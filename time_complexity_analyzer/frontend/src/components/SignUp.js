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
import PersonOutline from '@mui/icons-material/PersonOutline';
import EmailOutlined from '@mui/icons-material/EmailOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import AxiosInstance from './Axios';

const Signup = () => {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await AxiosInstance.post('/users/', {
        username: name,
        email: email,
        password: password
      });

      navigate('/login');
    } catch (err) {
      setError('Failed to sign up. Please try again.');
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
          boxShadow: `0 24px 80px ${alpha(theme.palette.secondary.main, 0.12)}`,
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            padding: 2,
            borderRadius: 'inherit',
            background: `linear-gradient(225deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
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
            Join the lab
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Create an account
          </Typography>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Name"
                variant="outlined"
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                label="E-mail"
                variant="outlined"
                fullWidth
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlined color="action" />
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
              <Button type="submit" variant="contained" color="secondary" size="large" sx={{ borderRadius: 999, py: 1.25 }}>
                Create account
              </Button>
            </Stack>
          </form>
          {error && (
            <Typography color="error" variant="body2" fontWeight={600}>
              {error}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            Have an account?{' '}
            <Link to="/login" style={{ color: theme.palette.primary.main, fontWeight: 700 }}>
              Log in
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
};

export default Signup;
