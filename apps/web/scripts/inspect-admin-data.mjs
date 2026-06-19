import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const adminClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function isSuspiciousEmail(email) {
  if (!email) return false
  const lower = email.toLowerCase()
  return (
    lower.includes('demo') ||
    lower.includes('test') ||
    lower.endsWith('@example.com') ||
    lower.endsWith('@test.com') ||
    lower.endsWith('@goprism.dev')
  )
}

function isSuspiciousAdvertiser(a) {
  return (
    isSuspiciousEmail(a.email) ||
    /\b(demo|test|example)\b/i.test(a.name ?? '') ||
    /example\.com|test\.com|placehold\.co/i.test(a.website ?? '') ||
    a.stripe_customer_id === 'cus_demo' ||
    a.stripe_subscription_id === 'sub_demo'
  )
}

async function main() {
  console.log('=== Admin data audit ===\n')

  // Auth users
  const { data: usersData, error: usersErr } = await adminClient.auth.admin.listUsers()
  if (usersErr) console.error('auth users error:', usersErr.message)
  const users = usersData?.users ?? []
  console.log(`Auth users: ${users.length}`)
  const suspiciousUsers = users.filter((u) => isSuspiciousEmail(u.email))
  if (suspiciousUsers.length) {
    console.log('Suspicious auth users:')
    for (const u of suspiciousUsers) {
      console.log(`  ${u.id} ${u.email} (created ${u.created_at})`)
    }
  }
  console.log()

  // Advertisers
  const { data: advertisers, error: advErr } = await adminClient
    .from('advertisers')
    .select('*')
    .order('created_at', { ascending: false })
  if (advErr) console.error('advertisers error:', advErr.message)
  console.log(`Advertisers: ${advertisers?.length ?? 0}`)
  const suspiciousAdv = (advertisers ?? []).filter(isSuspiciousAdvertiser)
  if (suspiciousAdv.length) {
    console.log('Suspicious advertisers:')
    for (const a of suspiciousAdv) {
      console.log(
        `  ${a.id.slice(0, 8)} ${a.name} <${a.email}> website=${a.website} status=${a.status} created=${a.created_at}`
      )
    }
  }
  if ((advertisers ?? []).length) {
    console.log('All advertisers:')
    for (const a of advertisers.slice(0, 50)) {
      console.log(
        `  ${a.id.slice(0, 8)} ${a.name} <${a.email}> status=${a.status} balance=${a.balance_cents} created=${a.created_at}`
      )
    }
  }
  console.log()

  // Campaigns
  const { data: campaigns, error: campErr } = await adminClient
    .from('campaigns')
    .select('id, title, status, advertiser_id, budget_cents, spent_cents, created_at')
    .order('created_at', { ascending: false })
  if (campErr) console.error('campaigns error:', campErr.message)
  console.log(`Campaigns: ${campaigns?.length ?? 0}`)
  if ((campaigns ?? []).length) {
    for (const c of campaigns.slice(0, 50)) {
      console.log(
        `  ${c.id.slice(0, 8)} "${c.title}" status=${c.status} adv=${c.advertiser_id.slice(0, 8)} budget=${c.budget_cents} spent=${c.spent_cents} created=${c.created_at}`
      )
    }
  }
  console.log()

  // Payouts
  const { data: payouts, error: payErr } = await adminClient
    .from('payouts')
    .select('*')
    .order('created_at', { ascending: false })
  if (payErr) console.error('payouts error:', payErr.message)
  console.log(`Payouts: ${payouts?.length ?? 0}`)
  if ((payouts ?? []).length) {
    for (const p of payouts.slice(0, 50)) {
      console.log(
        `  ${p.id.slice(0, 8)} user=${p.user_id.slice(0, 8)} amount=${p.amount_cents} status=${p.status} created=${p.created_at}`
      )
    }
  }
  console.log()

  // User trust
  const { data: trust, error: trustErr } = await adminClient
    .from('user_trust')
    .select('*')
    .order('last_seen_at', { ascending: false })
  if (trustErr) console.error('user_trust error:', trustErr.message)
  console.log(`User trust rows: ${trust?.length ?? 0}`)
  if ((trust ?? []).length) {
    for (const t of trust.slice(0, 50)) {
      const user = users.find((u) => u.id === t.user_id)
      console.log(
        `  ${t.user_id.slice(0, 8)} ${user?.email ?? '(no auth user)'} score=${t.trust_score} impressions=${t.impression_count} last_seen=${t.last_seen_at}`
      )
    }
  }
  console.log()

  // Waitlist
  const { data: waitlist, error: waitErr } = await adminClient
    .from('waitlist')
    .select('*')
    .order('created_at', { ascending: false })
  if (waitErr) console.error('waitlist error:', waitErr.message)
  console.log(`Waitlist entries: ${waitlist?.length ?? 0}`)
  const suspiciousWaitlist = (waitlist ?? []).filter((w) => isSuspiciousEmail(w.email))
  if (suspiciousWaitlist.length) {
    console.log('Suspicious waitlist entries:')
    for (const w of suspiciousWaitlist) {
      console.log(`  ${w.id.slice(0, 8)} ${w.email} type=${w.type} created=${w.created_at}`)
    }
  }
  console.log()

  // Metrics totals
  const tables = ['impressions', 'clicks', 'conversions', 'visits', 'anomaly_events', 'audit_logs']
  for (const table of tables) {
    const { count, error } = await adminClient
      .from(table)
      .select('*', { count: 'exact', head: true })
    if (error) {
      console.log(`${table}: error - ${error.message}`)
    } else {
      console.log(`${table}: ${count ?? 0}`)
    }
  }
}

main().catch(console.error)
