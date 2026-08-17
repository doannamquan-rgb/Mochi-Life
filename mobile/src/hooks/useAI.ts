import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '../lib/auth-context'

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_MOCHI_API_URL ||
  'http://localhost:3000'
).replace(/\/$/, '')

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  domainsUsed?: string[]
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

  // 1. Fetch Mochi Daily Brief
  const briefQuery = useQuery({
    queryKey: ['daily-brief', session?.user?.id],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/ai/daily-brief`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) {
        throw new Error(`Daily brief failed with status ${res.status}`)
      }
      return (await res.json()) as DailyBriefData
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  })

  // 2. AI Chat State & Mutation
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Chào bạn! Mochi là trợ lý đồng hành của bạn. Bạn muốn hỏi về sức khỏe, tiếng Trung hay tài chính hôm nay nè? 🐱✨',
      created_at: new Date().toISOString(),
    },
  ])

  const chatMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: messageText,
        created_at: new Date().toISOString(),
      }

      setMessages(prev => [...prev, userMsg])

      const history = messages.map(m => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        content: m.content,
      }))

      const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          history,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Lỗi AI (${res.status})`)
      }

      const data = await res.json()
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        created_at: new Date().toISOString(),
        domainsUsed: data.domainsUsed,
      }

      setMessages(prev => [...prev, botMsg])
      return botMsg
    },
  })

  return {
    dailyBrief: briefQuery.data,
    briefLoading: briefQuery.isLoading,
    messages,
    sendMessage: chatMutation.mutateAsync,
    isReplying: chatMutation.isPending,
  }
}
