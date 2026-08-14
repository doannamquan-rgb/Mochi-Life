import { GoogleGenAI } from '@google/genai';
import type { MochiChatMessage } from './types';

let genAIClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  if (genAIClient) return genAIClient;
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  
  genAIClient = new GoogleGenAI({ apiKey });
  return genAIClient;
}

export function isAIEnabled(): boolean {
  return process.env.MOCHI_AI_ENABLED === 'true' && !!process.env.GEMINI_API_KEY;
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.7-flash';

// ─── Timeout Constants ────────────────────────────────────────────────────────
const CHAT_TIMEOUT_MS = 30000;
const DAILY_BRIEF_TIMEOUT_MS = 30000;
const REACTION_TIMEOUT_MS = 20000;

/**
 * Creates an AbortController + setTimeout pair that properly cleans up.
 * Uses native @google/genai abortSignal support (v2.16.0+).
 * Returns { signal, cleanup } — caller MUST call cleanup() in finally block.
 */
function createTimeoutAbort(timeoutMs: number): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}

/**
 * Checks if an error is a timeout/abort error from the SDK or AbortController.
 */
function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.includes('aborted') || error.message.includes('abort');
  }
  return false;
}

export async function generateChatResponse(systemPrompt: string, messages: MochiChatMessage[], userMessage: string): Promise<string> {
  const client = getGeminiClient();
  if (!client || !isAIEnabled()) {
    throw new Error('AI is disabled or no API key provided');
  }

  const { signal, cleanup } = createTimeoutAbort(CHAT_TIMEOUT_MS);

  try {
    const formattedMessages = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));
    
    formattedMessages.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const response = await client.models.generateContent({
      model: DEFAULT_MODEL,
      contents: formattedMessages,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        abortSignal: signal,
        httpOptions: { timeout: CHAT_TIMEOUT_MS },
      },
    });

    return response.text ?? '';
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw new Error('Mochi AI đang bận quá, bạn thử lại sau chút nhé! 🐱💤');
    }
    throw new Error('GEMINI_ERROR: Failed to generate chat response');
  } finally {
    cleanup();
  }
}

export async function generateDailyBriefResponse(systemPrompt: string, context: string): Promise<string> {
  const client = getGeminiClient();
  if (!client || !isAIEnabled()) {
    throw new Error('AI is disabled or no API key provided');
  }

  const { signal, cleanup } = createTimeoutAbort(DAILY_BRIEF_TIMEOUT_MS);

  try {
    const response = await client.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [{ role: 'user', parts: [{ text: context }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        responseMimeType: 'application/json',
        abortSignal: signal,
        httpOptions: { timeout: DAILY_BRIEF_TIMEOUT_MS },
      }
    });

    return response.text ?? '';
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw new Error('Mochi AI đang bận quá, bạn thử lại sau chút nhé! 🐱💤');
    }
    throw new Error('GEMINI_ERROR: Failed to generate daily brief');
  } finally {
    cleanup();
  }
}

export async function generateReactionResponse(systemPrompt: string, context: string): Promise<string> {
  const client = getGeminiClient();
  if (!client || !isAIEnabled()) {
    throw new Error('AI is disabled or no API key provided');
  }

  const { signal, cleanup } = createTimeoutAbort(REACTION_TIMEOUT_MS);

  try {
    const response = await client.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [{ role: 'user', parts: [{ text: context }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.6,
        responseMimeType: 'application/json',
        abortSignal: signal,
        httpOptions: { timeout: REACTION_TIMEOUT_MS },
      }
    });

    return response.text ?? '';
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw new Error('Mochi AI đang bận quá, bạn thử lại sau chút nhé! 🐱💤');
    }
    throw new Error('GEMINI_ERROR: Failed to generate reaction');
  } finally {
    cleanup();
  }
}
