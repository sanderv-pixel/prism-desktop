import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

function csvCell(v: string | number): string {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Daily performance export as CSV, drawn from the maintained daily counters (so it
// is not capped by the 1000-row fetch).
export async function GET() {
  const authClient = await createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  try {
    const { data: advertiser, error: advErr } = await supabase
      .from('advertisers')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (advErr) {
      if (advErr.code === 'PGRST116') return NextResponse.json({ error: 'Advertiser not found' }, { status: 404 })
      throw advErr
    }

    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, title')
      .eq('advertiser_id', advertiser.id)
    const title = new Map((campaigns ?? []).map((c) => [c.id, c.title]))
    const ids = (campaigns ?? []).map((c) => c.id)

    const { data: daily } = ids.length
      ? await supabase
          .from('campaign_daily_spend')
          .select('campaign_id, spend_date, spent_cents, impressions')
          .in('campaign_id', ids)
          .order('spend_date', { ascending: false })
      : { data: [] as any[] }

    const header = ['date', 'campaign', 'impressions', 'spend_usd', 'cpm_usd']
    const rows = (daily ?? []).map((r) => {
      const imps = r.impressions ?? 0
      const spend = (r.spent_cents ?? 0) / 100
      const cpm = imps > 0 ? (spend / imps) * 1000 : 0
      return [
        r.spend_date,
        title.get(r.campaign_id) ?? r.campaign_id,
        imps,
        spend.toFixed(2),
        cpm.toFixed(2),
      ]
    })

    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
    const filename = `prism-performance-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('GET /api/advertiser/export error:', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
