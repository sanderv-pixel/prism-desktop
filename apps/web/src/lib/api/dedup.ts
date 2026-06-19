import { kvSet, kvExists } from '@/lib/redis'

export async function isDuplicateKey(key: string, windowMs = 5000): Promise<boolean> {
  const exists = await kvExists(`dedup:${key}`)
  if (exists) return true

  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000))
  await kvSet(`dedup:${key}`, '1', { ex: ttlSeconds })
  return false
}
