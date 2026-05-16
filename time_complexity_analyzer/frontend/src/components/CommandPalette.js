import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  InputAdornment,
  Typography,
  Box,
  alpha,
  useTheme,
} from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import TerminalOutlined from '@mui/icons-material/TerminalOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import PersonAddAltOutlined from '@mui/icons-material/PersonAddAltOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { useNavigate } from 'react-router-dom';
import { usePlatform } from '../context/PlatformContext';

const COMMANDS = [
  { id: 'analyzer', label: 'Open Analyzer', path: '/', keywords: 'home calculator code profile', icon: <TerminalOutlined fontSize="small" /> },
  { id: 'learning', label: 'Open Learning hub', path: '/learning', keywords: 'lessons quiz syllabus', icon: <SchoolOutlined fontSize="small" /> },
  { id: 'login', label: 'Sign in', path: '/login', keywords: 'auth account', icon: <LoginOutlined fontSize="small" /> },
  { id: 'signup', label: 'Create account', path: '/signup', keywords: 'register join', icon: <PersonAddAltOutlined fontSize="small" /> },
  { id: 'about', label: 'About', path: '/about-us', keywords: 'team info', icon: <InfoOutlined fontSize="small" /> },
];

export default function CommandPalette() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isLoggedIn } = usePlatform();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords.toLowerCase().includes(q) ||
        c.id.includes(q)
    );
  }, [query]);

  const go = useCallback(
    (path) => {
      navigate(path);
      setOpen(false);
      setQuery('');
    },
    [navigate]
  );

  useEffect(() => {
    const onKey = (e) => {
      const isK = e.key === 'k' || e.key === 'K';
      if ((e.ctrlKey || e.metaKey) && isK) {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) {
          return;
        }
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
            backgroundImage: `linear-gradient(120deg, ${alpha(theme.palette.primary.main, 0.06)}, transparent 45%)`,
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, fontWeight: 800, letterSpacing: '-0.02em' }}>
        Command palette
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontWeight: 600 }}>
          {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+K · signed {isLoggedIn ? 'in' : 'out'}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="Jump to…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ mb: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <List dense disablePadding sx={{ maxHeight: 360, overflow: 'auto' }}>
          {filtered.map((c) => (
            <ListItemButton
              key={c.id}
              onClick={() => go(c.path)}
              sx={{ borderRadius: 2, mb: 0.5, alignItems: 'center', gap: 1.5 }}
            >
              <Box sx={{ color: 'primary.main', display: 'flex' }}>{c.icon}</Box>
              <ListItemText primary={c.label} secondary={c.path} primaryTypographyProps={{ fontWeight: 800 }} />
            </ListItemButton>
          ))}
          {filtered.length === 0 && (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No matches — try “learn”, “login”, or “about”.
              </Typography>
            </Box>
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
}
