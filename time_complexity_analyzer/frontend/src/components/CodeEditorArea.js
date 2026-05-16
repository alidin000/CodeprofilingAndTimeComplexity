import React, { useEffect, useState } from "react";
import CodeEditor from '@uiw/react-textarea-code-editor';
import { Box, alpha, useTheme } from "@mui/material";

export default function CodeEditorArea({ language, code, onCodeChange }) {
  const theme = useTheme();
  const [localCode, setLocalCode] = useState(code);
  const editorBg =
    theme.palette.mode === "dark" ? "#0d1118" : "#faf8ff";
  const editorFg =
    theme.palette.mode === "dark" ? "#e2e8f0" : "#1e1b4b";

  useEffect(() => {
    setLocalCode(code);
  }, [code]);

  const handleChange = (evn) => {
    const newCode = evn.target.value;
    setLocalCode(newCode);
    onCodeChange(newCode);
  };

  return (
    <Box
      sx={{
        mt: 1,
        borderRadius: 2,
        overflow: "hidden",
        border: `1px solid ${theme.palette.divider}`,
        transition: "box-shadow 0.35s ease, border-color 0.25s ease, transform 0.25s ease",
        boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0)}`,
        "&:focus-within": {
          borderColor: alpha(theme.palette.primary.main, 0.65),
          boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.28)}, 0 12px 40px ${alpha(theme.palette.primary.main, 0.12)}`,
        },
        "&:hover": {
          borderColor: alpha(theme.palette.primary.main, 0.35),
        },
      }}
    >
      <CodeEditor
        value={localCode}
        language={language}
        placeholder={`Drop your ${language} snippet here…`}
        onChange={handleChange}
        padding={16}
        style={{
          backgroundColor: editorBg,
          color: editorFg,
          fontFamily: theme.typography.fontFamilyMonospace,
          fontSize: 14,
          lineHeight: 1.55,
          minHeight: 360,
          maxHeight: 520,
          overflow: "auto",
        }}
      />
    </Box>
  );
}
