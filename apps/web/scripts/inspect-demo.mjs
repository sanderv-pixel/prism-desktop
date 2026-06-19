import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing Supabase URL or service role key')
  process.exit(1)
}

const adminClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_EMAIL = 'demo@goprism.dev'

async function main() {
  const { data: authData, error: userError } = await adminClient.auth.admin.listUsers()

  if (userError) {
    console.error('Error fetching demo user:', userError)
    return
  }

  const demoUser = authData.users.find((u) => u.email === DEMO_EMAIL)

  if (!demoUser) {
    console.log('No demo user found with email', DEMO_EMAIL)
    return
  }

  console.log('Demo user:', demoUser.id, demoUser.email)

  const tables = [
    'advertisers',
    'campaigns',
    'impressions',
    'clicks',
    'conversions',
    'payouts',
    'user_trust',
    'builder_identities',
    'payout_recipients',
    'referrals',
    'anomalies',
    'audit_logs',
    'visits',
    'waitlist',
  ]

  for (const table of tables) {
    try {
      const { count, error } = await adminClient
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', demoUser.id)
      if (error) {
        console.log(`  ${table}: error - ${error.message}`)
      } else {
        console.log(`  ${table}: ${count ?? 0} rows`)
      }
    } catch (e) {
      console.log(`  ${table}: exception - ${e.message}`)
    }
  }

  // Also count demo advertisers by email pattern
  const { count: advCount, error: advError } = await adminClient
    .from('advertisers')
    .select('*', { count: 'exact', head: true })
    .like('email', 'demo+%@goprism.dev')
  console.log(`  advertisers (demo+ pattern): ${advError ? advError.message : advCount ?? 0} rows`)

  // Campaigns tied to demo advertisers
  const { data: advRows } = await adminClient
    .from('advertisers')
    .select('id, name')
    .eq('user_id', demoUser.id)
  console.log('Demo advertisers:', advRows?.map((a) => `${a.id} ${a.name}`).join(', ') ?? 'none')
}

main().catch(console.error)
