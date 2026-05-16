import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AboutUs from './AboutUs';

const theme = createTheme();

function renderAbout() {
  return render(
    <ThemeProvider theme={theme}>
      <AboutUs />
    </ThemeProvider>
  );
}

test('renders About Us heading', () => {
  renderAbout();
  expect(screen.getByText(/About Complexity Lab/i)).toBeInTheDocument();
});

test('renders About Us paragraphs', () => {
  renderAbout();
  expect(screen.getByText(/Welcome to our platform!/i)).toBeInTheDocument();
  expect(screen.getByText(/On our Learning Page/i)).toBeInTheDocument();
  expect(screen.getByText(/Utilize our Calculator Page/i)).toBeInTheDocument();
  expect(screen.getByText(/Please note that our tool/i)).toBeInTheDocument();
});

test('renders embedded video', () => {
  renderAbout();
  expect(screen.getByTitle(/Time Complexity Animations/i)).toBeInTheDocument();
});
