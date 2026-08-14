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

export async function generateChatResponse(systemPrompt: string, messages: MochiChatMessage[], userMessage: string): Promise<string> {
  const client = getGeminiClient();
  if (!client || !isAIEnabled()) {
    throw new Error('AI is disabled or no API key provided');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

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
      },
    });

    return response.text ?? '';
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Timeout while generating chat response');
    }
    throw new Error('GEMINI_ERROR: Failed to generate chat response');
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateDailyBriefResponse(systemPrompt: string, context: string): Promise<string> {
  const client = getGeminiClient();
  if (!client || !isAIEnabled()) {
    throw new Error('AI is disabled or no API key provided');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await client.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [{ role: 'user', parts: [{ text: context }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        responseMimeType: 'application/json',
      }
    });

    return response.text ?? '';
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Timeout while generating daily brief response');
    }
    throw new Error('GEMINI_ERROR: Failed to generate daily brief');
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateReactionResponse(systemPrompt: string, context: string): Promise<string> {
  const client = getGeminiClient();
  if (!client || !isAIEnabled()) {
    throw new Error('AI is disabled or no API key provided');
  }

  // 20s timeout — shorter than chat since this is a background post-action call
  const timeout = setTimeout(() => { /* no-op — no AbortController for now */ }, 20000);

  try {
    const response = await client.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [{ role: 'user', parts: [{ text: context }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.6,
        responseMimeType: 'application/json',
      }
    });

    return response.text ?? '';
  } catch (error: any) {
    throw new Error('GEMINI_ERROR: Failed to generate reaction');
  } finally {
    clearTimeout(timeout);
  }
}
