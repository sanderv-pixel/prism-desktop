import { Redis } from '@upstash/redis'

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

export const redis = url && token ? new Redis({ url, token }) : null

interface MemoryEntry {
  value: string
  expiresAt?: number
}

const memoryStore = new Map<string, MemoryEntry>()

function isExpired(entry: MemoryEntry): boolean {
  return entry.expiresAt !== undefined && Date.now() > entry.expiresAt
}

export async function kvGet(key: string): Promise<string | null> {
  if (redis) {
    const value = await redis.get<string>(key)
    return value ?? null
  }

  const entry = memoryStore.get(key)
  if (!entry) return null
  if (isExpired(entry)) {
    memoryStore.delete(key)
    return null
  }
  return entry.value
}

export async function kvSet(
  key: string,
  value: string,
  opts?: { ex?: number; px?: number; nx?: boolean }
): Promise<'OK' | null> {
  if (redis) {
    const result = await redis.set<string>(key, value, opts as any)
    return result as 'OK' | null
  }

  const now = Date.now()
  const entry = memoryStore.get(key)
  if (opts?.nx && entry && !isExpired(entry)) {
    return null
  }

  let expiresAt: number | undefined
  if (opts?.ex !== undefined) expiresAt = now + opts.ex * 1000
  if (opts?.px !== undefined) expiresAt = now + opts.px

  memoryStore.set(key, { value, expiresAt })
  return 'OK'
}

export async function kvExists(key: string): Promise<number> {
  if (redis) {
    return redis.exists(key)
  }
  const entry = memoryStore.get(key)
  if (!entry) return 0
  if (isExpired(entry)) {
    memoryStore.delete(key)
    return 0
  }
  return 1
}

export async function kvIncr(key: string, windowSeconds?: number): Promise<number> {
  if (redis) {
    const count = Number(await redis.incr(key))
    // Only set the TTL when the window first opens (count === 1). Calling EXPIRE
    // on every increment slides the TTL forward, so a key under sustained traffic
    // never expires — a rate-limited caller would be locked out permanently and a
    // fraud-velocity counter would never reset.
    if (windowSeconds !== undefined && count === 1) {
      await redis.expire(key, windowSeconds)
    }
    return Number.isNaN(count) ? 1 : count
  }

  const raw = memoryStore.get(key)
  const fresh = !raw || isExpired(raw)
  const count = fresh ? 1 : Number(raw.value) + 1
  // Same rule for the dev in-memory store: keep the original expiry, don't slide.
  const expiresAt = fresh
    ? windowSeconds !== undefined
      ? Date.now() + windowSeconds * 1000
      : undefined
    : raw.expiresAt
  memoryStore.set(key, { value: String(count), expiresAt })
  return count
}

export async function kvTtl(key: string): Promise<number> {
  if (redis) {
    return redis.ttl(key)
  }
  const entry = memoryStore.get(key)
  if (!entry || entry.expiresAt === undefined) return -1
  const ttl = Math.ceil((entry.expiresAt - Date.now()) / 1000)
  return ttl > 0 ? ttl : -2
}

export async function kvDel(key: string): Promise<number> {
  if (redis) {
    return redis.del(key)
  }
  return memoryStore.delete(key) ? 1 : 0
}

function cleanupMemoryStore(): void {
  const now = Date.now()
  for (const [key, entry] of memoryStore) {
    if (isExpired(entry)) {
      memoryStore.delete(key)
    }
  }
}

const timer = setInterval(cleanupMemoryStore, 60_000)
if (typeof (timer as any).unref === 'function') {
  ;(timer as any).unref()
}
