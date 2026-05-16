import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Footer from './Footer';

const theme = createTheme();

function renderFooter() {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <Footer />
      </ThemeProvider>
    </BrowserRouter>
  );
}

test('renders footer text', () => {
  renderFooter();
  expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} Complexity Lab`, 'i'))).toBeInTheDocument();
});

test('renders footer links', () => {
  renderFooter();
  expect(screen.getByText(/^About$/i)).toBeInTheDocument();
  expect(screen.getByText(/^Privacy$/i)).toBeInTheDocument();
  expect(screen.getByText(/^Licensing$/i)).toBeInTheDocument();
  expect(screen.getByText(/^Contact$/i)).toBeInTheDocument();
});
