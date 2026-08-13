import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAIEnabled, generateChatResponse } from '@/lib/ai/client'
import { checkRateLimit } from '@/lib/ai/rate-limit'
import { detectContextDomains, buildContextForDomains } from '@/lib/ai/context'
import { buildChatSystemPrompt } from '@/lib/ai/prompts'
import type { MochiChatMessage } from '@/lib/ai/types'

export async function POST(request: Request) {
  // 1. Feature flag check
  if (!isAIEnabled()) {
    return NextResponse.json(
      { error: 'Mochi AI chưa được cấu hình hoặc đang bị tắt.', code: 'AI_DISABLED' },
      { status: 503 }
    )
  }

  try {
    // 2. Auth check server-side
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Bạn cần đăng nhập để trò chuyện với Mochi.', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // 3. Rate limit check
    const rateCheck = checkRateLimit(user.id, 'chat')
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Mochi đang hơi bận. Bạn vui lòng đợi ${rateCheck.retryAfter ?? 60} giây trước khi gửi thêm câu hỏi nhé.`,
          code: 'RATE_LIMITED',
          retryAfter: rateCheck.retryAfter,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfter ?? 60) },
        }
      )
    }

    // 4. Parse & validate request body
    const body = await request.json().catch(() => ({}))
    const userMessage = typeof body.message === 'string' ? body.message.trim() : ''
    const history: MochiChatMessage[] = Array.isArray(body.history) ? body.history : []

    if (!userMessage) {
      return NextResponse.json(
        { error: 'Vui lòng nhập nội dung câu hỏi.', code: 'INVALID_REQUEST' },
        { status: 400 }
      )
    }

    // 5. Fetch user profile for display name
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('display_name, active_hsk_course_id')
      .eq('user_id', user.id)
      .maybeSingle()

    // 6. Detect context domain & build context
    const domains = detectContextDomains(userMessage)
    const aiContext = await buildContextForDomains(supabase, user.id, domains, {
      display_name: profile?.display_name,
    })

    // 7. Build system prompt & call Gemini
    const systemPrompt = buildChatSystemPrompt(aiContext)
    const replyText = await generateChatResponse(systemPrompt, history, userMessage)

    return NextResponse.json({
      message: replyText,
      domainsUsed: domains,
    })
  } catch (err: any) {
    console.error('[Mochi AI Chat Error]:', err)
    const message = err?.message?.includes('Timeout')
      ? 'Mochi phản hồi hơi lâu, bạn thử lại lần nữa nhé!'
      : 'Mochi chưa xử lý được câu trả lời này. Bạn có thể thử lại.'

    return NextResponse.json(
      { error: message, code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
