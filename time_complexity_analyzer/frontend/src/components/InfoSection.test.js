import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import InfoSection from './InfoSection';

const theme = createTheme();

const limitations = ["No decorators", "Only one function should be present"];

test('renders limitations for the selected language', () => {
  render(
    <ThemeProvider theme={theme}>
      <InfoSection language="Python" limitations={limitations} />
    </ThemeProvider>
  );
  expect(screen.getByText(/Guardrails for Python/i)).toBeInTheDocument();
  expect(screen.getByText(/No decorators/i)).toBeInTheDocument();
  expect(screen.getByText(/Only one function should be present/i)).toBeInTheDocument();
});
