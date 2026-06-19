import { kvSet } from '@/lib/redis'

const rawSecret = process.env.PRISM_IMPRESSION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY

if (process.env.NODE_ENV === 'production' && !rawSecret) {
  throw new Error('PRISM_IMPRESSION_SECRET is required in production')
}

const SECRET = rawSecret ?? 'dev-secret-not-for-production'
const TOKEN_VERSION = 'v1'
const TOKEN_TTL_MS = 5 * 60 * 1000 // 5 minutes

export interface ImpressionTokenPayload {
  campaignId: string
  userId: string
  sessionId: string
  auctionPriceCpm: number
  nonce: string
  issuedAt: number
}

interface TokenParts {
  version: string
  payload: ImpressionTokenPayload
  signature: string
}

let cachedKey: CryptoKey | null = null

async function getSigningKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey
  const encoder = new TextEncoder()
  const keyData = encoder.encode(SECRET)
  cachedKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
  return cachedKey
}

async function signMessage(message: string): Promise<string> {
  const key = await getSigningKey()
  const encoder = new TextEncoder()
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Buffer.from(signature).toString('base64url')
}

async function verifySignature(message: string, signature: string): Promise<boolean> {
  const key = await getSigningKey()
  const encoder = new TextEncoder()
  try {
    return await crypto.subtle.verify(
      'HMAC',
      key,
      Buffer.from(signature, 'base64url'),
      encoder.encode(message)
    )
  } catch {
    return false
  }
}

function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function createImpressionToken(
  payload: Omit<ImpressionTokenPayload, 'nonce' | 'issuedAt'>
): Promise<string> {
  const fullPayload: ImpressionTokenPayload = {
    ...payload,
    nonce: randomNonce(),
    issuedAt: Date.now(),
  }

  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')
  const signature = await signMessage(`${TOKEN_VERSION}.${encodedPayload}`)
  return `${TOKEN_VERSION}.${encodedPayload}.${signature}`
}

export function parseImpressionToken(token: string): TokenParts | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [version, encodedPayload, signature] = parts
  if (version !== TOKEN_VERSION) return null

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString()) as ImpressionTokenPayload
    return { version, payload, signature }
  } catch {
    return null
  }
}

export async function verifyImpressionToken(token: string): Promise<ImpressionTokenPayload | null> {
  const parsed = parseImpressionToken(token)
  if (!parsed) return null

  const encodedPayload = Buffer.from(JSON.stringify(parsed.payload)).toString('base64url')
  const valid = await verifySignature(`${TOKEN_VERSION}.${encodedPayload}`, parsed.signature)
  if (!valid) return null

  const now = Date.now()
  if (now - parsed.payload.issuedAt > TOKEN_TTL_MS) {
    return null
  }

  return parsed.payload
}

const NONCE_TTL_SECONDS = Math.ceil((TOKEN_TTL_MS + 60 * 1000) / 1000)

export async function isNonceUsed(nonce: string): Promise<boolean> {
  const key = `nonce:${nonce}`
  const result = await kvSet(key, '1', { nx: true, ex: NONCE_TTL_SECONDS })
  // If the key already exists, the nonce was already used.
  return result === null
}

// ---------------------------------------------------------------------------
// Conversion token: issued alongside an ad, used to attribute a conversion
// back to a real served session/campaign without trusting the client to name
// the campaign itself.
// ---------------------------------------------------------------------------

const CONVERSION_TOKEN_VERSION = 'cv1'
const CONVERSION_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

const CONVERSION_NONCE_TTL_SECONDS = Math.ceil(
  (CONVERSION_TOKEN_TTL_MS + 60 * 1000) / 1000
)

export async function isConversionNonceUsed(nonce: string): Promise<boolean> {
  const key = `conversion:nonce:${nonce}`
  const result = await kvSet(key, '1', { nx: true, ex: CONVERSION_NONCE_TTL_SECONDS })
  return result === null
}

export interface ConversionTokenPayload {
  campaignId: string
  sessionId: string
  nonce: string
  issuedAt: number
}

export async function createConversionToken(
  payload: Omit<ConversionTokenPayload, 'nonce' | 'issuedAt'>
): Promise<string> {
  const fullPayload: ConversionTokenPayload = {
    ...payload,
    nonce: randomNonce(),
    issuedAt: Date.now(),
  }
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')
  const signature = await signMessage(`${CONVERSION_TOKEN_VERSION}.${encodedPayload}`)
  return `${CONVERSION_TOKEN_VERSION}.${encodedPayload}.${signature}`
}

async function parseConversionToken(token: string): Promise<ConversionTokenPayload | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [version, encodedPayload, signature] = parts
  if (version !== CONVERSION_TOKEN_VERSION) return null

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString()
    ) as ConversionTokenPayload
    const recomposed = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const valid = await verifySignature(`${CONVERSION_TOKEN_VERSION}.${recomposed}`, signature)
    if (!valid) return null
    if (Date.now() - payload.issuedAt > CONVERSION_TOKEN_TTL_MS) return null
    return payload
  } catch {
    return null
  }
}

export async function verifyConversionToken(
  token: string
): Promise<ConversionTokenPayload | null> {
  return parseConversionToken(token)
}
