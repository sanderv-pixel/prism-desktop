import { createAdminClient } from '@/utils/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/utils/supabase/database.types'

export type AuditAction =
  | 'admin.campaign.approve'
  | 'admin.campaign.reject'
  | 'payout.request'
  | 'payout.approve'
  | 'payout.approve_failed'
  | 'payout.reject'
  | 'builder.connect.created'
  | 'builder.payout_settings.updated'
  | 'campaign.create'
  | 'campaign.update'
  | 'campaign.budget_increase'
  | 'campaign.budget_decrease'
  | 'campaign.status_change'
  | 'campaign.delete'
  | 'advertiser.activate'
  | 'advertiser.deactivate'
  | 'advertiser.deposit'
  | 'advertiser.pause_all'
  | 'advertiser.close'
  | 'impression.blocked'
  | 'admin.user.set_hold'
  | 'admin.user.release_hold'

export interface AuditLogEntry {
  actorId?: string
  actorEmail?: string
  action: AuditAction
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
}

function safeJson(value: Record<string, unknown> | undefined): Json {
  return (value ?? {}) as Json
}

/**
 * Write an immutable audit log entry. Uses the service-role client so it never
 * depends on the requesting user's RLS permissions.
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('audit_logs').insert({
    actor_id: entry.actorId ?? null,
    actor_email: entry.actorEmail ?? null,
    action: entry.action,
    target_type: entry.targetType ?? null,
    target_id: entry.targetId ?? null,
    metadata: safeJson(entry.metadata),
    ip_address: entry.ipAddress ?? null,
  })
}

export type AuditLogQueryOptions = {
  action?: AuditAction
  targetType?: string
  targetId?: string
  actorId?: string
  limit?: number
  offset?: number
}

/**
 * Fetch audit logs. Intended for the admin review UI.
 */
export async function fetchAuditLogs(
  supabase: SupabaseClient<Database>,
  options: AuditLogQueryOptions = {}
) {
  const { action, targetType, targetId, actorId, limit = 100, offset = 0 } = options
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (action) query = query.eq('action', action)
  if (targetType) query = query.eq('target_type', targetType)
  if (targetId) query = query.eq('target_id', targetId)
  if (actorId) query = query.eq('actor_id', actorId)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}
