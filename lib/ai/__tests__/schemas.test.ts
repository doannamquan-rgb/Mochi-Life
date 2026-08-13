import { describe, it, expect } from 'vitest'
import { validateDailyBrief, validateChatResponse, DailyBriefSchema } from '../schemas'

describe('Zod Schema Validation Tests', () => {
  it('validates correct DailyBrief JSON structure', () => {
    const validBrief = {
      summary: 'Hôm nay bạn có 12 từ cần ôn và 1 buổi tập.',
      highlights: [
        { type: 'study', title: 'Học tập', description: '12 từ đến hạn ôn tập' },
        { type: 'fitness', title: 'Giảm cân', description: 'Tập 1 buổi tuần này' },
      ],
      recommendation: 'Hãy ưu tiên ôn 12 từ trước khi bắt đầu bài mới.',
    }

    const result = validateDailyBrief(validBrief)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.summary).toBe(validBrief.summary)
      expect(result.data.highlights.length).toBe(2)
    }
  })

  it('rejects invalid DailyBrief JSON missing required fields', () => {
    const invalidBrief = {
      summary: 'Thiếu highlights và recommendation',
    }

    const result = validateDailyBrief(invalidBrief)
    expect(result.success).toBe(false)
  })

  it('rejects DailyBrief JSON with invalid highlight type enum', () => {
    const invalidEnumBrief = {
      summary: 'Invalid highlight type',
      highlights: [
        { type: 'invalid_type_enum', title: 'Lỗi', description: 'Lỗi enum' },
      ],
      recommendation: 'Thử lại',
    }

    const result = validateDailyBrief(invalidEnumBrief)
    expect(result.success).toBe(false)
  })

  it('validates ChatResponse JSON', () => {
    const validChat = { message: 'Chào bạn! Mochi có thể giúp gì?' }
    const result = validateChatResponse(validChat)
    expect(result.success).toBe(true)
  })
})
