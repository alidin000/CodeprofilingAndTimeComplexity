import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Stack,
  alpha,
  useTheme,
  InputAdornment,
} from '@mui/material';
import LockOutlined from '@mui/icons-material/LockOutlined';
import PersonOutline from '@mui/icons-material/PersonOutline';
import AxiosInstance from './Axios';
import { usePlatform } from '../context/PlatformContext';

const Login = () => {
  const theme = useTheme();
  const { handleLogin } = usePlatform();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await AxiosInstance.post('/login/', {
        username,
        password,
      });

      if (response.status === 200) {
        localStorage.setItem('token', response.data.access);
        localStorage.setItem('refreshToken', response.data.refresh);
        localStorage.setItem('username', username);
        handleLogin(username);
        navigate('/');
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Failed to login. Please try again.');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}`,
          background:
            theme.palette.mode === 'dark'
              ? alpha(theme.palette.background.paper, 0.85)
              : alpha('#ffffff', 0.92),
          backdropFilter: 'blur(12px)',
          boxShadow: `0 24px 80px ${alpha(theme.palette.primary.main, 0.15)}`,
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            padding: 2,
            borderRadius: 'inherit',
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
            opacity: 0.35,
          },
        }}
      >
        <Stack spacing={2} sx={{ position: 'relative' }}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: '0.18em' }}>
            Welcome back
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Log in
          </Typography>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Username"
                variant="outlined"
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutline color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Password"
                variant="outlined"
                fullWidth
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <Button type="submit" variant="contained" color="primary" size="large" sx={{ borderRadius: 999, py: 1.25 }}>
                Continue
              </Button>
            </Stack>
          </form>
          {error && (
            <Typography color="error" variant="body2" fontWeight={600}>
              {error}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            Don&apos;t have an account?{' '}
            <Link to="/signup" style={{ color: theme.palette.secondary.main, fontWeight: 700 }}>
              Sign up
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
};

export default Login;
