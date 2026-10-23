import { NextResponse } from 'next/server';
import { GenAiApiError } from '@/lib/genai/client';
import { MissingGenAiAuthError, requireGenAiApiKey, resolveGenAiBaseUrl } from '@/lib/genai/config';
import {
  DEFAULT_STORYTELLER_MODEL,
  labelForModelId,
  STORYTELLER_MODEL_OPTIONS,
} from '@/lib/genai/models';

export const dynamic = 'force-dynamic';

type ModelsResponse = {
  data?: { id?: string }[];
};

export async function GET(request: Request) {
  try {
    const apiKey = requireGenAiApiKey(request);
    const baseUrl = resolveGenAiBaseUrl();
    const res = await fetch(`${baseUrl}/models`, {
      headers: { 'api-key': apiKey },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({
        models: STORYTELLER_MODEL_OPTIONS,
        defaultModel: DEFAULT_STORYTELLER_MODEL,
        source: 'curated',
      });
    }

    const body = (await res.json()) as ModelsResponse;
    const ids = (body.data ?? [])
      .map((m) => m.id?.trim())
      .filter((id): id is string => Boolean(id));

    const curatedIds = new Set(STORYTELLER_MODEL_OPTIONS.map((m) => m.id));
    const merged = [...STORYTELLER_MODEL_OPTIONS];
    for (const id of ids) {
      if (!curatedIds.has(id)) {
        merged.push({ id, label: labelForModelId(id) });
      }
    }

    return NextResponse.json({
      models: merged,
      defaultModel: DEFAULT_STORYTELLER_MODEL,
      source: 'gateway',
    });
  } catch (error) {
    if (error instanceof MissingGenAiAuthError) {
      return NextResponse.json({
        models: STORYTELLER_MODEL_OPTIONS,
        defaultModel: DEFAULT_STORYTELLER_MODEL,
        source: 'curated',
      });
    }
    if (error instanceof GenAiApiError) {
      return NextResponse.json({
        models: STORYTELLER_MODEL_OPTIONS,
        defaultModel: DEFAULT_STORYTELLER_MODEL,
        source: 'curated',
      });
    }
    return NextResponse.json({
      models: STORYTELLER_MODEL_OPTIONS,
      defaultModel: DEFAULT_STORYTELLER_MODEL,
      source: 'curated',
    });
  }
}
