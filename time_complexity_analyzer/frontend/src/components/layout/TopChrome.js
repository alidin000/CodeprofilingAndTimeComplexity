import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Stack,
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
import PersonAddAltOutlined from '@mui/icons-material/PersonAddAltOutlined';
import logo from '../../assets/logo.png';
import { usePlatform } from '../../context/PlatformContext';
import SidebarNav from './SidebarNav';
import { dockBtnSx, floatingGlassShellSx } from './navDockStyles';

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

  const pillNav = () => (
    <>
      <Tooltip title="Calculator" placement="bottom">
        <NavLink to="/" end aria-label="Calculator" style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <Box sx={dockBtnSx(theme, isActive)} display="flex" alignItems="center" justifyContent="center">
              <CalculateOutlined fontSize="small" />
            </Box>
          )}
        </NavLink>
      </Tooltip>
      <Tooltip title="Learning" placement="bottom">
        <NavLink to="/learning" aria-label="Learning" style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <Box sx={dockBtnSx(theme, isActive)} display="flex" alignItems="center" justifyContent="center">
              <MenuBookOutlined fontSize="small" color={isActive ? 'secondary' : 'inherit'} />
            </Box>
          )}
        </NavLink>
      </Tooltip>
      <Tooltip title="About" placement="bottom">
        <NavLink to="/about-us" aria-label="About" style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <Box sx={dockBtnSx(theme, isActive)} display="flex" alignItems="center" justifyContent="center">
              <InfoOutlined fontSize="small" />
            </Box>
          )}
        </NavLink>
      </Tooltip>
    </>
  );

  return (
    <>
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: theme.zIndex.appBar,
          width: '100%',
          py: { xs: 1.25, sm: 1.5 },
          px: { xs: 0.5, sm: 1 },
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
            pointerEvents: 'auto',
          }}
        >
          {!isMdUp && (
            <IconButton
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              size="small"
              sx={{
                ...dockBtnSx(theme, false),
                width: 40,
                height: 40,
              }}
            >
              <MenuRounded fontSize="small" />
            </IconButton>
          )}

          <Box
            component="img"
            src={logo}
            alt=""
            sx={{
              width: 32,
              height: 'auto',
              borderRadius: 1,
              display: { xs: 'none', sm: 'block' },
              filter: theme.palette.mode === 'dark' ? 'contrast(1.08) saturate(1.1)' : 'none',
            }}
          />

          {isMdUp ? pillNav() : null}

          <Divider
            orientation="vertical"
            flexItem
            sx={{
              alignSelf: 'stretch',
              my: 0.5,
              borderColor: alpha(theme.palette.divider, 0.65),
              display: { xs: 'none', md: 'block' },
            }}
          />

          <Box sx={{ minWidth: 0, maxWidth: { xs: 120, sm: 200 }, px: 0.25 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontWeight: 700,
                letterSpacing: '0.14em',
                display: { xs: 'none', sm: 'block' },
                lineHeight: 1,
              }}
            >
              WORKSPACE
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {breadcrumbLabel(location.pathname)}
            </Typography>
          </Box>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ alignSelf: 'stretch', my: 0.5, borderColor: alpha(theme.palette.divider, 0.65) }}
          />

          <Chip
            size="small"
            label="LIVE"
            sx={{
              fontWeight: 800,
              letterSpacing: '0.1em',
              borderRadius: 1,
              height: 26,
              bgcolor: alpha(theme.palette.success.main, 0.15),
              color: 'success.main',
              border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`,
              display: { xs: 'none', sm: 'flex' },
            }}
          />

          <Tooltip title="Quick actions (⌘K / Ctrl+K)">
            <IconButton
              size="small"
              onClick={() => setCommandOpen(true)}
              aria-label="Quick actions"
              sx={{ ...dockBtnSx(theme, false), width: 40, height: 40 }}
            >
              <SearchRounded fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={colorMode === 'light' ? 'Dark mode' : 'Light mode'}>
            <IconButton
              onClick={toggleColorMode}
              aria-label={colorMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              size="small"
              sx={{ ...dockBtnSx(theme, false), width: 40, height: 40 }}
            >
              {colorMode === 'light' ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
            </IconButton>
          </Tooltip>

          {isLoggedIn ? (
            <>
              <IconButton
                aria-label="account of current user"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                size="small"
                sx={{ ...dockBtnSx(theme, false), width: 40, height: 40 }}
              >
                <AccountCircle fontSize="small" />
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
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title="Log in">
                <Button
                  component={NavLink}
                  to="/login"
                  variant="contained"
                  color="primary"
                  size="small"
                  sx={{
                    borderRadius: 999,
                    fontWeight: 800,
                    px: 1.5,
                    minWidth: 0,
                    display: { xs: 'none', sm: 'inline-flex' },
                  }}
                >
                  Log in
                </Button>
              </Tooltip>
              <Tooltip title="Sign up">
                <Button
                  component={NavLink}
                  to="/signup"
                  variant="contained"
                  color="secondary"
                  size="small"
                  aria-label="Sign up"
                  sx={{
                    minWidth: 0,
                    width: 40,
                    height: 40,
                    borderRadius: '12px',
                    p: 0,
                    boxShadow: `0 6px 20px ${alpha(theme.palette.secondary.main, 0.35)}`,
                    display: { xs: 'none', sm: 'inline-flex' },
                  }}
                >
                  <PersonAddAltOutlined fontSize="small" />
                </Button>
              </Tooltip>
            </Stack>
          )}
        </Box>
      </Box>

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
