import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 60

function getStartOfWeekIso(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday-start
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}

export async function GET() {
  const adminClient = createAdminClient()

  try {
    const weekAgoIso = getStartOfWeekIso()

    const [
      { count: totalImpressions },
      { count: weeklyImpressions },
      { count: totalCreators },
      { count: activeCampaigns },
    ] = await Promise.all([
      adminClient
        .from('impressions')
        .select('*', { count: 'exact', head: true })
        .eq('validated', true),
      adminClient
        .from('impressions')
        .select('*', { count: 'exact', head: true })
        .eq('validated', true)
        .gte('created_at', weekAgoIso),
      adminClient.from('referrals').select('*', { count: 'exact', head: true }),
      adminClient
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
    ])

    return NextResponse.json({
      totalImpressions: totalImpressions ?? 0,
      weeklyImpressions: weeklyImpressions ?? 0,
      totalCreators: totalCreators ?? 0,
      activeCampaigns: activeCampaigns ?? 0,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('GET /api/public-stats error:', err)
    return NextResponse.json(
      {
        totalImpressions: 0,
        weeklyImpressions: 0,
        totalCreators: 0,
        activeCampaigns: 0,
        updatedAt: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
