import { lookup } from 'dns/promises'
import net from 'net'

// SSRF guard for server-side fetches of user-supplied URLs (e.g. advertiser icon
// URLs). Rejects non-http(s) schemes and any host that resolves to a private,
// loopback, link-local (incl. the 169.254.169.254 cloud-metadata endpoint), or
// otherwise reserved address. Pair with redirect:'manual' at the call site so a
// public host cannot 3xx-redirect the request onto an internal target.

export function isPrivateIp(ip: string): boolean {
  const kind = net.isIP(ip)
  if (kind === 4) {
    const parts = ip.split('.').map(Number)
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true
    const [a, b] = parts
    if (a === 0) return true // "this" network
    if (a === 10) return true // private
    if (a === 127) return true // loopback
    if (a === 169 && b === 254) return true // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true // private
    if (a === 192 && b === 168) return true // private
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
    if (a >= 224) return true // multicast / reserved / broadcast
    return false
  }
  if (kind === 6) {
    const lower = ip.toLowerCase().replace(/^\[|\]$/g, '')
    if (lower === '::1' || lower === '::') return true // loopback / unspecified
    if (lower.startsWith('fe80')) return true // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true // unique-local fc00::/7
    const mapped = lower.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
    if (mapped) return isPrivateIp(mapped[1]) // IPv4-mapped IPv6
    return false
  }
  return true // not a valid IP literal -> treat as unsafe
}

// Throws if the URL is not safe to fetch server-side. Resolves DNS and checks every
// returned address, so a hostname pointing at an internal IP is rejected too.
export async function assertPublicHttpUrl(rawUrl: string): Promise<void> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Invalid URL')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('URL must use http or https')
  }
  const host = url.hostname

  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('URL points to a private address')
    return
  }

  let addresses
  try {
    addresses = await lookup(host, { all: true })
  } catch {
    throw new Error('Host could not be resolved')
  }
  if (!addresses.length) throw new Error('Host could not be resolved')
  for (const a of addresses) {
    if (isPrivateIp(a.address)) throw new Error('URL points to a private address')
  }
}
