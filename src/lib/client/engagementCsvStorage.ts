import {
  parseCanvasExportDate,
  type ChartCsvRow,
  type ResourceCsvRow,
} from '@/lib/client/canvasAnalyticsCsv';

const STORAGE_KEY = 'lads.engagement.csv';

export type StoredEngagementCsv = {
  activityTab: 'api' | 'csv';
  chartRows: ChartCsvRow[];
  chartFileName: string;
  resourceRows: ResourceCsvRow[];
  resourceFileName: string;
  chartFilter: string;
};

type SerializedChartRow = {
  weekStartLabel: string;
  weekStartIso: string | null;
  filter: string;
  pageViews: number;
  participations: number;
};

type SerializedStore = Record<
  string,
  {
    activityTab: 'api' | 'csv';
    chartRows: SerializedChartRow[];
    chartFileName: string;
    resourceRows: ResourceCsvRow[];
    resourceFileName: string;
    chartFilter: string;
  }
>;

function serializeChartRows(rows: ChartCsvRow[]): SerializedChartRow[] {
  return rows.map((row) => ({
    weekStartLabel: row.weekStartLabel,
    weekStartIso: row.weekStart ? row.weekStart.toISOString() : null,
    filter: row.filter,
    pageViews: row.pageViews,
    participations: row.participations,
  }));
}

function deserializeChartRows(rows: SerializedChartRow[]): ChartCsvRow[] {
  return rows.map((row) => ({
    weekStartLabel: row.weekStartLabel,
    weekStart:
      row.weekStartIso != null
        ? new Date(row.weekStartIso)
        : parseCanvasExportDate(row.weekStartLabel),
    filter: row.filter,
    pageViews: row.pageViews,
    participations: row.participations,
  }));
}

function readStore(): SerializedStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as SerializedStore;
  } catch {
    return {};
  }
}

function writeStore(store: SerializedStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // quota
  }
}

export function readStoredEngagementCsv(courseId: string | null): StoredEngagementCsv | null {
  if (!courseId) return null;
  const entry = readStore()[courseId];
  if (!entry) return null;
  return {
    activityTab: entry.activityTab,
    chartRows: deserializeChartRows(entry.chartRows ?? []),
    chartFileName: entry.chartFileName ?? '',
    resourceRows: entry.resourceRows ?? [],
    resourceFileName: entry.resourceFileName ?? '',
    chartFilter: entry.chartFilter ?? 'All Sections',
  };
}

export function writeStoredEngagementCsv(
  courseId: string | null,
  data: StoredEngagementCsv,
): void {
  if (!courseId) return;
  const store = readStore();
  const hasChart = data.chartRows.length > 0;
  const hasResources = data.resourceRows.length > 0;
  if (!hasChart && !hasResources && data.activityTab === 'api') {
    delete store[courseId];
  } else {
    store[courseId] = {
      activityTab: data.activityTab,
      chartRows: serializeChartRows(data.chartRows),
      chartFileName: data.chartFileName,
      resourceRows: data.resourceRows,
      resourceFileName: data.resourceFileName,
      chartFilter: data.chartFilter,
    };
  }
  writeStore(store);
}
