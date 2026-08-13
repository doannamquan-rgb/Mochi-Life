import { z } from 'zod';

export const DailyBriefSchema = z.object({
  summary: z.string(),
  highlights: z.array(z.object({
    type: z.enum(['study', 'fitness', 'finance', 'calendar', 'motivation', 'general']),
    title: z.string(),
    description: z.string()
  })),
  recommendation: z.string()
});

export type DailyBrief = z.infer<typeof DailyBriefSchema>;

export const ChatResponseSchema = z.object({
  message: z.string()
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export function validateDailyBrief(data: unknown): { success: true; data: DailyBrief } | { success: false; error: z.ZodError } {
  const result = DailyBriefSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function validateChatResponse(data: unknown): { success: true; data: ChatResponse } | { success: false; error: z.ZodError } {
  const result = ChatResponseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
