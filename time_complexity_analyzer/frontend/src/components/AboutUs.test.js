import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AboutUs from './AboutUs';

const theme = createTheme();

function renderAbout() {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <AboutUs />
      </ThemeProvider>
    </MemoryRouter>
  );
}

test('renders About Us heading', () => {
  renderAbout();
  expect(screen.getByText(/About Complexity Lab/i)).toBeInTheDocument();
});

test('renders mission and CTAs', () => {
  renderAbout();
  expect(screen.getByText(/Complexity Lab is a small workspace/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Open the Analyzer/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Browse Learning topics/i })).toBeInTheDocument();
});

test('renders limitations callout', () => {
  renderAbout();
  expect(screen.getByText(/Empirical fits depend on harness noise/i)).toBeInTheDocument();
});

test('renders embedded video', () => {
  renderAbout();
  expect(screen.getByTitle(/Time Complexity Animations/i)).toBeInTheDocument();
});
