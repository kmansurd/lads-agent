import { NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/api/errors';
import { withCanvasRoute } from '@/lib/api/withCanvasRoute';
import { getCourseTabSummary, type StorytellerTab } from '@/lib/canvas/tabSummary';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ courseId: string }> };

export async function GET(request: Request, { params }: Params) {
  return withCanvasRoute(request, async () => {
    try {
      const { courseId } = await params;
      const tab = (new URL(request.url).searchParams.get('tab') ??
        'grades') as StorytellerTab;
      const summary = await getCourseTabSummary(courseId, tab);
      return NextResponse.json({ summary });
    } catch (error) {
      return handleRouteError(error);
    }
  });
}
