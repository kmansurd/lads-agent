import { parseCsv } from './parseCsv';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export type ChartCsvRow = {
  weekStartLabel: string;
  weekStart: Date | null;
  filter: string;
  pageViews: number;
  participations: number;
};

export type ResourceCsvRow = {
  id: string;
  source: string;
  resourceType: string;
  name: string;
  students: number | null;
  pageViews: number | null;
  participations: number | null;
};

function headerIndex(headers: string[], name: string): number {
  const target = name.toLowerCase();
  return headers.findIndex((header) => header.trim().toLowerCase() === target);
}

function requireColumns(headers: string[], names: string[], fileLabel: string): string | null {
  const missing = names.filter((name) => headerIndex(headers, name) < 0);
  if (missing.length === 0) return null;
  return `${fileLabel} is missing ${missing.join(', ')}. Use the CSV downloaded from Canvas course analytics.`;
}

function cell(row: string[], index: number): string {
  if (index < 0) return '';
  return row[index]?.trim() ?? '';
}

function parseCount(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Canvas New Analytics week labels look like `3-Aug-26`. */
export function parseCanvasExportDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = MONTHS.indexOf(match[2].toLowerCase());
  if (month < 0) return null;
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function weekOverlapsRange(weekStart: Date, rangeStart: Date, rangeEnd: Date): boolean {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const start = new Date(rangeStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(rangeEnd);
  end.setHours(23, 59, 59, 999);
  return weekStart.getTime() <= end.getTime() && weekEnd.getTime() >= start.getTime();
}

export function parseChartCsv(text: string): { rows: ChartCsvRow[]; error: string | null } {
  const table = parseCsv(text);
  if (table.length < 2) {
    return { rows: [], error: 'The chart CSV has no data rows.' };
  }
  const headers = table[0];
  const missing = requireColumns(headers, ['Week Start', 'Page Views', 'Participations'], 'chart.csv');
  if (missing) return { rows: [], error: missing };

  const weekIdx = headerIndex(headers, 'Week Start');
  const filterIdx = headerIndex(headers, 'Filter');
  const viewsIdx = headerIndex(headers, 'Page Views');
  const partsIdx = headerIndex(headers, 'Participations');

  const rows: ChartCsvRow[] = [];
  for (const line of table.slice(1)) {
    const weekStartLabel = cell(line, weekIdx);
    if (!weekStartLabel) continue;
    rows.push({
      weekStartLabel,
      weekStart: parseCanvasExportDate(weekStartLabel),
      filter: filterIdx >= 0 ? cell(line, filterIdx) || 'All Sections' : 'All Sections',
      pageViews: parseCount(cell(line, viewsIdx)) ?? 0,
      participations: parseCount(cell(line, partsIdx)) ?? 0,
    });
  }

  if (rows.length === 0) {
    return { rows: [], error: 'The chart CSV has no weekly rows.' };
  }
  return { rows, error: null };
}

export function parseResourcesCsv(text: string): { rows: ResourceCsvRow[]; error: string | null } {
  const table = parseCsv(text);
  if (table.length < 2) {
    return { rows: [], error: 'The resources CSV has no data rows.' };
  }
  const headers = table[0];
  const missing = requireColumns(
    headers,
    ['Source', 'Resource Type', 'Name', 'Students', 'Page Views', 'Participations'],
    'resources.csv',
  );
  if (missing) return { rows: [], error: missing };

  const sourceIdx = headerIndex(headers, 'Source');
  const typeIdx = headerIndex(headers, 'Resource Type');
  const nameIdx = headerIndex(headers, 'Name');
  const studentsIdx = headerIndex(headers, 'Students');
  const viewsIdx = headerIndex(headers, 'Page Views');
  const partsIdx = headerIndex(headers, 'Participations');

  const rows = table.slice(1).map((line, index) => ({
    id: `resource-${index}`,
    source: cell(line, sourceIdx),
    resourceType: cell(line, typeIdx),
    name: cell(line, nameIdx),
    students: parseCount(cell(line, studentsIdx)),
    pageViews: parseCount(cell(line, viewsIdx)),
    participations: parseCount(cell(line, partsIdx)),
  }));

  if (rows.length === 0) {
    return { rows: [], error: 'The resources CSV has no content rows.' };
  }
  return { rows, error: null };
}
