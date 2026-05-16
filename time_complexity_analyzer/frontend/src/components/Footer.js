import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Container, Typography, Link, Box, alpha, useTheme } from '@mui/material';

const Footer = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      component="footer"
      sx={{
        position: 'relative',
        mt: 6,
        py: 3,
        px: 2,
        color: isDark ? alpha('#faf5ff', 0.92) : alpha('#1e1033', 0.88),
        background: isDark
          ? `linear-gradient(180deg, ${alpha('#120b1e', 0.3)} 0%, ${alpha('#0a0612', 0.95)} 100%)`
          : `linear-gradient(180deg, ${alpha('#ffffff', 0.45)} 0%, ${alpha('#ede9fe', 0.95)} 100%)`,
        borderTop: `1px solid ${theme.palette.divider}`,
        backdropFilter: 'blur(14px)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.primary.light})`,
          opacity: 0.85,
        }}
      />
      <Container maxWidth="lg">
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            © {new Date().getFullYear()} Complexity Lab
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
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
                  color="inherit"
                  sx={{
                    fontSize: 14,
                    fontWeight: 600,
                    opacity: 0.9,
                    transition: 'opacity 0.2s ease, transform 0.2s ease',
                    '&:hover': { opacity: 1, transform: 'translateY(-2px)' },
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  underline="hover"
                  color="inherit"
                  sx={{
                    fontSize: 14,
                    fontWeight: 600,
                    opacity: 0.75,
                    transition: 'opacity 0.2s ease, transform 0.2s ease',
                    '&:hover': { opacity: 1, transform: 'translateY(-2px)' },
                  }}
                >
                  {item.label}
                </Link>
              )
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
