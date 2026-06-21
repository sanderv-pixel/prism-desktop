import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

// Returns the authenticated advertiser's conversion postback key (generating one if
// missing). POST rotates it.
async function getAdvertiser(userId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('advertisers')
    .select('id, conversion_api_key')
    .eq('user_id', userId)
    .single()
  return data
}

function newKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return 'pck_' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function GET() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const advertiser = await getAdvertiser(user.id)
  if (!advertiser) return NextResponse.json({ error: 'Advertiser not found' }, { status: 404 })
  let key = advertiser.conversion_api_key
  if (!key) {
    key = newKey()
    await createAdminClient().from('advertisers').update({ conversion_api_key: key }).eq('id', advertiser.id)
  }
  return NextResponse.json({ key })
}

export async function POST() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const advertiser = await getAdvertiser(user.id)
  if (!advertiser) return NextResponse.json({ error: 'Advertiser not found' }, { status: 404 })
  const key = newKey()
  await createAdminClient().from('advertisers').update({ conversion_api_key: key }).eq('id', advertiser.id)
  return NextResponse.json({ key })
}
