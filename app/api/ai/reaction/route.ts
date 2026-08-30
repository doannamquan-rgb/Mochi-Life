import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { checkRateLimit } from '@/lib/ai/rate-limit'
import { generateSmartReaction } from '@/lib/ai/reactions/engine'
import type { MochiReactionEvent } from '@/lib/ai/reactions/types'
import { z } from 'zod'

const VALID_EVENTS: MochiReactionEvent[] = [
  'exercise_logged',
  'weight_logged',
  'transaction_expense_created',
  'transaction_income_created',
  'study_session_completed',
  'review_session_completed',
]

const RequestBodySchema = z.object({
  eventType: z.enum([
    'exercise_logged',
    'weight_logged',
    'transaction_expense_created',
    'transaction_income_created',
    'study_session_completed',
    'review_session_completed',
  ]),
})

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    // 1. Auth — server-side (Dual Cookie + Bearer)
    const { user, supabase } = await getAuthenticatedUser(req)

    if (!user || !supabase) {
      return NextResponse.json(
        { error: 'AUTH_ERROR', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Parse and validate request body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const parsed = RequestBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid eventType', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { eventType } = parsed.data

    // 3. Rate limit check (generous — 30/hr)
    const rateCheck = checkRateLimit(user.id, 'reaction')
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'Too many reaction requests',
          retryAfter: rateCheck.retryAfter,
        },
        {
          status: 429,
          headers: rateCheck.retryAfter
            ? { 'Retry-After': String(rateCheck.retryAfter) }
            : undefined,
        }
      )
    }

    // 4. Generate reaction (deterministic facts + optional Gemini)
    //    This never writes any user data — read-only AI principle.
    const reaction = await generateSmartReaction(supabase, user.id, eventType)

    return NextResponse.json({ reaction }, { status: 200 })
  } catch (err) {
    console.error('[/api/ai/reaction] Unhandled error:', err)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to generate reaction' },
      { status: 500 }
    )
  }
}
