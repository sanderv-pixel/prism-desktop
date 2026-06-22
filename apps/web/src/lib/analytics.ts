import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { kvGet, kvSet } from './redis'

const GA_CACHE_TTL_SECONDS = 5 * 60 // 5 minutes

const EXCLUDED_PATH_PREFIXES = [
  '/admin',
  '/advertiser',
  '/dashboard',
  '/auth',
  '/api',
  '/_next',
  '/favicon',
]

export function isGoogleAnalyticsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_ANALYTICS_PROPERTY_ID &&
      process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL &&
      process.env.GOOGLE_ANALYTICS_PRIVATE_KEY
  )
}

async function withGaCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const cached: unknown = await kvGet(key)
    if (cached != null) {
      // Upstash auto-deserializes JSON (object); the in-memory dev store returns a
      // string. Handle both, else the cache never hits and GA is refetched each time.
      if (typeof cached === 'object') return cached as T
      try {
        return JSON.parse(cached as string) as T
      } catch {
        // ignore parse errors and fetch fresh
      }
    }
  } catch {
    // ignore redis errors and fetch fresh
  }

  const value = await fetcher()

  try {
    await kvSet(key, JSON.stringify(value), { ex: GA_CACHE_TTL_SECONDS })
  } catch {
    // ignore cache write errors
  }

  return value
}

function getClient(): BetaAnalyticsDataClient {
  const clientEmail = process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY
  const projectId = process.env.GOOGLE_ANALYTICS_PROJECT_ID

  if (!clientEmail || !privateKey) {
    throw new Error('Google Analytics service account credentials are missing')
  }

  return new BetaAnalyticsDataClient({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    },
  })
}

function formatGaDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function parseGaDate(dateStr: string): string {
  // GA returns dates as YYYYMMDD; convert to YYYY-MM-DD.
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
}

interface GaVisitorRow {
  date: string
  visits: number
  uniqueVisitors: number
}

async function runVisitorReport(
  startDate: Date,
  endDate: Date
): Promise<GaVisitorRow[]> {
  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID
  if (!propertyId) throw new Error('GOOGLE_ANALYTICS_PROPERTY_ID is not set')

  const client = getClient()

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate: formatGaDate(startDate),
        endDate: formatGaDate(endDate),
      },
    ],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
    dimensionFilter: {
      andGroup: {
        expressions: EXCLUDED_PATH_PREFIXES.map((prefix) => ({
          notExpression: {
            filter: {
              fieldName: 'pagePath',
              stringFilter: {
                matchType: 'BEGINS_WITH',
                value: prefix,
              },
            },
          },
        })),
      },
    },
  })

  const rows: GaVisitorRow[] = []
  for (const row of response.rows ?? []) {
    const date = parseGaDate(row.dimensionValues?.[0]?.value ?? '')
    const visits = parseInt(row.metricValues?.[0]?.value ?? '0', 10)
    const uniqueVisitors = parseInt(row.metricValues?.[1]?.value ?? '0', 10)
    if (date) rows.push({ date, visits, uniqueVisitors })
  }

  return rows
}

export async function fetchGaVisitors(
  days: number
): Promise<{ date: string; visits: number; unique_visitors: number }[]> {
  return withGaCache(`ga:visitors:${days}`, async () => {
    const end = new Date()
    const start = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()))
    start.setUTCDate(start.getUTCDate() - days + 1)

    const rows = await runVisitorReport(start, end)

    const points = new Map<string, { date: string; visits: number; unique_visitors: number }>()
    for (let i = 0; i < days; i++) {
      const d = new Date(start)
      d.setUTCDate(d.getUTCDate() + i)
      const key = d.toISOString().slice(0, 10)
      points.set(key, { date: key, visits: 0, unique_visitors: 0 })
    }

    for (const row of rows) {
      const point = points.get(row.date)
      if (point) {
        point.visits = row.visits
        point.unique_visitors = row.uniqueVisitors
      }
    }

    return Array.from(points.values())
  })
}

export async function fetchGaVisitTotals() {
  return withGaCache('ga:visit-totals', async () => {
    const today = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()))
    const weekStart = new Date(today)
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay())
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))

    const [todayRows, weekRows, monthRows] = await Promise.all([
      runVisitorReport(today, today),
      runVisitorReport(weekStart, today),
      runVisitorReport(monthStart, today),
    ])

    const sum = (rows: GaVisitorRow[]) =>
      rows.reduce((acc, r) => acc + r.visits, 0)

    return {
      today: sum(todayRows),
      week: sum(weekRows),
      month: sum(monthRows),
      uniqueToday: todayRows.reduce((acc, r) => acc + r.uniqueVisitors, 0),
    }
  })
}

function getPathFilter(): any {
  return {
    andGroup: {
      expressions: EXCLUDED_PATH_PREFIXES.map((prefix) => ({
        notExpression: {
          filter: {
            fieldName: 'pagePath',
            stringFilter: {
              matchType: 'BEGINS_WITH',
              value: prefix,
            },
          },
        },
      })),
    },
  }
}

async function runReportRequest(
  client: BetaAnalyticsDataClient,
  request: Parameters<BetaAnalyticsDataClient['runReport']>[0]
) {
  const [response] = await client.runReport(request)
  return response
}

function dateRangeForDays(days: number) {
  const end = new Date()
  const start = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()))
  start.setUTCDate(start.getUTCDate() - days + 1)
  return { startDate: formatGaDate(start), endDate: formatGaDate(end) }
}

export interface GaAnalyticsOverview {
  users: number
  sessions: number
  newUsers: number
  screenPageViews: number
  averageSessionDuration: number
  bounceRate: number
}

export interface GaTimeSeriesPoint {
  date: string
  users: number
  sessions: number
  screenPageViews: number
}

export interface GaTopPage {
  pagePath: string
  pageTitle: string
  sessions: number
  screenPageViews: number
}

export interface GaSource {
  source: string
  medium: string
  sessions: number
  users: number
}

export interface GaCountry {
  country: string
  sessions: number
  users: number
}

export interface GaDevice {
  deviceCategory: string
  sessions: number
  users: number
}

export interface GaAnalyticsData {
  overview: GaAnalyticsOverview
  timeSeries: GaTimeSeriesPoint[]
  topPages: GaTopPage[]
  sources: GaSource[]
  countries: GaCountry[]
  devices: GaDevice[]
}

export async function fetchGaAnalytics(days: number): Promise<GaAnalyticsData> {
  return withGaCache(`ga:analytics:${days}`, async () => {
    const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID
    if (!propertyId) throw new Error('GOOGLE_ANALYTICS_PROPERTY_ID is not set')

    const client = getClient()
    const dateRange = dateRangeForDays(days)
    const pathFilter = getPathFilter()

    const [overviewResponse, pagesResponse, sourcesResponse, countriesResponse, devicesResponse] =
      await Promise.all([
      runReportRequest(client, {
        property: `properties/${propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'totalUsers' },
          { name: 'sessions' },
          { name: 'newUsers' },
          { name: 'screenPageViews' },
          { name: 'userEngagementDuration' },
          { name: 'bounceRate' },
        ],
        dimensionFilter: pathFilter,
      }),
      runReportRequest(client, {
        property: `properties/${propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }],
        dimensionFilter: pathFilter,
        limit: 10,
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      }),
      runReportRequest(client, {
        property: `properties/${propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        dimensionFilter: pathFilter,
        limit: 10,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      }),
      runReportRequest(client, {
        property: `properties/${propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        dimensionFilter: pathFilter,
        limit: 10,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      }),
      runReportRequest(client, {
        property: `properties/${propertyId}`,
        dateRanges: [dateRange],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        dimensionFilter: pathFilter,
        limit: 10,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      }),
    ])

  const overview: GaAnalyticsOverview = {
    users: 0,
    sessions: 0,
    newUsers: 0,
    screenPageViews: 0,
    averageSessionDuration: 0,
    bounceRate: 0,
  }
  const timeSeries = new Map<string, GaTimeSeriesPoint>()
  let totalEngagementDuration = 0
  let totalBounceRate = 0

  for (const row of overviewResponse.rows ?? []) {
    const date = parseGaDate(row.dimensionValues?.[0]?.value ?? '')
    const users = parseInt(row.metricValues?.[0]?.value ?? '0', 10)
    const sessions = parseInt(row.metricValues?.[1]?.value ?? '0', 10)
    const newUsers = parseInt(row.metricValues?.[2]?.value ?? '0', 10)
    const views = parseInt(row.metricValues?.[3]?.value ?? '0', 10)
    const engagementDuration = parseFloat(row.metricValues?.[4]?.value ?? '0')
    const bounceRate = parseFloat(row.metricValues?.[5]?.value ?? '0')

    overview.users += users
    overview.sessions += sessions
    overview.newUsers += newUsers
    overview.screenPageViews += views
    totalEngagementDuration += engagementDuration
    totalBounceRate += bounceRate

    if (date) {
      timeSeries.set(date, {
        date,
        users,
        sessions,
        screenPageViews: views,
      })
    }
  }

  if (overview.sessions > 0) {
    overview.averageSessionDuration = totalEngagementDuration / overview.sessions
  }
  const rowCount = overviewResponse.rows?.length ?? 0
  if (rowCount > 0) {
    overview.bounceRate = totalBounceRate / rowCount
  }

  const topPages: GaTopPage[] = (pagesResponse.rows ?? []).map((row) => ({
    pagePath: row.dimensionValues?.[0]?.value ?? '',
    pageTitle: row.dimensionValues?.[1]?.value ?? '',
    sessions: parseInt(row.metricValues?.[1]?.value ?? '0', 10),
    screenPageViews: parseInt(row.metricValues?.[0]?.value ?? '0', 10),
  }))

  const sources: GaSource[] = (sourcesResponse.rows ?? []).map((row) => ({
    source: row.dimensionValues?.[0]?.value ?? '(direct)',
    medium: row.dimensionValues?.[1]?.value ?? '(none)',
    sessions: parseInt(row.metricValues?.[0]?.value ?? '0', 10),
    users: parseInt(row.metricValues?.[1]?.value ?? '0', 10),
  }))

  const countries: GaCountry[] = (countriesResponse.rows ?? []).map((row) => ({
    country: row.dimensionValues?.[0]?.value ?? 'Unknown',
    sessions: parseInt(row.metricValues?.[0]?.value ?? '0', 10),
    users: parseInt(row.metricValues?.[1]?.value ?? '0', 10),
  }))

  const devices: GaDevice[] = (devicesResponse.rows ?? []).map((row) => ({
    deviceCategory: row.dimensionValues?.[0]?.value ?? 'Unknown',
    sessions: parseInt(row.metricValues?.[0]?.value ?? '0', 10),
    users: parseInt(row.metricValues?.[1]?.value ?? '0', 10),
  }))

  // Fill missing dates in the time series so the chart is continuous.
  const { startDate, endDate } = dateRange
  const start = new Date(startDate)
  const end = new Date(endDate)
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    if (!timeSeries.has(key)) {
      timeSeries.set(key, { date: key, users: 0, sessions: 0, screenPageViews: 0 })
    }
  }

    return {
      overview,
      timeSeries: Array.from(timeSeries.values()).sort((a, b) => a.date.localeCompare(b.date)),
      topPages,
      sources,
      countries,
      devices,
    }
  })
}
