import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  Button,
  Select,
  MenuItem,
  Typography,
  FormControl,
  InputLabel,
  Box,
  Stack,
  Chip,
  alpha,
  useTheme,
  Collapse,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
  Divider,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import CodeRounded from "@mui/icons-material/CodeRounded";
import SpeedRounded from "@mui/icons-material/SpeedRounded";
import InsightsOutlined from "@mui/icons-material/InsightsOutlined";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import { Link as RouterLink } from "react-router-dom";
import CodeEditorArea from "./CodeEditorArea";
import Output from "./CodeOut";
import AxiosInstance from "./Axios";
import InfoSection from "./InfoSection";
import AnalysisRunPanel from "./AnalysisRunPanel";
import { usePlatform } from "../context/PlatformContext";
import { ANALYSIS_PHASES } from "../style/system";
import { TIME_COMPLEXITY_NOTATION } from "../constants/timeComplexityNotation";

const limitations = {
  Java: [
    "Function must be defined as: public type functionName(int[] arr)",
    "No static methods allowed",
    "No annotations",
    "Only one function should be present",
    "No third-party libraries",
    "No empty lines or comments",
    "Code will be run with the numbers between 0 and 10^5",
    "Benchmark input profile applies to Java, Python, and C++ harnesses (how synthetic arrays are filled at each n).",
  ],
  Python: [
    "Function must accept a list as an argument",
    "Correct indentation is required",
    "No decorators",
    "Only one function should be present",
    "No third-party libraries",
    "No empty lines or comments",
    "Code will be run with the numbers between 0 and 10^5",
    "Benchmark input profile applies to Java, Python, and C++ harnesses (try sorted ascending to stress max-finding loops).",
  ],
  Cpp: [
    "Function must be defined as: type functionName(std::vector<int>& arr)",
    "No public or private keywords",
    "Only one function should be present",
    "No third-party libraries",
    "No empty lines or comments",
    "Code will be run with the numbers between 0 and 10^5",
    "Benchmark input profile applies to Java, Python, and C++ harnesses.",
  ],
};

const DEFAULT_CODES = {
  Java: `public boolean isSorted(int[] arr) {
      for (int i = 0; i < arr.length - 1; i++) {
          if (arr[i] > arr[i + 1]) {
              return false;
          }
      }
      return true;
  }`,
  Python: `def find_max(arr):
      if not arr:
          return None
      max_value = arr[0]
      for num in arr:
          if num > max_value:
              max_value = num
      return max_value`,
  Cpp: `int sumArray(std::vector<int>& arr) {
      int sum = 0;
      for (int num : arr) {
          sum += num;
      }
      return sum;
  }`,
};

const POLL_MS = 400;

function serverPhaseToStepIndex(phase) {
  if (!phase) return 0;
  if (phase === "queued" || phase === "workspace") return 0;
  if (phase === "benchmark") return 1;
  if (phase === "fitting") return 2;
  if (phase === "finalize" || phase === "done" || phase === "error" || phase === "cancelled") return 3;
  return 1;
}

function CalculatorPage() {
  const theme = useTheme();
  const { isLoggedIn: isAuthenticated, currentUser } = usePlatform();
  const [code, setCode] = useState(``);
  const [language, setLanguage] = useState("Python");
  const [outputText, setOutputText] = useState("// Output will be displayed here");
  const [results, setResults] = useState([]);
  const [lastRawAnalysis, setLastRawAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [userModifiedCode, setUserModifiedCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [benchmarkProfile, setBenchmarkProfile] = useState("random");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareProfile, setCompareProfile] = useState("sorted_ascending");
  const [teachingMode, setTeachingMode] = useState(false);
  const [lastRawAnalysisCompare, setLastRawAnalysisCompare] = useState(null);
  const [mainTab, setMainTab] = useState("source");
  const [expandedCode, setExpandedCode] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [analysisPhaseIndex, setAnalysisPhaseIndex] = useState(0);
  const [serverRunMessage, setServerRunMessage] = useState("");
  const [serverRunPhase, setServerRunPhase] = useState(null);
  const abortRef = useRef(null);
  const analysisJobIdRef = useRef(null);
  const user = isAuthenticated ? currentUser : "Unknown";

  useEffect(() => () => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!loading) {
      setElapsedMs(0);
      return undefined;
    }
    const t0 = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - t0), 100);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (!loading) {
      setAnalysisPhaseIndex(0);
      return undefined;
    }
    const t0 = Date.now();
    const id = setInterval(() => {
      const sec = (Date.now() - t0) / 1000;
      setAnalysisPhaseIndex((prev) => {
        const next = Math.min(Math.floor(sec / 2.35), ANALYSIS_PHASES.length - 1);
        return Math.max(prev, next);
      });
    }, 400);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (!loading) {
      setServerRunMessage("");
      setServerRunPhase(null);
      analysisJobIdRef.current = null;
    }
  }, [loading]);

  useEffect(() => {
    abortRef.current?.abort();
    setCode(DEFAULT_CODES[language]);
    setOutputText("// Output will be displayed here");
    setResults([]);
    setLastRawAnalysis(null);
    setLastRawAnalysisCompare(null);
    setError("");
    setUserModifiedCode(false);
    setBenchmarkProfile("random");
    setMainTab("source");
  }, [language]);

  const handleLanguageChange = (selectedLanguage) => {
    setLanguage(selectedLanguage);
    if (!userModifiedCode || code === "") {
      setCode(DEFAULT_CODES[selectedLanguage]);
    }
    setError("");
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    setUserModifiedCode(true);
  };

  const fetchHistory = () => {
    if (isAuthenticated) {
      setHistoryLoading(true);
      AxiosInstance.get(`/code-history/${user}/`)
        .then((response) => {
          const nonEmptyResults = response.data.filter(
            (entry) =>
              entry.analysis_result &&
              Object.keys(entry.analysis_result).length > 0
          );
          setHistory(nonEmptyResults);
          setHistoryLoading(false);
        })
        .catch(() => {
          setHistoryLoading(false);
        });
    }
  };

  const handleMainTabChange = (_event, newValue) => {
    if (newValue === "history" && isAuthenticated) {
      fetchHistory();
    }
    setMainTab(newValue);
  };

  const handleCancelAnalysis = useCallback(() => {
    abortRef.current?.abort();
    const jid = analysisJobIdRef.current;
    if (jid) {
      AxiosInstance.post(`/api/analyse-code/async/${jid}/cancel/`).catch(() => {});
    }
  }, []);

  const handleAnalyseClick = async () => {
    if (!user || !code || !language) {
      setError("Can't calculate it. Please check your code and try again.");
      return;
    }
    if (compareEnabled && compareProfile === benchmarkProfile) {
      setError("Pick a different compare profile than the primary benchmark.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setOutputText("Please wait...");
    setLastRawAnalysis(null);
    setLastRawAnalysisCompare(null);
    setError("");
    setServerRunMessage("Submitting job…");

    const basePayload = {
      username: user,
      code: code,
      language: language,
      time_complexity: "O(n)",
      teaching_mode: teachingMode,
    };

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const pollJob = async (jobId, profileLabel) => {
      const url = `/api/analyse-code/async/${jobId}/`;
      for (;;) {
        if (controller.signal.aborted) {
          throw new axios.Cancel("Run aborted");
        }
        const { data } = await AxiosInstance.get(url, { signal: controller.signal });
        setServerRunPhase(data.phase || null);
        const msg = data.message || data.phase || "Working…";
        setServerRunMessage(`${profileLabel ? `[${profileLabel}] ` : ""}${msg}`);
        if (data.status === "done" && data.result) {
          return data.result;
        }
        if (data.status === "error") {
          const errMsg =
            typeof data.error === "string"
              ? data.error
              : data.message || "Analysis failed";
          throw new Error(errMsg);
        }
        if (data.status === "cancelled") {
          const e = new Error("cancelled");
          e.name = "AnalysisCancelled";
          throw e;
        }
        await sleep(POLL_MS);
      }
    };

    const startJob = async (benchmark_profile) => {
      const { data } = await AxiosInstance.post(
        "/api/analyse-code/async/start/",
        { ...basePayload, benchmark_profile },
        { signal: controller.signal }
      );
      const jobId = data.job_id;
      if (!jobId) {
        throw new Error("Server did not return a job id.");
      }
      analysisJobIdRef.current = jobId;
      try {
        return await pollJob(jobId, benchmark_profile);
      } finally {
        if (analysisJobIdRef.current === jobId) {
          analysisJobIdRef.current = null;
        }
      }
    };

    try {
      const primary = await startJob(benchmarkProfile);
      setLastRawAnalysis(primary);
      setResults(formatResults(primary, code, language));
      setOutputText(formatOutput(primary, code, language));

      if (compareEnabled && compareProfile !== benchmarkProfile) {
        setServerRunMessage("Starting compare profile…");
        const secondary = await startJob(compareProfile);
        setLastRawAnalysisCompare(secondary);
      } else {
        setLastRawAnalysisCompare(null);
      }

      setError("");
      setMainTab("results");
    } catch (err) {
      if (axios.isCancel(err) || err.code === "ERR_CANCELED" || err.name === "CanceledError") {
        setOutputText("// Run cancelled — adjust your snippet and run again when ready.");
        setError("");
      } else if (err.name === "AnalysisCancelled" || err.message === "cancelled") {
        setOutputText("// Run cancelled — adjust your snippet and run again when ready.");
        setError("");
      } else if (err.response?.status === 401) {
        setError(
          "Sign in or create an account to run analysis. If you self-host the API, set TCA_ALLOW_ANONYMOUS_ANALYSIS=true (default) or DEBUG=true, then restart Django."
        );
      } else if (err.response?.status === 404) {
        const detail = err.response?.data?.detail;
        if (typeof detail === "string" && /unknown or expired job/i.test(detail)) {
          setError(
            "The analysis job disappeared immediately after it started. The API uses in-memory cache for job state, which is not shared across multiple Gunicorn workers. Redeploy the API with a single worker (this repo’s Dockerfile uses --workers 1), or configure Redis as Django’s cache backend."
          );
        } else {
          setError(
            "API returned 404 (not found). If the UI is on a different host than Django, set REACT_APP_API_URL to your API origin when building the static site (e.g. https://your-api.onrender.com with no trailing /api), clear build cache, redeploy the static site, and confirm the API URL matches your live web service."
          );
        }
      } else {
        setError(err.message || "Can't calculate it. Please check your code and try again.");
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      analysisJobIdRef.current = null;
      setLoading(false);
      setServerRunMessage("");
      setServerRunPhase(null);
    }
  };

  const formatResults = (data, code, language) => {
    const codeLines = code.split("\n");
    const results = codeLines.map((line, index) => {
      const lineNumber = language === "Python" ? index : index + 1;
      const lineInfo = data.lines ? data.lines[lineNumber] : null;

      if (lineInfo) {
        const complexity = lineInfo.best_fit ? lineInfo.best_fit.model : "";
        const avgExecTimes = lineInfo.average_exec_times || {};
        const bf = lineInfo.best_fit || {};
        return {
          line: line.trim(),
          lineNumber,
          complexity,
          notation: TIME_COMPLEXITY_NOTATION[complexity] || "",
          avgExecTimes,
          series: lineInfo.series || null,
          fitAmbiguous: Boolean(bf.ambiguous),
          runnerUpModel: bf.runner_up_model ?? null,
          runnerUpNotation:
            bf.runner_up_model && TIME_COMPLEXITY_NOTATION[bf.runner_up_model]
              ? TIME_COMPLEXITY_NOTATION[bf.runner_up_model]
              : bf.runner_up_model || null,
          bicClearance:
            bf.bic_clearance != null && Number.isFinite(bf.bic_clearance) ? bf.bic_clearance : null,
          rssRelativeRunnerUp:
            bf.rss_relative_runner_up != null && Number.isFinite(bf.rss_relative_runner_up)
              ? bf.rss_relative_runner_up
              : null,
          fitNPoints: bf.fit_n_points != null ? bf.fit_n_points : null,
        };
      }
      return {
        line: line.trim(),
        lineNumber,
        function: "",
        complexity: "",
        avgExecTimes: {},
        series: null,
      };
    });
    const functionComplexity =
      data.function && data.function.best_fit
        ? data.function.best_fit.model
        : "";
    const functionAvgExecTimes = data.function
      ? data.function.average_exec_times
      : {};
    results.functionComplexity = functionComplexity;
    results.functionComplexityWord = functionComplexity;
    results.functionNotation = TIME_COMPLEXITY_NOTATION[functionComplexity] || "";
    results.functionAvgExecTimes = functionAvgExecTimes;
    results.measurement = data.measurement;
    results.staticAnalysis = data.static_analysis ?? null;
    results.functionSeries = data.function?.series ?? null;
    results.benchmarkProfile = data.benchmark_profile ?? null;
    const fnBest = data.function?.best_fit;
    results.functionFitAmbiguous = Boolean(fnBest?.ambiguous);
    results.functionRunnerUpModel = fnBest?.runner_up_model ?? null;
    results.functionBicClearance =
      fnBest?.bic_clearance != null && Number.isFinite(fnBest.bic_clearance) ? fnBest.bic_clearance : null;
    results.functionFitNPoints = fnBest?.fit_n_points ?? null;
    results.fitStaticAlignment = data.fit_static_alignment ?? null;

    return results;
  };

  const formatOutput = (data, code, language) => {
    const lineMeasurement = data.measurement === "line_executions";
    const formatBuckets = (avgMap, useNs) => {
      if (!avgMap) return "";
      return Object.entries(avgMap)
        .map(([size, val]) => {
          if (useNs) return `${size}: ${Number(val).toFixed(2)} ns`;
          const n = Number(val);
          const s = Number.isInteger(n) ? String(n) : n.toFixed(1);
          return `${size}: ${s} exec`;
        })
        .join(", ");
    };
    const codeLines = code.split("\n");
    const linesOutput = codeLines.map((line, index) => {
      const lineNumber = language === "Python" ? index : index + 1;
      const lineInfo = data.lines ? data.lines[lineNumber] : null;
      if (lineInfo) {
        const avgExecTimes = formatBuckets(
          lineInfo.average_exec_times,
          !lineMeasurement
        );
        const amb = lineInfo.best_fit?.ambiguous ? ' [ambiguous line fit]' : '';
        return `Line ${lineNumber}: ${line} -> ${
          TIME_COMPLEXITY_NOTATION[
            lineInfo.best_fit ? lineInfo.best_fit.model : ""
          ] || ""
        } {${
          lineInfo.best_fit ? lineInfo.best_fit.model : ""
        }} (${lineMeasurement ? "Avg executions" : "Avg times"}: ${avgExecTimes})${amb}`;
      }
      return `Line ${lineNumber}: ${line}`;
    });

    const overallAvgExecTimes = formatBuckets(
      data.function && data.function.average_exec_times,
      true
    );
    const overallComplexity = data.function
      ? `\nOverall Function Time Complexity: ${
          TIME_COMPLEXITY_NOTATION[
            data.function.best_fit ? data.function.best_fit.model : ""
          ] || ""
        } {${
          data.function.best_fit ? data.function.best_fit.model : ""
        }} (Wall-clock avg: ${overallAvgExecTimes})`
      : "";
    linesOutput.push(overallComplexity);
    return linesOutput.join("\n");
  };

  const renderHistory = () => {
    if (historyLoading) {
      return (
        <Stack alignItems="center" py={4} spacing={2}>
          <LinearProgress sx={{ width: "min(400px, 100%)", borderRadius: 2 }} />
          <Typography color="text.secondary">Pulling your past runs…</Typography>
        </Stack>
      );
    }

    if (!history || history.length === 0) {
      return (
        <Typography color="text.secondary" sx={{ py: 3 }}>
          No history yet. Run an analysis while signed in to build a timeline here.
        </Typography>
      );
    }

    return history.map((entry, index) => (
      <Card
        key={index}
        sx={{
          mb: 2,
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          "&:hover": { transform: "translateY(-2px)", boxShadow: theme.shadows[4] },
        }}
      >
        <CardContent>
          <Typography
            variant="subtitle1"
            sx={{
              cursor: "pointer",
              fontWeight: 700,
              color: "primary.main",
              "&:hover": { textDecoration: "underline" },
            }}
            onClick={() =>
              setExpandedCode(expandedCode === index ? null : index)
            }
          >
            {`Code (${entry.language}) — ${entry.code.slice(0, 52)}…`}
          </Typography>
          <Collapse in={expandedCode === index}>
            <Box sx={{ mt: 2 }}>
              <Output
                outputText=""
                results={formatResults(entry.analysis_result, entry.code, entry.language)}
                error=""
                loading={false}
                rawAnalysis={entry.analysis_result}
                analysisLanguage={entry.language}
              />
            </Box>
          </Collapse>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            {`Analyzed ${new Date(entry.created_at).toLocaleString()}`}
          </Typography>
        </CardContent>
      </Card>
    ));
  };

  const heroChips = [
    { icon: <SpeedRounded />, label: "Wall-clock + line counts" },
    { icon: <CodeRounded />, label: "Java · Python · C++" },
    { icon: <InsightsOutlined />, label: "BIC growth fits" },
    { icon: <TuneOutlined />, label: "Five input schedules" },
  ];

  return (
    <Box sx={{ position: "relative", width: "100%", maxWidth: 1280, mx: "auto", pb: { xs: 3, md: 5 } }}>
      <Stack spacing={2.5}>
        <Card
          sx={{
            overflow: "hidden",
            border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
            background: `linear-gradient(110deg, ${alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.08)} 0%, transparent 55%)`,
          }}
        >
          <CardContent sx={{ py: 2.5, px: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: "0.22em" }}>
                  Analysis lab
                </Typography>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: "-0.03em", mt: 0.5 }}>
                  Profile one function —{" "}
                  <Box component="span" sx={{ color: "secondary.main" }}>
                    Learning-style
                  </Box>{" "}
                  layout.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 560, lineHeight: 1.65 }}>
                  Sticky session rail (like topic filters), tabbed workspace for source, results deck, and account
                  history. Top pill navigation: Calculator, Learning, and About live in the header.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {heroChips.map((c) => (
                  <Chip
                    key={c.label}
                    icon={c.icon}
                    label={c.label}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {loading && mainTab !== "history" ? (
          <AnalysisRunPanel
            phases={ANALYSIS_PHASES}
            phaseIndex={serverRunPhase ? serverPhaseToStepIndex(serverRunPhase) : analysisPhaseIndex}
            elapsedMs={elapsedMs}
            onCancel={handleCancelAnalysis}
            serverHeadline={serverRunMessage}
          />
        ) : null}

        <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems="stretch">
          <Card
            sx={{
              width: { xs: "100%", md: 300 },
              flexShrink: 0,
              alignSelf: { md: "flex-start" },
              position: { md: "sticky" },
              top: { md: 16 },
              maxHeight: { md: "calc(100vh - 100px)" },
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CardContent sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2, flex: 1, minHeight: 0 }}>
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: "0.2em" }}>
                  Session
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Run profile
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, lineHeight: 1.5 }}>
                  Mirrors the Learning page: configure here, read outputs in tabs →
                </Typography>
              </Box>
              <Divider />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: "0.12em" }}>
                LANGUAGE
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={language}
                onChange={(_, v) => v && handleLanguageChange(v)}
                size="small"
                orientation="vertical"
                sx={{
                  width: "100%",
                  "& .MuiToggleButton-root": {
                    justifyContent: "flex-start",
                    px: 2,
                    py: 1,
                    fontWeight: 700,
                    textTransform: "none",
                    borderRadius: "10px !important",
                    border: `1px solid ${theme.palette.divider} !important`,
                  },
                }}
              >
                <ToggleButton value="Java">Java</ToggleButton>
                <ToggleButton value="Python">Python</ToggleButton>
                <ToggleButton value="Cpp">C++</ToggleButton>
              </ToggleButtonGroup>
              <FormControl variant="outlined" size="small" fullWidth>
                <InputLabel id="benchmark-profile-label">Benchmark inputs</InputLabel>
                <Select
                  labelId="benchmark-profile-label"
                  value={benchmarkProfile}
                  onChange={(e) => setBenchmarkProfile(e.target.value)}
                  label="Benchmark inputs"
                >
                  <MenuItem value="random">Random (average-ish)</MenuItem>
                  <MenuItem value="sorted_ascending">Sorted ascending (stress max / search)</MenuItem>
                  <MenuItem value="sorted_descending">Sorted descending</MenuItem>
                  <MenuItem value="all_equal">All equal</MenuItem>
                  <MenuItem value="alternating_high_low">Alternating high / low</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={compareEnabled}
                    onChange={(_, c) => setCompareEnabled(c)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Compare with second profile
                  </Typography>
                }
              />
              {compareEnabled ? (
                <FormControl variant="outlined" size="small" fullWidth>
                  <InputLabel id="compare-profile-label">Compare profile</InputLabel>
                  <Select
                    labelId="compare-profile-label"
                    value={compareProfile}
                    onChange={(e) => setCompareProfile(e.target.value)}
                    label="Compare profile"
                  >
                    {["random", "sorted_ascending", "sorted_descending", "all_equal", "alternating_high_low"].map(
                      (p) => (
                        <MenuItem key={p} value={p} disabled={p === benchmarkProfile}>
                          {p === "random" && "Random (average-ish)"}
                          {p === "sorted_ascending" && "Sorted ascending"}
                          {p === "sorted_descending" && "Sorted descending"}
                          {p === "all_equal" && "All equal"}
                          {p === "alternating_high_low" && "Alternating high / low"}
                        </MenuItem>
                      )
                    )}
                  </Select>
                </FormControl>
              ) : null}
              {compareEnabled && compareProfile === benchmarkProfile ? (
                <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>
                  Choose a compare profile different from the primary run.
                </Typography>
              ) : null}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={teachingMode}
                    onChange={(_, c) => setTeachingMode(c)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Teaching mode (restrict fit families)
                  </Typography>
                }
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.45 }}>
                Uses a smaller growth-model menu (constant through cubic and common logs) so classroom snippets
                do not chase exotic exponentials on noisy benches.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                className="analyse-cta"
                fullWidth
                onClick={handleAnalyseClick}
                disabled={loading || (compareEnabled && compareProfile === benchmarkProfile)}
                startIcon={<PlayArrowRounded />}
                sx={{ borderRadius: 2, py: 1.25, fontWeight: 800 }}
              >
                Run analysis
              </Button>
              <Divider />
              <Button
                component={RouterLink}
                to="/learning"
                variant="outlined"
                color="inherit"
                fullWidth
                startIcon={<MenuBookOutlined />}
                sx={{ borderRadius: 2, fontWeight: 700, justifyContent: "flex-start" }}
              >
                Open Learning topics
              </Button>
              {!isAuthenticated ? (
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                  Sign in to enable the <strong>History</strong> tab.
                </Typography>
              ) : null}
            </CardContent>
          </Card>

          <Box flex={1} minWidth={0}>
            <Card sx={{ overflow: "hidden", height: "100%" }}>
              <Box
                sx={{
                  px: 2,
                  pt: 2,
                  pb: 0.5,
                  background: `linear-gradient(95deg, ${alpha(theme.palette.secondary.main, 0.08)}, transparent 55%)`,
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: "0.12em" }}>
                    NOW RUNNING
                  </Typography>
                  <Chip size="small" label={language} sx={{ fontWeight: 800 }} />
                </Stack>
                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em", mb: 1.5 }}>
                  Analyzer workspace
                </Typography>
                <Tabs value={mainTab} onChange={handleMainTabChange} variant="fullWidth" sx={{ minHeight: 52 }}>
                  <Tab icon={<CodeRounded sx={{ fontSize: 20 }} />} iconPosition="start" label="Source" value="source" />
                  <Tab
                    icon={<InsightsOutlined sx={{ fontSize: 20 }} />}
                    iconPosition="start"
                    label="Results"
                    value="results"
                  />
                  <Tab
                    icon={<HistoryRounded sx={{ fontSize: 20 }} />}
                    iconPosition="start"
                    label="History"
                    value="history"
                    disabled={!isAuthenticated}
                  />
                </Tabs>
              </Box>
              <CardContent sx={{ pt: 2.5 }}>
                {mainTab === "source" ? (
                  <CodeEditorArea language={language} code={code} onCodeChange={handleCodeChange} />
                ) : null}
                {mainTab === "results" ? (
                  <Box>
                    {loading ? (
                      <LinearProgress sx={{ mb: 2, borderRadius: 2 }} color="secondary" />
                    ) : null}
                    <Output
                      outputText={outputText}
                      results={results}
                      error={error}
                      loading={loading}
                      rawAnalysis={lastRawAnalysis}
                      rawAnalysisCompare={lastRawAnalysisCompare}
                      compareBenchmarkProfile={compareEnabled && lastRawAnalysisCompare ? compareProfile : null}
                      analysisLanguage={language}
                    />
                  </Box>
                ) : null}
                {mainTab === "history" ? renderHistory() : null}
              </CardContent>
            </Card>
          </Box>
        </Stack>

        <InfoSection language={language} limitations={limitations[language]} />
      </Stack>
    </Box>
  );
}

export default CalculatorPage;
