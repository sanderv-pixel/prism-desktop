import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

function csvCell(v: string | number): string {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Daily earnings statement as CSV, aggregated in the DB (uncapped).
export async function GET() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data: identities } = await supabase
    .from('builder_identities')
    .select('anonymous_user_id')
    .eq('auth_user_id', user.id)
  const ids = [user.id, ...(identities ?? []).map((i) => i.anonymous_user_id)]

  const { data } = await supabase.rpc('creator_daily_earnings', { p_user_ids: ids, p_since: undefined })

  const header = ['date', 'impressions', 'earnings_usd']
  const rows = (data ?? []).map((r) => [
    r.day,
    r.impressions,
    (Number(r.earnings_millicents) / 100000).toFixed(2),
  ])
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
  const filename = `prism-earnings-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
