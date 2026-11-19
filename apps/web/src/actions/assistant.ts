'use server';

import type { AssistantReply } from '@dari/contracts';
import { api } from '@/lib/api';
import { toActionError } from '@/lib/action-result';
import { config } from '@/lib/config';

export async function askAssistant(message: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<AssistantReply | { error: string }> {
  try {
    return await api<AssistantReply>('/assistant', { method: 'POST', body: { city: config.city, message, history: history.slice(-6) } });
  } catch (err) {
    return { error: toActionError(err).error ?? 'تعذر الوصول للمساعد' };
  }
}
