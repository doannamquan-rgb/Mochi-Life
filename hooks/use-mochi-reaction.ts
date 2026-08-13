'use client'

import { useCallback, useRef } from 'react'
import { toast } from 'sonner'
import type { MochiReactionEvent } from '@/lib/ai/reactions/types'

type TriggerReactionOptions = {
  /** Optional dedup key — same event+key won't fire twice in the same browser session */
  dedupKey?: string
  /** Delay before calling the API (ms). Allows the insert to settle. Default: 300ms */
  delayMs?: number
  /** Silent mode: don't show a toast, just fire the callback if provided */
  onReaction?: (reaction: import('@/lib/ai/reactions/types').MochiReaction) => void
}

/**
 * Hook to trigger a Mochi Smart Reaction after a successful user action.
 *
 * Usage:
 *   const { triggerReaction } = useMochiReaction()
 *   // After successful save:
 *   triggerReaction('exercise_logged')
 *
 * Rules:
 * - Uses sessionStorage to deduplicate within the same tab/session
 * - Gemini failure is silent — deterministic fallback shown instead
 * - Never blocks or delays the UI — fire-and-forget after save
 */
export function useMochiReaction() {
  const pendingRef = useRef<Set<string>>(new Set())

  const triggerReaction = useCallback(
    async (eventType: MochiReactionEvent, options: TriggerReactionOptions = {}) => {
      const { dedupKey, delayMs = 300, onReaction } = options

      // Deduplication: avoid double-firing for the same event in the same session
      const dedupStorageKey = `mochi_reaction_${eventType}_${dedupKey ?? 'default'}`
      if (dedupKey) {
        const alreadyFired = sessionStorage.getItem(dedupStorageKey)
        if (alreadyFired) return
        sessionStorage.setItem(dedupStorageKey, '1')
      }

      // Prevent concurrent duplicate calls
      if (pendingRef.current.has(eventType)) return
      pendingRef.current.add(eventType)

      // Small delay — let the DB write settle before server reads it back
      if (delayMs > 0) {
        await new Promise<void>(resolve => setTimeout(resolve, delayMs))
      }

      try {
        const res = await fetch('/api/ai/reaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType }),
        })

        if (!res.ok) {
          // Rate limited or error — fail silently
          if (res.status === 429) {
            console.debug('[MochiReaction] Rate limited, skipping reaction toast')
          }
          return
        }

        const data = await res.json()
        const reaction = data.reaction as import('@/lib/ai/reactions/types').MochiReaction

        if (!reaction) return

        if (onReaction) {
          onReaction(reaction)
          return
        }

        // Show as a styled toast
        showReactionToast(reaction)
      } catch (err) {
        // Network error — fail completely silently
        console.debug('[MochiReaction] Failed to fetch reaction:', err)
      } finally {
        pendingRef.current.delete(eventType)
      }
    },
    []
  )

  return { triggerReaction }
}

function showReactionToast(reaction: import('@/lib/ai/reactions/types').MochiReaction) {
  const toneConfig: Record<string, { icon: string }> = {
    celebrate:     { icon: '🎉' },
    encourage:     { icon: '✨' },
    gentle_nudge:  { icon: '💡' },
    informative:   { icon: '🐱' },
    welcome_back:  { icon: '🌸' },
    milestone:     { icon: '🏆' },
  }

  const { icon } = toneConfig[reaction.tone] ?? { icon: '🐱' }

  const description = [
    reaction.message,
    reaction.highlight ? `• ${reaction.highlight}` : null,
    reaction.nextAction ? `→ ${reaction.nextAction}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  toast(
    `${icon} ${reaction.title}`,
    {
      description,
      duration: 6000,
      // The toast uses Sonner's rich content — no action needed
      className: 'mochi-reaction-toast',
    }
  )
}
