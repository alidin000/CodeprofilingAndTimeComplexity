import React from 'react';
import {
  Box,
  Stack,
  Typography,
  Button,
  LinearProgress,
  alpha,
  useTheme,
} from '@mui/material';
import StopCircleOutlined from '@mui/icons-material/StopCircleOutlined';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import TripOriginRounded from '@mui/icons-material/TripOriginRounded';

function formatElapsed(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m > 0) return `${m}m ${String(r).padStart(2, '0')}s`;
  return `${s}s`;
}

/**
 * Full-width status while an analysis job is in flight (async API + polling).
 */
export default function AnalysisRunPanel({
  phases,
  phaseIndex,
  elapsedMs,
  onCancel,
  serverHeadline = '',
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        mb: 2,
        p: { xs: 1.75, sm: 2 },
        borderRadius: 2.5,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.05),
        boxShadow: `inset 0 1px 0 ${alpha('#fff', theme.palette.mode === 'dark' ? 0.06 : 0.35)}`,
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: '0.16em', color: 'primary.main' }}>
              Live run
            </Typography>
            <Typography variant="subtitle1" fontWeight={800} sx={{ fontFamily: theme.typography.h6.fontFamily }}>
              Profiling in progress · {formatElapsed(elapsedMs)}
            </Typography>
            {serverHeadline ? (
              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  fontWeight: 700,
                  color: 'secondary.main',
                  lineHeight: 1.5,
                  maxWidth: 720,
                }}
              >
                {serverHeadline}
              </Typography>
            ) : null}
          </Box>
          <Button
            type="button"
            variant="outlined"
            color="warning"
            size="medium"
            startIcon={<StopCircleOutlined />}
            onClick={onCancel}
            sx={{ borderRadius: 999, flexShrink: 0 }}
          >
            Cancel run
          </Button>
        </Stack>
        <LinearProgress
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            '& .MuiLinearProgress-bar': { borderRadius: 3 },
          }}
        />
        <Stack spacing={1} sx={{ mt: 0.5 }}>
          {phases.map((phase, i) => {
            const done = i < phaseIndex;
            const active = i === phaseIndex;
            return (
              <Stack
                key={phase.id}
                direction="row"
                spacing={1.25}
                alignItems="flex-start"
                sx={{
                  py: 0.75,
                  px: 1,
                  borderRadius: 1.5,
                  bgcolor: active
                    ? alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.12 : 0.1)
                    : 'transparent',
                  border: active ? `1px solid ${alpha(theme.palette.secondary.main, 0.35)}` : '1px solid transparent',
                }}
              >
                <Box sx={{ pt: 0.15, color: done ? 'success.main' : active ? 'secondary.main' : 'text.disabled' }}>
                  {done ? (
                    <CheckCircleRounded fontSize="small" />
                  ) : (
                    <TripOriginRounded fontSize="small" sx={{ opacity: active ? 1 : 0.35 }} />
                  )}
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={active ? 800 : 600} color={active ? 'text.primary' : 'text.secondary'}>
                    {phase.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.45, mt: 0.25 }}>
                    {phase.detail}
                  </Typography>
                </Box>
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
}
