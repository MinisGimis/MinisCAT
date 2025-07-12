import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  TextField,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useAppContext } from "../../contexts/AppContext";
import {
  translateChapter,
  containsChinese,
} from "../../services/translationService";
import {
  getPinyin,
  convertToSimplified,
  convertToTraditional,
} from "../../utils/textConversion";
import { importProgress } from "../../services/fileService";
import GlossaryModal from "./GlossaryModal";
import SettingsMenu from "./SettingsMenu";
import ClearTranslationModal from "./ClearTranslationModal";
import ImportDialog from "./ImportDialog";

interface ChapterViewerProps {
  apiKey: string;
  onFileUpload: (file: File) => void;
}

const ChapterViewer: React.FC<ChapterViewerProps> = ({
  apiKey,
  onFileUpload,
}) => {
  const { state, dispatch } = useAppContext();
  const { chapters, selectedChapter, translations, settings } = state;
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [translatingChunks, setTranslatingChunks] = useState<Set<number>>(
    new Set()
  );
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importFileContent, setImportFileContent] = useState("");
  const [importRegex, setImportRegex] = useState(settings.chapterRegex);

  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const nearBottom = scrollHeight - scrollTop - clientHeight < 50;
      if (
        nearBottom &&
        selectedChapter !== null &&
        selectedChapter < chapters.length - 1
      ) {
        dispatch({
          type: "SET_SELECTED_CHAPTER",
          payload: selectedChapter + 1,
        });
        contentRef.current.scrollTop = 0;
      }
    }
  };

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [selectedChapter]);

  const handleLineClick = (line: string) => {
    dispatch({ type: "SET_CLICKED_LINE", payload: line });
    dispatch({ type: "SET_LINE_MODAL_OPEN", payload: true });
  };

  const handleTranslationLineClick = (line: string, lineIndex: number) => {
    setEditingLineIndex(lineIndex);
    setEditingText(line);
  };

  const handleTranslationEdit = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setEditingText(event.target.value);
  };

  const handleTranslationSave = () => {
    if (editingLineIndex !== null && selectedChapter !== null) {
      const currentTranslation = translations[selectedChapter] || "";
      const translationLines = currentTranslation.split("\n");

      while (translationLines.length <= editingLineIndex) {
        translationLines.push("");
      }

      translationLines[editingLineIndex] = editingText;

      dispatch({
        type: "UPDATE_TRANSLATION",
        payload: {
          chapterId: selectedChapter,
          translation: translationLines.join("\n"),
        },
      });
    }
    setEditingLineIndex(null);
    setEditingText("");
  };

  const handleTranslationCancel = () => {
    setEditingLineIndex(null);
    setEditingText("");
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleTranslationSave();
    } else if (event.key === "Escape") {
      event.preventDefault();
      handleTranslationCancel();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportFileName(file.name);
        setImportFileContent(content);
        setImportRegex(settings.chapterRegex);
        setImportDialogOpen(true);
      };
      reader.readAsText(file);
    }
    event.target.value = "";
  };

  const handleImportDialogClose = () => {
    setImportDialogOpen(false);
    setImportFileName("");
    setImportFileContent("");
  };

  const handleImportDialogConfirm = (chapters: any[]) => {
    localStorage.removeItem("chapters");
    localStorage.removeItem("translations");
    localStorage.removeItem("glossary");
    localStorage.removeItem("selectedChapter");
    localStorage.removeItem("fileContent");
    dispatch({ type: "SET_CHAPTERS", payload: [] });
    dispatch({ type: "SET_TRANSLATIONS", payload: {} });
    dispatch({ type: "SET_GLOSSARY", payload: { terms: [], characters: [] } });
    dispatch({ type: "SET_SELECTED_CHAPTER", payload: null });
    dispatch({ type: "SET_CHAPTERS", payload: chapters });
    dispatch({ type: "SET_TRANSLATIONS", payload: {} });
    dispatch({ type: "SET_GLOSSARY", payload: { terms: [], characters: [] } });
    if (chapters.length > 0) {
      dispatch({ type: "SET_SELECTED_CHAPTER", payload: 0 });
    }
    localStorage.setItem("chapters", JSON.stringify(chapters));
    localStorage.setItem("translations", JSON.stringify({}));
    localStorage.setItem(
      "glossary",
      JSON.stringify({ terms: [], characters: [] })
    );
    localStorage.setItem("selectedChapter", chapters.length > 0 ? "0" : "");
    handleImportDialogClose();
  };

  const handleTranslate = async () => {
    if (selectedChapter === null || !apiKey) {
      if (!apiKey) {
        setTranslationError(
          "Please enter your OpenAI API key in the settings first."
        );
      } else {
        setTranslationError("Please select a chapter to translate.");
      }
      return;
    }

    const chapter = chapters[selectedChapter];
    if (!chapter) return;

    setIsTranslating(true);
    setTranslationError(null);
    setTranslatingChunks(new Set());

    const chunks = chapter.content.split("\n");
    const maxLinesPerChunk = settings.maxLinesPerChunk || 10;
    const chunkCount = Math.ceil(chunks.length / maxLinesPerChunk);

    let currentTranslation = "";
    for (let i = 0; i < chunkCount; i++) {
      currentTranslation += "\n".repeat(
        Math.min(maxLinesPerChunk, chunks.length - i * maxLinesPerChunk)
      );
    }

    dispatch({
      type: "UPDATE_TRANSLATION",
      payload: {
        chapterId: selectedChapter,
        translation: currentTranslation,
      },
    });

    try {
      const response = await translateChapter(
        chapter.content,
        apiKey,
        state.glossary,
        state.settings,
        (chunkIndex, translation, newTerms, newCharacters) => {
          setTranslatingChunks((prev) => new Set(prev).add(chunkIndex));

          const currentChunks = currentTranslation.split("\n");
          const translationChunks = translation.split("\n");

          const startLine = chunkIndex * maxLinesPerChunk;
          const endLine = Math.min(startLine + maxLinesPerChunk, chunks.length);
          const chunkSize = endLine - startLine;

          while (currentChunks.length < startLine + chunkSize) {
            currentChunks.push("");
          }

          for (let i = 0; i < chunkSize && i < translationChunks.length; i++) {
            currentChunks[startLine + i] = translationChunks[i] || "";
          }

          currentTranslation = currentChunks.join("\n");

          dispatch({
            type: "UPDATE_TRANSLATION",
            payload: {
              chapterId: selectedChapter,
              translation: currentTranslation,
            },
          });

          setTranslatingChunks((prev) => {
            const newSet = new Set(prev);
            newSet.delete(chunkIndex);
            return newSet;
          });
        }
      );

      if (response.NEW_TERMS && response.NEW_TERMS.length > 0) {
        const existingTerms = new Set(
          state.glossary.terms.map((term) => term.original)
        );
        response.NEW_TERMS.forEach((term) => {
          if (!existingTerms.has(term.original)) {
            dispatch({ type: "ADD_GLOSSARY_TERM", payload: term });
            existingTerms.add(term.original);
          }
        });
      }
      if (response.NEW_CHARACTERS && response.NEW_CHARACTERS.length > 0) {
        const existingCharacters = new Set(
          state.glossary.characters.map((character) => character.original_name)
        );
        response.NEW_CHARACTERS.forEach((character) => {
          if (!existingCharacters.has(character.original_name)) {
            dispatch({ type: "ADD_GLOSSARY_CHARACTER", payload: character });
            existingCharacters.add(character.original_name);
          }
        });
      }
    } catch (error) {
      console.error("Translation failed:", error);
      if (error instanceof Error) {
        setTranslationError(`Translation failed: ${error.message}`);
      } else {
        setTranslationError(
          "Translation failed. Please check your API key and try again."
        );
      }
    } finally {
      setIsTranslating(false);
      setTranslatingChunks(new Set());
    }
  };

  const handleImportProgress = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importProgress(file)
        .then((data) => {
          dispatch({ type: "SET_CHAPTERS", payload: data.chapters });
          dispatch({ type: "SET_TRANSLATIONS", payload: data.translations });
          dispatch({ type: "SET_GLOSSARY", payload: data.glossary });
          if (data.chapters.length > 0) {
            dispatch({ type: "SET_SELECTED_CHAPTER", payload: 0 });
          }
        })
        .catch((error) => {
          setTranslationError(`Failed to import progress: ${error.message}`);
        });
    }
    event.target.value = "";
  };

  const renderLineWithPinyin = (
    line: string,
    isOriginal: boolean = true,
    indexOverride?: number
  ) => {
    const lineStyle = {
      cursor: "pointer",
      borderRadius: "4px",
      transition: "background-color 0.2s",
      lineHeight: "1.6",
    };

    if (!settings.showPinyin || !containsChinese(line)) {
      return (
        <Box
          key={indexOverride !== undefined ? indexOverride : line}
          className="line"
          onClick={() => handleLineClick(line)}
          sx={lineStyle}
        >
          {line}
        </Box>
      );
    }
    if (settings.useBlockTextPinyin) {
      const pinyinResult = getPinyin(line)
        .map((arr) => arr[0])
        .join(" ");
      return (
        <Box
          key={indexOverride !== undefined ? indexOverride : line}
          className="line"
          onClick={() => handleLineClick(line)}
          sx={lineStyle}
        >
          <span className="pinyin-text">{pinyinResult}</span>
          <span className="char-text">{line}</span>
        </Box>
      );
    }
    const charArray = line.split("");
    const isChineseChar = (char: string) => /[\u4e00-\u9fff]/.test(char);
    return (
      <Box
        key={indexOverride !== undefined ? indexOverride : line}
        className="line"
        onClick={() => handleLineClick(line)}
        sx={lineStyle}
      >
        {charArray.map((char, index) => {
          if (isChineseChar(char)) {
            const pinyinResult = getPinyin(char);
            const pinyinText =
              pinyinResult &&
              pinyinResult.length > 0 &&
              pinyinResult[0].length > 0
                ? pinyinResult[0][0]
                : "";
            return (
              <span key={`char-py-${index}`} className="char-pinyin-container">
                <span className="pinyin-text">{pinyinText}</span>
                <span className="char-text">{char}</span>
              </span>
            );
          } else {
            return (
              <span key={`char-nc-${index}`} className="char-pinyin-container">
                <span className="pinyin-text placeholder">&nbsp;</span>
                <span className="char-text">{char}</span>
              </span>
            );
          }
        })}
      </Box>
    );
  };

  const renderContent = (content: string, characterType: string) => {
    let processedContent = content;

    switch (characterType) {
      case "simplified":
        processedContent = convertToSimplified(content);
        break;
      case "traditional":
        processedContent = convertToTraditional(content);
        break;
      default:
        processedContent = content;
    }

    const lines = processedContent.split("\n");
    const hasTranslation =
      typeof currentTranslation === "string" &&
      currentTranslation.trim().length > 0;
    const translationLines = hasTranslation
      ? currentTranslation.split("\n")
      : [];
    const maxLinesPerChunk = settings.maxLinesPerChunk || 10;

    const isLineBeingTranslated = (lineIndex: number): boolean => {
      const chunkIndex = Math.floor(lineIndex / maxLinesPerChunk);
      return translatingChunks.has(chunkIndex);
    };

    if (hasTranslation && !settings.showTranslationBelow) {
      return translationLines.map((line, index) => {
        if (line.trim() === "") {
          return (
            <div
              key={`empty-${index}`}
              className="line"
              style={{ marginBottom: "1em" }}
            />
          );
        }

        const isTranslating = isLineBeingTranslated(index);

        if (settings.allowEdits && editingLineIndex === index) {
          return (
            <div
              key={`line-container-${index}`}
              className="line-pair"
              style={{ marginBottom: "1em" }}
            >
              <TextField
                value={editingText}
                onChange={handleTranslationEdit}
                onKeyDown={handleKeyPress}
                onBlur={handleTranslationSave}
                autoFocus
                multiline
                variant="standard"
                sx={{
                  fontSize: "1em",
                  lineHeight: "1.6",
                  letterSpacing: "normal",
                  "& .MuiInputBase-root": {
                    fontSize: "1em",
                    lineHeight: "1.6",
                    letterSpacing: "normal",
                    padding: "0",
                    "&:before": { borderBottom: "none" },
                    "&:after": { borderBottom: "none" },
                    "&:hover:before": { borderBottom: "none" },
                    "&.Mui-focused:after": { borderBottom: "none" },
                    "&.Mui-focused": {
                      backgroundColor: "transparent",
                    },
                  },
                  "& .MuiInputBase-input": {
                    padding: "0",
                    lineHeight: "1.6",
                    fontSize: "1em",
                    letterSpacing: "normal",
                    "&:focus": {
                      backgroundColor: "transparent",
                    },
                  },
                  "& .MuiInputBase-inputMultiline": {
                    padding: "0",
                    lineHeight: "1.6",
                    fontSize: "1em",
                    letterSpacing: "normal",
                    "&:focus": {
                      backgroundColor: "transparent",
                    },
                  },
                }}
              />
            </div>
          );
        }

        const boxSx = settings.allowEdits
          ? {
              cursor: "pointer",
              borderRadius: "4px",
              transition: "background-color 0.2s",
              lineHeight: "1.6",
              letterSpacing: "normal",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.05)",
              },
              ...(isTranslating && {
                backgroundColor: "rgba(255, 193, 7, 0.1)",
                borderLeft: "3px solid #ffc107",
                paddingLeft: "8px",
              }),
            }
          : {
              lineHeight: "1.6",
              letterSpacing: "normal",
              ...(isTranslating && {
                backgroundColor: "rgba(255, 193, 7, 0.1)",
                borderLeft: "3px solid #ffc107",
                paddingLeft: "8px",
              }),
            };
        const boxOnClick = settings.allowEdits
          ? () => handleTranslationLineClick(line, index)
          : undefined;

        return (
          <div
            key={`line-container-${index}`}
            className="line-pair"
            style={{ marginBottom: "1em" }}
          >
            <Box className="line" sx={boxSx} onClick={boxOnClick}>
              {line}
              {isTranslating && (
                <CircularProgress
                  size={16}
                  sx={{
                    ml: 1,
                    color: "#ffc107",
                    verticalAlign: "middle",
                  }}
                />
              )}
            </Box>
          </div>
        );
      });
    }

    return lines.map((line, index) => {
      if (line.trim() === "") {
        return (
          <div
            key={`empty-${index}`}
            className="line"
            style={{ marginBottom: "1em" }}
          />
        );
      }

      const originalLine = renderLineWithPinyin(line, true, index);
      const translationLine =
        hasTranslation &&
        translationLines[index] &&
        translationLines[index].trim().length > 0
          ? translationLines[index]
          : null;
      const isTranslating = isLineBeingTranslated(index);

      if (settings.showTranslationBelow && translationLine) {
        if (settings.allowEdits && editingLineIndex === index) {
          return (
            <div
              key={`line-container-${index}`}
              className="line-pair"
              style={{ marginBottom: "1em" }}
            >
              {originalLine}
              <TextField
                value={editingText}
                onChange={handleTranslationEdit}
                onKeyDown={handleKeyPress}
                onBlur={handleTranslationSave}
                autoFocus
                multiline
                variant="standard"
                fullWidth
                sx={{
                  color: "#666",
                  fontSize: "1em",
                  fontWeight: 400,
                  fontFamily: "inherit",
                  letterSpacing: "normal",
                  width: "100%",
                  display: "block",
                  "& .MuiInputBase-root": {
                    color: "#666",
                    fontSize: "1em",
                    fontWeight: 400,
                    fontFamily: "inherit",
                    lineHeight: "1.6",
                    letterSpacing: "normal",
                    padding: "0",
                    width: "100%",
                    display: "block",
                    "&:before": { borderBottom: "none" },
                    "&:after": { borderBottom: "none" },
                    "&:hover:before": { borderBottom: "none" },
                    "&.Mui-focused:after": { borderBottom: "none" },
                    "&.Mui-focused": {
                      backgroundColor: "transparent",
                    },
                  },
                  "& .MuiInputBase-input": {
                    padding: "0",
                    lineHeight: "1.6",
                    color: "#666",
                    fontSize: "1em",
                    fontWeight: 400,
                    fontFamily: "inherit",
                    letterSpacing: "normal",
                    width: "100%",
                    display: "block",
                    "&:focus": {
                      backgroundColor: "transparent",
                    },
                  },
                  "& .MuiInputBase-inputMultiline": {
                    padding: "0",
                    lineHeight: "1.6",
                    color: "#666",
                    fontSize: "1em",
                    fontWeight: 400,
                    fontFamily: "inherit",
                    letterSpacing: "normal",
                    width: "100%",
                    display: "block",
                    "&:focus": {
                      backgroundColor: "transparent",
                    },
                  },
                }}
              />
            </div>
          );
        }

        const boxSx = settings.allowEdits
          ? {
              color: "#666",
              fontSize: "1em",
              cursor: "pointer",
              borderRadius: "4px",
              transition: "background-color 0.2s",
              lineHeight: "1.6",
              letterSpacing: "normal",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.05)",
              },
              ...(isTranslating && {
                backgroundColor: "rgba(255, 193, 7, 0.1)",
                borderLeft: "3px solid #ffc107",
                paddingLeft: "8px",
              }),
            }
          : {
              color: "#666",
              fontSize: "1em",
              lineHeight: "1.6",
              letterSpacing: "normal",
              ...(isTranslating && {
                backgroundColor: "rgba(255, 193, 7, 0.1)",
                borderLeft: "3px solid #ffc107",
                paddingLeft: "8px",
              }),
            };
        const boxOnClick = settings.allowEdits
          ? () => handleTranslationLineClick(translationLine, index)
          : undefined;

        return (
          <div
            key={`line-container-${index}`}
            className="line-pair"
            style={{ marginBottom: "1em" }}
          >
            {originalLine}
            <Box className="translation-line" sx={boxSx} onClick={boxOnClick}>
              {translationLine}
              {isTranslating && (
                <CircularProgress
                  size={16}
                  sx={{
                    ml: 1,
                    color: "#ffc107",
                    verticalAlign: "middle",
                  }}
                />
              )}
            </Box>
          </div>
        );
      }

      return (
        <div
          key={`line-container-${index}`}
          className="line-pair"
          style={{ marginBottom: "1em" }}
        >
          <Box
            sx={{
              ...(isTranslating && {
                backgroundColor: "rgba(255, 193, 7, 0.1)",
                borderLeft: "3px solid #ffc107",
                paddingLeft: "8px",
                borderRadius: "4px",
              }),
            }}
          >
            {originalLine}
            {isTranslating && (
              <CircularProgress
                size={16}
                sx={{
                  ml: 1,
                  color: "#ffc107",
                  verticalAlign: "middle",
                }}
              />
            )}
          </Box>
        </div>
      );
    });
  };

  if (chapters.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="h5" gutterBottom>
          Welcome to MinisTranslator
        </Typography>
        <Typography variant="body1" gutterBottom>
          Upload a Chinese novel to get started
        </Typography>
        <input
          type="file"
          accept=".txt"
          onChange={handleFileUpload}
          style={{ display: "none" }}
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button variant="contained" component="span">
            Upload Novel
          </Button>
        </label>
        <Box sx={{ mt: 2 }}>
          <input
            type="file"
            accept=".json"
            onChange={handleImportProgress}
            style={{ display: "none" }}
            id="progress-upload"
          />
          <label htmlFor="progress-upload">
            <Button variant="outlined" component="span" size="small">
              Import Progress
            </Button>
          </label>
        </Box>
        <ImportDialog
          open={importDialogOpen}
          onClose={handleImportDialogClose}
          onConfirm={handleImportDialogConfirm}
          fileName={importFileName}
          fileContent={importFileContent}
          initialRegex={importRegex}
        />
      </Box>
    );
  }

  if (selectedChapter === null) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="h6">Select a chapter to begin reading</Typography>
      </Box>
    );
  }

  const currentChapter = chapters[selectedChapter];
  const currentTranslation = translations[selectedChapter];

  return (
    <Box>
      <Box
        sx={{
          position: "fixed",
          top: "16px",
          right: "16px",
          zIndex: 1000,
        }}
      >
        <Tooltip title="Settings">
          <IconButton
            onClick={() => setIsSettingsOpen(true)}
            size="large"
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              },
            }}
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {translationError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setTranslationError(null)}
        >
          {translationError}
        </Alert>
      )}

      <Box
        ref={contentRef}
        onScroll={handleScroll}
        sx={{
          mb: 3,
          height: "calc(100vh - 1px)",
          overflowY: "auto",
          padding: `0 ${settings.viewerPadding}px`,
          fontSize: `${settings.fontSize}px`,
        }}
      >
        <Box
          sx={{
            mb: 2,
            display: "flex",
            gap: 2,
            alignItems: "center",
            flexWrap: "wrap",
            paddingTop: "16px",
          }}
        >
          <Typography variant="h6">{currentChapter.title}</Typography>
          <Button
            variant="contained"
            onClick={handleTranslate}
            disabled={isTranslating || !apiKey}
            startIcon={isTranslating ? <CircularProgress size={20} /> : null}
          >
            {isTranslating
              ? "Translating..."
              : `Translate${apiKey ? "" : "(API KEY NOT Set)"}`}
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={() =>
              dispatch({
                type: "SET_CLEAR_TRANSLATION_MODAL_OPEN",
                payload: true,
              })
            }
          >
            Clear Translation
          </Button>
          <Button
            variant="outlined"
            onClick={() =>
              dispatch({ type: "SET_GLOSSARY_MODAL_OPEN", payload: true })
            }
          >
            Glossary (
            {state.glossary.terms.length + state.glossary.characters.length})
          </Button>
        </Box>

        {renderContent(currentChapter.content, settings.characterType)}

        <Box
          sx={{
            height: "300vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ fontSize: "18px", color: "#666" }}>
            Scroll to continue
          </Typography>
        </Box>
      </Box>

      <GlossaryModal
        isOpen={state.viewerState.isGlossaryModalOpen}
        onClose={() =>
          dispatch({ type: "SET_GLOSSARY_MODAL_OPEN", payload: false })
        }
      />
      <ClearTranslationModal
        isOpen={state.viewerState.isClearTranslationModalOpen}
        onClose={() =>
          dispatch({ type: "SET_CLEAR_TRANSLATION_MODAL_OPEN", payload: false })
        }
      />
      <SettingsMenu
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <ImportDialog
        open={importDialogOpen}
        onClose={handleImportDialogClose}
        onConfirm={handleImportDialogConfirm}
        fileName={importFileName}
        fileContent={importFileContent}
        initialRegex={importRegex}
      />
    </Box>
  );
};

export default ChapterViewer;
