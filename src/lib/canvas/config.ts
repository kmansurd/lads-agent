const CANVAS_API_PATH = /^\/api\/v\d+\/?$/;

/** Default Canvas REST base when not set in Settings or server env. */
export const DEFAULT_CANVAS_API_URL = 'https://canvas.ust.hk/api/v1';

export type CanvasConfig = {
  baseUrl: string;
  token: string;
};

export function normalizeCanvasApiUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '');
}

export function validateCanvasApiUrl(baseUrl: string): void {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error(
      'CANVAS_API_URL must be a valid URL ending with /api/v1 (e.g. https://canvas.instructure.com/api/v1)',
    );
  }

  if (!CANVAS_API_PATH.test(url.pathname)) {
    throw new Error(
      'CANVAS_API_URL must end with /api/v1 (e.g. https://canvas.instructure.com/api/v1). Paths like /api/v without a version number are not valid.',
    );
  }
}

/** Header sent from the browser; never logged or persisted server-side. */
export const CANVAS_ACCESS_TOKEN_HEADER = 'X-Canvas-Access-Token';
export const CANVAS_API_URL_HEADER = 'X-Canvas-Api-Url';

function resolveBaseUrlFromRequest(request: Request): string {
  const headerUrl = request.headers.get(CANVAS_API_URL_HEADER)?.trim();
  const envUrl = process.env.CANVAS_API_URL?.trim();
  const baseUrl = normalizeCanvasApiUrl(
    headerUrl || envUrl || DEFAULT_CANVAS_API_URL,
  );
  validateCanvasApiUrl(baseUrl);
  return baseUrl;
}

export function resolveCanvasConfigFromRequest(request: Request): CanvasConfig | null {
  let baseUrl: string;
  try {
    baseUrl = resolveBaseUrlFromRequest(request);
  } catch {
    return null;
  }

  const headerToken = request.headers.get(CANVAS_ACCESS_TOKEN_HEADER)?.trim();
  const envToken = process.env.CANVAS_API_TOKEN?.trim();
  const token = headerToken || envToken;
  if (!token) {
    return null;
  }

  return { baseUrl, token };
}

export function getEnvCanvasConfig(): CanvasConfig | null {
  const envUrl = process.env.CANVAS_API_URL?.trim();
  const token = process.env.CANVAS_API_TOKEN?.trim();

  if (!token) {
    return null;
  }

  const baseUrl = normalizeCanvasApiUrl(envUrl || DEFAULT_CANVAS_API_URL);
  validateCanvasApiUrl(baseUrl);

  return { baseUrl, token };
}
