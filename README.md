
# Time Complexity Analyzer

Web app for **wall-clock profiling**, **growth-curve fitting**, and **learning content** around how a single function scales (Python, Java, C++).

---

## Quick start

| Area | Command |
|------|---------|
| **Backend** | From `time_complexity_analyzer/`: `pip install -r requirements.txt`, then `python manage.py migrate` and `python manage.py runserver` |
| **Frontend** | From `time_complexity_analyzer/frontend/`: `npm install`, then `npm start` |
| **Tests** | Backend: `python manage.py test` and/or `pytest time_complexity_analyzer/analyzer`. Frontend: `npm test` in `frontend/` |
| **Docker API** | Build/run using `time_complexity_analyzer/Dockerfile.backend` (Python **3.12** image; JDK + g++ included for Java/C++ harness) |

Environment variables for Django live in `time_complexity_analyzer/time_complexity_analyzer/settings.py` (e.g. `DJANGO_SECRET_KEY`). Use a real secret in production.

### Render.com (split static site + API)

The UI calls Django under **`/api/...`**. Those routes exist on the **API** service only.

1. On the **static site** build, set **`REACT_APP_API_URL`** to your API’s public origin, e.g. `https://your-time-complexity-api.onrender.com` (no `/api` suffix). See `time_complexity_analyzer/frontend/.env.production.example`.
2. **Rebuild** the static site so Create React App inlines the variable (build-time only).
3. Keep the **web/API** service running.

If `REACT_APP_API_URL` is missing, production builds default the API base to the **static site’s origin**; `POST /api/analyse-code/...` then hits the CDN and often returns **404**. You can also set `window.__TCA_API_BASE__` before the app bundle loads (see `frontend/src/components/Axios.js`).

---

## Stack (high level)

- **API**: Django + Django REST Framework, Gunicorn in Docker.
- **UI**: React (CRA), MUI, Framer Motion, Recharts.
- **Analysis**: SciPy least-squares fitting, optional **tree-sitter** grammars for richer Java/C++ static loop hints when those packages are installed (see `requirements.txt`).

CI runs Python **3.12** (see `.github/workflows/ci-pipeline.yml`).

---

## UI shell

- **Header**: centered floating “pill” (glass) with primary nav, workspace label, quick search (⌘/Ctrl+K), theme toggle, and auth.
- **Footer**: same floating pill treatment for copyright and links.
- **Background**: light animated complexity-themed glyphs (respects reduced-motion).

---

## Overview
The **Time Complexity Analyzer** is a tool for code profiling, designed to measure runtime and provide insights into the performance of functions. While the tool approximates the time complexity of functions, its accuracy is limited due to the inherent challenges of data fitting and model simplification.

---

## Key Features
### 1. Code Profiling and Runtime Analysis
- **Precise Runtime Measurement**:
  - Tracks execution time for each line of code.
  - Provides the total runtime of functions.
- **Profiling Features**:
  - Outputs detailed runtime logs for in-depth performance evaluation.
  - Highlights performance bottlenecks in functions.

### 2. Time Complexity Approximation
- Approximates the time complexity of functions using fitted mathematical models.
- **Limitations**:
  - The approximations may not always reflect the actual complexity, especially for functions with edge cases or unusual input distributions.
  - Relies on data fitting, which introduces inaccuracies for complex or nonstandard patterns.

### 3. Algorithm Database
- A repository of algorithms with:
  - Definitions and code examples.
  - Instructional videos and quizzes to support learning.

### 4. User Authentication
- Secure sign-up and login to provide personalized access to profiling data and analysis reports.

---

## How Runtime is Calculated
- The tool uses **instrumentation** to insert profiling hooks into the code.
- For each line or function:
  - Start and end timestamps are recorded.
  - The difference between these timestamps gives the execution time.
- Outputs include:
  - Execution time for each individual line of code.
  - Total runtime for the entire function.

---

## How Time Complexity is Approximated
### Least Squares Method
The tool applies the "least squares method" to fit runtime data to known mathematical models. Here’s how it works:

1. Collect Data:
   - The runtime for various input sizes (x_data) and corresponding execution times (y_data) are recorded.

2. Error Function:
   - The error between the observed execution times and the model predictions is minimized.
   - For a given model f(x, params), the error function is:
       Error = Σ [y_i - f(x_i, params)]^2

3. Optimization:
   - Numerical optimization techniques (e.g., least_squares from scipy.optimize) are used to adjust the parameters of the model until the error is minimized.

4. Model Selection:
   - The tool evaluates multiple models (e.g., linear, logarithmic, quadratic) and selects the one with the lowest residual sum of squares (RSS).
   - Overly complex models are penalized to avoid overfitting.


---

## Screenshots

> Paths below assume screenshots exist under `images/` at the repo root. Replace or add assets as the UI evolves.

### Main Page
![Main Page](./images/main_page.png)

### Code Output
![Code Output](./images/code_out.png)

### History
![History](./images/history.png)

### Login/Sign Up
![Login/Sign Up](./images/login_signup.png)

### Learning Page
![Learning Page](./images/learning_page.png)

---

## Limitations
1. **Accuracy of Time Complexity Approximation**:
   - Limited by the quality of data fitting and the assumptions made by the mathematical models.
   - Small coefficients or inappropriate constants can lead to misleading results.
2. **Single-Array Functions**:
   - Only supports functions with a single array as input.
3. **External Calls**:
   - Cannot measure execution time for functions that rely on external calls.

---

## Areas for Improvement
- **Better Runtime Modeling**:
  - Explore advanced optimization methods like robust regression or Bayesian optimization for improved fitting accuracy.
- **Enhanced Profiling**:
  - Add support for functions with multiple input types and external calls.
- **Sophisticated Input Handling**:
  - Improve input generation methods to better reflect real-world scenarios.

---
