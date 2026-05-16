import React from 'react';
import {
  Box,
  Typography,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';

const InfoSection = ({ language, limitations }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        mb: 4,
        p: { xs: 2, md: 3 },
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        background:
          theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.5)
            : alpha('#ffffff', 0.65),
        backdropFilter: 'blur(10px)',
      }}
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        Guardrails for {language}
      </Typography>
      <Stack spacing={1.25}>
        {limitations.map((limitation, index) => (
          <Stack direction="row" spacing={1.5} key={index} alignItems="flex-start">
            <CheckCircleOutlineRounded
              sx={{
                fontSize: 22,
                color: 'secondary.main',
                mt: 0.15,
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {limitation}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

export default InfoSection;
