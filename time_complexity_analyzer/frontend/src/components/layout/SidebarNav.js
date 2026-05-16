import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Stack,
  alpha,
  useTheme,
  Button,
  Divider,
  Tooltip,
} from '@mui/material';
import CalculateOutlined from '@mui/icons-material/CalculateOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import PersonAddAltOutlined from '@mui/icons-material/PersonAddAltOutlined';
import logo from '../../assets/logo.png';
import { usePlatform } from '../../context/PlatformContext';
import { dockBtnSx, floatingGlassShellSx } from './navDockStyles';

const linkSx = (theme, { active }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  px: 2,
  py: 1.25,
  borderRadius: 2,
  textDecoration: 'none',
  color: active ? theme.palette.primary.contrastText : theme.palette.text.secondary,
  bgcolor: active ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.35 : 0.92) : 'transparent',
  border: `1px solid ${active ? alpha(theme.palette.primary.light, 0.45) : 'transparent'}`,
  fontWeight: 700,
  fontSize: 14,
  letterSpacing: '0.02em',
  transition: 'all 0.2s ease',
  '&:hover': {
    bgcolor: active
      ? alpha(theme.palette.primary.main, 0.5)
      : alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.06),
    color: active ? theme.palette.primary.contrastText : theme.palette.text.primary,
    transform: 'translateX(4px)',
  },
});

/**
 * Primary navigation: full-width drawer (mobile menu), or floating vertical dock when used in drawer.
 */
export default function SidebarNav({ onNavigate, variant = 'full' }) {
  const theme = useTheme();
  const { isLoggedIn } = usePlatform();
  const isDock = variant === 'floating';

  const wrap = (fn) => () => {
    fn?.();
    onNavigate?.();
  };

  if (isDock) {
    return (
      <Box component="nav" aria-label="Main" sx={floatingGlassShellSx(theme, { orientation: 'column' })}>
        <Box
          component="img"
          src={logo}
          alt=""
          sx={{
            width: 36,
            height: 'auto',
            borderRadius: 1.5,
            mb: 0.5,
            filter: theme.palette.mode === 'dark' ? 'contrast(1.08) saturate(1.1)' : 'none',
          }}
        />
        <Tooltip title="Calculator" placement="right">
          <NavLink to="/" end aria-label="Calculator" onClick={wrap()} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <Box sx={dockBtnSx(theme, isActive)} display="flex" alignItems="center" justifyContent="center">
                <CalculateOutlined fontSize="small" />
              </Box>
            )}
          </NavLink>
        </Tooltip>
        <Tooltip title="Learning" placement="right">
          <NavLink to="/learning" aria-label="Learning" onClick={wrap()} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <Box sx={dockBtnSx(theme, isActive)} display="flex" alignItems="center" justifyContent="center">
                <MenuBookOutlined fontSize="small" color={isActive ? 'secondary' : 'inherit'} />
              </Box>
            )}
          </NavLink>
        </Tooltip>
        <Tooltip title="About" placement="right">
          <NavLink to="/about-us" aria-label="About" onClick={wrap()} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <Box sx={dockBtnSx(theme, isActive)} display="flex" alignItems="center" justifyContent="center">
                <InfoOutlined fontSize="small" />
              </Box>
            )}
          </NavLink>
        </Tooltip>

        <Box sx={{ flex: 1, minHeight: 8 }} />

        {!isLoggedIn ? (
          <Stack spacing={1} alignItems="center">
            <Tooltip title="Log in" placement="right">
              <NavLink to="/login" aria-label="Log in" onClick={wrap()} style={{ textDecoration: 'none' }}>
                {({ isActive }) => (
                  <Box sx={dockBtnSx(theme, isActive)} display="flex" alignItems="center" justifyContent="center">
                    <LoginOutlined fontSize="small" />
                  </Box>
                )}
              </NavLink>
            </Tooltip>
            <Tooltip title="Sign up" placement="right">
              <Button
                component={NavLink}
                to="/signup"
                aria-label="Sign up"
                onClick={wrap()}
                variant="contained"
                color="secondary"
                sx={{
                  minWidth: 0,
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  p: 0,
                  boxShadow: `0 8px 28px ${alpha(theme.palette.secondary.main, 0.35)}`,
                }}
              >
                <PersonAddAltOutlined fontSize="small" />
              </Button>
            </Tooltip>
          </Stack>
        ) : (
          <Typography variant="caption" sx={{ writingMode: 'vertical-rl', textOrientation: 'mixed', opacity: 0.45, fontWeight: 700 }}>
            ●
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box
      component="nav"
      aria-label="Main"
      sx={{
        width: 244,
        height: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${theme.palette.divider}`,
        background:
          theme.palette.mode === 'dark'
            ? `linear-gradient(180deg, ${alpha('#020617', 0.98)} 0%, ${alpha('#0f172a', 0.92)} 40%, ${alpha('#020617', 0.98)} 100%)`
            : `linear-gradient(180deg, ${alpha('#ffffff', 0.98)} 0%, ${alpha('#f8fafc', 0.95)} 100%)`,
        backdropFilter: 'blur(20px)',
        py: 2,
        px: 1.5,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 1, mb: 3 }}>
        <Box
          component="img"
          src={logo}
          alt=""
          sx={{ width: 44, height: 'auto', borderRadius: 1, filter: theme.palette.mode === 'dark' ? 'contrast(1.05)' : 'none' }}
        />
        <Box>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              background: `linear-gradient(115deg, ${theme.palette.primary.light}, ${theme.palette.secondary.main})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            COMPLEXITY
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.14em' }}>
            PLATFORM
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={0.5} flex={1}>
        <NavLink to="/" end onClick={wrap()} style={{ textDecoration: 'none' }} aria-label="Calculator">
          {({ isActive }) => (
            <Box sx={linkSx(theme, { active: isActive })}>
              <CalculateOutlined fontSize="small" />
              Calculator
            </Box>
          )}
        </NavLink>
        <NavLink to="/learning" onClick={wrap()} style={{ textDecoration: 'none' }} aria-label="Learning">
          {({ isActive }) => (
            <Box sx={linkSx(theme, { active: isActive })}>
              <MenuBookOutlined fontSize="small" />
              Learning
            </Box>
          )}
        </NavLink>
        <NavLink to="/about-us" onClick={wrap()} style={{ textDecoration: 'none' }} aria-label="About">
          {({ isActive }) => (
            <Box sx={linkSx(theme, { active: isActive })}>
              <InfoOutlined fontSize="small" />
              About
            </Box>
          )}
        </NavLink>
      </Stack>

      <Divider sx={{ my: 2, borderColor: alpha(theme.palette.divider, 0.6) }} />

      {!isLoggedIn ? (
        <Stack spacing={1}>
          <Button
            component={NavLink}
            to="/login"
            variant="outlined"
            color="inherit"
            fullWidth
            onClick={wrap()}
            startIcon={<LoginOutlined />}
            aria-label="Log in"
            sx={{ borderRadius: 2, justifyContent: 'flex-start', fontWeight: 700, borderWidth: 2 }}
          >
            Log in
          </Button>
          <Button
            component={NavLink}
            to="/signup"
            variant="contained"
            color="secondary"
            fullWidth
            onClick={wrap()}
            startIcon={<PersonAddAltOutlined />}
            aria-label="Sign up"
            sx={{ borderRadius: 2, fontWeight: 800, py: 1.1 }}
          >
            Sign up
          </Button>
        </Stack>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontWeight: 600 }}>
          Use the account menu in the top bar to sign out.
        </Typography>
      )}
    </Box>
  );
}
