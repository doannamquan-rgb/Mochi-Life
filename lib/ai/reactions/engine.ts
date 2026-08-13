import type { SupabaseClient } from '@supabase/supabase-js'
import type { MochiReactionEvent, ReactionFacts, MochiReaction } from './types'
import { buildExerciseReactionFacts, buildWeightReactionFacts } from './fitness'
import { buildStudyReactionFacts } from './study'
import { buildFinanceReactionFacts } from './finance'
import { buildFallbackReaction } from './fallback'
import { MOCHI_REACTION_SYSTEM_PROMPT, buildReactionContext } from './prompts'
import { validateReaction } from './schemas'
import { generateReactionResponse, isAIEnabled } from '@/lib/ai/client'

/**
 * Orchestrates the full Smart Reaction flow:
 * 1. Build ReactionFacts deterministically (server-side, under RLS)
 * 2. If AI enabled: generate Gemini reaction
 * 3. Validate with Zod
 * 4. Fallback to deterministic reaction if AI fails or is disabled
 */
export async function generateSmartReaction(
  supabase: SupabaseClient,
  userId: string,
  eventType: MochiReactionEvent
): Promise<MochiReaction> {
  // Step 1: Build deterministic facts
  const facts = await buildReactionFacts(supabase, userId, eventType)
  if (!facts) {
    return buildEmptyReaction(eventType)
  }

  // Step 2: Try Gemini if enabled
  if (isAIEnabled()) {
    try {
      const context = buildReactionContext(facts)
      const raw = await generateReactionResponse(MOCHI_REACTION_SYSTEM_PROMPT, context)

      // Parse JSON response
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        throw new Error('Invalid JSON from Gemini')
      }

      const validation = validateReaction(parsed)
      if (!validation.success) {
        throw new Error('Gemini response failed schema validation')
      }

      return {
        eventType,
        ...validation.data,
        generatedBy: 'gemini',
      }
    } catch (err) {
      // Silently fall through to deterministic fallback
      console.warn('[MochiReaction] Gemini failed, using fallback:', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Step 3: Deterministic fallback
  return buildFallbackReaction(facts)
}

async function buildReactionFacts(
  supabase: SupabaseClient,
  userId: string,
  eventType: MochiReactionEvent
): Promise<ReactionFacts | null> {
  switch (eventType) {
    case 'exercise_logged':
      return buildExerciseReactionFacts(supabase, userId)

    case 'weight_logged':
      return buildWeightReactionFacts(supabase, userId)

    case 'study_session_completed':
    case 'review_session_completed':
      return buildStudyReactionFacts(supabase, userId, eventType)

    case 'transaction_expense_created':
      return buildFinanceReactionFacts(supabase, userId, 'expense')

    case 'transaction_income_created':
      return buildFinanceReactionFacts(supabase, userId, 'income')
  }
}

function buildEmptyReaction(eventType: MochiReactionEvent): MochiReaction {
  return {
    eventType,
    title: 'Đã ghi nhận 🐱',
    message: 'Mochi đã ghi lại hoạt động của bạn thành công!',
    tone: 'informative',
    highlight: null,
    nextAction: null,
    generatedBy: 'fallback',
  }
}
