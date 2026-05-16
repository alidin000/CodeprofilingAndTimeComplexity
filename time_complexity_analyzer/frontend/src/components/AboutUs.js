import React from 'react';
import { Box, Card, CardContent, Typography, alpha, useTheme } from '@mui/material';
import AutoStoriesRounded from '@mui/icons-material/AutoStoriesRounded';

const AboutUs = () => {
  const theme = useTheme();

  return (
    <Box sx={{ py: 1 }}>
      <Card
        sx={{
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}`,
          background:
            theme.palette.mode === 'dark'
              ? `linear-gradient(160deg, ${alpha('#1a1428', 0.95)} 0%, ${alpha('#0f0a18', 0.9)} 100%)`
              : `linear-gradient(160deg, ${alpha('#ffffff', 0.98)} 0%, ${alpha('#faf5ff', 0.95)} 100%)`,
        }}
      >
        <Box
          sx={{
            px: { xs: 2, md: 4 },
            py: { xs: 2.5, md: 3.5 },
            background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.12)}, transparent)`,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <AutoStoriesRounded sx={{ fontSize: 40, color: 'secondary.main' }} />
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: '0.2em' }}>
              Our story
            </Typography>
            <Typography variant="h3" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
              About Complexity Lab
            </Typography>
          </Box>
        </Box>
        <CardContent sx={{ px: { xs: 2, md: 4 }, pb: 4 }}>
          <Typography variant="body1" paragraph color="text.secondary" sx={{ lineHeight: 1.8 }}>
            Welcome to our platform! Our mission is to provide you with the tools and knowledge to understand algorithms and data structures comprehensively. We aim to assist you in calculating the time complexity of various algorithms, albeit with certain limitations.
          </Typography>
          <Typography variant="body1" paragraph color="text.secondary" sx={{ lineHeight: 1.8 }}>
            On our Learning Page, you will find detailed tutorials and resources designed to help you grasp different data structures and algorithms. We also offer visualizations to make your learning experience more engaging and effective.
          </Typography>
          <Typography variant="body1" paragraph color="text.secondary" sx={{ lineHeight: 1.8 }}>
            Utilize our Calculator Page to estimate the time complexity of your algorithms. This tool is crafted to help you gain insights into your code’s performance and to assist in its optimization.
          </Typography>
          <Typography variant="body1" paragraph color="text.secondary" sx={{ lineHeight: 1.8 }}>
            Please note that our tool is not yet perfect and may not always provide accurate results. Further research and development are required to enhance its accuracy.
          </Typography>
          <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
            A short video about Time Complexity
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
