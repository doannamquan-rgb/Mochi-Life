import { z } from 'zod'
import type { MochiReaction } from './types'

export const ReactionToneSchema = z.enum([
  'celebrate',
  'encourage',
  'gentle_nudge',
  'informative',
  'welcome_back',
  'milestone',
])

export const MochiReactionSchema = z.object({
  title: z.string().max(80),
  message: z.string().max(600),
  tone: ReactionToneSchema,
  highlight: z.string().max(120).nullable(),
  nextAction: z.string().max(180).nullable(),
})

export type MochiReactionOutput = z.infer<typeof MochiReactionSchema>

export function validateReaction(
  data: unknown
): { success: true; data: MochiReactionOutput } | { success: false; error: z.ZodError } {
  const result = MochiReactionSchema.safeParse(data)
  if (result.success) return { success: true, data: result.data }
  return { success: false, error: result.error }
}
