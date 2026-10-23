import type { ChartCsvRow, ResourceCsvRow } from '@/lib/client/canvasAnalyticsCsv';

const MAX_RESOURCE_LINES = 25;

export function buildEngagementCsvSummary(options: {
  activityTab: 'api' | 'csv';
  chartRows: ChartCsvRow[];
  chartFileName: string;
  chartFilter: string;
  resourceRows: ResourceCsvRow[];
  resourceFileName: string;
}): string | null {
  const parts: string[] = [];

  if (options.activityTab === 'csv') {
    parts.push('The instructor is viewing Engagement using uploaded Canvas New Analytics CSV exports (not the REST activity API chart).');
  }

  if (options.chartRows.length > 0) {
    const filtered =
      options.chartFilter && options.chartFilter !== 'All Sections'
        ? options.chartRows.filter((r) => r.filter === options.chartFilter)
        : options.chartRows;
    const rows = filtered.length > 0 ? filtered : options.chartRows;
    const totalViews = rows.reduce((s, r) => s + r.pageViews, 0);
    const totalParts = rows.reduce((s, r) => s + r.participations, 0);
    const peak = [...rows].sort((a, b) => b.pageViews - a.pageViews)[0];
    parts.push(
      `Chart CSV${options.chartFileName ? ` (${options.chartFileName})` : ''}: ${rows.length} weekly rows${options.chartFilter ? `, filter "${options.chartFilter}"` : ''}. Totals — page views ${totalViews.toLocaleString()}, participations ${totalParts.toLocaleString()}. Peak week by page views: ${peak?.weekStartLabel ?? 'n/a'} (${peak?.pageViews.toLocaleString() ?? 0} views, ${peak?.participations.toLocaleString() ?? 0} participations).`,
    );
    const recent = rows.slice(-6);
    if (recent.length > 0) {
      parts.push(
        'Recent weekly rows (week → views / participations): ' +
          recent
            .map((r) => `${r.weekStartLabel}: ${r.pageViews}/${r.participations}`)
            .join('; '),
      );
    }
  }

  if (options.resourceRows.length > 0) {
    const sorted = [...options.resourceRows].sort(
      (a, b) => (b.pageViews ?? 0) - (a.pageViews ?? 0),
    );
    const top = sorted.slice(0, MAX_RESOURCE_LINES);
    const totalViews = options.resourceRows.reduce((s, r) => s + (r.pageViews ?? 0), 0);
    parts.push(
      `Resources CSV${options.resourceFileName ? ` (${options.resourceFileName})` : ''}: ${options.resourceRows.length} resources; combined page views ${totalViews.toLocaleString()}. Top by page views:`,
    );
    for (const row of top) {
      parts.push(
        `- [${row.resourceType || row.source}] ${row.name}: ${row.pageViews ?? 0} views, ${row.participations ?? 0} participations, ${row.students ?? '—'} students`,
      );
    }
    if (sorted.length > MAX_RESOURCE_LINES) {
      parts.push(`(…${sorted.length - MAX_RESOURCE_LINES} more resources not listed.)`);
    }
  }

  if (parts.length === 0) return null;
  return parts.join('\n');
}
