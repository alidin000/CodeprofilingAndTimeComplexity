/**
 * Visual system for the analyzer UI — single source for layout chrome
 * (hero, workspace shell) and copy constants. Theme colors stay in theme.js;
 * this file composes surfaces from the active MUI theme.
 */
import { alpha } from '@mui/material/styles';

export const FONT_STACK = {
  display: '"Sora", system-ui, sans-serif',
  body: '"Plus Jakarta Sans", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

/** Ordered steps shown while a run is in flight (best-effort narrative, not wired to server events). */
export const ANALYSIS_PHASES = [
  {
    id: 'submit',
    label: 'Handoff',
    detail: 'Posting code, language, and benchmark profile to the API.',
  },
  {
    id: 'bench',
    label: 'Bench passes',
    detail: 'Timed runs across multiple synthetic input sizes.',
  },
  {
    id: 'fit',
    label: 'Model fit',
    detail: 'Least-squares fits and complexity class ranking.',
  },
  {
    id: 'report',
    label: 'Assembler',
    detail: 'Per-line metrics, optional AST hints, export payload.',
  },
];

export function calculatorHeroSx(theme) {
  const m = theme.palette.mode;
  const p = theme.palette.primary.main;
  const s = theme.palette.secondary.main;
  return {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 3,
    p: { xs: 2, md: 2.5 },
    border: `1px solid ${theme.palette.divider}`,
    background:
      m === 'dark'
        ? `linear-gradient(148deg, ${alpha('#0c0a09', 0.98)} 0%, ${alpha('#1c1917', 0.94)} 52%, ${alpha(p, 0.14)} 100%)`
        : `linear-gradient(148deg, ${alpha('#ffffff', 0.99)} 0%, ${alpha('#fafaf9', 0.97)} 45%, ${alpha(s, 0.14)} 100%)`,
    boxShadow:
      m === 'dark'
        ? `0 24px 80px ${alpha('#000', 0.55)}`
        : `0 24px 80px ${alpha(p, 0.1)}`,
  };
}

export function calculatorWorkspaceSx(theme) {
  const m = theme.palette.mode;
  return {
    borderRadius: 3,
    overflow: 'hidden',
    border: `1px solid ${alpha(theme.palette.primary.main, m === 'dark' ? 0.28 : 0.18)}`,
    bgcolor: alpha(theme.palette.background.paper, m === 'dark' ? 0.5 : 0.88),
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    boxShadow:
      m === 'dark'
        ? `0 12px 48px ${alpha('#000', 0.35)}`
        : `0 12px 40px ${alpha(theme.palette.primary.main, 0.08)}`,
  };
}

export function workspaceRailSx(theme) {
  return {
    px: { xs: 1.5, sm: 2 },
    py: 1.5,
    borderBottom: `1px solid ${theme.palette.divider}`,
    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.06 : 0.04),
  };
}
