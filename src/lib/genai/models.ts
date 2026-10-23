export const DEFAULT_STORYTELLER_MODEL = 'gpt-4o-mini';

/** Curated HKUST GenAI models for the picker (gateway also exposes more via /models). */
export const STORYTELLER_MODEL_OPTIONS: { id: string; label: string }[] = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini (fast, low cost)' },
  { id: 'gpt-4o', label: 'GPT-4o (strong reasoning)' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { id: 'gpt-5-mini', label: 'GPT-5 mini' },
  { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna (chatbots)' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { id: 'deepseek/deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
  { id: 'qwen/qwen3.8-flash', label: 'Qwen 3.8 Flash' },
];

export function labelForModelId(id: string): string {
  return STORYTELLER_MODEL_OPTIONS.find((m) => m.id === id)?.label ?? id;
}
