import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { MemoryRouter } from "react-router-dom";
import LearningPage from "./LearningPage";

const theme = createTheme();

function renderLearning() {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <LearningPage />
      </ThemeProvider>
    </MemoryRouter>
  );
}

test("renders learning page and switches tabs", async () => {
  renderLearning();
  expect(screen.getByText(/Curriculum/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Lesson/i).length).toBeGreaterThan(0);
  expect(screen.getByRole("tab", { name: /Quiz/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: /Quiz/i }));
  expect(await screen.findByText(/SUBMIT/i)).toBeInTheDocument();
});

test("renders course outline sidebar", () => {
  renderLearning();
  expect(screen.getByText(/Course outline/i)).toBeInTheDocument();
});

test("navigates between overview, implementation, and watch", () => {
  renderLearning();
  fireEvent.click(screen.getByRole("button", { name: /^Overview$/i }));
  expect(screen.getByText(/Open primary reading/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^Implementation$/i }));
  expect(screen.getByText(/^Python$/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^Watch$/i }));
  expect(screen.getByRole("button", { name: /^Watch$/i })).toBeInTheDocument();
});

test("shows reference desk accordions with sorting table and glossary", () => {
  renderLearning();
  expect(screen.getByText(/Sorting complexity reference/i)).toBeInTheDocument();
  expect(screen.getByText(/Interview glossary/i)).toBeInTheDocument();
  expect(screen.getByText(/Structured study workflow/i)).toBeInTheDocument();
  expect(screen.getByText(/Asymptotic notation/i)).toBeInTheDocument();
});

test("shows interview enrichment on overview for first lesson", () => {
  renderLearning();
  fireEvent.click(screen.getByRole("button", { name: /^Overview$/i }));
  expect(screen.getByText(/Interview angle/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /^Go to analyzer$/i })).toBeInTheDocument();
});
