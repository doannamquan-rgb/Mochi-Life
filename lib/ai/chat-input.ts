import type { MochiChatMessage, ThinkingMode } from './types'

const MAX_REQUEST_BYTES = 128 * 1024
const MAX_HISTORY_MESSAGES = 24
const MAX_MESSAGE_LENGTH = 8_000
const MAX_TOTAL_HISTORY_LENGTH = 80_000

export type ChatInputResult =
  | { success: true; data: { userMessage: string; history: MochiChatMessage[]; thinkingMode?: ThinkingMode } }
  | { success: false; error: string }

export function validateChatInput(value: unknown): ChatInputResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { success: false, error: 'Yêu cầu trò chuyện không hợp lệ.' }
  }

  const body = value as Record<string, unknown>
  if (typeof body.message !== 'string' || !body.message.trim()) {
    return { success: false, error: 'Vui lòng nhập nội dung câu hỏi.' }
  }
  const userMessage = body.message.trim()
  if (userMessage.length > MAX_MESSAGE_LENGTH) {
    return { success: false, error: `Câu hỏi tối đa ${MAX_MESSAGE_LENGTH} ký tự.` }
  }

  const rawHistory = body.history ?? []
  if (!Array.isArray(rawHistory) || rawHistory.length > MAX_HISTORY_MESSAGES) {
    return { success: false, error: `Lịch sử trò chuyện tối đa ${MAX_HISTORY_MESSAGES} tin nhắn.` }
  }

  const history: MochiChatMessage[] = []
  let totalHistoryLength = 0
  for (const item of rawHistory) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { success: false, error: 'Lịch sử trò chuyện không hợp lệ.' }
    }
    const message = item as Record<string, unknown>
    if (
      (message.role !== 'user' && message.role !== 'assistant') ||
      typeof message.content !== 'string' ||
      message.content.trim().length === 0 ||
      message.content.length > MAX_MESSAGE_LENGTH ||
      (message.timestamp !== undefined && typeof message.timestamp !== 'number')
    ) {
      return { success: false, error: 'Tin nhắn trong lịch sử không hợp lệ.' }
    }
    totalHistoryLength += message.content.length
    if (totalHistoryLength > MAX_TOTAL_HISTORY_LENGTH) {
      return { success: false, error: 'Lịch sử trò chuyện vượt quá giới hạn dung lượng.' }
    }
    history.push({
      role: message.role,
      content: message.content,
      timestamp: typeof message.timestamp === 'number' ? message.timestamp : 0,
    })
  }

  const mode = body.thinkingMode
  if (mode !== undefined && mode !== 'fast' && mode !== 'balanced' && mode !== 'deep') {
    return { success: false, error: 'Chế độ suy luận không hợp lệ.' }
  }

  return {
    success: true,
    data: {
      userMessage,
      history,
      thinkingMode: mode as ThinkingMode | undefined,
    },
  }
}

export { MAX_REQUEST_BYTES }
