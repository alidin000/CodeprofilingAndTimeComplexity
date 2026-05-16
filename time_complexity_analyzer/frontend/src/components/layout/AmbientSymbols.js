import React from 'react';
import { Box, useTheme, alpha } from '@mui/material';
import { useReducedMotion } from 'framer-motion';

/**
 * Decorative floating glyphs (Big-O, braces, growth). Sits above the mesh gradient,
 * below app content (see App.js + .app-shell-inner z-index). pointer-events: none.
 */
const GLYPHS = [
  { label: 'O(n)', top: '5%', left: '2%', delay: '0s', dur: '19s', alt: false },
  { label: 'Ω(n)', top: '8%', right: '4%', delay: '1.1s', dur: '22s', alt: true },
  { label: '{ }', top: '38%', left: '1%', delay: '0.3s', dur: '17s', alt: true },
  { label: 'Θ(1)', bottom: '32%', right: '2%', delay: '1.8s', dur: '21s', alt: false },
  { label: 'n²', top: '48%', right: '8%', delay: '0.6s', dur: '20s', alt: false },
  { label: '≤', top: '18%', left: '14%', delay: '2.2s', dur: '24s', alt: true },
  { label: 'log n', bottom: '10%', left: '4%', delay: '0.9s', dur: '26s', alt: false },
  { label: '↗', top: '62%', left: '8%', delay: '2.5s', dur: '18s', alt: true },
  { label: 'O(1)', bottom: '16%', right: '12%', delay: '0.4s', dur: '23s', alt: false },
  { label: 'Σ', top: '28%', right: '18%', delay: '1.4s', dur: '25s', alt: true },
  { label: '[ ]', bottom: '42%', left: '12%', delay: '2s', dur: '19s', alt: false },
  { label: '#', top: '72%', right: '22%', delay: '0.2s', dur: '27s', alt: true },
  { label: 'O(n log n)', top: '12%', left: '28%', delay: '1.6s', dur: '28s', alt: false },
  { label: '∞', bottom: '24%', left: '22%', delay: '2.8s', dur: '22s', alt: true },
  { label: 'λ', top: '52%', left: '3%', delay: '0.7s', dur: '20s', alt: false },
  { label: 'BIC', bottom: '8%', right: '28%', delay: '1.2s', dur: '24s', alt: true },
  { label: '( )', top: '22%', right: '32%', delay: '2.1s', dur: '21s', alt: false },
  { label: 'f(n)', bottom: '38%', right: '6%', delay: '0.5s', dur: '26s', alt: true },
  { label: '→', top: '34%', left: '38%', delay: '1.9s', dur: '18s', alt: false },
  { label: 'O(n³)', bottom: '48%', right: '38%', delay: '2.3s', dur: '29s', alt: true },
];

export default function AmbientSymbols() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();

  const glow =
    theme.palette.mode === 'dark'
      ? `0 0 32px ${alpha('#0c0a09', 0.65)}, 0 0 2px ${alpha(theme.palette.primary.light, 0.35)}`
      : `0 0 28px ${alpha('#fafaf9', 0.9)}, 0 0 2px ${alpha(theme.palette.primary.main, 0.25)}`;

  return (
    <Box
      aria-hidden
      className="ambient-symbols-root"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {GLYPHS.map((g, i) => {
        const classes = ['ambient-glyph', g.alt ? 'ambient-glyph--alt' : '', reduceMotion ? 'ambient-glyph--static' : '']
          .filter(Boolean)
          .join(' ');
        return (
          <Box
            key={`${g.label}-${i}`}
            className={classes}
            sx={{
              position: 'absolute',
              top: g.top,
              left: g.left,
              right: g.right,
              bottom: g.bottom,
              color: theme.palette.primary.main,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: { xs: 'clamp(0.95rem, 3.8vmin, 1.35rem)', md: 'clamp(1.05rem, 2.8vmin, 1.85rem)' },
              fontWeight: 800,
              letterSpacing: g.label.length > 4 ? '0.04em' : '0.1em',
              userSelect: 'none',
              animationDelay: g.delay,
              animationDuration: g.dur,
              textShadow: glow,
              WebkitFontSmoothing: 'antialiased',
            }}
          >
            {g.label}
          </Box>
        );
      })}
    </Box>
  );
}
