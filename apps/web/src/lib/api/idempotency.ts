import { kvSet, kvExists } from '@/lib/redis'

const EVENT_TTL_SECONDS = 24 * 60 * 60

export async function hasHandledEvent(eventId: string): Promise<boolean> {
  const exists = await kvExists(`stripe:event:${eventId}`)
  return exists > 0
}

export async function markEventHandled(eventId: string): Promise<void> {
  await kvSet(`stripe:event:${eventId}`, String(Date.now()), { ex: EVENT_TTL_SECONDS })
}
