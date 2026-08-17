import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../lib/auth-context'
import { queryKeys } from '../lib/query-keys'
import type { ThinkingMode } from '@mochi/shared'

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_MOCHI_API_URL ||
  'https://mochi-life-z7pj-delta.vercel.app'
).replace(/\/$/, '')

const STORAGE_KEY_THINKING_MODE = '@mochi_ai_thinking_mode'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  thinkingMode?: ThinkingMode
  domainsUsed?: string[]
  isError?: boolean
  errorDetail?: string
  canRetry?: boolean
}

export interface DailyBriefData {
  summary: string
  highlights: Array<{
    type: string
    title: string
    description: string
  }>
  recommendation: string
  isAiGenerated: boolean
}

export function useAI() {
  const { session } = useAuth()
  const token = session?.access_token
  const userId = session?.user?.id

  // 1. Thinking Mode State & Persistence
  const [thinkingMode, setThinkingModeState] = useState<ThinkingMode>('balanced')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_THINKING_MODE).then(savedMode => {
      if (savedMode === 'fast' || savedMode === 'balanced' || savedMode === 'deep') {
        setThinkingModeState(savedMode)
      }
    })
  }, [])

  const setThinkingMode = useCallback((mode: ThinkingMode) => {
    setThinkingModeState(mode)
    AsyncStorage.setItem(STORAGE_KEY_THINKING_MODE, mode).catch(() => {})
  }, [])

  // 2. Fetch Mochi Daily Brief
  const briefQuery = useQuery({
    queryKey: queryKeys.dailyBrief(userId),
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/ai/daily-brief`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) {
        throw new Error(`Daily brief failed (${res.status})`)
      }
      return (await res.json()) as DailyBriefData
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  })

  // 3. Chat Messages State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Chào bạn! Mochi là trợ lý đồng hành của bạn. Bạn muốn hỏi về sức khỏe, tiếng Trung hay tài chính hôm nay nè? 🐱✨',
      created_at: new Date().toISOString(),
    },
  ])

  const [isReplying, setIsReplying] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 4. Send Message Function with Full Error Handling & Retry
  const sendMessage = useCallback(
    async (messageText: string, retryMode?: ThinkingMode) => {
      if (!messageText.trim() || !token) return

      const activeMode = retryMode || thinkingMode

      // Cancel any ongoing in-flight AI request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      const controller = new AbortController()
      abortControllerRef.current = controller

      const userMsgId = `user-${Date.now()}`
      const userMsg: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: messageText.trim(),
        created_at: new Date().toISOString(),
        thinkingMode: activeMode,
      }

      setMessages(prev => [...prev, userMsg])
      setIsReplying(true)

      // Build history for context (exclude errors and initial welcome greeting)
      const validHistory = messages
        .filter(m => !m.isError && m.id !== 'welcome')
        .map(m => ({
          role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
          content: m.content,
        }))

      try {
        const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageText.trim(),
            history: validHistory,
            thinkingMode: activeMode,
          }),
        })

        if (!res.ok) {
          const errorJson = await res.json().catch(() => ({}))
          let friendlyError = 'Mochi AI đang gặp sự cố. Bạn vui lòng thử lại nhé!'

          if (res.status === 401) {
            friendlyError = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          } else if (res.status === 429) {
            friendlyError =
              errorJson.error ||
              'Mochi đang bận xử lý nhiều câu hỏi. Bạn vui lòng đợi 30 giây rồi thử lại nha! 🐱⏳'
          } else if (res.status >= 500) {
            friendlyError = 'Máy chủ AI tạm thời gián đoạn. Bạn thử bấm "Thử lại" nhé.'
          } else if (errorJson.error) {
            friendlyError = errorJson.error
          }

          const errorMsg: ChatMessage = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: friendlyError,
            created_at: new Date().toISOString(),
            isError: true,
            canRetry: true,
            errorDetail: `HTTP ${res.status}`,
          }
          setMessages(prev => [...prev, errorMsg])
          return
        }

        const data = await res.json()
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: data.message || 'Mochi đã tiếp nhận câu hỏi của bạn!',
          created_at: new Date().toISOString(),
          thinkingMode: data.thinkingMode || activeMode,
          domainsUsed: data.domainsUsed,
        }

        setMessages(prev => [...prev, botMsg])
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return // User aborted or sent new query
        }

        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content:
            'Không thể kết nối đến Mochi AI. Bạn vui lòng kiểm tra kết nối mạng và thử lại nhé! 📶🐱',
          created_at: new Date().toISOString(),
          isError: true,
          canRetry: true,
          errorDetail: err.message,
        }
        setMessages(prev => [...prev, errorMsg])
      } finally {
        setIsReplying(false)
        abortControllerRef.current = null
      }
    },
    [token, thinkingMode, messages]
  )

  // 5. Retry Last Failed User Message
  const retryLastMessage = useCallback(() => {
    // Find the last user message
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMsg) {
      // Remove trailing error messages
      setMessages(prev => prev.filter(m => !m.isError))
      sendMessage(lastUserMsg.content, lastUserMsg.thinkingMode)
    }
  }, [messages, sendMessage])

  return {
    dailyBrief: briefQuery.data,
    briefLoading: briefQuery.isLoading,
    refetchBrief: briefQuery.refetch,
    thinkingMode,
    setThinkingMode,
    messages,
    sendMessage,
    retryLastMessage,
    isReplying,
  }
}
