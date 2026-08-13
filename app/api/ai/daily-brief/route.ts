import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAIEnabled, generateDailyBriefResponse } from '@/lib/ai/client'
import { checkRateLimit } from '@/lib/ai/rate-limit'
import { buildContextForDomains } from '@/lib/ai/context'
import { generateDeterministicInsights } from '@/lib/ai/insights'
import { MOCHI_DAILY_BRIEF_PROMPT } from '@/lib/ai/prompts'
import { validateDailyBrief } from '@/lib/ai/schemas'

export async function GET(request: Request) {
  try {
    // 1. Auth check server-side
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Bạn cần đăng nhập để xem Mochi Daily Brief.', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // 2. Fetch user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle()

    // 3. Build full context (all domains) & deterministic insights
    const aiContext = await buildContextForDomains(supabase, user.id, ['general'], {
      display_name: profile?.display_name,
    })
    const deterministicInsights = generateDeterministicInsights(aiContext)

    // Default fallback brief payload (deterministic)
    const fallbackBrief = {
      summary: `Hôm nay là một ngày tuyệt vời để hoàn thành các mục tiêu của bạn, ${profile?.display_name?.split(' ').slice(-1)[0] ?? 'bạn'}! 🐱`,
      highlights: deterministicInsights.slice(0, 4).map(insight => ({
        type: insight.type,
        title: insight.title,
        description: insight.description,
      })),
      recommendation: deterministicInsights.length > 0
        ? deterministicInsights[0].description
        : 'Hãy tiếp tục duy trì thói quen học tập và rèn luyện sức khỏe mỗi ngày nhé!',
      insights: deterministicInsights,
      isAiGenerated: false,
    }

    // 4. If AI is disabled or rate limited, return deterministic fallback
    if (!isAIEnabled()) {
      return NextResponse.json(fallbackBrief)
    }

    const rateCheck = checkRateLimit(user.id, 'brief')
    if (!rateCheck.allowed) {
      return NextResponse.json(fallbackBrief)
    }

    // 5. Generate AI brief
    try {
      const contextString = JSON.stringify(aiContext, null, 2)
      const aiResponseRaw = await generateDailyBriefResponse(MOCHI_DAILY_BRIEF_PROMPT, contextString)
      
      let parsedJson: unknown
      try {
        // Strip code block markers if model wraps json in ```json ... ```
        const cleaned = aiResponseRaw.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim()
        parsedJson = JSON.parse(cleaned)
      } catch {
        parsedJson = null
      }

      if (parsedJson) {
        const validated = validateDailyBrief(parsedJson)
        if (validated.success) {
          return NextResponse.json({
            ...validated.data,
            insights: deterministicInsights,
            isAiGenerated: true,
          })
        }
      }
    } catch (aiErr) {
      console.warn('[Mochi AI Daily Brief Warning]: AI brief generation failed, using deterministic fallback', aiErr)
    }

    // Fallback to deterministic brief if AI generation or validation fails
    return NextResponse.json(fallbackBrief)
  } catch (err: any) {
    console.error('[Mochi Daily Brief Route Error]:', err)
    return NextResponse.json(
      { error: 'Không thể tải Mochi Daily Brief', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
