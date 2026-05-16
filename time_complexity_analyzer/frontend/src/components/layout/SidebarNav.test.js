import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PlatformProvider } from '../../context/PlatformContext';
import SidebarNav from './SidebarNav';

const theme = createTheme();

const noop = () => {};

function renderSidebar({ isLoggedIn = false } = {}) {
  return render(
    <MemoryRouter>
      <PlatformProvider
        value={{
          isLoggedIn,
          currentUser: isLoggedIn ? 'alice' : '',
          handleLogin: noop,
          handleLogout: noop,
          colorMode: 'light',
          toggleColorMode: noop,
        }}
      >
        <ThemeProvider theme={theme}>
          <SidebarNav />
        </ThemeProvider>
      </PlatformProvider>
    </MemoryRouter>
  );
}

test('sidebar shows primary navigation when logged out', () => {
  renderSidebar({ isLoggedIn: false });
  expect(screen.getByRole('link', { name: /Calculator/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Learning/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /About/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Log in/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Sign up/i })).toBeInTheDocument();
});

test('sidebar hides auth CTAs when logged in', () => {
  renderSidebar({ isLoggedIn: true });
  expect(screen.getByRole('link', { name: /Calculator/i })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /^Sign up$/i })).not.toBeInTheDocument();
});
