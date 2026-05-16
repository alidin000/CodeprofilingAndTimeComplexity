import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Typography, Link, Box, useTheme } from '@mui/material';
import { floatingGlassShellSx } from './layout/navDockStyles';

const Footer = () => {
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        position: 'relative',
        mt: 4,
        py: 2,
        px: 1,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: 'transparent',
        backgroundImage: 'none',
        border: 'none',
        boxShadow: 'none',
      }}
    >
      <Box
        sx={{
          ...floatingGlassShellSx(theme, { orientation: 'row' }),
          width: { xs: 'calc(100% - 16px)', sm: 'min(calc(100% - 32px), 920px)' },
          maxWidth: '100%',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: { xs: 'center', sm: 'space-between' },
          py: 1.25,
          px: { xs: 2, sm: 2.5 },
          gap: 2,
          rowGap: 1.5,
        }}
      >
        <Typography
          variant="body2"
          color="text.primary"
          sx={{ fontWeight: 700, textAlign: { xs: 'center', sm: 'left' } }}
        >
          © {new Date().getFullYear()} Complexity Lab
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            alignItems: 'center',
            justifyContent: { xs: 'center', sm: 'flex-end' },
          }}
        >
          {[
            { to: '/about-us', label: 'About' },
            { href: '#', label: 'Privacy' },
            { href: '#', label: 'Licensing' },
            { href: '#', label: 'Contact' },
          ].map((item) =>
            item.to ? (
              <Link
                key={item.label}
                component={RouterLink}
                to={item.to}
                underline="hover"
                color="text.secondary"
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  transition: 'color 0.2s ease, transform 0.2s ease',
                  '&:hover': { color: 'primary.main', transform: 'translateY(-1px)' },
                }}
              >
                {item.label}
              </Link>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                underline="hover"
                color="text.secondary"
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  opacity: 0.85,
                  transition: 'color 0.2s ease, transform 0.2s ease',
                  '&:hover': { color: 'primary.main', opacity: 1, transform: 'translateY(-1px)' },
                }}
              >
                {item.label}
              </Link>
            )
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Footer;
