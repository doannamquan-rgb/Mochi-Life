import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
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
    // 2. Auth check server-side (Dual Cookie + Bearer)
    const { user, supabase } = await getAuthenticatedUser(request)

    if (!user || !supabase) {
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
    const thinkingMode: string | undefined = typeof body.thinkingMode === 'string' ? body.thinkingMode : undefined

    if (!userMessage) {
      return NextResponse.json(
        { error: 'Vui lòng nhập nội dung câu hỏi.', code: 'INVALID_REQUEST' },
        { status: 400 }
      )
    }

    // Map thinkingMode to budget: 'fast' -> 0 (disabled), 'deep' -> 8192, 'balanced' -> undefined (dynamic)
    let thinkingBudget: number | undefined = undefined
    if (thinkingMode === 'fast') {
      thinkingBudget = 0
    } else if (thinkingMode === 'deep') {
      thinkingBudget = 8192
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
    const replyText = await generateChatResponse(systemPrompt, history, userMessage, { thinkingBudget })

    return NextResponse.json({
      message: replyText,
      domainsUsed: domains,
      thinkingMode: thinkingMode || 'balanced',
    })
  } catch (err: any) {
    console.error('[Mochi AI Chat Error]:', err)
    let message = 'Mochi chưa xử lý được câu trả lời này. Bạn có thể thử lại.'

    if (err?.message && typeof err.message === 'string') {
      if (err.message.includes('Mochi AI đang bận') || err.message.includes('Mochi phản hồi')) {
        message = err.message
      } else if (err.message.includes('Timeout') || err.message.includes('timeout')) {
        message = 'Mochi phản hồi hơi lâu, bạn thử lại lần nữa nhé!'
      } else if (err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('429') || err.message.includes('Quota')) {
        message = 'Mochi AI đang nhận được quá nhiều câu hỏi cùng lúc, bạn đợi một lát rồi thử lại nha! 🐱⏳'
      }
    }

    return NextResponse.json(
      { error: message, code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
