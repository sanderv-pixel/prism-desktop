import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Service-role client. Bypasses Row Level Security; use only on the server
 * for admin operations and public/unauthenticated endpoints such as /api/ads.
 */
export const createAdminClient = () => {
  return createSupabaseClient<Database>(supabaseUrl!, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
