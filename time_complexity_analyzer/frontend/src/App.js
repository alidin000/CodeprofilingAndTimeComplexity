import React, { useMemo, useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline, Box, ThemeProvider, LinearProgress } from '@mui/material';
import CalculatorPage from './components/CalculatorPage';
import Login from './components/Login';
import Signup from './components/SignUp';
import AboutUs from './components/AboutUs';
import PlatformLayout from './components/layout/PlatformLayout';
import AmbientSymbols from './components/layout/AmbientSymbols';
import { PlatformProvider } from './context/PlatformContext';
import { createAppTheme } from './theme';
import './App.css';
import 'primeflex/primeflex.css';

const LearningPage = lazy(() => import('./components/LearningPage'));

const STORAGE_KEY = 'tca_color_mode';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [colorMode, setColorMode] = useState(() =>
    localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  );

  const theme = useMemo(() => createAppTheme(colorMode), [colorMode]);

  const toggleColorMode = useCallback(() => {
    setColorMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const handleLogin = useCallback((user) => {
    setIsLoggedIn(true);
    setUsername(user);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername('');
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorMode);
  }, [colorMode]);

  const platformValue = useMemo(
    () => ({
      isLoggedIn,
      currentUser: username,
      handleLogin,
      handleLogout,
      colorMode,
      toggleColorMode,
    }),
    [isLoggedIn, username, handleLogin, handleLogout, colorMode, toggleColorMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <PlatformProvider value={platformValue}>
        <Router>
          <CssBaseline />
          <Box className="app-shell">
            <AmbientSymbols />
            <Box className="app-shell-inner" display="flex" flexDirection="column" minHeight="100vh">
              <Routes>
                <Route element={<PlatformLayout />}>
                  <Route path="/" element={<CalculatorPage />} />
                  <Route
                    path="/learning"
                    element={
                      <Suspense
                        fallback={
                          <Box sx={{ p: 4, maxWidth: 720, mx: 'auto' }}>
                            <LinearProgress color="secondary" sx={{ borderRadius: 2 }} />
                          </Box>
                        }
                      >
                        <LearningPage />
                      </Suspense>
                    }
                  />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/about-us" element={<AboutUs />} />
                </Route>
              </Routes>
            </Box>
          </Box>
        </Router>
      </PlatformProvider>
    </ThemeProvider>
  );
};

export default App;
