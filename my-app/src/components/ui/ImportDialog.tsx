import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { extractChapters } from "../../services/fileService";

interface ImportDialogProps {
  open: boolean;
  fileName: string;
  fileContent: string;
  initialRegex: string;
  onClose: () => void;
  onConfirm: (chapters: any[]) => void;
}

const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  fileName,
  fileContent,
  initialRegex,
  onClose,
  onConfirm,
}) => {
  const [regex, setRegex] = useState(initialRegex);
  const [chapters, setChapters] = useState<any[]>([]);
  const [regexError, setRegexError] = useState<string | null>(null);

  useEffect(() => {
    setRegex(initialRegex);
  }, [initialRegex, open]);

  useEffect(() => {
    if (fileContent) {
      try {
        const chapters = extractChapters(fileContent, regex);
        setChapters(chapters);
        setRegexError(null);
      } catch (err) {
        setChapters([]);
        setRegexError("Invalid regular expression");
      }
    } else {
      setChapters([]);
      setRegexError(null);
    }
  }, [fileContent, regex]);

  const suggestedRegexes = [
    {
      label: "Numeric Chapters (e.g., 001., 002.)",
      value: "^\\d{3}\\.[^\\n]*",
    },
    {
      label: "Chinese Chapters (e.g., 第一章)",
      value: "第[一二三四五六七八九十百千零0-9]+章[^\\n]*",
    },
    {
      label: "Simple Chapter (e.g., Chapter 1)",
      value: "^Chapter\\s+\\d+[^\\n]*",
    },
    {
      label: "Any line starting with number and dot",
      value: "^\\d+\\.[^\\n]*",
    },
    {
      label: "Chapter with hash (e.g., # Chapter 1)",
      value: "^#\\s+[^\\n]*",
    },
    {
      label: "Chapter with asterisk (e.g., * Chapter 1)",
      value: "^\\*\\s+[^\\n]*",
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Import Preview: {fileName}</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          File Preview (first 30 lines):
        </Typography>
        <Box
          sx={{
            maxHeight: 200,
            overflow: "auto",
            mb: 2,
            p: 1,
            bgcolor: "#f7f7f7",
            fontFamily: "monospace",
            fontSize: 14,
          }}
        >
          {fileContent
            .split("\n")
            .slice(0, 30)
            .map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
        </Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Chapter Extraction Regex:
        </Typography>
        <TextField
          value={regex}
          onChange={(e) => setRegex(e.target.value)}
          fullWidth
          size="small"
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Suggestions:
          </Typography>
          {suggestedRegexes.map((regexOpt) => (
            <Button
              key={regexOpt.label}
              variant="outlined"
              size="small"
              onClick={() => setRegex(regexOpt.value)}
              sx={{
                textTransform: "none",
                justifyContent: "flex-start",
                width: "fit-content",
              }}
            >
              {regexOpt.label}
            </Button>
          ))}
        </Box>
        {regexError && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {regexError}
          </Typography>
        )}
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Extracted Chapters TOC:
        </Typography>
        <Box
          sx={{
            maxHeight: 200,
            overflow: "auto",
            p: 1,
            bgcolor: "#f7f7f7",
            fontFamily: "monospace",
            fontSize: 14,
          }}
        >
          {chapters.length === 0 && !regexError ? (
            <div style={{ color: "#888" }}>
              (No chapters found with current regex)
            </div>
          ) : (
            chapters.map((ch, idx) => (
              <div key={idx}>
                {idx + 1}. {ch.title || "(Untitled Chapter)"}
              </div>
            ))
          )}
        </Box>
        {chapters.length > 0 && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1, mt: 2 }}>
              First Chapter Preview:
            </Typography>
            <Box
              sx={{
                maxHeight: 150,
                overflow: "auto",
                p: 1,
                bgcolor: "#f0f8ff",
                fontFamily: "monospace",
                fontSize: 12,
                border: "1px solid #ccc",
              }}
            >
              <div style={{ color: "#666", marginBottom: "8px" }}>
                Title: {chapters[0].title}
              </div>
              <div style={{ color: "#666", marginBottom: "8px" }}>
                Content length: {chapters[0].content.length} characters
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>
                {chapters[0].content.substring(0, 300)}
                {chapters[0].content.length > 300 && "..."}
              </div>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => onConfirm(chapters)}
          variant="contained"
          color="primary"
          disabled={!!regexError || chapters.length === 0}
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportDialog;
