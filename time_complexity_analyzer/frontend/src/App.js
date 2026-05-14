import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline, Box, Container } from '@mui/material';
import Header from './components/Header';
import Footer from './components/Footer';
import CalculatorPage from './components/CalculatorPage';
import LearningPage from './components/LearningPage';
import Login from './components/Login';
import Signup from './components/SignUp';
import AboutUs from './components/AboutUs';
import './App.css';
import 'primeflex/primeflex.css';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username') || '');

  const handleLogin = (user) => {
    setIsLoggedIn(true);
    setUsername(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername('');
  };

  return (
    <Router>
      <CssBaseline />
      <Box display="flex" flexDirection="column" minHeight="100vh">
        <Header isLoggedIn={isLoggedIn} handleLogout={handleLogout} />
        <Box flex={1} display="flex" justifyContent="center">
          <Container sx={{ maxWidth: "1800px", width: "100%" }}>
            <Routes>
              <Route path="/" element={<CalculatorPage isAuthenticated={isLoggedIn} currentUser={username} />} />
              <Route path="/learning" element={<LearningPage />} />
              <Route path="/login" element={<Login handleLogin={handleLogin} />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/about-us" element={<AboutUs />} />
            </Routes>
          </Container>
        </Box>
        <Footer />
      </Box>
    </Router>
  );
};

export default App;
