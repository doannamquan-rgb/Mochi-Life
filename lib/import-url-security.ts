import dns from 'node:dns/promises'
import http from 'node:http'
import https from 'node:https'
import { Readable } from 'node:stream'
import net from 'node:net'

export type SafeAddress = { address: string; family: number }
type LookupAll = (hostname: string, options: { all: true; verbatim: true }) => Promise<Array<{ address: string; family: number }>>

export function isPrivateIP(ip: string): boolean {
  if (!net.isIP(ip)) return false
  const normalized = ip.toLowerCase()

  if (net.isIPv6(ip) && normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice(7)
    if (net.isIPv4(mapped)) return isPrivateIP(mapped)
  }

  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    const c = Number(ip.split('.')[2])
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || (a === 192 && b === 0 && (c === 0 || c === 2 || c === 88)) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113) || a >= 224
  }

  if (net.isIPv6(ip)) {
    const first = normalized.split(':')[0]
    const firstWord = parseInt(first || '0', 16)
    // Only global unicast IPv6 is permitted. This rejects mapped IPv4,
    // loopback, link-local, unique-local, multicast, and unspecified ranges.
    return (firstWord & 0xe000) !== 0x2000 ||
      (firstWord === 0x2001 && normalized.startsWith('2001:db8:')) ||
      firstWord === 0x2002
  }
  return false
}

export async function resolvePublicAddress(
  hostname: string,
  lookup: LookupAll = dns.lookup as LookupAll
): Promise<SafeAddress> {
  const normalizedHostname = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname

  if (net.isIP(normalizedHostname)) {
    if (isPrivateIP(normalizedHostname)) throw new Error('Private network addresses are not allowed')
    return { address: normalizedHostname, family: net.isIPv6(normalizedHostname) ? 6 : 4 }
  }

  const addresses = await lookup(normalizedHostname, { all: true, verbatim: true })
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIP(address))) {
    throw new Error('Host resolves to a private or unavailable address')
  }
  return addresses[0]
}

/** Fetches using the exact validated address while retaining hostname-based Host/TLS verification. */
export function fetchPinnedUrl(url: URL, address: SafeAddress, signal: AbortSignal): Promise<Response> {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http
    const hostname = url.hostname.startsWith('[') ? url.hostname.slice(1, -1) : url.hostname
    const lookup = ((
      _hostname: string,
      _options: unknown,
      callback: (error: NodeJS.ErrnoException | null, address: string, family: number) => void
    ) => callback(null, address.address, address.family)) as NonNullable<http.RequestOptions['lookup']>

    const req = transport.request(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'MochiLife-Importer/1.0',
        Accept: 'text/csv, application/json, text/plain, */*',
      },
      lookup,
      ...(url.protocol === 'https:' && net.isIP(hostname) === 0 ? { servername: hostname } : {}),
    }, incoming => {
      const headers = new Headers()
      for (const [key, value] of Object.entries(incoming.headers)) {
        if (Array.isArray(value)) value.forEach(item => headers.append(key, item))
        else if (value !== undefined) headers.set(key, value)
      }
      resolve(new Response(Readable.toWeb(incoming) as ReadableStream<Uint8Array>, {
        status: incoming.statusCode || 502,
        statusText: incoming.statusMessage,
        headers,
      }))
    })

    const abort = () => req.destroy(new DOMException('The request was aborted', 'AbortError'))
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
    req.once('error', error => reject(error))
    req.once('close', () => signal.removeEventListener('abort', abort))
    req.setTimeout(10_000, () => req.destroy(new DOMException('The request timed out', 'AbortError')))
    req.end()
  })
}
