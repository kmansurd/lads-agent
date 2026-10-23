import { DEFAULT_STORYTELLER_MODEL } from '@/lib/genai/models';

const STORAGE_KEY = 'lads.storyteller.model';

export function readStoredStorytellerModel(): string {
  if (typeof window === 'undefined') return DEFAULT_STORYTELLER_MODEL;
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() || DEFAULT_STORYTELLER_MODEL;
  } catch {
    return DEFAULT_STORYTELLER_MODEL;
  }
}

export function writeStoredStorytellerModel(model: string): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = model.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}
