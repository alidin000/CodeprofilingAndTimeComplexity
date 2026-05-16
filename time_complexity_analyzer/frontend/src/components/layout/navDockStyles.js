import { alpha } from '@mui/material/styles';

/** Icon tile — shared by floating sidebar and top pill nav */
export function dockBtnSx(theme, active) {
  return {
    width: 44,
    height: 44,
    borderRadius: '12px',
    border: `1px solid ${active ? alpha(theme.palette.secondary.main, 0.65) : alpha(theme.palette.divider, 0.9)}`,
    color: active ? theme.palette.secondary.main : theme.palette.text.secondary,
    bgcolor: active
      ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.35 : 0.18)
      : alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.25 : 0.55),
    backdropFilter: 'blur(14px)',
    transition: 'transform 0.2s ease, border-color 0.2s ease, color 0.2s ease',
    '&:hover': {
      transform: 'scale(1.06)',
      borderColor: alpha(theme.palette.primary.light, 0.55),
      color: theme.palette.text.primary,
    },
  };
}

/** Outer glass shell: vertical dock (narrow) or horizontal pill (round-edged) */
export function floatingGlassShellSx(theme, { orientation = 'column' } = {}) {
  const isRow = orientation === 'row';
  return {
    display: 'flex',
    flexDirection: isRow ? 'row' : 'column',
    alignItems: 'center',
    gap: isRow ? 0.75 : 1,
    ...(isRow
      ? { py: 0.75, px: { xs: 1, sm: 1.25 }, borderRadius: 999 }
      : { py: 2, px: 1, borderRadius: 4 }),
    width: isRow ? 'fit-content' : 72,
    maxWidth: isRow ? 'min(100%, calc(100vw - 16px))' : undefined,
    flexWrap: isRow ? 'wrap' : 'nowrap',
    justifyContent: 'center',
    border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
    background:
      theme.palette.mode === 'dark'
        ? alpha('#0c0a09', 0.55)
        : alpha('#fafaf9', 0.78),
    backdropFilter: 'blur(22px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(22px) saturate(1.4)',
    boxShadow:
      theme.palette.mode === 'dark'
        ? `0 18px 60px ${alpha('#000', 0.45)}, inset 0 1px 0 ${alpha('#fff', 0.04)}`
        : `0 18px 50px ${alpha(theme.palette.primary.main, 0.12)}, inset 0 1px 0 ${alpha('#fff', 0.85)}`,
  };
}
