import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  alpha,
  useTheme,
  Stack,
  Button,
  Grid,
  Paper,
} from '@mui/material';
import AutoStoriesRounded from '@mui/icons-material/AutoStoriesRounded';
import CalculateOutlined from '@mui/icons-material/CalculateOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';

const AboutUs = () => {
  const theme = useTheme();

  return (
    <Box sx={{ py: 1, maxWidth: 960, mx: 'auto' }}>
      <Card
        sx={{
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}`,
          background:
            theme.palette.mode === 'dark'
              ? `linear-gradient(165deg, ${alpha('#1a1428', 0.96)} 0%, ${alpha('#0f0a18', 0.92)} 100%)`
              : `linear-gradient(165deg, ${alpha('#ffffff', 0.99)} 0%, ${alpha('#faf5ff', 0.96)} 100%)`,
        }}
      >
        <Box
          sx={{
            px: { xs: 2, md: 4 },
            py: { xs: 2.5, md: 3.5 },
            background: `linear-gradient(95deg, ${alpha(theme.palette.primary.main, 0.14)}, transparent 65%)`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <AutoStoriesRounded sx={{ fontSize: 44, color: 'secondary.main', flexShrink: 0 }} />
          <Box sx={{ flex: '1 1 240px', minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: '0.2em' }}>
              Our story
            </Typography>
            <Typography variant="h3" sx={{ fontSize: { xs: '1.75rem', md: '2.35rem' }, fontWeight: 800, letterSpacing: '-0.03em' }}>
              About Complexity Lab
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.75, maxWidth: 640 }}>
              Complexity Lab is a small workspace for building intuition around how code scales: wall-clock runs,
              line-level structure hints, and model-based growth fits—so you can connect what you see on the chart with
              what you wrote in the editor.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2.5 }} flexWrap="wrap" useFlexGap>
              <Button
                component={RouterLink}
                to="/"
                variant="contained"
                color="primary"
                startIcon={<CalculateOutlined />}
                sx={{ borderRadius: 2, fontWeight: 800 }}
              >
                Open the Analyzer
              </Button>
              <Button
                component={RouterLink}
                to="/learning"
                variant="outlined"
                color="inherit"
                startIcon={<MenuBookOutlined />}
                sx={{ borderRadius: 2, fontWeight: 700, borderWidth: 2 }}
              >
                Browse Learning topics
              </Button>
            </Stack>
          </Box>
        </Box>

        <CardContent sx={{ px: { xs: 2, md: 4 }, pb: 4, pt: 1 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <InsightsOutlined fontSize="small" color="secondary" />
                What you can do here
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph sx={{ lineHeight: 1.8 }}>
                Use the <strong>Calculator</strong> to profile a single function in Python, Java, or C++ against
                synthetic inputs, inspect timings, and compare empirical growth to simple structural hints where
                available.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                Use the <strong>Learning</strong> area for denser write-ups, pitfalls, and suggested experiments you can
                paste back into the Analyzer to stress-test your understanding.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                Honest limitations
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.08 : 0.06),
                  borderColor: alpha(theme.palette.warning.main, 0.35),
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
                  Empirical fits depend on harness noise, input schedules, and constant factors. Static hints are
                  conservative and may miss unusual control flow. Nothing here replaces careful profiling on your own
                  workloads—or a formal complexity proof when you need one.
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ fontWeight: 800, mt: 3, mb: 1.5 }}>
            A short video on time complexity
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720, lineHeight: 1.7 }}>
            Visual intuition for growth rates and classic structures—useful alongside hands-on runs in the Analyzer.
          </Typography>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: 720,
              borderRadius: 2,
              overflow: 'hidden',
              border: `1px solid ${theme.palette.divider}`,
              aspectRatio: '16 / 9',
              boxShadow: theme.shadows[4],
            }}
          >
            <iframe
              src="https://www.youtube.com/embed/IA8On-kfxYo?list=PLFonK3OU1E4qVvtRGBSL0xtXOmzZkLy8x"
              title="Time Complexity Animations | Data Structure | Visual How"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AboutUs;
