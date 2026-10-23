import type { StorytellerTab } from '@/lib/canvas/tabSummary';

const TAB_LABELS: Record<StorytellerTab, string> = {
  overview: 'Overview',
  grades: 'Gradebook',
  engagement: 'Engagement',
  students: 'Students',
  discussions: 'Discussions',
};

export function buildStorytellerSystemPrompt(options: {
  tab: StorytellerTab;
  courseLabel: string | null;
  courseSummary: string | null;
  engagementCsvSummary?: string | null;
}): string {
  const tabName = TAB_LABELS[options.tab] ?? options.tab;
  const courseLine = options.courseLabel
    ? `Selected course: ${options.courseLabel}.`
    : 'No course is selected yet.';

  const canvasBlock = options.courseSummary
    ? `Canvas REST / API snapshot:\n${options.courseSummary}`
    : null;

  const csvBlock =
    options.engagementCsvSummary?.trim() ?
      `Uploaded Canvas New Analytics CSV data (treat as authoritative for Engagement questions when present):\n${options.engagementCsvSummary.trim()}`
    : null;

  const dataBlock =
    [csvBlock, canvasBlock].filter(Boolean).join('\n\n') ||
    'No live Canvas snapshot is available yet (missing course or Canvas token). On Engagement, upload chart.csv and resources.csv for CSV-backed answers.';

  return [
    'You are the Learning Analytics Data Storyteller (LADS) for instructors and teaching staff at HKUST.',
    'Help them interpret dashboard views, spot patterns, and decide sensible follow-ups—without inventing numbers or student names.',
    'If the snapshot does not contain a fact, say you do not have it and suggest where to look in the UI.',
    'Be concise (2–5 short paragraphs or a tight bullet list). Use plain language; avoid jargon where possible.',
    `The user is on the "${tabName}" tab.`,
    courseLine,
    dataBlock,
  ].join('\n\n');
}
