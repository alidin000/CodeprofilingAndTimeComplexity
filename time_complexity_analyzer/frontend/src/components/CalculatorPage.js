import React, { useState, useEffect } from "react";
import {
  Container,
  Card,
  CardContent,
  Button,
  Select,
  MenuItem,
  Typography,
  FormControl,
  InputLabel,
  Box,
} from "@mui/material";
import CodeEditorArea from "./CodeEditorArea";
import Output from "./CodeOut";
import AxiosInstance from "./Axios";
import InfoSection from "./InfoSection";

const time_complexity_notation = {
  constant: "O(1)",
  linear: "O(n)",
  quadratic: "O(n^2)",
  logarithmic: "O(log n)",
  exponential: "O(2^n)",
  cubic: "O(n^3)",
  log_linear: "O(n log n)",
  factorial: "O(n!)",
  polynomial: "O(n^k)",
  inverse_ackermann: "O(α(n))",
  iterated_logarithmic: "O(log* n)",
  log_logarithmic: "O(log log n)",
  polylogarithmic: "O((log n)^k)",
  fractional_power: "O(n^c)",
  quasilinear: "O(n log^k n)",
  quasi_polynomial: "O(exp((log n)^k))",
  subexponential: "O(exp(n^c))",
  subexponential_variant: "2^(o(n))",
  polynomial_linear_exponent: "O(2^(O(n)))",
  double_exponential: "O(2^(2^n))",
  exponential_poly: "O(2^(poly(n)))",
};

const limitations = {
  Java: [
    "Function must be defined as: public type functionName(int[] arr)",
    "No static methods allowed",
    "No annotations",
    "Only one function should be present",
    "No third-party libraries",
    "No empty lines or comments",
    "Code will be run with the numbers between 0 and 10^5",
  ],
  Python: [
    "Function must accept a list as an argument",
    "Correct indentation is required",
    "No decorators",
    "Only one function should be present",
    "No third-party libraries",
    "No empty lines or comments",
    "Code will be run with the numbers between 0 and 10^5",
  ],
  Cpp: [
    "Function must be defined as: type functionName(std::vector<int>& arr)",
    "No public or private keywords",
    "Only one function should be present",
    "No third-party libraries",
    "No empty lines or comments",
    "Code will be run with the numbers between 0 and 10^5",
  ],
};

function CalculatorPage({ isAuthenticated, currentUser }) {
  const [code, setCode] = useState(``);
  const [language, setLanguage] = useState("Python");
  const [outputText, setOutputText] = useState(
    "// Output will be displayed here"
  );
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [userModifiedCode, setUserModifiedCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedCode, setExpandedCode] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const user = isAuthenticated ? currentUser : "Unknown";

  const defaultCodes = {
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

  useEffect(() => {
    setCode(defaultCodes[language]);
    setOutputText("// Output will be displayed here");
    setResults([]);
    setError("");
    setUserModifiedCode(false);
  }, [language]);

  const handleLanguageChange = (selectedLanguage) => {
    setLanguage(selectedLanguage);
    if (!userModifiedCode || code === "") {
      setCode(defaultCodes[selectedLanguage]);
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

  const handleToggleHistory = () => {
    setShowHistory((prev) => {
      if (!prev) {
        fetchHistory();
      }
      return !prev;
    });
  };

  const handleAnalyseClick = () => {
    if (!user || !code || !language) {
      setError("Can't calculate it. Please check your code and try again.");
      return;
    }

    setLoading(true);
    setOutputText("Please wait...");

    const payload = {
      username: user,
      code: code,
      language: language,
      time_complexity: "O(n)",
    };

    AxiosInstance.post("/api/analyse-code/", payload)
      .then((response) => {
        setResults(formatResults(response.data, code, language));
        setOutputText(formatOutput(response.data, code, language));
        setError("");
        setLoading(false);
      })
      .catch(() => {
        setError("Can't calculate it. Please check your code and try again.");
        setLoading(false);
      });
  };

  const formatResults = (data, code, language) => {
    const codeLines = code.split("\n");
    const results = codeLines.map((line, index) => {
      const lineNumber = language === "Python" ? index : index + 1;
      const lineInfo = data.lines ? data.lines[lineNumber] : null;

      if (lineInfo) {
        const complexity = lineInfo.best_fit ? lineInfo.best_fit.model : "";
        const avgExecTimes = lineInfo.average_exec_times || {};
        return {
          line: line.trim(),
          lineNumber,
          complexity,
          notation: time_complexity_notation[complexity] || "",
          avgExecTimes,
        };
      }
      return {
        line: line.trim(),
        lineNumber,
        function: "",
        complexity: "",
        avgExecTimes: {},
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
    results.functionNotation = time_complexity_notation[functionComplexity] || "";
    results.functionAvgExecTimes = functionAvgExecTimes;
  
    return results;
  };
  
  const formatOutput = (data, code, language) => {
    const codeLines = code.split("\n");    
    const linesOutput = codeLines.map((line, index) => {
      const lineNumber = language === "Python" ? index : index + 1;     
      const lineInfo = data.lines ? data.lines[lineNumber] : null;
      if (lineInfo) {
        const avgExecTimes = lineInfo.average_exec_times
          ? Object.entries(lineInfo.average_exec_times)
              .map(([size, time]) => `${size}: ${time.toFixed(2)} ns`)
              .join(", ")
          : "";
        return `Line ${lineNumber}: ${line} -> ${
          time_complexity_notation[
            lineInfo.best_fit ? lineInfo.best_fit.model : ""
          ] || ""
        } {${
          lineInfo.best_fit ? lineInfo.best_fit.model : ""
        }} (Avg times: ${avgExecTimes})`;
      }
      return `Line ${lineNumber}: ${line}`;
    });

    const overallAvgExecTimes =
      data.function && data.function.average_exec_times
        ? Object.entries(data.function.average_exec_times)
            .map(([size, time]) => `${size}: ${time.toFixed(2)} ns`)
            .join(", ")
        : "";
    const overallComplexity = data.function
      ? `\nOverall Function Time Complexity: ${
          time_complexity_notation[
            data.function.best_fit ? data.function.best_fit.model : ""
          ] || ""
        } {${
          data.function.best_fit ? data.function.best_fit.model : ""
        }} (Avg times: ${overallAvgExecTimes})`
      : "";
    linesOutput.push(overallComplexity);
    return linesOutput.join("\n");
  };

  const renderHistory = () => {
    if (historyLoading) {
      return <Typography>Loading history...</Typography>;
    }

    if (!history || history.length === 0) {
      return <Typography>No history available.</Typography>;
    }

    return history.map((entry, index) => (
      <Card key={index} className="mt-2">
        <CardContent>
          <Typography
            variant="h6"
            style={{
              cursor: "pointer",
              textDecoration: "underline",
              color: "blue",
            }}
            onClick={() =>
              setExpandedCode(expandedCode === index ? null : index)
            }
          >
            {`Code (${entry.language}) - ${entry.code.slice(0, 50)}...`}
          </Typography>
          {expandedCode === index && (
            <Output
              outputText=""
              results={formatResults(entry.analysis_result, entry.code, entry.language)}
              error=""
              loading={false}
            />
          )}
          <Typography variant="caption">{`Analyzed on: ${new Date(
            entry.created_at
          ).toLocaleString()}`}</Typography>
        </CardContent>
      </Card>
    ));
  };

  return (
    <Container sx={{ maxWidth: "1800px" }}>
      <Card className="mt-4">
        <CardContent>
          <Box display="flex" justifyContent="space-between">
            <FormControl variant="outlined" sx={{ width: 200 }}>
              <InputLabel id="language-select-label">Language</InputLabel>
              <Select
                labelId="language-select-label"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                label="Language"
              >
                <MenuItem value="Java">Java</MenuItem>
                <MenuItem value="Python">Python</MenuItem>
                <MenuItem value="Cpp">C++</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleToggleHistory}
              disabled={!isAuthenticated}
            >
              {showHistory ? "Hide History" : "Show History"}
            </Button>
          </Box>
        </CardContent>
      </Card>
      <div
        className="flex flex-row mt-3"
        style={{ display: "flex", width: "100%" }}
      >
        <Card className="flex-grow-1" sx={{ flex: 1, marginRight: "1rem" }}>
          <CardContent>
            <CodeEditorArea
              language={language}
              code={code}
              onCodeChange={handleCodeChange}
            />
            <Button
              variant="contained"
              color="primary"
              className="mt-4"
              onClick={handleAnalyseClick}
            >
              Analyse
            </Button>
          </CardContent>
        </Card>
        <Card className="flex-grow-2" sx={{ flex: 3 }}>
          <CardContent>
            {showHistory ? (
              renderHistory()
            ) : (
              <Output
                outputText={outputText}
                results={results}
                error={error}
                loading={loading}
              />
            )}
          </CardContent>
        </Card>
      </div>
      <InfoSection language={language} limitations={limitations[language]} />
    </Container>
  );
}

export default CalculatorPage;
