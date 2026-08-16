'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/use-user'
import { toast } from 'sonner'
import type { ThinkingMode } from '@/lib/ai/types'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  domainsUsed?: string[]
}

const QUICK_PROMPTS = [
  { label: 'Hôm nay nên học gì?', emoji: '📚', text: 'Hôm nay tui nên học gì?' },
  { label: 'Tiến độ giảm cân', emoji: '⚖️', text: 'Dạo này tui giảm cân thế nào?' },
  { label: 'Chi tiêu tháng này', emoji: '💰', text: 'Tháng này tui tiêu tiền thế nào rồi?' },
  { label: 'Đánh giá hôm nay', emoji: '✨', text: 'Đánh giá tổng quan hôm nay cho tui với!' },
  { label: 'Động viên tui chút', emoji: '💪', text: 'Nói gì đó động viên tui đi Mochi!' },
]

export default function MochiAIPage() {
  const { user, profile, loading: userLoading } = useUser()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [thinkingMode, setThinkingMode] = useState<ThinkingMode>('balanced')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load saved thinking mode preference
  useEffect(() => {
    const savedMode = localStorage.getItem('mochi-ai-thinking-mode') as ThinkingMode | null
    if (savedMode && ['fast', 'balanced', 'deep'].includes(savedMode)) {
      setThinkingMode(savedMode)
    }
  }, [])

  const handleThinkingModeChange = (mode: ThinkingMode) => {
    setThinkingMode(mode)
    localStorage.setItem('mochi-ai-thinking-mode', mode)
    const labels: Record<ThinkingMode, string> = {
      fast: '⚡ Đã chuyển sang chế độ Siêu tốc (Tắt suy nghĩ, phản hồi nhanh nhất)',
      balanced: '⚖️ Đã chuyển sang chế độ Cân bằng (Dynamic Thinking)',
      deep: '🧠 Đã chuyển sang chế độ Suy luận sâu (Phân tích chuyên sâu & logic cao)',
    }
    toast.success(labels[mode])
  }

  // Initial welcome message
  useEffect(() => {
    if (profile && messages.length === 0) {
      const name = profile.display_name?.split(' ').slice(-1)[0] ?? 'bạn'
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Chào ${name}! 🐱 Mochi đây! Hôm nay mình có thể giúp gì cho bạn? Bạn có thể hỏi về tiến độ học tiếng Trung, giảm cân, chi tiêu hoặc nhờ Mochi đánh giá tổng quan nhé! ✨`,
          timestamp: Date.now(),
        },
      ])
    }
  }, [profile, messages.length])

  // Auto scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim()
    if (!text || loading) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const apiHistory = messages
        .filter(m => m.id !== 'welcome' && !m.id.startsWith('error-') && !m.content.startsWith('😿'))
        .map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }))

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: apiHistory,
          thinkingMode,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi gọi Mochi AI')
      }

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: Date.now(),
        domainsUsed: data.domainsUsed,
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      toast.error(err.message || 'Mochi AI chưa phản hồi được, thử lại sau nhé!')
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `😿 ${err.message || 'Mochi đang gặp chút sự cố kết nối, bạn thử hỏi lại lần nữa nhé!'}`,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (userLoading) {
    return (
      <div className="ai-page-loading">
        <span className="animate-float" style={{ fontSize: '3rem' }}>🐱</span>
        <p>Mochi đang chuẩn bị...</p>
      </div>
    )
  }

  return (
    <div className="ai-page">
      {/* Header */}
      <div className="ai-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => router.back()} aria-label="Quay lại">
            ←
          </button>
          <span className="mascot-icon animate-float">🐱</span>
          <div>
            <h1 className="ai-title">Mochi AI Coach</h1>
            <p className="ai-status">● Đang hoạt động • Gemini 3.7</p>
          </div>
        </div>

        {/* Thinking Mode Pill Selector */}
        <div className="thinking-controls">
          <span className="thinking-label">Chế độ:</span>
          <div className="thinking-pills">
            <button
              type="button"
              className={`pill-btn ${thinkingMode === 'fast' ? 'active fast' : ''}`}
              onClick={() => handleThinkingModeChange('fast')}
              title="⚡ Siêu tốc: Phản hồi tức thì, không tốn thời gian suy nghĩ"
            >
              ⚡ Siêu tốc
            </button>
            <button
              type="button"
              className={`pill-btn ${thinkingMode === 'balanced' ? 'active balanced' : ''}`}
              onClick={() => handleThinkingModeChange('balanced')}
              title="⚖️ Cân bằng: Tự động điều chỉnh suy luận (Mặc định)"
            >
              ⚖️ Cân bằng
            </button>
            <button
              type="button"
              className={`pill-btn ${thinkingMode === 'deep' ? 'active deep' : ''}`}
              onClick={() => handleThinkingModeChange('deep')}
              title="🧠 Suy luận sâu: Phân tích kỹ số liệu, logic đa bước"
            >
              🧠 Suy luận sâu
            </button>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="chat-messages">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`message-row ${msg.role === 'user' ? 'user-row' : 'assistant-row'}`}
          >
            {msg.role === 'assistant' && (
              <div className="avatar">🐱</div>
            )}

            <div className={`message-bubble ${msg.role}`}>
              <div className="message-content">{msg.content}</div>
              <div className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="avatar user-avatar">
                {profile?.display_name ? profile.display_name[0].toUpperCase() : '👤'}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="message-row assistant-row">
            <div className="avatar">🐱</div>
            <div className="message-bubble assistant loading-bubble">
              <div className="typing-dots">
                <span />
                <span />
                <span />
              </div>
              <span className="typing-text">
                {thinkingMode === 'deep'
                  ? 'Mochi đang suy luận và phân tích sâu... 🧠💭'
                  : thinkingMode === 'fast'
                  ? 'Mochi đang phản hồi siêu tốc... ⚡'
                  : 'Mochi đang suy nghĩ... 🐱✨'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="quick-prompts-container">
        <div className="quick-prompts-scroll">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              className="quick-prompt-btn"
              onClick={() => handleSend(prompt.text)}
              disabled={loading}
            >
              <span>{prompt.emoji}</span> {prompt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder="Hỏi Mochi điều gì đó... (Enter để gửi, Shift+Enter xuống dòng)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={1}
          />
          <button
            className="send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
          >
            🚀
          </button>
        </div>
      </div>

      <style jsx>{`
        .ai-page {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          height: calc(100vh - 120px);
          position: relative;
        }

        .ai-page-loading {
          min-height: 60vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: var(--chocolate-500);
          font-weight: 600;
        }

        .ai-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: white;
          border-radius: 20px;
          box-shadow: var(--shadow-sm);
          border: 1.5px solid var(--chocolate-100);
          margin-bottom: 12px;
          gap: 12px;
          flex-wrap: wrap;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .thinking-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .thinking-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--chocolate-400);
        }

        .thinking-pills {
          display: flex;
          background: var(--cream);
          padding: 3px;
          border-radius: 999px;
          border: 1px solid var(--chocolate-100);
          gap: 2px;
        }

        .pill-btn {
          border: none;
          background: transparent;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 0.76rem;
          font-weight: 700;
          color: var(--chocolate-400);
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .pill-btn:hover:not(.active) {
          color: var(--chocolate-600);
          background: rgba(255, 255, 255, 0.6);
        }

        .pill-btn.active {
          background: white;
          box-shadow: 0 2px 6px rgba(45, 30, 20, 0.08);
        }

        .pill-btn.active.fast {
          color: #D97706;
          font-weight: 800;
        }

        .pill-btn.active.balanced {
          color: #3BB88E;
          font-weight: 800;
        }

        .pill-btn.active.deep {
          color: #8F71F5;
          font-weight: 800;
        }


        .back-btn {
          background: var(--cream);
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--chocolate-600);
          transition: transform 0.15s;
        }

        .back-btn:hover {
          transform: translateX(-2px);
        }

        .mascot-icon {
          font-size: 2rem;
        }

        .ai-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--chocolate-600);
          margin: 0;
          line-height: 1.2;
        }

        .ai-status {
          font-size: 0.75rem;
          color: #3BB88E;
          font-weight: 700;
          margin: 2px 0 0;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: white;
          border-radius: 24px;
          border: 1.5px solid var(--chocolate-100);
          box-shadow: var(--shadow-sm);
          margin-bottom: 12px;
        }

        .message-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }

        .user-row {
          justify-content: flex-end;
        }

        .assistant-row {
          justify-content: flex-start;
        }

        .avatar {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          background: var(--cream);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          flex-shrink: 0;
          border: 1px solid var(--chocolate-100);
        }

        .user-avatar {
          background: var(--cheese-200);
          font-weight: 800;
          color: var(--chocolate-600);
          font-size: 1rem;
        }

        .message-bubble {
          max-width: 75%;
          padding: 14px 18px;
          border-radius: 20px;
          font-size: 0.95rem;
          line-height: 1.5;
          position: relative;
          word-break: break-word;
        }

        .message-bubble.assistant {
          background: var(--cream);
          color: var(--chocolate-600);
          border-bottom-left-radius: 4px;
          border: 1px solid var(--chocolate-100);
        }

        .message-bubble.user {
          background: var(--chocolate-500);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .message-content {
          white-space: pre-wrap;
        }

        .message-time {
          font-size: 0.65rem;
          margin-top: 4px;
          opacity: 0.6;
          text-align: right;
        }

        .loading-bubble {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
        }

        .typing-dots {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .typing-dots span {
          width: 8px;
          height: 8px;
          background: var(--chocolate-400);
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
        .typing-dots span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        .typing-text {
          font-size: 0.85rem;
          color: var(--chocolate-400);
          font-weight: 600;
        }

        .quick-prompts-container {
          margin-bottom: 12px;
          overflow: hidden;
        }

        .quick-prompts-scroll {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: none;
        }

        .quick-prompts-scroll::-webkit-scrollbar {
          display: none;
        }

        .quick-prompt-btn {
          white-space: nowrap;
          padding: 8px 14px;
          background: white;
          border: 1.5px solid var(--chocolate-100);
          border-radius: 16px;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--chocolate-600);
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .quick-prompt-btn:hover:not(:disabled) {
          background: var(--cheese-100);
          transform: translateY(-1px);
          border-color: var(--cheese-300);
        }

        .chat-input-area {
          background: white;
          border-radius: 24px;
          padding: 10px 14px;
          border: 1.5px solid var(--chocolate-100);
          box-shadow: var(--shadow-sm);
        }

        .input-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }

        .chat-textarea {
          flex: 1;
          border: none;
          outline: none;
          resize: none;
          font-family: inherit;
          font-size: 0.95rem;
          color: var(--chocolate-600);
          max-height: 120px;
          line-height: 1.4;
          background: transparent;
        }

        .send-btn {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          background: var(--chocolate-500);
          color: white;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .send-btn:hover:not(:disabled) {
          background: var(--chocolate-600);
          transform: scale(1.05);
        }

        .send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .ai-page {
            height: calc(100vh - 140px);
          }
          .ai-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
            padding: 12px 16px;
          }
          .thinking-controls {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .thinking-pills {
            flex: 1;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
          }
          .pill-btn {
            padding: 5px 4px;
            font-size: 0.7rem;
            text-align: center;
          }
          .message-bubble {
            max-width: 85%;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  )
}
