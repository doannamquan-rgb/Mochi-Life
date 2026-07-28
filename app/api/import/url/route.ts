import { NextRequest, NextResponse } from 'next/server'
import dns from 'dns/promises'
import net from 'net'

function isPrivateIP(ip: string): boolean {
  if (!net.isIP(ip)) return false

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
    const normalized = ip.toLowerCase()
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true
    if (normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) return true
  }

  return false
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL không hợp lệ' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Định dạng URL không hợp lệ' }, { status: 400 })
    }

    // Protocol check
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Chỉ hỗ trợ giao thức HTTP hoặc HTTPS' }, { status: 400 })
    }

    const hostname = parsedUrl.hostname

    // Block obvious local hostnames
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return NextResponse.json({ error: 'Không được phép truy cập địa chỉ nội bộ (SSRF Protection)' }, { status: 403 })
    }

    // Resolve DNS to check underlying IP
    try {
      const resolvedIps = await dns.resolve(hostname)
      for (const ip of resolvedIps) {
        if (isPrivateIP(ip)) {
          return NextResponse.json({ error: 'Địa chỉ IP đích thuộc mạng nội bộ hoặc bị cấm (SSRF Protection)' }, { status: 403 })
        }
      }
    } catch {
      // DNS resolution failed or skipped for direct IP
      if (net.isIP(hostname) && isPrivateIP(hostname)) {
        return NextResponse.json({ error: 'Địa chỉ IP đích bị cấm (SSRF Protection)' }, { status: 403 })
      }
    }

    // Fetch with timeout and strict options (No credentials forwarded)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(parsedUrl.href, {
      method: 'GET',
      headers: {
        'User-Agent': 'MochiLife-Importer/1.0',
        'Accept': 'text/csv, application/json, text/plain, */*',
      },
      signal: controller.signal,
      redirect: 'follow',
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json({ error: `Tải từ URL thất bại: HTTP status ${response.status}` }, { status: 400 })
    }

    // Check size limit (max 5MB)
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Dung lượng file vượt quá giới hạn 5MB' }, { status: 400 })
    }

    const contentText = await response.text()

    if (contentText.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Nội dung file quá lớn (tối đa 5MB)' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      content: contentText,
      contentType: response.headers.get('content-type') || 'text/plain',
    })
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Yêu cầu tải dữ liệu hết thời gian (Timeout 10s)' }, { status: 408 })
    }
    return NextResponse.json({ error: error.message || 'Lỗi khi kết nối đến URL' }, { status: 500 })
  }
}
