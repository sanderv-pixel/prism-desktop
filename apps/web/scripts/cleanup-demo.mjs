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

const DEMO_EMAILS = ['demo@goprism.dev', 'demo@prism.dev']

function isDemoEmail(email) {
  if (!email) return false
  const lower = email.toLowerCase()
  return lower.startsWith('demo@') || lower.startsWith('test@') || lower.includes('+demo') || lower.includes('+test')
}

async function deleteFrom(table, column, value) {
  const { error, count } = await adminClient
    .from(table)
    .delete({ count: 'exact' })
    .eq(column, value)
  if (error) {
    console.error(`  ❌ ${table}.${column}=${value}: ${error.message}`)
    return 0
  }
  console.log(`  ✅ ${table}: deleted ${count ?? 0} row(s)`)
  return count ?? 0
}

async function deleteFromLike(table, column, pattern) {
  const { error, count } = await adminClient
    .from(table)
    .delete({ count: 'exact' })
    .like(column, pattern)
  if (error) {
    console.error(`  ❌ ${table}.${column} LIKE ${pattern}: ${error.message}`)
    return 0
  }
  console.log(`  ✅ ${table} (${column} LIKE ${pattern}): deleted ${count ?? 0} row(s)`)
  return count ?? 0
}

async function main() {
  console.log('Looking for demo/test auth users…')

  const { data: authData, error: listError } = await adminClient.auth.admin.listUsers()
  if (listError) {
    console.error('Failed to list auth users:', listError)
    process.exit(1)
  }

  const demoUsers = (authData?.users ?? []).filter((u) => isDemoEmail(u.email))

  for (const demoUser of demoUsers) {
    console.log('\nFound demo auth user:', demoUser.id, demoUser.email)

    // Tables that do NOT cascade on auth user deletion, or that use a different column name.
    // Run these first so the final auth-user delete cannot fail on a stray FK.
    await deleteFrom('user_trust', 'user_id', demoUser.id)
    await deleteFrom('referrals', 'user_id', demoUser.id)
    await deleteFrom('builder_payout_settings', 'auth_user_id', demoUser.id)
    await deleteFrom('builder_identities', 'auth_user_id', demoUser.id)
    await deleteFrom('payouts', 'user_id', demoUser.id)

    // Advertisers and everything tied to them (campaigns, impressions, clicks,
    // conversions, advertiser_transactions) will cascade once the auth user is deleted
    // because advertisers.user_id references auth.users ON DELETE CASCADE.
    // We also delete explicitly for a clear audit log.
    await deleteFrom('advertisers', 'user_id', demoUser.id)

    console.log('Deleting demo auth user…')
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(demoUser.id)
    if (deleteAuthError) {
      console.error('  ❌ Failed to delete demo auth user:', deleteAuthError)
      process.exit(1)
    }
    console.log('  ✅ Deleted demo auth user')
  }

  if (demoUsers.length === 0) {
    console.log('No demo auth users found; checking for orphan demo rows…')
  }

  // Safety net: any advertisers created with demo/test email patterns.
  await deleteFromLike('advertisers', 'email', 'demo+%@prism.dev')
  await deleteFromLike('advertisers', 'email', 'demo+%@goprism.dev')
  await deleteFromLike('advertisers', 'email', 'demo@%.%')
  await deleteFromLike('advertisers', 'email', 'test@%.%')

  // Remove demo/test emails from the waitlist.
  await deleteFromLike('waitlist', 'email', 'demo@%.%')
  await deleteFromLike('waitlist', 'email', 'test@%.%')
  await deleteFromLike('waitlist', 'email', '%@example.com')

  // Delete orphan user_trust rows that look like test fingerprints.
  await deleteFromLike('user_trust', 'user_id', 'test%')
  await deleteFromLike('user_trust', 'user_id', 'prism_%')

  // Delete test impressions.
  await deleteFromLike('impressions', 'user_id', 'test%')
  await deleteFromLike('impressions', 'session_id', 'test%')
  await deleteFromLike('impressions', 'user_id', 'prism_%')
  await deleteFromLike('impressions', 'session_id', 'prism_%')

  // Delete any test device credentials / builder identities.
  await deleteFromLike('device_credentials', 'anonymous_user_id', 'test%')
  await deleteFromLike('device_credentials', 'anonymous_user_id', 'prism_%')
  await deleteFromLike('builder_identities', 'anonymous_user_id', 'test%')
  await deleteFromLike('builder_identities', 'anonymous_user_id', 'prism_%')

  console.log('\nCleanup complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
