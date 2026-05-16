import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Box, Typography, alpha, useTheme } from '@mui/material';

function mergeCompareObserved(primary, compare) {
  if (!compare || !Array.isArray(compare.n) || compare.n.length === 0) {
    return null;
  }
  const byN = new Map(compare.n.map((n, i) => [String(n), compare.observed[i]]));
  return primary.n.map((n) => {
    const v = byN.get(String(n));
    return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
  });
}

/**
 * Observed means vs fitted model curve (same n grid as backend fitting).
 * Optional compareSeries overlays a second observed trace (e.g. alternate benchmark_profile).
 */
function GrowthFitChart({ title, series, yAxisLabel, compareSeries }) {
  const theme = useTheme();
  const compareObserved = useMemo(
    () => (series && compareSeries ? mergeCompareObserved(series, compareSeries) : null),
    [series, compareSeries]
  );

  if (!series || !Array.isArray(series.n) || series.n.length === 0) {
    return null;
  }

  const data = series.n.map((n, i) => ({
    n,
    observed: series.observed[i],
    fitted: series.fitted != null && series.fitted[i] != null ? series.fitted[i] : null,
    observedCompare: compareObserved ? compareObserved[i] : null,
  }));

  const showFitted = series.fitted != null && series.fitted.some((v) => v != null && Number.isFinite(v));
  const showCompare =
    compareObserved &&
    compareObserved.some((v) => v != null && Number.isFinite(v)) &&
    compareSeries?.label;

  const obsStroke = theme.palette.primary.main;
  const fitStroke = theme.palette.secondary.main;
  const compareStroke = theme.palette.warning.main;
  const gridStroke = alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.12 : 0.15);

  return (
    <Box sx={{ width: '100%', height: 320, mt: 1 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {series.note && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          {series.note}
        </Typography>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 20, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 6" stroke={gridStroke} />
          <XAxis
            dataKey="n"
            type="number"
            scale="log"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v) => String(v)}
            stroke={alpha(theme.palette.text.secondary, 0.85)}
            tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
            label={{ value: 'Input size n', position: 'insideBottom', offset: -2, fill: theme.palette.text.secondary }}
          />
          <YAxis
            tickFormatter={(v) => (Number.isInteger(v) ? String(v) : Number(v).toPrecision(3))}
            stroke={alpha(theme.palette.text.secondary, 0.85)}
            tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
            label={{
              value: yAxisLabel || 'Value',
              angle: -90,
              position: 'insideLeft',
              fill: theme.palette.text.secondary,
            }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: alpha(theme.palette.background.paper, 0.95),
            }}
            formatter={(value, name) => [
              value != null && Number.isFinite(value) ? Number(value).toPrecision(5) : '—',
              name,
            ]}
            labelFormatter={(label) => `n = ${label}`}
          />
          <Legend wrapperStyle={{ paddingTop: 8 }} />
          <Line
            type="monotone"
            dataKey="observed"
            name="Observed (mean)"
            stroke={obsStroke}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 0, fill: obsStroke }}
            activeDot={{ r: 5 }}
          />
          {showCompare && (
            <Line
              type="monotone"
              dataKey="observedCompare"
              name={compareSeries.label}
              stroke={compareStroke}
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 0, fill: compareStroke }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          )}
          {showFitted && (
            <Line
              type="monotone"
              dataKey="fitted"
              name={series.model ? `Fitted (${series.model})` : 'Fitted'}
              stroke={fitStroke}
              dot={false}
              strokeDasharray="6 4"
              strokeWidth={2.5}
              connectNulls={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default GrowthFitChart;
