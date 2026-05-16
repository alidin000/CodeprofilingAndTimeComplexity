import { alpha, createTheme } from '@mui/material/styles';
import { FONT_STACK } from './style/system';

const HEADING_FONT = FONT_STACK.display;
const BODY_FONT = FONT_STACK.body;
const MONO_FONT = FONT_STACK.mono;

/**
 * Analyzer theme: stone neutrals + violet primary + amber secondary.
 * Typography stacks are centralized in src/style/system.js.
 */
export function createAppTheme(mode) {
  const isDark = mode === 'dark';

  const primaryMain = isDark ? '#a78bfa' : '#5b21b6';
  const primaryDark = isDark ? '#8b5cf6' : '#4c1d95';
  const primaryLight = isDark ? '#c4b5fd' : '#6d28d9';
  const secondaryMain = isDark ? '#fcd34d' : '#b45309';
  const secondaryLight = isDark ? '#fde68a' : '#d97706';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primaryMain,
        dark: primaryDark,
        light: primaryLight,
        contrastText: isDark ? '#0c0a09' : '#ffffff',
      },
      secondary: {
        main: secondaryMain,
        light: secondaryLight,
        contrastText: isDark ? '#0c0a09' : '#ffffff',
      },
      success: { main: isDark ? '#4ade80' : '#15803d' },
      warning: { main: isDark ? '#fb923c' : '#c2410c' },
      error: { main: isDark ? '#fb7185' : '#be123c' },
      info: { main: isDark ? '#38bdf8' : '#0369a1' },
      divider: isDark ? alpha('#e7e5e4', 0.12) : alpha('#292524', 0.1),
      text: {
        primary: isDark ? '#fafaf9' : '#1c1917',
        secondary: isDark ? alpha('#fafaf9', 0.62) : alpha('#292524', 0.58),
      },
      background: {
        default: 'transparent',
        paper: isDark ? alpha('#1c1917', 0.72) : alpha('#ffffff', 0.9),
      },
      action: {
        hover: isDark ? alpha(primaryMain, 0.1) : alpha(primaryMain, 0.08),
        selected: isDark ? alpha(primaryMain, 0.18) : alpha(primaryMain, 0.12),
      },
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: BODY_FONT,
      fontSize: 15,
      h1: {
        fontFamily: HEADING_FONT,
        fontWeight: 700,
        letterSpacing: '-0.035em',
        lineHeight: 1.06,
      },
      h2: {
        fontFamily: HEADING_FONT,
        fontWeight: 700,
        letterSpacing: '-0.03em',
      },
      h3: {
        fontFamily: HEADING_FONT,
        fontWeight: 700,
        letterSpacing: '-0.03em',
      },
      h4: {
        fontFamily: HEADING_FONT,
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h5: {
        fontFamily: HEADING_FONT,
        fontWeight: 700,
      },
      h6: {
        fontFamily: HEADING_FONT,
        fontWeight: 700,
      },
      button: {
        textTransform: 'none',
        fontWeight: 700,
        letterSpacing: '0.02em',
      },
      subtitle1: { fontWeight: 700 },
      subtitle2: { fontWeight: 700 },
      fontFamilyMonospace: MONO_FONT,
    },
    shadows: [
      'none',
      isDark
        ? `0 4px 24px ${alpha('#000000', 0.55)}`
        : `0 4px 24px ${alpha('#1c1917', 0.07)}`,
      ...Array(23).fill(
        isDark
          ? `0 16px 48px ${alpha('#000000', 0.6)}`
          : `0 16px 48px ${alpha('#1c1917', 0.1)}`
      ),
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: isDark
              ? `${alpha(primaryMain, 0.45)} #0c0a09`
              : `${alpha(primaryMain, 0.35)} #e7e5e4`,
          },
          '::selection': {
            backgroundColor: alpha(primaryMain, isDark ? 0.38 : 0.22),
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'transparent', square: true },
        styleOverrides: {
          root: {
            borderRadius: 0,
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            transition: 'transform 0.2s ease, box-shadow 0.25s ease',
          },
          containedPrimary: {
            boxShadow: `0 4px 22px ${alpha(primaryMain, isDark ? 0.45 : 0.35)}`,
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: `0 8px 28px ${alpha(primaryMain, isDark ? 0.55 : 0.42)}`,
            },
          },
          outlined: {
            borderWidth: 2,
            '&:hover': { borderWidth: 2 },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: `1px solid ${isDark ? alpha('#e7e5e4', 0.1) : alpha('#292524', 0.08)}`,
            boxShadow: isDark
              ? `0 8px 40px ${alpha('#000', 0.5)}`
              : `0 8px 40px ${alpha('#1c1917', 0.06)}`,
            transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 700,
            borderRadius: 10,
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            '&:before': { display: 'none' },
            border: `1px solid ${isDark ? alpha('#e7e5e4', 0.1) : alpha('#292524', 0.08)}`,
            borderRadius: `${12}px !important`,
            mb: 1.5,
            overflow: 'hidden',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            '&.Mui-expanded': {
              boxShadow: `0 0 0 1px ${alpha(primaryMain, 0.28)}`,
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 4,
            borderRadius: 4,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 700,
            fontFamily: HEADING_FONT,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontFamily: HEADING_FONT,
            fontWeight: 700,
            letterSpacing: '0.06em',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            color: isDark ? alpha('#fafaf9', 0.88) : alpha('#1c1917', 0.72),
            borderBottom: `2px solid ${alpha(primaryMain, 0.4)}`,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontWeight: 600,
            borderRadius: 10,
            backdropFilter: 'blur(8px)',
            fontFamily: BODY_FONT,
          },
        },
      },
    },
  });
}
