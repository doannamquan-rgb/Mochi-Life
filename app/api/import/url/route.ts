import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { fetchPinnedUrl, isPrivateIP, resolvePublicAddress } from '@/lib/import-url-security'

export { isPrivateIP }

export async function isSafeUrl(
  urlStr: string,
  resolveAddress: typeof resolvePublicAddress = resolvePublicAddress
): Promise<{ isSafe: boolean, parsedUrl?: URL, address?: { address: string; family: number }, error?: string }> {
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
    const address = await resolveAddress(hostname)
    return { isSafe: true, parsedUrl, address }
  } catch {
    return { isSafe: false, error: 'Không thể xác minh địa chỉ IP công khai của URL này (SSRF Protection) (´・ω・`)' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    
    if (!user) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để làm điều này nha! (◕‿◕✿)' }, { status: 401 })
    }

    const body: unknown = await req.json().catch(() => null)
    const url = body && typeof body === 'object' && 'url' in body ? body.url : null

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL không hợp lệ rồi, thử lại nhé! (´・ω・`)' }, { status: 400 })
    }

    let currentUrl = url
    let redirectsCount = 0
    const maxRedirects = 5
    let response: Response | null = null
    let activeTimeout: ReturnType<typeof setTimeout> | undefined

    while (redirectsCount <= maxRedirects) {
      const { isSafe, parsedUrl, address, error } = await isSafeUrl(currentUrl)
      if (!isSafe || !parsedUrl || !address) {
        return NextResponse.json({ error: error || 'URL không an toàn rồi (´・ω・`)' }, { status: 403 })
      }

      const controller = new AbortController()
      activeTimeout = setTimeout(() => controller.abort(), 10000)

      try {
        response = await fetchPinnedUrl(parsedUrl, address, controller.signal)
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location')
          if (!location) {
            clearTimeout(activeTimeout)
            return NextResponse.json({ error: 'URL chuyển hướng bị lỗi mất rồi (´・ω・`)' }, { status: 400 })
          }
          currentUrl = new URL(location, parsedUrl.href).href
          redirectsCount++
          await response.body?.cancel()
          clearTimeout(activeTimeout)
          activeTimeout = undefined
          continue
        }

        break
      } catch (error) {
        clearTimeout(activeTimeout)
        activeTimeout = undefined
        throw error
      }
    }

    if (redirectsCount > maxRedirects) {
      clearTimeout(activeTimeout)
      return NextResponse.json({ error: 'URL chuyển hướng quá nhiều lần, Mochi chóng mặt quá! (@_@)' }, { status: 400 })
    }

    if (!response || !response.ok) {
      clearTimeout(activeTimeout)
      return NextResponse.json({ error: `Mochi tải dữ liệu thất bại rồi: HTTP status ${response?.status} (´・ω・\`)` }, { status: 400 })
    }

    const contentLength = response.headers.get('content-length')
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      clearTimeout(activeTimeout)
      return NextResponse.json({ error: 'Dung lượng file lớn hơn 5MB, Mochi mang không nổi! (╥﹏╥)' }, { status: 400 })
    }

    if (!response.body) {
      clearTimeout(activeTimeout)
      return NextResponse.json({ error: 'Không đọc được dữ liệu từ URL này nha (´・ω・`)' }, { status: 400 })
    }

    // Đọc theo chunk để kiểm soát dung lượng thực tế
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let contentText = ''
    let loadedSize = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        loadedSize += value.byteLength
        if (loadedSize > maxSize) {
          await reader.cancel()
          return NextResponse.json({ error: 'Nội dung file quá lớn (tối đa 5MB), Mochi đành bỏ cuộc! (╥﹏╥)' }, { status: 400 })
        }
        contentText += decoder.decode(value, { stream: true })
      }
      contentText += decoder.decode()
    } catch (error) {
      await reader.cancel().catch(() => undefined)
      clearTimeout(activeTimeout)
      activeTimeout = undefined
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json({ error: 'Đợi lâu quá, Mochi hết kiên nhẫn rồi (Timeout 10s)! ᕙ( •̀ ᗜ •́ )ᕗ' }, { status: 408 })
      }
      throw error
    } finally {
      clearTimeout(activeTimeout)
    }

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
