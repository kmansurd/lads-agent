/** HKUST GenAI gateway (OpenAI-compatible). See ITSO GenAI API service docs. */
export const DEFAULT_HKUST_GENAI_BASE_URL = 'https://hkust.azure-api.net/hkust-genai/v1';

export const HKUST_GENAI_API_KEY_HEADER = 'X-HKUST-GenAI-Api-Key';

export class MissingGenAiAuthError extends Error {
  constructor() {
    super(
      'HKUST GenAI API key required. Subscribe at the HKUST API Developer Portal, then paste your key under Settings.',
    );
    this.name = 'MissingGenAiAuthError';
  }
}

export function resolveGenAiBaseUrl(): string {
  const fromEnv = process.env.HKUST_GENAI_BASE_URL?.trim();
  return (fromEnv || DEFAULT_HKUST_GENAI_BASE_URL).replace(/\/$/, '');
}

export function resolveGenAiModel(): string {
  return process.env.HKUST_GENAI_MODEL?.trim() || 'gpt-4o-mini';
}

export function resolveGenAiModelFromBody(requested?: string | null): string {
  const trimmed = requested?.trim();
  if (trimmed) return trimmed;
  return resolveGenAiModel();
}

export function resolveGenAiApiKeyFromRequest(request: Request): string | null {
  const headerKey = request.headers.get(HKUST_GENAI_API_KEY_HEADER)?.trim();
  const envKey = process.env.HKUST_GENAI_API_KEY?.trim();
  return headerKey || envKey || null;
}

export function requireGenAiApiKey(request: Request): string {
  const key = resolveGenAiApiKeyFromRequest(request);
  if (!key) {
    throw new MissingGenAiAuthError();
  }
  return key;
}
