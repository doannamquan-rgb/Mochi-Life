import { NextRequest, NextResponse } from 'next/server'
import dns from 'dns/promises'
import net from 'net'
import { createClient } from '@/lib/supabase/server'

export function isPrivateIP(ip: string): boolean {
  if (!net.isIP(ip)) return false

  const normalized = ip.toLowerCase()

  // IPv4-mapped IPv6 check
  if (net.isIPv6(ip) && normalized.startsWith('::ffff:')) {
    const ipv4Part = normalized.substring(7)
    if (net.isIPv4(ipv4Part)) {
      return isPrivateIP(ipv4Part)
    }
  }

  // IPv4 private & loopback check
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number)
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true
    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true
    // 172.16.0.0/12 (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true
    // 169.254.0.0/16 (Link-local & AWS Metadata)
    if (parts[0] === 169 && parts[1] === 254) return true
    // 0.0.0.0
    if (parts[0] === 0) return true
  }

  // IPv6 check
  if (net.isIPv6(ip)) {
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true
    if (normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) return true
  }

  return false
}

export async function isSafeUrl(urlStr: string): Promise<{ isSafe: boolean, parsedUrl?: URL, error?: string }> {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(urlStr)
  } catch {
    return { isSafe: false, error: 'Định dạng URL không hợp lệ nha (◕‿◕✿)' }
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { isSafe: false, error: 'Mochi chỉ hỗ trợ HTTP hoặc HTTPS thôi nè (๑˃̵ᴗ˂̵)و' }
  }

  if (parsedUrl.username || parsedUrl.password) {
    return { isSafe: false, error: 'URL không được chứa thông tin đăng nhập nha! (SSRF Protection) (・`ω´・)' }
  }

  const hostname = parsedUrl.hostname

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return { isSafe: false, error: 'Không được phép truy cập địa chỉ nội bộ đâu nha! (SSRF Protection) (・`ω´・)' }
  }

  try {
    const resolvedIps = await dns.resolve(hostname)
    for (const ip of resolvedIps) {
      if (isPrivateIP(ip)) {
        return { isSafe: false, error: 'Địa chỉ IP đích thuộc mạng nội bộ hoặc bị cấm mất tiêu rồi (SSRF Protection) (´・ω・`)' }
      }
    }
  } catch {
    if (net.isIP(hostname) && isPrivateIP(hostname)) {
      return { isSafe: false, error: 'Địa chỉ IP đích bị cấm rồi nha (SSRF Protection) (´・ω・`)' }
    }
  }
  return { isSafe: true, parsedUrl }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để làm điều này nha! (◕‿◕✿)' }, { status: 401 })
    }

    const body = await req.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL không hợp lệ rồi, thử lại nhé! (´・ω・`)' }, { status: 400 })
    }

    let currentUrl = url
    let redirectsCount = 0
    const maxRedirects = 5
    let response: Response | null = null

    while (redirectsCount <= maxRedirects) {
      const { isSafe, parsedUrl, error } = await isSafeUrl(currentUrl)
      if (!isSafe || !parsedUrl) {
        return NextResponse.json({ error: error || 'URL không an toàn rồi (´・ω・`)' }, { status: 403 })
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      try {
        response = await fetch(parsedUrl.href, {
          method: 'GET',
          headers: {
            'User-Agent': 'MochiLife-Importer/1.0',
            'Accept': 'text/csv, application/json, text/plain, */*',
          },
          signal: controller.signal,
          redirect: 'manual', // Chặn auto redirect để tự xử lý
        })
      } catch (err: any) {
        clearTimeout(timeoutId)
        throw err
      }

      clearTimeout(timeoutId)

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) {
          return NextResponse.json({ error: 'URL chuyển hướng bị lỗi mất rồi (´・ω・`)' }, { status: 400 })
        }
        
        // Handle relative redirects
        currentUrl = new URL(location, parsedUrl.href).href
        redirectsCount++
        continue
      }
      
      break // Không phải redirect
    }

    if (redirectsCount > maxRedirects) {
      return NextResponse.json({ error: 'URL chuyển hướng quá nhiều lần, Mochi chóng mặt quá! (@_@)' }, { status: 400 })
    }

    if (!response || !response.ok) {
      return NextResponse.json({ error: `Mochi tải dữ liệu thất bại rồi: HTTP status ${response?.status} (´・ω・\`)` }, { status: 400 })
    }

    const contentLength = response.headers.get('content-length')
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      return NextResponse.json({ error: 'Dung lượng file lớn hơn 5MB, Mochi mang không nổi! (╥﹏╥)' }, { status: 400 })
    }

    if (!response.body) {
      return NextResponse.json({ error: 'Không đọc được dữ liệu từ URL này nha (´・ω・`)' }, { status: 400 })
    }

    // Đọc theo chunk để kiểm soát dung lượng thực tế
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let contentText = ''
    let loadedSize = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      loadedSize += value.length
      if (loadedSize > maxSize) {
        await reader.cancel()
        return NextResponse.json({ error: 'Nội dung file quá lớn (tối đa 5MB), Mochi đành bỏ cuộc! (╥﹏╥)' }, { status: 400 })
      }
      
      contentText += decoder.decode(value, { stream: true })
    }
    contentText += decoder.decode() // flush còn lại

    return NextResponse.json({
      success: true,
      content: contentText,
      contentType: response.headers.get('content-type') || 'text/plain',
    })

  } catch (error: any) {
    // Log lỗi thật ở server side để debug
    console.error('[Import URL Error]:', error)
    
    // Trả về lỗi dễ thương cho client
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Đợi lâu quá, Mochi hết kiên nhẫn rồi (Timeout 10s)! ᕙ( •̀ ᗜ •́ )ᕗ' }, { status: 408 })
    }
    return NextResponse.json({ error: 'Có lỗi bất ngờ khi kết nối, Mochi đang kiểm tra lại nhé! (´・ω・`)' }, { status: 500 })
  }
}
