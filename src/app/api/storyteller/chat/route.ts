import { NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/api/errors';
import { withCanvasRoute } from '@/lib/api/withCanvasRoute';
import { getCourseTabSummary, type StorytellerTab } from '@/lib/canvas/tabSummary';
import { createChatCompletion, GenAiApiError, type ChatMessage } from '@/lib/genai/client';
import { MissingGenAiAuthError, requireGenAiApiKey, resolveGenAiModelFromBody } from '@/lib/genai/config';
import { buildStorytellerSystemPrompt } from '@/lib/storyteller/systemPrompt';

export const dynamic = 'force-dynamic';

const VALID_TABS = new Set<StorytellerTab>([
  'overview',
  'grades',
  'engagement',
  'students',
  'discussions',
]);

type ClientMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatBody = {
  messages?: ClientMessage[];
  tab?: StorytellerTab;
  courseId?: string | null;
  courseLabel?: string | null;
  model?: string | null;
  engagementCsvSummary?: string | null;
};

const MAX_HISTORY = 16;

export async function POST(request: Request) {
  try {
    const apiKey = requireGenAiApiKey(request);
    const body = (await request.json()) as ChatBody;
    const tab = body.tab && VALID_TABS.has(body.tab) ? body.tab : 'overview';
    const courseId = body.courseId?.trim() || null;
    const courseLabel = body.courseLabel?.trim() || null;

    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const history: ChatMessage[] = rawMessages
      .filter(
        (m): m is ClientMessage =>
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0,
      )
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content.trim() }));

    if (history.length === 0 || history[history.length - 1].role !== 'user') {
      return NextResponse.json({ error: 'Last message must be a user question.' }, { status: 400 });
    }

    let courseSummary: string | null = null;
    if (courseId) {
      const summaryResponse = await withCanvasRoute(request, async () => {
        const summary = await getCourseTabSummary(courseId, tab);
        return NextResponse.json({ summary });
      });
      if (summaryResponse.ok) {
        const data = (await summaryResponse.json()) as { summary?: string };
        courseSummary = typeof data.summary === 'string' ? data.summary : null;
      }
    }

    const engagementCsvSummary =
      tab === 'engagement' ? body.engagementCsvSummary?.trim() || null : null;

    const systemPrompt = buildStorytellerSystemPrompt({
      tab,
      courseLabel,
      courseSummary,
      engagementCsvSummary,
    });

    const model = resolveGenAiModelFromBody(body.model);

    const reply = await createChatCompletion(
      apiKey,
      [{ role: 'system', content: systemPrompt }, ...history],
      model,
    );

    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof MissingGenAiAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof GenAiApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
      );
    }
    return handleRouteError(error);
  }
}
