import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Alert,
  Button,
  alpha,
  useTheme,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Skeleton,
  Tooltip,
} from '@mui/material';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import HubOutlined from '@mui/icons-material/HubOutlined';
import ViewStreamOutlined from '@mui/icons-material/ViewStreamOutlined';
import TableRowsOutlined from '@mui/icons-material/TableRowsOutlined';
import ShowChartOutlined from '@mui/icons-material/ShowChartOutlined';
import PsychologyOutlined from '@mui/icons-material/PsychologyOutlined';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import GrowthFitChart from './GrowthFitChart';
import { buildBigOExplainer } from '../util/bigOExplainer';

function complexityChipColors(theme, key) {
  const isDark = theme.palette.mode === 'dark';
  const muted = (hex) => (isDark ? alpha(hex, 0.88) : hex);
  const map = {
    constant: { bg: muted('#059669'), fg: '#fff' },
    linear: { bg: muted('#2563eb'), fg: '#fff' },
    quadratic: { bg: muted('#dc2626'), fg: '#fff' },
    logarithmic: { bg: muted('#7c3aed'), fg: '#fff' },
    exponential: { bg: muted('#a21caf'), fg: '#fff' },
    cubic: { bg: muted('#b45309'), fg: '#fff' },
    log_linear: { bg: muted('#0d9488'), fg: '#fff' },
    factorial: { bg: muted('#db2777'), fg: '#fff' },
    polynomial: { bg: muted('#4d7c0f'), fg: '#fff' },
    inverse_ackermann: { bg: muted('#64748b'), fg: '#fff' },
    iterated_logarithmic: { bg: muted('#0e7490'), fg: '#fff' },
    log_logarithmic: { bg: muted('#1d4ed8'), fg: '#fff' },
    polylogarithmic: { bg: muted('#5b21b6'), fg: '#fff' },
    fractional_power: { bg: muted('#ca8a04'), fg: '#1e1033' },
    quasilinear: { bg: muted('#ea580c'), fg: '#fff' },
    quasi_polynomial: { bg: muted('#be185d'), fg: '#fff' },
    subexponential: { bg: muted('#9333ea'), fg: '#fff' },
    polynomial_linear_exponent: { bg: muted('#6b21a8'), fg: '#fff' },
    double_exponential: { bg: muted('#991b1b'), fg: '#fff' },
  };
  const fallback = {
    bg: isDark ? alpha(theme.palette.primary.light, 0.35) : theme.palette.primary.main,
    fg: theme.palette.getContrastText(theme.palette.primary.main),
  };
  return map[key] || fallback;
}

function formatChipLabel(size, value, useWallNs) {
  if (useWallNs) {
    return `${size}: ${Number(value).toFixed(2)} ns`;
  }
  const n = Number(value);
  const s = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return `${size}: ${s} exec`;
}

function Output({
  outputText: _outputText = '',
  results = [],
  error = '',
  loading = false,
  rawAnalysis = null,
  rawAnalysisCompare = null,
  compareBenchmarkProfile = null,
  analysisLanguage = '',
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [surface, setSurface] = useState('runway');
  const [deckTab, setDeckTab] = useState(0);

  useEffect(() => {
    setDeckTab(0);
    setSurface('runway');
  }, [rawAnalysis]);

  const lineUsesExecCounts = results.measurement === 'line_executions';

  const linesWithSeries = useMemo(
    () =>
      (Array.isArray(results) ? results : []).filter(
        (r) => r && r.series && Array.isArray(r.series.n) && r.series.n.length > 0
      ),
    [results]
  );
  const [lineChartKey, setLineChartKey] = useState(null);
  const firstLineKey = linesWithSeries[0]?.lineNumber;
  const effectiveLineKey = lineChartKey ?? firstLineKey;
  const selectedLineSeries = linesWithSeries.find(
    (r) => String(r.lineNumber) === String(effectiveLineKey)
  )?.series;

  const [copyFeedback, setCopyFeedback] = useState('');

  const jsonBlob = useMemo(() => {
    if (!rawAnalysis) return '';
    try {
      return JSON.stringify(rawAnalysis, null, 2);
    } catch {
      return '';
    }
  }, [rawAnalysis]);

  const explainer = useMemo(() => {
    const modelKey = rawAnalysis?.function?.best_fit?.model;
    if (!modelKey) return null;
    return buildBigOExplainer({
      language: analysisLanguage,
      fittedModelKey: modelKey,
      staticAnalysis: results.staticAnalysis,
    });
  }, [rawAnalysis, analysisLanguage, results.staticAnalysis]);

  const functionCompareSeries = useMemo(() => {
    if (!rawAnalysisCompare?.function?.series?.n?.length || !compareBenchmarkProfile) return null;
    return {
      label: `Observed — ${compareBenchmarkProfile}`,
      n: rawAnalysisCompare.function.series.n,
      observed: rawAnalysisCompare.function.series.observed,
    };
  }, [rawAnalysisCompare, compareBenchmarkProfile]);

  const selectedLineCompareSeries = useMemo(() => {
    if (
      !rawAnalysisCompare?.lines ||
      !compareBenchmarkProfile ||
      effectiveLineKey === undefined ||
      effectiveLineKey === null
    ) {
      return null;
    }
    const lineInfo = rawAnalysisCompare.lines[effectiveLineKey];
    const s = lineInfo?.series;
    if (!s?.n?.length) return null;
    return {
      label: `Line ${effectiveLineKey} — ${compareBenchmarkProfile}`,
      n: s.n,
      observed: s.observed,
    };
  }, [rawAnalysisCompare, compareBenchmarkProfile, effectiveLineKey]);

  const compareNarrative = useMemo(() => {
    if (!rawAnalysis || !rawAnalysisCompare || !compareBenchmarkProfile) return null;
    const a = rawAnalysis.function?.best_fit?.model;
    const b = rawAnalysisCompare.function?.best_fit?.model;
    if (!a || !b) return null;
    const primaryProfile = results.benchmarkProfile || 'primary';
    if (a === b) {
      return `Both ${primaryProfile} and ${compareBenchmarkProfile} picked the same empirical family (${a}). The overlaid means can still separate constant factors and micro-structure.`;
    }
    return `Profiles diverge on the function fit: ${primaryProfile} → ${a}; ${compareBenchmarkProfile} → ${b}. That is a strong hint that input order changes dominant work (e.g. insertion sort on sorted vs random data).`;
  }, [rawAnalysis, rawAnalysisCompare, compareBenchmarkProfile, results.benchmarkProfile]);

  const handleDownloadJson = useCallback(() => {
    if (!jsonBlob) return;
    const blob = new Blob([jsonBlob], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'time-complexity-analysis.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [jsonBlob]);

  const handleCopyJson = useCallback(async () => {
    if (!jsonBlob) return;
    try {
      await navigator.clipboard.writeText(jsonBlob);
      setCopyFeedback('Copied to clipboard');
      setTimeout(() => setCopyFeedback(''), 2500);
    } catch {
      setCopyFeedback('Copy failed (browser blocked clipboard)');
      setTimeout(() => setCopyFeedback(''), 3500);
    }
  }, [jsonBlob]);

  const renderComplexityChip = (notation, modelKey) => {
    if (!modelKey) return null;
    const { bg, fg } = complexityChipColors(theme, modelKey);
    return (
      <Chip
        label={`${notation} {${modelKey}}`}
        size="small"
        sx={{
          fontWeight: 800,
          bgcolor: bg,
          color: fg,
          boxShadow: `0 4px 18px ${alpha(bg, 0.45)}`,
          letterSpacing: '0.02em',
        }}
      />
    );
  };

  const renderExecutionTimes = (avgExecTimes, useWallNs) => (
    <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.5} sx={{ mt: 0.5 }}>
      {Object.entries(avgExecTimes || {}).map(([size, time]) => (
        <Chip
          key={size}
          label={formatChipLabel(size, time, useWallNs)}
          size="small"
          sx={{
            fontWeight: 700,
            borderRadius: 1.5,
            fontFamily: theme.typography.fontFamilyMonospace,
            fontSize: 11,
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.1),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
          }}
        />
      ))}
    </Stack>
  );

  const getLineStyle = (complexity) => {
    if (!complexity) return { rail: alpha(theme.palette.divider, 0.5), wash: 'transparent' };
    const { bg } = complexityChipColors(theme, complexity);
    return { rail: bg, wash: alpha(bg, theme.palette.mode === 'dark' ? 0.12 : 0.1) };
  };

  const lineRows = useMemo(
    () =>
      Array.isArray(results)
        ? results.filter(
            (item) =>
              item &&
              typeof item === 'object' &&
              Object.prototype.hasOwnProperty.call(item, 'line') &&
              typeof item.line === 'string'
          )
        : [],
    [results]
  );
  const hasLineRows = lineRows.length > 0;

  const deckTabs = [
    { label: 'Signal', icon: <ViewStreamOutlined fontSize="small" /> },
    { label: 'Growth', icon: <ShowChartOutlined fontSize="small" /> },
    { label: 'Static', icon: <PsychologyOutlined fontSize="small" /> },
  ];

  const showGrowth = results.functionSeries || linesWithSeries.length > 0;
  const showStatic = results.staticAnalysis && results.staticAnalysis.ok;

  return (
    <Card
      className="output-card"
      elevation={0}
      sx={{
        mt: 0,
        overflow: 'hidden',
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
        boxShadow:
          theme.palette.mode === 'dark'
            ? `0 0 0 1px ${alpha('#fff', 0.04)}, 0 24px 80px ${alpha('#000', 0.45)}`
            : `0 0 0 1px ${alpha(theme.palette.primary.main, 0.08)}, 0 24px 70px ${alpha(theme.palette.primary.main, 0.12)}`,
        background: `linear-gradient(165deg, ${alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.06 : 0.05)} 0%, transparent 42%), ${alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.55 : 0.92)}`,
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.12)}, transparent)`,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <HubOutlined color="primary" />
          <Typography variant="subtitle2" sx={{ fontWeight: 900, letterSpacing: '0.18em' }}>
            ANALYSIS DECK
          </Typography>
        </Stack>
        {!loading && rawAnalysis && jsonBlob && (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {copyFeedback && (
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>
                {copyFeedback}
              </Typography>
            )}
            <Button size="small" variant="outlined" onClick={handleDownloadJson} sx={{ borderRadius: 999, fontWeight: 800 }}>
              Download JSON
            </Button>
            <Button size="small" variant="contained" color="secondary" onClick={handleCopyJson} sx={{ borderRadius: 999, fontWeight: 800 }}>
              Copy JSON
            </Button>
          </Stack>
        )}
      </Box>

      <CardContent sx={{ pt: 2.5 }}>
        {loading ? (
          <Stack spacing={2} sx={{ py: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <CircularProgress size={36} thickness={5} />
              <Box flex={1}>
                <Typography variant="subtitle1" fontWeight={800}>
                  Synthesizing traces…
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Fitting curves and wiring the deck
                </Typography>
              </Box>
            </Stack>
            <Skeleton variant="rounded" height={56} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
          </Stack>
        ) : error ? (
          <Alert
            severity="error"
            icon={<ErrorOutlineRounded />}
            sx={{
              borderRadius: 2,
              alignItems: 'flex-start',
              border: `1px solid ${alpha(theme.palette.error.main, 0.35)}`,
              background: alpha(theme.palette.error.main, 0.06),
            }}
          >
            <Typography variant="subtitle1" fontWeight={800}>
              Can&apos;t calculate it. Please check your code and try again.
            </Typography>
            {error && (
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.92 }}>
                {error}
              </Typography>
            )}
          </Alert>
        ) : (
          <Stack spacing={2.5}>
            {results.benchmarkProfile && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  label={`Benchmark profile · ${results.benchmarkProfile}`}
                  sx={{ fontWeight: 800, alignSelf: 'flex-start' }}
                  color="primary"
                  variant="outlined"
                />
                {compareBenchmarkProfile && rawAnalysisCompare ? (
                  <Chip
                    size="small"
                    label={`Compare overlay · ${compareBenchmarkProfile}`}
                    sx={{ fontWeight: 800, alignSelf: 'flex-start' }}
                    color="warning"
                    variant="outlined"
                  />
                ) : null}
              </Stack>
            )}

            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} alignItems="stretch">
              <Stack spacing={2.5} flex={1} minWidth={0}>
                {results.functionComplexity && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      position: 'relative',
                      overflow: 'hidden',
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
                      background: `radial-gradient(120% 80% at 100% 0%, ${alpha(theme.palette.secondary.main, 0.18)}, transparent 55%), ${alpha(theme.palette.background.paper, 0.6)}`,
                    }}
                  >
                    <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: '0.2em', color: 'secondary.main' }}>
                      Function verdict
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mt: 1 }}>
                      <Typography
                        variant="h3"
                        sx={{
                          fontWeight: 900,
                          letterSpacing: '-0.04em',
                          fontFamily: theme.typography.fontFamilyMonospace,
                          lineHeight: 1.05,
                        }}
                      >
                        {results.functionNotation || '—'}
                      </Typography>
                      <Box flex={1}>{renderComplexityChip(results.functionNotation, results.functionComplexityWord)}</Box>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', fontWeight: 600 }}>
                      Wall-clock mean across sizes (fitted curve in Growth tab)
                    </Typography>
                    {renderExecutionTimes(results.functionAvgExecTimes, true)}
                    {explainer?.bullets?.length ? (
                      <Paper
                        elevation={0}
                        sx={{
                          mt: 2,
                          p: 2,
                          borderRadius: 2,
                          border: `1px solid ${alpha(theme.palette.info.main, 0.35)}`,
                          bgcolor: alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.08 : 0.06),
                        }}
                      >
                        <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: '0.14em', color: 'info.main' }}>
                          Why this Big-O?
                        </Typography>
                        <Stack component="ul" spacing={1} sx={{ m: 0, mt: 1, pl: 2.25 }}>
                          {explainer.bullets.map((b, i) => (
                            <Typography key={i} component="li" variant="body2" sx={{ lineHeight: 1.65, fontWeight: 600 }}>
                              {b}
                            </Typography>
                          ))}
                        </Stack>
                        {explainer.staticAlignment !== 'n/a' ? (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.25, display: 'block', fontWeight: 700 }}>
                            Static vs fit: {explainer.staticAlignment}
                          </Typography>
                        ) : null}
                      </Paper>
                    ) : null}
                  </Paper>
                )}

                <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                  <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
                    Line-by-line analysis
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={surface}
                    onChange={(_, v) => v && setSurface(v)}
                    sx={{
                      '& .MuiToggleButton-root': {
                        px: 1.5,
                        fontWeight: 800,
                        textTransform: 'none',
                        borderRadius: '999px !important',
                      },
                    }}
                  >
                    <ToggleButton value="runway">
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <ViewStreamOutlined sx={{ fontSize: 18 }} />
                        Runway
                      </Stack>
                    </ToggleButton>
                    <ToggleButton value="table">
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <TableRowsOutlined sx={{ fontSize: 18 }} />
                        Table
                      </Stack>
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Stack>

                {surface === 'runway' ? (
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.divider}`,
                      overflow: 'hidden',
                      maxHeight: 480,
                      overflowY: 'auto',
                      background: alpha(theme.palette.mode === 'dark' ? '#020617' : '#f8fafc', theme.palette.mode === 'dark' ? 0.65 : 0.95),
                    }}
                  >
                    {!hasLineRows ? (
                      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                        No line payloads yet — run an analysis to populate the runway.
                      </Typography>
                    ) : (
                      <Stack divider={<Box sx={{ height: 1, bgcolor: 'divider', opacity: 0.6 }} />}>
                        {lineRows.map((result, index) => {
                          const { rail, wash } = getLineStyle(result.complexity);
                          return (
                            <motion.div
                              key={`${result.lineNumber}-${index}`}
                              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: reduceMotion ? 0 : 0.22, delay: reduceMotion ? 0 : index * 0.02 }}
                            >
                              <Stack
                                direction="row"
                                alignItems="stretch"
                                sx={{
                                  minHeight: 48,
                                  bgcolor: wash,
                                  '&:hover': {
                                    bgcolor: alpha(rail, theme.palette.mode === 'dark' ? 0.16 : 0.12),
                                  },
                                }}
                              >
                                <Tooltip title={result.complexity ? `Fit: ${result.complexity}` : 'No line-level fit'}>
                                  <Box sx={{ width: 6, flexShrink: 0, bgcolor: rail }} />
                                </Tooltip>
                                <Box
                                  sx={{
                                    width: 44,
                                    flexShrink: 0,
                                    display: 'grid',
                                    placeItems: 'center',
                                    fontFamily: theme.typography.fontFamilyMonospace,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: 'text.secondary',
                                    borderRight: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                                  }}
                                >
                                  {result.lineNumber ?? index + 1}
                                </Box>
                                <Box sx={{ flex: 1, py: 1.25, px: 1.5, minWidth: 0 }}>
                                  <Typography
                                    component="div"
                                    variant="body2"
                                    sx={{
                                      fontFamily: theme.typography.fontFamilyMonospace,
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word',
                                      lineHeight: 1.55,
                                      fontSize: 13,
                                    }}
                                  >
                                    {result.line}
                                  </Typography>
                                  {renderExecutionTimes(result.avgExecTimes, !lineUsesExecCounts)}
                                </Box>
                                <Box
                                  sx={{
                                    width: { xs: 100, sm: 140 },
                                    flexShrink: 0,
                                    p: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-end',
                                    justifyContent: 'center',
                                    borderLeft: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                                    bgcolor: alpha(theme.palette.background.paper, 0.35),
                                  }}
                                >
                                  {result.complexity ? (
                                    renderComplexityChip(result.notation, result.complexity)
                                  ) : (
                                    <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 700 }}>
                                      —
                                    </Typography>
                                  )}
                                </Box>
                              </Stack>
                            </motion.div>
                          );
                        })}
                      </Stack>
                    )}
                  </Paper>
                ) : (
                  <TableContainer
                    component={Paper}
                    elevation={0}
                    sx={{
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.divider}`,
                      maxHeight: 440,
                      overflow: 'auto',
                    }}
                  >
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell width={56}>#</TableCell>
                          <TableCell>Code</TableCell>
                          <TableCell>Fit</TableCell>
                          <TableCell>{lineUsesExecCounts ? 'Avg executions by n' : 'Avg times by n'}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lineRows.map((result, index) => (
                          <TableRow
                            key={index}
                            hover
                            sx={{
                              borderLeft: `4px solid ${getLineStyle(result.complexity).rail}`,
                              transition: 'background-color 0.2s ease',
                            }}
                          >
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                              <Typography
                                component="code"
                                variant="body2"
                                sx={{
                                  fontFamily: theme.typography.fontFamilyMonospace,
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {result.line}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {result.complexity ? renderComplexityChip(result.notation, result.complexity) : '—'}
                            </TableCell>
                            <TableCell>{renderExecutionTimes(result.avgExecTimes, !lineUsesExecCounts)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {lineUsesExecCounts && (
                  <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                    <Typography variant="body2" component="div">
                      Line fits use <strong>mean execution counts</strong> across many benchmark draws at each size <em>n</em>.
                      Rare branches can look cheaper than worst-case Big-O — cross-check static hints when in doubt.
                    </Typography>
                  </Alert>
                )}

                {(showGrowth || showStatic) && (
                  <Box>
                    <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
                      {deckTabs.map((t, i) => {
                        const disabled = i === 1 && !showGrowth;
                        const disabledStatic = i === 2 && !showStatic;
                        return (
                          <Button
                            key={t.label}
                            size="small"
                            variant={deckTab === i ? 'contained' : 'outlined'}
                            color={deckTab === i ? 'primary' : 'inherit'}
                            onClick={() => !disabled && !disabledStatic && setDeckTab(i)}
                            disabled={disabled || disabledStatic}
                            startIcon={t.icon}
                            sx={{ borderRadius: 999, fontWeight: 800 }}
                          >
                            {t.label}
                          </Button>
                        );
                      })}
                    </Stack>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={deckTab}
                        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? false : { opacity: 0, y: -6 }}
                        transition={{ duration: reduceMotion ? 0 : 0.22 }}
                      >
                        {deckTab === 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Use the runway to read code with inline fits. Switch to <strong>Growth</strong> for curves,{' '}
                            <strong>Static</strong> for AST hints (Python).
                          </Typography>
                        )}
                        {deckTab === 1 && showGrowth && (
                          <Stack spacing={2}>
                            {compareNarrative ? (
                              <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {compareNarrative}
                                </Typography>
                              </Alert>
                            ) : null}
                            {results.functionSeries && results.functionSeries.n?.length > 0 && (
                              <GrowthFitChart
                                title="Overall function (wall-clock mean vs n)"
                                series={results.functionSeries}
                                yAxisLabel="Mean time (ns)"
                                compareSeries={functionCompareSeries}
                              />
                            )}
                            {linesWithSeries.length > 0 && (
                              <Box sx={{ mt: results.functionSeries?.n?.length ? 2 : 0 }}>
                                <FormControl size="small" sx={{ minWidth: 220, mb: 1 }}>
                                  <InputLabel id="line-series-select">Line for chart</InputLabel>
                                  <Select
                                    labelId="line-series-select"
                                    label="Line for chart"
                                    value={effectiveLineKey === undefined || effectiveLineKey === null ? '' : effectiveLineKey}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setLineChartKey(v === '' ? null : Number(v));
                                    }}
                                  >
                                    {linesWithSeries.map((r) => (
                                      <MenuItem key={r.lineNumber} value={r.lineNumber}>
                                        Line {r.lineNumber}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                                {selectedLineSeries && (
                                  <GrowthFitChart
                                    title={`Line ${effectiveLineKey} (mean vs n)`}
                                    series={selectedLineSeries}
                                    yAxisLabel={lineUsesExecCounts ? 'Mean executions' : 'Mean time'}
                                    compareSeries={selectedLineCompareSeries}
                                  />
                                )}
                              </Box>
                            )}
                          </Stack>
                        )}
                        {deckTab === 2 && showStatic && (
                          <Stack spacing={1}>
                            <Typography variant="body2" component="div">
                              Function <strong>{results.staticAnalysis.function}</strong>: max loop nesting{' '}
                              <strong>{results.staticAnalysis.max_loop_nesting}</strong>,{' '}
                              <strong>{results.staticAnalysis.for_loops}</strong> for-loop(s),{' '}
                              <strong>{results.staticAnalysis.while_loops}</strong> while-loop(s), direct recursion{' '}
                              <strong>{results.staticAnalysis.recursion_direct ? 'yes' : 'no'}</strong>.
                            </Typography>
                            {(results.staticAnalysis.hints || []).length > 0 && (
                              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                {results.staticAnalysis.hints.map((h, i) => (
                                  <Typography key={i} component="li" variant="body2">
                                    {h}
                                  </Typography>
                                ))}
                              </Box>
                            )}
                          </Stack>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </Box>
                )}
              </Stack>

              <Stack
                spacing={2}
                sx={{
                  width: { xs: '100%', lg: 300 },
                  flexShrink: 0,
                  position: { lg: 'sticky' },
                  top: { lg: 16 },
                  alignSelf: 'flex-start',
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: `1px dashed ${alpha(theme.palette.secondary.main, 0.45)}`,
                    background: alpha(theme.palette.secondary.main, 0.04),
                  }}
                >
                  <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: '0.16em' }}>
                    How to read this
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.65, fontWeight: 500 }}>
                    The runway mirrors your source: each row is a line, the chromatic rail encodes the fitted class, and
                    chips summarize measurements at each <em>n</em>.
                  </Typography>
                </Paper>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: '0.16em', color: 'text.secondary' }}>
                    Deck flow
                  </Typography>
                  <Stack spacing={1.25} sx={{ mt: 1 }}>
                    {['Measure harness', 'BIC model pick', 'Line + function fits', 'Optional AST hints'].map((step, i) => (
                      <Stack key={step} direction="row" spacing={1} alignItems="center">
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            fontWeight: 900,
                            fontSize: 13,
                            bgcolor: alpha(theme.palette.primary.main, 0.2),
                            color: 'primary.main',
                          }}
                        >
                          {i + 1}
                        </Box>
                        <Typography variant="body2" fontWeight={700}>
                          {step}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              </Stack>
            </Stack>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

export default Output;
