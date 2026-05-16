import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Typography,
  Tooltip,
  Chip,
  alpha,
  useTheme,
  useMediaQuery,
  Drawer,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import MenuRounded from '@mui/icons-material/MenuRounded';
import DarkMode from '@mui/icons-material/DarkMode';
import LightMode from '@mui/icons-material/LightMode';
import SearchRounded from '@mui/icons-material/SearchRounded';
import AccountCircle from '@mui/icons-material/AccountCircle';
import CalculateOutlined from '@mui/icons-material/CalculateOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import { usePlatform } from '../../context/PlatformContext';
import SidebarNav from './SidebarNav';

function breadcrumbLabel(pathname) {
  if (pathname === '/') return 'Analyzer';
  if (pathname.startsWith('/learning')) return 'Learning';
  if (pathname.startsWith('/about')) return 'About';
  if (pathname.startsWith('/login')) return 'Log in';
  if (pathname.startsWith('/signup')) return 'Sign up';
  return 'App';
}

export default function TopChrome() {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, handleLogout, colorMode, toggleColorMode } = usePlatform();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (path) => {
    navigate(path);
    setCommandOpen(false);
    setMobileOpen(false);
  };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          background:
            theme.palette.mode === 'dark'
              ? alpha('#020617', 0.75)
              : alpha('#ffffff', 0.82),
          backdropFilter: 'blur(16px) saturate(1.5)',
        }}
      >
        <Toolbar sx={{ gap: 1.5, minHeight: 58, py: 0.5 }}>
          {!isMdUp && (
            <IconButton edge="start" aria-label="Open menu" onClick={() => setMobileOpen(true)} size="medium">
              <MenuRounded />
            </IconButton>
          )}

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.16em' }}>
              WORKSPACE
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {breadcrumbLabel(location.pathname)}
            </Typography>
          </Box>

          <Chip
            size="small"
            label="LIVE"
            sx={{
              fontWeight: 800,
              letterSpacing: '0.12em',
              borderRadius: 1,
              bgcolor: alpha(theme.palette.success.main, 0.15),
              color: 'success.main',
              border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`,
              display: { xs: 'none', sm: 'flex' },
            }}
          />

          <Tooltip title="Quick actions (⌘K / Ctrl+K)">
            <Button
              variant="outlined"
              size="small"
              startIcon={<SearchRounded />}
              onClick={() => setCommandOpen(true)}
              sx={{
                borderRadius: 999,
                px: 2,
                display: { xs: 'none', sm: 'inline-flex' },
                borderColor: alpha(theme.palette.text.primary, 0.12),
                color: 'text.secondary',
                fontWeight: 700,
              }}
            >
              Quick
            </Button>
          </Tooltip>

          <Tooltip title={colorMode === 'light' ? 'Dark mode' : 'Light mode'}>
            <IconButton
              onClick={toggleColorMode}
              aria-label={colorMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              sx={{ border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`, borderRadius: 2 }}
            >
              {colorMode === 'light' ? <DarkMode /> : <LightMode />}
            </IconButton>
          </Tooltip>

          {isLoggedIn ? (
            <>
              <IconButton
                aria-label="account of current user"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{ border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`, borderRadius: 2 }}
              >
                <AccountCircle />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                PaperProps={{ sx: { borderRadius: 2, minWidth: 180 } }}
              >
                <MenuItem disabled sx={{ opacity: 0.75, fontSize: 13 }}>
                  Signed in
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null);
                    handleLogout();
                  }}
                >
                  Log out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              component={NavLink}
              to="/login"
              variant="contained"
              color="primary"
              sx={{ display: { xs: 'none', sm: 'inline-flex' }, borderRadius: 999, fontWeight: 800 }}
            >
              Log in
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={mobileOpen} onClose={() => setMobileOpen(false)} PaperProps={{ sx: { width: 280 } }}>
        <SidebarNav onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <Dialog open={commandOpen} onClose={() => setCommandOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Jump to</DialogTitle>
        <DialogContent dividers sx={{ pt: 0 }}>
          <List dense>
            <ListItemButton onClick={() => go('/')}>
              <ListItemIcon>
                <CalculateOutlined />
              </ListItemIcon>
              <ListItemText primary="Calculator" secondary="Run analyzer" />
            </ListItemButton>
            <ListItemButton onClick={() => go('/learning')}>
              <ListItemIcon>
                <MenuBookOutlined />
              </ListItemIcon>
              <ListItemText primary="Learning" secondary="Topics & quizzes" />
            </ListItemButton>
            <ListItemButton onClick={() => go('/about-us')}>
              <ListItemIcon>
                <InfoOutlined />
              </ListItemIcon>
              <ListItemText primary="About" secondary="Mission & video" />
            </ListItemButton>
            <Divider sx={{ my: 1 }} />
            <ListItemButton onClick={() => go('/login')}>
              <ListItemIcon>
                <LoginOutlined />
              </ListItemIcon>
              <ListItemText primary="Log in" />
            </ListItemButton>
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
}
