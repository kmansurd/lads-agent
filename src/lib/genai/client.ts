import { resolveGenAiBaseUrl, resolveGenAiModel } from '@/lib/genai/config';

export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export class GenAiApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GenAiApiError';
    this.status = status;
  }
}

type ChatCompletionResponse = {
  choices?: { message?: { content?: string | null } }[];
  error?: { message?: string };
};

export async function createChatCompletion(
  apiKey: string,
  messages: ChatMessage[],
  model?: string,
): Promise<string> {
  const baseUrl = resolveGenAiBaseUrl();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      model: model ?? resolveGenAiModel(),
      messages,
      temperature: 0.35,
    }),
  });

  let body: ChatCompletionResponse;
  try {
    body = (await res.json()) as ChatCompletionResponse;
  } catch {
    throw new GenAiApiError('GenAI returned a non-JSON response.', res.status || 502);
  }

  if (!res.ok) {
    const detail = body.error?.message ?? `GenAI request failed (${res.status}).`;
    throw new GenAiApiError(detail, res.status);
  }

  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new GenAiApiError('GenAI returned an empty completion.', 502);
  }

  return text;
}
