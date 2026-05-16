import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PlatformProvider } from '../../context/PlatformContext';
import TopChrome from './TopChrome';

const theme = createTheme();
const noop = () => {};

function renderTopChrome({ isLoggedIn = false } = {}) {
  return render(
    <MemoryRouter initialEntries={['/']}>
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
          <Routes>
            <Route path="*" element={<TopChrome />} />
          </Routes>
        </ThemeProvider>
      </PlatformProvider>
    </MemoryRouter>
  );
}

test('top chrome exposes theme toggle', () => {
  renderTopChrome({ isLoggedIn: false });
  expect(screen.getByLabelText(/Switch to dark mode/i)).toBeInTheDocument();
});

test('top chrome account menu when logged in', () => {
  renderTopChrome({ isLoggedIn: true });
  fireEvent.click(screen.getByLabelText(/account of current user/i));
  expect(screen.getByRole('menuitem', { name: /Log out/i })).toBeInTheDocument();
});
