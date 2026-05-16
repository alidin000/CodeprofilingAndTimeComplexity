import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Box,
  Link,
  Stack,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Divider,
  alpha,
  useTheme,
  TextField,
  InputAdornment,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import SearchRounded from "@mui/icons-material/SearchRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import QuizRounded from "@mui/icons-material/QuizRounded";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import ArticleOutlined from "@mui/icons-material/ArticleOutlined";
import IntegrationInstructionsOutlined from "@mui/icons-material/IntegrationInstructionsOutlined";
import OndemandVideoOutlined from "@mui/icons-material/OndemandVideoOutlined";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import CancelOutlined from "@mui/icons-material/CancelOutlined";
import EmojiEventsOutlined from "@mui/icons-material/EmojiEventsOutlined";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import ExpandMore from "@mui/icons-material/ExpandMore";
import TipsAndUpdatesOutlined from "@mui/icons-material/TipsAndUpdatesOutlined";
import TerminalOutlined from "@mui/icons-material/TerminalOutlined";
import FormatListNumberedRounded from "@mui/icons-material/FormatListNumberedRounded";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import algorithmsData from "../data_files/algorithmsData.json";
import guidedTracks from "../data/guidedTracks.json";
import {
  COMPLEXITY_TABLE_NOTES,
  GLOSSARY_ITEMS,
  SORTING_COMPLEXITY_ROWS,
  STUDY_WORKFLOW_STEPS,
  getSortingComplexityRow,
  getTopicEnrichment,
} from "../data/learningEnhancements";

const GUIDED_TRACK_PROGRESS_KEY = "tca_guided_track_progress_v1";

function readGuidedProgress() {
  try {
    return JSON.parse(localStorage.getItem(GUIDED_TRACK_PROGRESS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeGuidedProgress(obj) {
  localStorage.setItem(GUIDED_TRACK_PROGRESS_KEY, JSON.stringify(obj));
}

function inferCategory(name) {
  const n = name.toLowerCase();
  if (/sort|heap|bubble|insertion|selection|merge|quick|radix|bucket|counting|shell|tim/.test(n)) return "Sorting";
  if (/search|binary|linear/.test(n)) return "Search";
  if (/tree|graph|list|stack|queue|hash|trie/.test(n)) return "Structures";
  return "Concepts";
}

function extractUrl(description) {
  const urlMatch = description.match(/\(https?:\/\/[^\s]+\)/);
  return urlMatch ? urlMatch[0].slice(1, -1) : null;
}

function stripMarkdownLink(description) {
  return description.replace(/\[.*?\]\([^)]+\)/, "").trim();
}

function youtubeWatchUrlFromVideoHtml(html) {
  if (!html || typeof html !== "string") return null;
  const m = html.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
  return m ? `https://www.youtube.com/watch?v=${m[1]}` : null;
}

function notationChipsFromText(text) {
  const found = new Set();
  const re = /O\([^)]*\)/gi;
  let m;
  while ((m = re.exec(text))) {
    found.add(m[0]);
    if (found.size >= 6) break;
  }
  return [...found];
}

const CATEGORY_ORDER = ["Sorting", "Search", "Structures", "Concepts"];

function groupTopicsByCategory(topics) {
  const map = new Map();
  for (const a of topics) {
    const c = inferCategory(a.name);
    if (!map.has(c)) map.set(c, []);
    map.get(c).push(a);
  }
  return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({ category: c, topics: map.get(c) }));
}

function estimateReadMinutes(text) {
  if (!text || typeof text !== "string") return 1;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function BreadcrumbsNav() {
  const theme = useTheme();
  const crumbSx = {
    display: "inline-flex",
    alignItems: "center",
    gap: 0.35,
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: "0.04em",
    color: "text.secondary",
    textDecoration: "none",
    "&:hover": { color: "primary.main" },
  };
  return (
    <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" sx={{ rowGap: 0.5 }}>
      <Box component={RouterLink} to="/" sx={{ ...crumbSx, color: "text.secondary" }}>
        <HomeOutlined sx={{ fontSize: 16 }} />
        Home
      </Box>
      <Typography component="span" variant="caption" sx={{ color: alpha(theme.palette.text.primary, 0.35), fontWeight: 800 }}>
        /
      </Typography>
      <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: "0.06em", color: "text.primary" }}>
        Learning hub
      </Typography>
    </Stack>
  );
}

function LearningHero({ topicCount, trackHoursLabel }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.4 }}
    >
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.secondary.main, theme.palette.mode === "dark" ? 0.35 : 0.28)}`,
          background:
            theme.palette.mode === "dark"
              ? `linear-gradient(128deg, ${alpha(theme.palette.primary.main, 0.22)} 0%, ${alpha("#0c0a09", 0.92)} 42%, ${alpha(theme.palette.secondary.main, 0.12)} 100%)`
              : `linear-gradient(125deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha("#fff", 0.97)} 40%, ${alpha(theme.palette.secondary.main, 0.14)} 100%)`,
          boxShadow:
            theme.palette.mode === "dark"
              ? `0 28px 100px ${alpha("#000", 0.55)}, inset 0 1px 0 ${alpha("#fff", 0.06)}`
              : `0 28px 90px ${alpha("#1c1917", 0.1)}, inset 0 1px 0 ${alpha("#fff", 0.85)}`,
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            top: { xs: -80, md: -100 },
            right: { xs: -100, md: -40 },
            width: { xs: 260, md: 340 },
            height: { xs: 260, md: 340 },
            borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.35)} 0%, transparent 68%)`,
            pointerEvents: "none",
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            bottom: -40,
            left: "8%",
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.22)} 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        <Box sx={{ position: "relative", zIndex: 1, p: { xs: 2.5, sm: 3, md: 4 } }}>
          <Stack direction={{ xs: "column", lg: "row" }} spacing={3.5} alignItems={{ lg: "stretch" }} justifyContent="space-between">
            <Box sx={{ flex: 1, minWidth: 0, maxWidth: { lg: "62%" } }}>
              <BreadcrumbsNav />
              <Typography
                variant="overline"
                sx={{
                  mt: 2,
                  display: "block",
                  fontWeight: 800,
                  letterSpacing: "0.28em",
                  color: alpha(theme.palette.secondary.main, 0.95),
                }}
              >
                MSCI Time Complexity Lab
              </Typography>
              <Typography
                component="h1"
                variant="h3"
                sx={{
                  mt: 1,
                  fontWeight: 800,
                  letterSpacing: "-0.045em",
                  lineHeight: 1.08,
                  textWrap: "balance",
                }}
              >
                A studio-grade{" "}
                <Box component="span" sx={{ color: "primary.main" }}>
                  algorithms
                </Box>{" "}
                study program
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2, maxWidth: 560, lineHeight: 1.75, fontSize: 16 }}>
                Dense lessons, reference implementations, and checks you can run against the Analyzer—built to read like internal enablement, not a
                weekend tutorial site.
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2.5 }}>
                <Chip variant="outlined" label={`${topicCount} catalog lessons`} sx={{ fontWeight: 800, borderWidth: 2 }} />
                <Chip variant="outlined" label={`~${trackHoursLabel} h material`} sx={{ fontWeight: 800, borderWidth: 2 }} />
                <Chip variant="outlined" label="Interview-grade framing" sx={{ fontWeight: 800, borderWidth: 2 }} />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3 }}>
                <Button
                  component={RouterLink}
                  to="/"
                  variant="contained"
                  color="primary"
                  size="large"
                  endIcon={<TerminalOutlined />}
                  sx={{ px: 3, py: 1.25, fontWeight: 900 }}
                >
                  Open analyzer
                </Button>
                <Button variant="outlined" color="inherit" size="large" href="#learning-reference" sx={{ px: 3, py: 1.25, fontWeight: 800, borderWidth: 2 }}>
                  Jump to reference
                </Button>
              </Stack>
            </Box>
            <Stack spacing={1.25} sx={{ width: { xs: 1, lg: 300 }, flexShrink: 0 }}>
              {[
                { k: "Lessons", v: String(topicCount), sub: "sorting · structures · graphs" },
                { k: "Depth", v: "3 modes", sub: "Overview · Implementation · Watch" },
                { k: "Checks", v: "Quizzes", sub: "Per-topic knowledge gates" },
              ].map((tile) => (
                <Paper
                  key={tile.k}
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
                    bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.45 : 0.55),
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: "0.16em" }}>
                    {tile.k}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.03em", mt: 0.25 }}>
                    {tile.v}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mt: 0.5 }}>
                    {tile.sub}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </motion.div>
  );
}

function LearningReferenceLibrary() {
  const theme = useTheme();
  return (
    <Stack id="learning-reference" spacing={2} sx={{ pt: 1 }}>
      <Stack spacing={0.5}>
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: "0.22em", color: "text.secondary" }}>
          Reference desk
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
          Tables, glossary, and how to study
        </Typography>
      </Stack>
      <Accordion
        defaultExpanded
        disableGutters
        elevation={0}
        sx={{
          borderRadius: "12px !important",
          border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
          overflow: "hidden",
          "&:before": { display: "none" },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2, py: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <MenuBookOutlined color="primary" />
            <Typography sx={{ fontWeight: 800 }}>Sorting complexity reference</Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ borderRadius: 2, overflow: "auto", borderColor: alpha(theme.palette.text.primary, 0.12) }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {["Algorithm", "Best", "Average", "Worst", "Extra space", "Stable"].map((h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {SORTING_COMPLEXITY_ROWS.map((row) => (
                  <TableRow key={row.name} hover>
                    <TableCell sx={{ fontWeight: 800 }}>{row.name}</TableCell>
                    <TableCell sx={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13 }}>{row.best}</TableCell>
                    <TableCell sx={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13 }}>{row.average}</TableCell>
                    <TableCell sx={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13 }}>{row.worst}</TableCell>
                    <TableCell sx={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13 }}>{row.space}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{row.stable}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, lineHeight: 1.6, fontWeight: 600 }}>
            {COMPLEXITY_TABLE_NOTES}
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Accordion
        disableGutters
        elevation={0}
        sx={{
          borderRadius: "12px !important",
          border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
          overflow: "hidden",
          "&:before": { display: "none" },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2, py: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TipsAndUpdatesOutlined color="secondary" />
            <Typography sx={{ fontWeight: 800 }}>Interview glossary</Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
          <Stack spacing={2}>
            {GLOSSARY_ITEMS.map((g) => (
              <Box key={g.term}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "primary.main" }}>
                  {g.term}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.65 }}>
                  {g.def}
                </Typography>
              </Box>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
      <Accordion
        disableGutters
        elevation={0}
        sx={{
          borderRadius: "12px !important",
          border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
          overflow: "hidden",
          "&:before": { display: "none" },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2, py: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <FormatListNumberedRounded color="primary" />
            <Typography sx={{ fontWeight: 800 }}>Structured study workflow</Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
          <Stack spacing={2}>
            {STUDY_WORKFLOW_STEPS.map((s, i) => (
              <Stack key={s.title} direction="row" spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    minWidth: 36,
                    height: 36,
                    borderRadius: 2,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 900,
                    fontSize: 14,
                    bgcolor: alpha(theme.palette.primary.main, 0.18),
                    color: "primary.main",
                  }}
                >
                  {i + 1}
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    {s.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.65 }}>
                    {s.body}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}

const LearningPage = () => {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [topicQuery, setTopicQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("Lesson");
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(algorithmsData[0].name);
  const [quizState, setQuizState] = useState({
    currentQuestionIndex: 0,
    selectedOption: null,
    correctAnswers: 0,
    showResults: false,
    feedback: null,
  });
  const [guidedTrackId, setGuidedTrackId] = useState("");
  const [guidedProgress, setGuidedProgress] = useState(() => readGuidedProgress());

  const topicCount = algorithmsData.length;

  const activeTrack = useMemo(
    () => guidedTracks.tracks.find((t) => t.id === guidedTrackId) || null,
    [guidedTrackId]
  );

  useEffect(() => {
    if (!guidedTrackId || !activeTrack) return;
    if (!activeTrack.lessonNames.includes(selectedAlgorithm)) {
      setSelectedAlgorithm(activeTrack.lessonNames[0]);
    }
  }, [guidedTrackId, activeTrack, selectedAlgorithm]);

  useEffect(() => {
    if (!guidedTrackId || !activeTrack?.lessonNames.includes(selectedAlgorithm)) return;
    setGuidedProgress((prev) => {
      const next = { ...prev };
      const set = new Set(next[guidedTrackId]?.visited || []);
      set.add(selectedAlgorithm);
      next[guidedTrackId] = { visited: [...set] };
      writeGuidedProgress(next);
      return next;
    });
  }, [selectedAlgorithm, guidedTrackId, activeTrack]);

  const filteredTopics = useMemo(() => {
    const q = topicQuery.trim().toLowerCase();
    const base =
      guidedTrackId && activeTrack
        ? activeTrack.lessonNames
            .map((name) => algorithmsData.find((a) => a.name === name))
            .filter(Boolean)
        : algorithmsData;
    if (!q) return base;
    return base.filter((a) => a.name.toLowerCase().includes(q));
  }, [topicQuery, guidedTrackId, activeTrack]);

  const curriculumByModule = useMemo(() => {
    if (guidedTrackId && activeTrack) {
      return [{ category: activeTrack.title, topics: filteredTopics }];
    }
    return groupTopicsByCategory(filteredTopics);
  }, [guidedTrackId, activeTrack, filteredTopics]);

  const trackTotalLessons = activeTrack?.lessonNames.length ?? 0;
  const trackVisitedCount = guidedTrackId ? guidedProgress[guidedTrackId]?.visited?.length ?? 0 : 0;
  const trackLessonIndex =
    activeTrack && activeTrack.lessonNames.includes(selectedAlgorithm)
      ? activeTrack.lessonNames.indexOf(selectedAlgorithm) + 1
      : null;

  const selectedAlgoObj = useMemo(
    () => algorithmsData.find((a) => a.name === selectedAlgorithm),
    [selectedAlgorithm]
  );
  const lessonIndexInCatalog = algorithmsData.findIndex((a) => a.name === selectedAlgorithm) + 1;
  const readMinutes = selectedAlgoObj ? estimateReadMinutes(stripMarkdownLink(selectedAlgoObj.description)) : 1;
  const quizCount = selectedAlgoObj?.quiz?.length ?? 0;
  const trackHoursLabel = Math.max(1, Math.round((topicCount * 14) / 60));

  const handleTabChange = (_event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleAlgorithmSelect = (algorithmName) => {
    setSelectedAlgorithm(algorithmName);
    setQuizState({
      currentQuestionIndex: 0,
      selectedOption: null,
      correctAnswers: 0,
      showResults: false,
      feedback: null,
    });
  };

  return (
    <Box className="learning-hub" sx={{ maxWidth: 1320, mx: "auto", width: 1, pb: { xs: 3, md: 5 } }}>
      <Stack spacing={{ xs: 2.5, md: 3.5 }}>
        <LearningHero topicCount={topicCount} trackHoursLabel={trackHoursLabel} />

        <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} alignItems="flex-start">
          <Paper
            elevation={0}
            sx={{
              width: { xs: "100%", lg: 352 },
              flexShrink: 0,
              alignSelf: { lg: "flex-start" },
              position: { lg: "sticky" },
              top: { lg: 16 },
              maxHeight: { lg: "calc(100vh - 88px)" },
              display: "flex",
              flexDirection: "column",
              borderRadius: 3,
              overflow: "hidden",
              border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
              background:
                theme.palette.mode === "dark"
                  ? `linear-gradient(165deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.background.paper, 0.55)} 55%)`
                  : `linear-gradient(165deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha("#fff", 0.88)} 50%)`,
              boxShadow: theme.palette.mode === "dark" ? `0 20px 60px ${alpha("#000", 0.35)}` : `0 20px 50px ${alpha("#1c1917", 0.06)}`,
            }}
          >
            <Box sx={{ p: 2.25, display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: "0.24em" }}>
                Course outline
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em", mt: 0.5 }}>
                Curriculum
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, mb: 1.5, fontWeight: 600, lineHeight: 1.5 }}>
                {guidedTrackId && activeTrack
                  ? `Track: ${activeTrack.title} · Lesson ${trackLessonIndex ?? "—"} of ${trackTotalLessons} · ${trackVisitedCount}/${trackTotalLessons} lessons opened`
                  : `Lesson ${lessonIndexInCatalog} of ${topicCount} · syllabus grouped by module`}
              </Typography>
              <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
                <InputLabel id="guided-track-label">Guided track</InputLabel>
                <Select
                  labelId="guided-track-label"
                  label="Guided track"
                  value={guidedTrackId}
                  onChange={(e) => {
                    setGuidedTrackId(e.target.value);
                    setTopicQuery("");
                  }}
                >
                  <MenuItem value="">
                    <em>Full catalog</em>
                  </MenuItem>
                  {guidedTracks.tracks.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {activeTrack ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5, fontWeight: 600, lineHeight: 1.55 }}>
                  {activeTrack.description}
                </Typography>
              ) : null}
              <TextField
                size="small"
                placeholder="Search syllabus…"
                value={topicQuery}
                onChange={(e) => setTopicQuery(e.target.value)}
                fullWidth
                sx={{
                  mb: 1.5,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.06 : 0.04),
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <Divider sx={{ mb: 1, opacity: 0.7 }} />
              <List dense disablePadding sx={{ flex: 1, overflow: "auto", minHeight: { xs: 220, lg: 0 }, pr: 0.5 }}>
                <AnimatePresence initial={false}>
                  {curriculumByModule.map(({ category, topics }) => (
                    <Box key={category}>
                      <ListSubheader
                        disableSticky
                        sx={{
                          px: 0,
                          py: 1,
                          lineHeight: 1.3,
                          bgcolor: "transparent",
                          color: "text.secondary",
                          fontWeight: 800,
                          letterSpacing: "0.18em",
                          fontSize: 10,
                          textTransform: "uppercase",
                        }}
                      >
                        {category}
                      </ListSubheader>
                      {topics.map((algo) => {
                        const catalogLessonNo =
                          guidedTrackId && activeTrack
                            ? activeTrack.lessonNames.indexOf(algo.name) + 1
                            : algorithmsData.findIndex((a) => a.name === algo.name) + 1;
                        return (
                          <motion.div
                            key={algo.name}
                            layout
                            initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: reduceMotion ? 0 : 0.22 }}
                          >
                            <ListItemButton
                              selected={selectedAlgorithm === algo.name}
                              onClick={() => handleAlgorithmSelect(algo.name)}
                              sx={{
                                borderRadius: 2,
                                mb: 0.5,
                                py: 1.25,
                                alignItems: "flex-start",
                                border: "1px solid transparent",
                                transition: "transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease",
                                "&.Mui-selected": {
                                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.28 : 0.14),
                                  borderColor: alpha(theme.palette.secondary.main, 0.55),
                                  boxShadow: `inset 3px 0 0 ${theme.palette.secondary.main}`,
                                },
                                "&:hover": { transform: "translateX(3px)" },
                              }}
                            >
                              <ListItemText
                                primary={
                                  <Stack direction="row" alignItems="baseline" spacing={1.25} flexWrap="wrap" useFlexGap>
                                    <Typography
                                      component="span"
                                      variant="caption"
                                      sx={{
                                        fontWeight: 900,
                                        fontFamily: "IBM Plex Mono, ui-monospace, monospace",
                                        color: "secondary.main",
                                        minWidth: "2.25rem",
                                      }}
                                    >
                                      {String(catalogLessonNo).padStart(2, "0")}
                                    </Typography>
                                    <Typography component="span" variant="body2" sx={{ fontWeight: 800 }}>
                                      {algo.name}
                                    </Typography>
                                  </Stack>
                                }
                                secondary={algo.quiz?.length ? `${algo.quiz.length}-question gate` : "Reading + walkthrough"}
                                primaryTypographyProps={{ component: "div" }}
                                secondaryTypographyProps={{
                                  variant: "caption",
                                  sx: { fontWeight: 600, opacity: 0.88, pl: { xs: 0, sm: 5.75 }, mt: 0.35, display: "block" },
                                }}
                              />
                            </ListItemButton>
                          </motion.div>
                        );
                      })}
                    </Box>
                  ))}
                </AnimatePresence>
                {filteredTopics.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, px: 1 }}>
                    No matches — try another filter.
                  </Typography>
                )}
              </List>
            </Box>
          </Paper>

          <Box flex={1} minWidth={0}>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedAlgorithm + selectedTab}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? false : { opacity: 0, y: -12 }}
                transition={{ duration: reduceMotion ? 0 : 0.3 }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    overflow: "hidden",
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
                    boxShadow:
                      theme.palette.mode === "dark"
                        ? `0 24px 70px ${alpha("#000", 0.45)}, inset 0 1px 0 ${alpha("#fff", 0.04)}`
                        : `0 24px 70px ${alpha("#1c1917", 0.07)}, inset 0 1px 0 ${alpha("#fff", 0.9)}`,
                    background:
                      theme.palette.mode === "dark"
                        ? alpha(theme.palette.background.paper, 0.55)
                        : alpha(theme.palette.background.paper, 0.95),
                  }}
                >
                  <Box
                    sx={{
                      px: { xs: 2, sm: 2.5 },
                      pt: 2.5,
                      pb: 1,
                      background: `linear-gradient(100deg, ${alpha(theme.palette.secondary.main, 0.14)} 0%, transparent 52%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
                      borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: "0.14em" }}>
                        Active lesson
                      </Typography>
                      <Chip size="small" label={inferCategory(selectedAlgorithm)} sx={{ fontWeight: 800 }} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.25, fontWeight: 600, letterSpacing: "0.02em" }}>
                      Home / Learning / {inferCategory(selectedAlgorithm)} / {selectedAlgorithm}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.03em", mb: 1.5 }}>
                      {selectedAlgorithm}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 2 }} alignItems="center">
                      <Chip size="small" variant="outlined" label={`Lesson ${lessonIndexInCatalog} of ${topicCount}`} sx={{ fontWeight: 800 }} />
                      {selectedTab === "Lesson" ? (
                        <Chip
                          size="small"
                          variant="outlined"
                          icon={<ScheduleOutlined sx={{ "&&": { fontSize: 16 } }} />}
                          label={`~${readMinutes} min read`}
                          sx={{ fontWeight: 800 }}
                        />
                      ) : null}
                      {selectedTab === "Quiz" && quizCount > 0 ? (
                        <Chip size="small" variant="outlined" label={`${quizCount} questions · scored check`} sx={{ fontWeight: 800 }} />
                      ) : null}
                    </Stack>
                    <Tabs
                      value={selectedTab}
                      onChange={handleTabChange}
                      variant="fullWidth"
                      TabIndicatorProps={{ sx: { display: "none" } }}
                      sx={{
                        minHeight: 48,
                        p: 0.5,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.08 : 0.05),
                        "& .MuiTab-root": {
                          minHeight: 44,
                          borderRadius: 1.5,
                          textTransform: "none",
                          fontWeight: 800,
                          fontSize: 15,
                          transition: "background-color 0.2s ease, color 0.2s ease",
                        },
                        "& .Mui-selected": {
                          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.35 : 0.2),
                          color: theme.palette.mode === "dark" ? theme.palette.primary.contrastText : theme.palette.primary.dark,
                        },
                      }}
                    >
                      <Tab icon={<SchoolRounded sx={{ fontSize: 22 }} />} iconPosition="start" label="Lesson" value="Lesson" />
                      <Tab icon={<QuizRounded sx={{ fontSize: 22 }} />} iconPosition="start" label="Quiz" value="Quiz" />
                    </Tabs>
                  </Box>
                  <CardContent sx={{ pt: 3, px: { xs: 2, sm: 2.5 }, pb: 3 }}>
                    {selectedTab === "Lesson" ? (
                      <AlgorithmsContent algorithmName={selectedAlgorithm} />
                    ) : (
                      <QuizzesContent
                        algorithm={algorithmsData.find((a) => a.name === selectedAlgorithm)}
                        quizState={quizState}
                        setQuizState={setQuizState}
                      />
                    )}
                  </CardContent>
                </Paper>
              </motion.div>
            </AnimatePresence>
          </Box>
        </Stack>

        <LearningReferenceLibrary />
      </Stack>
    </Box>
  );
};

const AlgorithmsContent = ({ algorithmName }) => {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState("Overview");
  const [language, setLanguage] = useState("python");
  const [copyHint, setCopyHint] = useState("");
  const algorithm = algorithmsData.find((a) => a.name === algorithmName);
  const sortRow = getSortingComplexityRow(algorithmName);
  const enrich = getTopicEnrichment(algorithmName);

  useEffect(() => {
    setMode("Overview");
  }, [algorithmName]);
  const url = extractUrl(algorithm.description);
  const plainDescription = stripMarkdownLink(algorithm.description);
  const descriptionParagraphs = useMemo(
    () => plainDescription.split(/\n\n/).map((p) => p.trim()).filter(Boolean),
    [plainDescription]
  );
  const notations = useMemo(() => {
    const algo = algorithmsData.find((a) => a.name === algorithmName);
    if (!algo) return [];
    return notationChipsFromText(`${algo.description} ${JSON.stringify(algo.quiz || [])}`);
  }, [algorithmName]);
  const ytWatch = youtubeWatchUrlFromVideoHtml(algorithm.video);

  const handleCopy = useCallback(async () => {
    const text = algorithm.code[language];
    try {
      await navigator.clipboard.writeText(text);
      setCopyHint("Copied");
    } catch {
      setCopyHint("Copy blocked");
    }
    setTimeout(() => setCopyHint(""), 2200);
  }, [algorithm, language]);

  const modeButtons = [
    { key: "Overview", label: "Overview", icon: <ArticleOutlined fontSize="small" /> },
    { key: "Implementation", label: "Implementation", icon: <IntegrationInstructionsOutlined fontSize="small" /> },
    { key: "Watch", label: "Watch", icon: <OndemandVideoOutlined fontSize="small" /> },
  ];

  const renderBody = () => {
    if (mode === "Overview") {
      return (
        <Stack spacing={2.5}>
          {sortRow ? (
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                borderColor: alpha(theme.palette.primary.main, 0.35),
                bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.08 : 0.04),
              }}
            >
              <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.08)}` }}>
                <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: "0.2em", color: "primary.main" }}>
                  Complexity strip · this lesson
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {["Best", "Average", "Worst", "Extra space", "Stable"].map((h) => (
                        <TableCell key={h}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>{sortRow.best}</TableCell>
                      <TableCell sx={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>{sortRow.average}</TableCell>
                      <TableCell sx={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>{sortRow.worst}</TableCell>
                      <TableCell sx={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>{sortRow.space}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{sortRow.stable}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : null}

          {enrich ? (
            <Stack spacing={1.5}>
              <Alert
                severity="info"
                icon={<TipsAndUpdatesOutlined />}
                sx={{ borderRadius: 2, fontWeight: 600, "& .MuiAlert-message": { width: "100%" } }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.5 }}>
                  Interview angle
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.65 }}>
                  {enrich.interviewTip}
                </Typography>
              </Alert>
              <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2, fontWeight: 600 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.75 }}>
                  Pitfalls
                </Typography>
                <Stack component="ul" sx={{ m: 0, pl: 2.25 }} spacing={0.75}>
                  {enrich.pitfalls.map((p) => (
                    <Typography key={p} component="li" variant="body2" sx={{ lineHeight: 1.6 }}>
                      {p}
                    </Typography>
                  ))}
                </Stack>
              </Alert>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderStyle: "dashed", borderColor: alpha(theme.palette.secondary.main, 0.45) }}>
                <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: "0.14em", color: "secondary.main" }}>
                  Try in analyzer
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.65, fontWeight: 600 }}>
                  {enrich.tryInAnalyzer}
                </Typography>
                <Button component={RouterLink} to="/" size="small" variant="contained" color="secondary" sx={{ mt: 1.5, fontWeight: 900 }}>
                  Go to analyzer
                </Button>
              </Paper>
            </Stack>
          ) : null}

          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderStyle: "solid",
              borderColor: alpha(theme.palette.secondary.main, 0.35),
              bgcolor: alpha(theme.palette.secondary.main, theme.palette.mode === "dark" ? 0.07 : 0.05),
            }}
          >
            <CardContent sx={{ py: 2.25 }}>
              <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: "0.18em", color: "secondary.main" }}>
                Learning outcomes
              </Typography>
              <Stack component="ul" sx={{ m: 0, mt: 1.25, pl: 2.25, color: "text.secondary" }} spacing={1.1}>
                <Typography component="li" variant="body2" sx={{ lineHeight: 1.65, fontWeight: 600 }}>
                  Explain how <strong>{algorithmName}</strong> behaves on small, nearly sorted, and adversarial inputs.
                </Typography>
                <Typography component="li" variant="body2" sx={{ lineHeight: 1.65, fontWeight: 600 }}>
                  Connect the prose summary to Big-O claims you will see on interviews and in docs.
                </Typography>
                <Typography component="li" variant="body2" sx={{ lineHeight: 1.65, fontWeight: 600 }}>
                  Reuse the reference implementation in the Analyzer tab to compare empirical runtimes.
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.08 : 0.04),
              borderColor: alpha(theme.palette.primary.main, 0.25),
            }}
          >
            <CardContent sx={{ py: 2.5 }}>
              <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: "0.18em", color: "primary.main" }}>
                Instructor notes
              </Typography>
              <Stack spacing={1.75} sx={{ mt: 1.25 }}>
                {descriptionParagraphs.map((para, idx) => (
                  <Typography key={idx} variant="body1" color="text.secondary" sx={{ lineHeight: 1.85, fontSize: 16 }}>
                    {para}
                  </Typography>
                ))}
              </Stack>
              {notations.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                  {notations.map((n) => (
                    <Chip
                      key={n}
                      label={n}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 800 }}
                    />
                  ))}
                </Stack>
              )}
              {url && (
                <Button
                  component={Link}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  color="secondary"
                  endIcon={<OpenInNewOutlined />}
                  sx={{ mt: 2.5, borderRadius: 999, fontWeight: 900 }}
                >
                  Open primary reading
                </Button>
              )}
            </CardContent>
          </Card>
        </Stack>
      );
    }
    if (mode === "Implementation") {
      const lines = (algorithm.code[language] || "").split("\n").length;
      return (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, lineHeight: 1.65 }}>
            Reference implementation—switch languages, copy into the Analyzer, or diff against your own version.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} justifyContent="space-between">
            <ToggleButtonGroup
              exclusive
              size="small"
              value={language}
              onChange={(_, v) => v && setLanguage(v)}
              sx={{
                flexWrap: "wrap",
                "& .MuiToggleButton-root": {
                  px: 2,
                  fontWeight: 800,
                  textTransform: "none",
                  borderRadius: "999px !important",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 13,
                },
              }}
            >
              <ToggleButton value="python">Python</ToggleButton>
              <ToggleButton value="c++">C++</ToggleButton>
              <ToggleButton value="java">Java</ToggleButton>
            </ToggleButtonGroup>
            <Stack direction="row" spacing={1} alignItems="center">
              {copyHint ? (
                <Typography variant="caption" color="success.main" sx={{ fontWeight: 800 }}>
                  {copyHint}
                </Typography>
              ) : null}
              <Chip label={`${lines} lines`} size="small" sx={{ fontWeight: 800 }} />
              <Tooltip title="Copy snippet">
                <IconButton onClick={handleCopy} color="primary" sx={{ border: `1px solid ${theme.palette.divider}` }}>
                  <ContentCopyOutlined />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
          <Box
            component="pre"
            sx={{
              p: 2.25,
              borderRadius: 2,
              overflow: "auto",
              maxHeight: 520,
              bgcolor: (t) => (t.palette.mode === "dark" ? alpha("#020617", 0.94) : alpha("#f8fafc", 1)),
              color: "text.primary",
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
              fontSize: 13,
              lineHeight: 1.58,
              boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}, 0 16px 48px ${alpha("#000", theme.palette.mode === "dark" ? 0.35 : 0.08)}`,
              position: "relative",
              "&::before": {
                content: '""',
                position: "absolute",
                inset: 0,
                borderRadius: 2,
                pointerEvents: "none",
                background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.07)}, transparent 42%)`,
              },
            }}
          >
            {algorithm.code[language]}
          </Box>
        </Stack>
      );
    }
    return (
      <Stack spacing={1.75}>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560, lineHeight: 1.65, fontWeight: 600 }}>
          Full-screen embed. If your network blocks the player, open the watch link on YouTube instead.
        </Typography>
        {ytWatch ? (
          <Button component={Link} href={ytWatch} target="_blank" rel="noopener" size="small" endIcon={<OpenInNewOutlined />} sx={{ fontWeight: 800, alignSelf: "flex-start" }}>
            Open in YouTube
          </Button>
        ) : null}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            borderRadius: 2,
            overflow: "hidden",
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            pt: "56.25%",
            bgcolor: alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.4 : 0.08),
            boxShadow: theme.shadows[6],
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              "& iframe": { position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" },
            }}
            dangerouslySetInnerHTML={{ __html: algorithm.video }}
          />
        </Box>
      </Stack>
    );
  };

  return (
    <Stack spacing={2.25}>
      <ToggleButtonGroup
        exclusive
        value={mode}
        onChange={(_, v) => v && setMode(v)}
        sx={{
          flexWrap: "wrap",
          gap: 1,
          "& .MuiToggleButtonGroup-grouped": { m: 0 },
          "& .MuiToggleButton-root": {
            borderRadius: "999px !important",
            px: 2.25,
            py: 0.75,
            fontWeight: 800,
            textTransform: "none",
            border: `1px solid ${alpha(theme.palette.text.primary, 0.14)} !important`,
          },
        }}
      >
        {modeButtons.map((b) => (
          <ToggleButton key={b.key} value={b.key} color="primary">
            <Stack direction="row" spacing={1} alignItems="center">
              {b.icon}
              <span>{b.label}</span>
            </Stack>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <motion.div
        key={mode + language}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.22 }}
      >
        {renderBody()}
      </motion.div>
    </Stack>
  );
};

const QuizzesContent = ({ algorithm, quizState, setQuizState }) => {
  const theme = useTheme();
  if (algorithm && algorithm.quiz && algorithm.quiz.length > 0) {
    return (
      <Stack spacing={2}>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2,
            borderColor: alpha(theme.palette.secondary.main, 0.35),
            bgcolor: alpha(theme.palette.secondary.main, theme.palette.mode === "dark" ? 0.06 : 0.04),
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            Knowledge gate
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, fontWeight: 600, lineHeight: 1.65 }}>
            Short scored check—answer from understanding, then revisit the lesson bullets you missed.
          </Typography>
        </Paper>
        <QuizComponent quizData={algorithm.quiz} quizState={quizState} setQuizState={setQuizState} />
      </Stack>
    );
  }
  return (
    <Paper variant="outlined" sx={{ p: 4, borderStyle: "dashed", textAlign: "center", borderRadius: 2 }}>
      <EmojiEventsOutlined sx={{ fontSize: 52, color: "text.secondary", mb: 1.5 }} />
      <Typography variant="h6" sx={{ fontWeight: 900 }}>
        No quiz for this topic yet
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, maxWidth: 420, mx: "auto", fontWeight: 600 }}>
        Pick another lesson from the curriculum—most sorting modules include a five-question gate.
      </Typography>
    </Paper>
  );
};

const QuizComponent = ({ quizData, quizState, setQuizState }) => {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { currentQuestionIndex, selectedOption, correctAnswers, showResults, feedback } = quizState;
  const total = quizData.length;
  const progress = showResults ? 100 : ((currentQuestionIndex + 1) / total) * 100;

  const handleAnswer = () => {
    if (!selectedOption || feedback) return;
    const isCorrect = selectedOption === quizData[currentQuestionIndex].answer;
    setQuizState((prev) => ({ ...prev, feedback: isCorrect ? "correct" : "wrong" }));
    const delay = reduceMotion ? 0 : 650;
    window.setTimeout(() => {
      setQuizState((prev) => {
        const nextCorrect = isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers;
        const idx = prev.currentQuestionIndex;
        if (idx + 1 < quizData.length) {
          return {
            ...prev,
            correctAnswers: nextCorrect,
            currentQuestionIndex: idx + 1,
            selectedOption: null,
            feedback: null,
          };
        }
        return {
          ...prev,
          correctAnswers: nextCorrect,
          showResults: true,
          feedback: null,
        };
      });
    }, delay);
  };

  const handleRestart = () => {
    setQuizState({
      currentQuestionIndex: 0,
      selectedOption: null,
      correctAnswers: 0,
      showResults: false,
      feedback: null,
    });
  };

  if (showResults) {
    const pct = Math.round((correctAnswers / total) * 100);
    const tier = pct >= 80 ? "Distinction" : pct >= 50 ? "Pass with gaps" : "Needs another pass";
    return (
      <motion.div initial={reduceMotion ? false : { scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.35 }}>
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, textAlign: "center" }}>
          <Stack spacing={2.5} alignItems="center" sx={{ py: 1 }}>
            <Box
              sx={{
                width: 128,
                height: 128,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: `conic-gradient(${theme.palette.primary.main} ${pct}%, ${alpha(theme.palette.divider, 0.45)} 0)`,
                p: "5px",
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  bgcolor: "background.paper",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: 900 }}>
                  {pct}%
                </Typography>
              </Box>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              {tier}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
              You scored <strong>{correctAnswers}</strong> out of <strong>{total}</strong>
            </Typography>
            <Button onClick={handleRestart} variant="contained" color="primary" size="large" sx={{ borderRadius: 999, px: 4, fontWeight: 900 }}>
              Run it again
            </Button>
          </Stack>
        </Paper>
      </motion.div>
    );
  }

  const q = quizData[currentQuestionIndex];

  return (
    <Stack spacing={2}>
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900, letterSpacing: "0.16em" }}>
            ITEM {currentQuestionIndex + 1} / {total}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            Score: {correctAnswers}
          </Typography>
        </Stack>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 99 }} />
      </Box>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex + feedback}
          initial={reduceMotion ? false : { opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? false : { opacity: 0, x: -12 }}
          transition={{ duration: reduceMotion ? 0 : 0.25 }}
        >
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2, lineHeight: 1.35 }}>
            {q.question}
          </Typography>
        </motion.div>
      </AnimatePresence>

      {feedback ? (
        <Alert
          severity={feedback === "correct" ? "success" : "info"}
          icon={feedback === "correct" ? <CheckCircleOutlineRounded /> : <CancelOutlined />}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          {feedback === "correct" ? "Locked in—moving to the next item." : "Review the rationale later; advancing for flow."}
        </Alert>
      ) : null}

      <Stack spacing={1.25}>
        {q.options.map((option, index) => {
          const letter = String.fromCharCode(65 + index);
          const picked = selectedOption === option;
          const showResolve = Boolean(feedback);
          const isAnswer = option === q.answer;
          const wrongPick = showResolve && picked && !isAnswer;
          const rightPick = showResolve && isAnswer;

          return (
            <Button
              key={option}
              onClick={() => !feedback && setQuizState((prev) => ({ ...prev, selectedOption: option }))}
              disabled={Boolean(feedback)}
              variant={picked ? "contained" : "outlined"}
              color={picked ? "primary" : "inherit"}
              fullWidth
              sx={{
                py: 1.65,
                justifyContent: "flex-start",
                textAlign: "left",
                borderRadius: 2,
                borderWidth: 2,
                borderColor: wrongPick
                  ? theme.palette.error.main
                  : rightPick
                    ? theme.palette.success.main
                    : picked
                      ? theme.palette.primary.main
                      : alpha(theme.palette.text.primary, 0.12),
                transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                "&:hover": { transform: feedback ? "none" : "translateY(-2px)", boxShadow: feedback ? "none" : theme.shadows[4] },
              }}
              startIcon={
                <Box
                  sx={{
                    minWidth: 30,
                    height: 30,
                    borderRadius: 1,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 900,
                    fontSize: 13,
                    bgcolor: alpha(theme.palette.text.primary, picked ? 0.14 : 0.07),
                  }}
                >
                  {letter}
                </Box>
              }
            >
              {option}
            </Button>
          );
        })}
      </Stack>
      <Button
        onClick={handleAnswer}
        disabled={!selectedOption || Boolean(feedback)}
        variant="contained"
        color="secondary"
        sx={{ borderRadius: 999, alignSelf: "flex-start", px: 4, py: 1.35, fontWeight: 900 }}
      >
        Submit
      </Button>
    </Stack>
  );
};

export default LearningPage;
