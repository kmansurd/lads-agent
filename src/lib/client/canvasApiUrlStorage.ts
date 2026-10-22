import {
  DEFAULT_CANVAS_API_URL,
  normalizeCanvasApiUrl,
  validateCanvasApiUrl,
} from '@/lib/canvas/config';

const STORAGE_KEY = 'lads.canvas.apiUrl';

export function readStoredCanvasApiUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_CANVAS_API_URL;
  try {
    const stored = localStorage.getItem(STORAGE_KEY)?.trim();
    if (!stored) return DEFAULT_CANVAS_API_URL;
    return normalizeCanvasApiUrl(stored);
  } catch {
    return DEFAULT_CANVAS_API_URL;
  }
}

export function writeStoredCanvasApiUrl(apiUrl: string): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized = normalizeCanvasApiUrl(apiUrl);
    validateCanvasApiUrl(normalized);
    if (normalized === DEFAULT_CANVAS_API_URL) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, normalized);
    }
  } catch {
    // Invalid URL or blocked storage — caller should validate before save.
  }
}
