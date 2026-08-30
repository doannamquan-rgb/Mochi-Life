import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../lib/auth-context'
import { colors, radius, typography, spacing } from '../theme/tokens'
import type { MochiReactionEvent } from '@mochi/shared'

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_MOCHI_API_URL ||
  'https://mochi-life-z7pj-delta.vercel.app'
).replace(/\/$/, '')

export interface MochiReaction {
  title: string
  message: string
  highlight?: string
  nextAction?: string
  tone: 'celebrate' | 'encourage' | 'gentle_nudge' | 'informative' | 'welcome_back' | 'milestone'
}

interface ReactionContextType {
  triggerReaction: (eventType: MochiReactionEvent, options?: { delayMs?: number }) => Promise<void>
  showReaction: (reaction: MochiReaction) => void
}

const ReactionContext = createContext<ReactionContextType | undefined>(undefined)

export function ReactionProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const insets = useSafeAreaInsets()
  const [currentReaction, setCurrentReaction] = useState<MochiReaction | null>(null)
  const translateYRef = useRef(new Animated.Value(-150))
  const opacityRef = useRef(new Animated.Value(0))
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingEventsRef = useRef<Set<string>>(new Set())

  const dismissToast = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    Animated.parallel([
      Animated.timing(translateYRef.current, {
        toValue: -150,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityRef.current, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentReaction(null)
    })
  }, [translateYRef, opacityRef])

  const showReaction = useCallback(
    (reaction: MochiReaction) => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      setCurrentReaction(reaction)

      translateYRef.current.setValue(-100)
      opacityRef.current.setValue(0)

      Animated.parallel([
        Animated.spring(translateYRef.current, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 9,
        }),
        Animated.timing(opacityRef.current, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start()

      hideTimerRef.current = setTimeout(() => {
        dismissToast()
      }, 5500)
    },
    [dismissToast, translateYRef, opacityRef]
  )

  const triggerReaction = useCallback(
    async (eventType: MochiReactionEvent, options?: { delayMs?: number }) => {
      const token = session?.access_token
      if (!token) return

      if (pendingEventsRef.current.has(eventType)) return
      pendingEventsRef.current.add(eventType)

      const delay = options?.delayMs ?? 400
      if (delay > 0) {
        await new Promise<void>(resolve => setTimeout(resolve, delay))
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/ai/reaction`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ eventType }),
        })

        if (!res.ok) return

        const data = await res.json()
        if (data?.reaction) {
          showReaction(data.reaction)
        }
      } catch {
        // Fire-and-forget: fail silently
      } finally {
        pendingEventsRef.current.delete(eventType)
      }
    },
    [session?.access_token, showReaction]
  )

  const getToneEmoji = (tone?: string) => {
    switch (tone) {
      case 'celebrate': return '🎉'
      case 'milestone': return '🏆'
      case 'gentle_nudge': return '💡'
      case 'welcome_back': return '🌸'
      case 'encourage': return '✨'
      default: return '🐱'
    }
  }

  return (
    <ReactionContext.Provider value={{ triggerReaction, showReaction }}>
      {children}
      {currentReaction && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              top: Math.max(insets.top + 8, 20),
              // eslint-disable-next-line react-hooks/refs -- Animated.Value is an imperative handle, not a render value
              transform: [{ translateY: translateYRef.current }],
              // eslint-disable-next-line react-hooks/refs -- same as above
              opacity: opacityRef.current,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={dismissToast}
            style={styles.toastCard}
          >
            <View style={styles.toastHeader}>
              <Text style={styles.toastIcon}>{getToneEmoji(currentReaction.tone)}</Text>
              <Text style={styles.toastTitle}>{currentReaction.title}</Text>
            </View>
            <Text style={styles.toastMessage}>{currentReaction.message}</Text>
            {currentReaction.highlight ? (
              <Text style={styles.toastHighlight}>• {currentReaction.highlight}</Text>
            ) : null}
            {currentReaction.nextAction ? (
              <Text style={styles.toastNextAction}>👉 {currentReaction.nextAction}</Text>
            ) : null}
          </TouchableOpacity>
        </Animated.View>
      )}
    </ReactionContext.Provider>
  )
}

export function useMochiReaction() {
  const context = useContext(ReactionContext)
  if (!context) {
    throw new Error('useMochiReaction must be used within a ReactionProvider')
  }
  return context
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    elevation: 999,
  },
  toastCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cheese,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  toastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  toastIcon: {
    fontSize: 20,
  },
  toastTitle: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.chocolate,
    flex: 1,
  },
  toastMessage: {
    ...typography.bodySmall,
    color: colors.chocolateLight,
    lineHeight: 18,
  },
  toastHighlight: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolate,
    marginTop: 4,
  },
  toastNextAction: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.mintDark,
    marginTop: 2,
  },
})
