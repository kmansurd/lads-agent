import { HKUST_GENAI_API_KEY_HEADER } from '@/lib/genai/config';
import { canvasAuthHeaders } from '@/lib/client/canvasTokenStorage';

const STORAGE_KEY = 'lads.hkustGenAi.apiKey';

export function readStoredGenAiApiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

export function writeStoredGenAiApiKey(apiKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = apiKey.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Private mode — key stays in session memory only.
  }
}

export function storytellerRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = { ...canvasAuthHeaders() };
  const apiKey = readStoredGenAiApiKey();
  if (apiKey) {
    headers[HKUST_GENAI_API_KEY_HEADER] = apiKey;
  }
  return headers;
}

export function fetchWithStorytellerAuth(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(storytellerRequestHeaders())) {
    headers.set(key, value);
  }
  return fetch(input, { ...init, headers });
}
