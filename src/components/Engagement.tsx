'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Box,
  Typography,
  Alert,
  Slider,
  Stack,
  Tabs,
  Tab,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useCourse } from '@/context/CourseContext';
import { fetchWithCanvasAuth } from '@/lib/client/canvasTokenStorage';
import { TabLoader } from '@/components/CourseDataState';
import { ActivityPatternPanel } from '@/components/ActivityPatternPanel';
import { TabDataSourceFooter } from '@/components/TabDataSourceFooter';
import { useCourseCapabilities } from '@/hooks/useCourseCapabilities';
import { useCourseData } from '@/hooks/useCourseData';
import { getChartSeries, lineChartOptions } from '@/lib/chartDefaults';
import { useColorMode } from '@/context/ColorModeContext';
import { chartPanelSx, dataGridShellSx, getApplePalette } from '@/theme/appleTheme';
import { analyzeDailyAccess, type TimeOfDayPattern } from '@/lib/canvas/activityPatterns';
import type { CourseEngagementPayload } from '@/lib/canvas/engagement';
import {
  parseChartCsv,
  parseResourcesCsv,
  weekOverlapsRange,
  type ChartCsvRow,
  type ResourceCsvRow,
} from '@/lib/client/canvasAnalyticsCsv';
import {
  aggregateDailyToWeekly,
  filterDailyToWindow,
  type DailyActivityPoint,
} from '@/lib/canvas/engagementChart';
import {
  dateFromDayIndex,
  dayIndexFromSemesterStart,
  formatRangeLabel,
  parseIsoDateLocal,
} from '@/lib/canvas/engagementRange';
import { toIsoDateUtc } from '@/lib/canvas/courseTimeline';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const formatCount = (value: unknown) =>
  value == null || value === '' ? '—' : Number(value).toLocaleString();

const contentColumns: GridColDef<ResourceCsvRow>[] = [
  { field: 'source', headerName: 'Source', width: 120 },
  { field: 'resourceType', headerName: 'Resource type', width: 180 },
  {
    field: 'name',
    headerName: 'Name',
    flex: 1,
    minWidth: 220,
    valueFormatter: (value) => (value ? String(value) : '—'),
  },
  {
    field: 'students',
    headerName: 'Students',
    width: 110,
    type: 'number',
    align: 'center',
    headerAlign: 'center',
    valueFormatter: (value) => formatCount(value),
  },
  {
    field: 'pageViews',
    headerName: 'Page views',
    width: 120,
    type: 'number',
    align: 'center',
    headerAlign: 'center',
    valueFormatter: (value) => formatCount(value),
  },
  {
    field: 'participations',
    headerName: 'Participations',
    width: 130,
    type: 'number',
    align: 'center',
    headerAlign: 'center',
    valueFormatter: (value) => formatCount(value),
  },
];

function indicesToIso(
  semesterStartIso: string,
  startIdx: number,
  endIdx: number,
): { start: string; end: string } {
  const semesterStart = parseIsoDateLocal(semesterStartIso);
  if (!semesterStart) {
    return { start: semesterStartIso, end: semesterStartIso };
  }
  const start = dateFromDayIndex(semesterStart, startIdx);
  const end = dateFromDayIndex(semesterStart, endIdx);
  return { start: toIsoDateUtc(start), end: toIsoDateUtc(end) };
}

const Engagement = () => {
  const { courseId } = useCourse();
  const { data, loading, error, fetchedAt } = useCourseData<CourseEngagementPayload>('engagement');
  const { capabilities } = useCourseCapabilities();
  const { resolvedMode } = useColorMode();
  const chartSeries = getChartSeries(resolvedMode);

  const [dailyActivity, setDailyActivity] = useState<DailyActivityPoint[]>([]);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayPattern | null>(null);
  const [maxDayIndex, setMaxDayIndex] = useState(0);
  const [semesterStartIso, setSemesterStartIso] = useState('');
  const [startIdx, setStartIdx] = useState(0);
  const [endIdx, setEndIdx] = useState(0);
  const [timeOfDayLoading, setTimeOfDayLoading] = useState(false);
  const [activityTab, setActivityTab] = useState<'api' | 'csv'>('api');
  const [chartRows, setChartRows] = useState<ChartCsvRow[]>([]);
  const [chartFileName, setChartFileName] = useState('');
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartFilter, setChartFilter] = useState('All Sections');
  const [resourceRows, setResourceRows] = useState<ResourceCsvRow[]>([]);
  const [resourceFileName, setResourceFileName] = useState('');
  const [resourceError, setResourceError] = useState<string | null>(null);

  useEffect(() => {
    setSemesterStartIso('');
    setStartIdx(0);
    setEndIdx(0);
    setMaxDayIndex(0);
    setChartRows([]);
    setChartFileName('');
    setChartError(null);
    setChartFilter('All Sections');
    setResourceRows([]);
    setResourceFileName('');
    setResourceError(null);
    setActivityTab('api');
  }, [courseId]);

  useEffect(() => {
    if (!data) return;
    if (data.dailyActivity.length > 0) {
      setDailyActivity(data.dailyActivity);
    }
    setTimeOfDay(data.timeOfDay);

    const semStart = parseIsoDateLocal(data.range.semesterStart);
    const selectedStart = parseIsoDateLocal(data.range.selectedStart);
    const selectedEnd = parseIsoDateLocal(data.range.selectedEnd);
    const sliderMax = parseIsoDateLocal(data.range.sliderMax);

    if (semStart && selectedStart && selectedEnd && sliderMax) {
      setSemesterStartIso(data.range.semesterStart);
      const maxIdx = Math.max(0, dayIndexFromSemesterStart(semStart, sliderMax));
      setMaxDayIndex(maxIdx);
      setStartIdx(Math.max(0, dayIndexFromSemesterStart(semStart, selectedStart)));
      setEndIdx(Math.max(0, dayIndexFromSemesterStart(semStart, selectedEnd)));
    }
  }, [data]);

  const { start: selectedStartIso, end: selectedEndIso } = useMemo(
    () => indicesToIso(semesterStartIso, startIdx, endIdx),
    [semesterStartIso, startIdx, endIdx],
  );

  const dailyPattern = useMemo(() => {
    const semStart = parseIsoDateLocal(semesterStartIso);
    if (!semStart) return data?.dailyPattern ?? null;
    const start = dateFromDayIndex(semStart, startIdx);
    const end = dateFromDayIndex(semStart, endIdx);
    const filtered = filterDailyToWindow(dailyActivity, start, end);
    if (filtered.length === 0 && dailyActivity.length === 0) {
      return data?.dailyPattern ?? null;
    }
    return analyzeDailyAccess(
      filtered.map((row) => ({ date: row.date, views: row.views })),
      start,
      end,
    );
  }, [dailyActivity, semesterStartIso, startIdx, endIdx, data?.dailyPattern]);

  const chartBundle = useMemo(() => {
    const semStart = parseIsoDateLocal(semesterStartIso);
    if (!semStart || dailyActivity.length === 0) {
      return data?.chart ?? { labels: [], pageViews: [], participations: [], note: '' };
    }
    const start = dateFromDayIndex(semStart, startIdx);
    const end = dateFromDayIndex(semStart, endIdx);
    const filtered = filterDailyToWindow(dailyActivity, start, end);
    const weekly = aggregateDailyToWeekly(filtered, start, end);
    return {
      ...weekly,
      note: data?.chart.note ?? '',
    };
  }, [dailyActivity, semesterStartIso, startIdx, endIdx, data?.chart.note]);

  const chartFilters = useMemo(
    () => [...new Set(chartRows.map((row) => row.filter))],
    [chartRows],
  );

  const csvChart = useMemo(() => {
    const semStart = parseIsoDateLocal(semesterStartIso);
    const start = semStart ? dateFromDayIndex(semStart, startIdx) : null;
    const end = semStart ? dateFromDayIndex(semStart, endIdx) : null;
    const rows = chartRows.filter((row) => {
      if (chartFilters.length > 1 && row.filter !== chartFilter) return false;
      if (!start || !end || !row.weekStart) return true;
      return weekOverlapsRange(row.weekStart, start, end);
    });
    return {
      labels: rows.map((row) => row.weekStartLabel),
      pageViews: rows.map((row) => row.pageViews),
      participations: rows.map((row) => row.participations),
    };
  }, [chartRows, chartFilter, chartFilters.length, semesterStartIso, startIdx, endIdx]);

  const readCsvFile = (file: File, kind: 'chart' | 'resources') => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      if (kind === 'chart') {
        const parsed = parseChartCsv(text);
        setChartFileName(file.name);
        setChartError(parsed.error);
        setChartRows(parsed.rows);
        const filters = [...new Set(parsed.rows.map((row) => row.filter))];
        setChartFilter(
          filters.includes('All Sections') ? 'All Sections' : (filters[0] ?? 'All Sections'),
        );
      } else {
        const parsed = parseResourcesCsv(text);
        setResourceFileName(file.name);
        setResourceError(parsed.error);
        setResourceRows(parsed.rows);
      }
    };
    reader.readAsText(file);
  };

  const fetchTimeOfDayForRange = useCallback(async () => {
    if (!courseId || !semesterStartIso) return;
    const { start, end } = indicesToIso(semesterStartIso, startIdx, endIdx);
    setTimeOfDayLoading(true);
    try {
      const res = await fetchWithCanvasAuth(
        `/api/courses/${courseId}/engagement?start=${start}&end=${end}&contentOnly=1`,
      );
      const body = (await res.json()) as CourseEngagementPayload;
      if (res.ok && body.timeOfDay) setTimeOfDay(body.timeOfDay);
    } finally {
      setTimeOfDayLoading(false);
    }
  }, [courseId, semesterStartIso, startIdx, endIdx]);

  const rangeChangedFromDefault =
    !!data &&
    (selectedStartIso !== data.range.selectedStart ||
      selectedEndIso !== data.range.selectedEnd);

  useEffect(() => {
    if (!semesterStartIso || !rangeChangedFromDefault) return;
    const timer = window.setTimeout(() => {
      fetchTimeOfDayForRange();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [selectedStartIso, selectedEndIso, fetchTimeOfDayForRange, semesterStartIso, rangeChangedFromDefault]);

  const handleStartSlider = (_: Event, value: number | number[]) => {
    const next = value as number;
    setStartIdx(next);
    if (next > endIdx) setEndIdx(next);
  };

  const handleEndSlider = (_: Event, value: number | number[]) => {
    const next = value as number;
    setEndIdx(next);
    if (next < startIdx) setStartIdx(next);
  };

  if (loading || error) {
    return <TabLoader loading={loading} error={error} />;
  }

  if (!data) return null;

  const hasChartData = chartBundle.labels.length > 0;
  const hasCsvChart = csvChart.labels.length > 0;

  const weeklyActivityData = (labels: string[], pageViews: number[], participations: number[]) => ({
    labels,
    datasets: [
      {
        label: 'Page Views',
        data: pageViews,
        fill: false,
        borderColor: chartSeries.primary,
        backgroundColor: chartSeries.primary,
        tension: 0.35,
        yAxisID: 'y',
      },
      {
        label: 'Participations',
        data: participations,
        fill: false,
        borderColor: chartSeries.secondary,
        backgroundColor: chartSeries.secondary,
        tension: 0.35,
        yAxisID: 'y1',
      },
    ],
  });

  const chartOptions = lineChartOptions('Weekly course activity', resolvedMode, {
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Page views',
          color: getApplePalette(resolvedMode).textSecondary,
          font: { size: 11 },
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        title: {
          display: true,
          text: 'Participations',
          color: getApplePalette(resolvedMode).textSecondary,
          font: { size: 11 },
        },
        ticks: { color: getApplePalette(resolvedMode).textSecondary },
      },
    },
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
      <Alert severity={hasChartData ? 'info' : 'warning'}>
        {data.chart.note}
      </Alert>

      <Box sx={{ px: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Time period: {formatRangeLabel(selectedStartIso)} – {formatRangeLabel(selectedEndIso)}
        </Typography>
        <Stack spacing={2} sx={{ maxWidth: 720 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Start date
            </Typography>
            <Slider
              value={startIdx}
              min={0}
              max={maxDayIndex}
              step={1}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => formatRangeLabel(indicesToIso(semesterStartIso, v, v).start)}
              onChange={handleStartSlider}
            />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              End date
            </Typography>
            <Slider
              value={endIdx}
              min={0}
              max={maxDayIndex}
              step={1}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => formatRangeLabel(indicesToIso(semesterStartIso, v, v).end)}
              onChange={handleEndSlider}
            />
          </Box>
        </Stack>
      </Box>

      {dailyPattern ? (
        <ActivityPatternPanel
          daily={dailyPattern}
          timeOfDay={timeOfDay}
          timeOfDayLoading={timeOfDayLoading}
        />
      ) : null}

      <Box>
        <Typography variant="h6" gutterBottom>
          Weekly course activity
        </Typography>
        <Tabs
          value={activityTab}
          onChange={(_event, value: 'api' | 'csv') => setActivityTab(value)}
          sx={{ mb: 1.5 }}
        >
          <Tab value="api" label="From API" />
          <Tab value="csv" label="From CSV" />
        </Tabs>
        {activityTab === 'api' ? (
          hasChartData ? (
            <Box sx={{ ...chartPanelSx, height: 340 }}>
              <Line
                key={`${resolvedMode}-api`}
                options={chartOptions}
                data={weeklyActivityData(
                  chartBundle.labels,
                  chartBundle.pageViews,
                  chartBundle.participations,
                )}
              />
            </Box>
          ) : (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No activity data for this period.
            </Typography>
          )
        ) : (
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Button component="label" size="small" variant="outlined">
                Upload chart CSV
                <input
                  hidden
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) readCsvFile(file, 'chart');
                  }}
                />
              </Button>
              {chartFileName ? (
                <Typography variant="caption" color="text.secondary">
                  {chartFileName}
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Use the chart CSV from the Canvas course analytics dashboard.
                </Typography>
              )}
            </Stack>
            {chartFilters.length > 1 ? (
              <FormControl size="small" sx={{ maxWidth: 280 }}>
                <InputLabel id="chart-filter-label">Filter</InputLabel>
                <Select
                  labelId="chart-filter-label"
                  label="Filter"
                  value={chartFilter}
                  onChange={(event) => setChartFilter(event.target.value)}
                >
                  {chartFilters.map((filter) => (
                    <MenuItem key={filter} value={filter}>
                      {filter}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : null}
            {chartError ? <Alert severity="warning">{chartError}</Alert> : null}
            {hasCsvChart ? (
              <Box sx={{ ...chartPanelSx, height: 340 }}>
                <Line
                  key={`${resolvedMode}-csv`}
                  options={chartOptions}
                  data={weeklyActivityData(
                    csvChart.labels,
                    csvChart.pageViews,
                    csvChart.participations,
                  )}
                />
              </Box>
            ) : (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                {chartRows.length > 0
                  ? 'No chart rows fall in this time period.'
                  : 'Upload chart.csv to plot weekly page views and participations.'}
              </Typography>
            )}
          </Stack>
        )}
      </Box>

      <Box sx={{ width: '100%' }}>
        <Typography variant="h6" gutterBottom>
          Course content
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Upload the resources CSV from the Canvas course analytics dashboard. The table uses that
          file only.
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
          <Button component="label" size="small" variant="outlined">
            Upload resources CSV
            <input
              hidden
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) readCsvFile(file, 'resources');
              }}
            />
          </Button>
          {resourceFileName ? (
            <Typography variant="caption" color="text.secondary">
              {resourceFileName}
            </Typography>
          ) : null}
        </Stack>
        {resourceError ? (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {resourceError}
          </Alert>
        ) : null}
        {resourceRows.length > 0 ? (
          <Box
            sx={{
              ...dataGridShellSx,
              height: Math.max(280, Math.min(560, 56 + resourceRows.length * 52)),
            }}
          >
            <DataGrid
              rows={resourceRows}
              columns={contentColumns}
              disableRowSelectionOnClick
              pageSizeOptions={[25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              density="compact"
            />
          </Box>
        ) : (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            Upload resources.csv to list page views and participations for each course resource.
          </Typography>
        )}
      </Box>
      <TabDataSourceFooter
        sources={data.dataSources}
        fetchedAt={fetchedAt}
        note={capabilities?.tabNotes.engagement}
      />
    </Box>
  );
};

export default Engagement;
