import React, { useState } from "react";
import {
  Box,
  Typography,
  Switch,
  Slider,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  FormControlLabel,
  Radio,
  RadioGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from "@mui/material";
import {
  ExpandMore,
  Settings,
  Visibility,
  Translate,
  Storage,
  FileUpload,
  FileDownload,
} from "@mui/icons-material";
import { useAppContext } from "../../contexts/AppContext";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import {
  exportToTxt,
  exportToZip,
  exportProgress,
} from "../../services/fileService";
import ImportDialog from "./ImportDialog";

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useAppContext();

  const [fontSize, setFontSize] = useLocalStorage("fontSize", 16);
  const [viewerPadding, setViewerPadding] = useLocalStorage(
    "viewerPadding",
    16
  );
  const [chapterRegex] = useLocalStorage(
    "chapterRegex",
    "(第[一二三四五六七八九十百千零0-9]+章[sS]*?)(?=第[一二三四五六七八九十百千零0-9]+章|$)"
  );
  const [showPinyin, setShowPinyin] = useLocalStorage("showPinyin", false);
  const [useBlockTextPinyin, setUseBlockTextPinyin] = useLocalStorage(
    "useBlockTextPinyin",
    true
  );
  const [showTranslationBelow, setShowTranslationBelow] = useLocalStorage(
    "showTranslationBelow",
    false
  );
  const [characterType, setCharacterType] = useLocalStorage(
    "characterType",
    "original"
  );
  const [autoTranslateNext, setAutoTranslateNext] = useLocalStorage(
    "autoTranslateNext",
    false
  );
  const [showChapterList, setShowChapterList] = React.useState(
    state.settings.showChapterList
  );
  const [showFooter, setShowFooter] = React.useState(state.settings.showFooter);
  const [apiKey, setApiKey] = useLocalStorage("apiKey", "");
  const [translationModel, setTranslationModel] = useLocalStorage(
    "translationModel",
    "gpt-4.1-nano"
  );
  const [maxLinesPerChunk, setMaxLinesPerChunk] = useLocalStorage(
    "maxLinesPerChunk",
    10
  );
  const [allowEdits, setAllowEdits] = useLocalStorage(
    "allowEdits",
    state.settings.allowEdits ?? false
  );

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importFileContent, setImportFileContent] = useState("");
  const [importRegex, setImportRegex] = useState(chapterRegex);

  const fontSizeOptions = [4, 8, 12, 16, 20, 24, 32, 40, 48, 54, 60];
  const fontSizeIndex = fontSizeOptions.indexOf(fontSize);
  const handleFontSizeChange = (_: Event, value: number | number[]) => {
    const index = Array.isArray(value) ? value[0] : value;
    const newValue = fontSizeOptions[index] || 16;
    setFontSize(newValue);
    dispatch({ type: "UPDATE_SETTINGS", payload: { fontSize: newValue } });
  };

  const paddingOptions = [
    0, 2, 4, 8, 16, 24, 32, 40, 48, 60, 64, 72, 80, 100, 120, 160,
  ];
  const paddingIndex = paddingOptions.indexOf(viewerPadding);
  const handleViewerPaddingChange = (_: Event, value: number | number[]) => {
    const index = Array.isArray(value) ? value[0] : value;
    const newValue = paddingOptions[index] || 16;
    setViewerPadding(newValue);
    dispatch({ type: "UPDATE_SETTINGS", payload: { viewerPadding: newValue } });
  };

  const chunkSizeOptions = [1, 2, 4, 6, 8, 10, 16, 32, 50, 100];
  const chunkSizeIndex = chunkSizeOptions.indexOf(maxLinesPerChunk);
  const handleMaxLinesPerChunkChange = (_: Event, value: number | number[]) => {
    const index = Array.isArray(value) ? value[0] : value;
    const newValue = chunkSizeOptions[index] || 10;
    console.log("[SettingsMenu] Setting maxLinesPerChunk to:", newValue);
    setMaxLinesPerChunk(newValue);
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: { maxLinesPerChunk: newValue },
    });
  };

  const handleShowPinyinChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = event.target.checked;
    setShowPinyin(newValue);
    dispatch({ type: "UPDATE_SETTINGS", payload: { showPinyin: newValue } });
  };

  const handleUseBlockTextPinyinChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = event.target.checked;
    setUseBlockTextPinyin(newValue);
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: { useBlockTextPinyin: newValue },
    });
  };

  const handleShowTranslationBelowChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = event.target.checked;
    setShowTranslationBelow(newValue);
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: { showTranslationBelow: newValue },
    });
  };

  const handleCharacterTypeChange = (event: any) => {
    const newValue = event.target.value;
    setCharacterType(newValue);
    dispatch({ type: "UPDATE_SETTINGS", payload: { characterType: newValue } });
  };

  const handleAutoTranslateNextChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = event.target.checked;
    setAutoTranslateNext(newValue);
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: { autoTranslateNext: newValue },
    });
  };

  const handleShowChapterListChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = event.target.checked;
    setShowChapterList(newValue);
    localStorage.setItem("showChapterList", newValue.toString());
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: { showChapterList: newValue },
    });
  };

  const handleShowFooterChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = event.target.checked;
    setShowFooter(newValue);
    localStorage.setItem("showFooter", newValue.toString());
    dispatch({ type: "UPDATE_SETTINGS", payload: { showFooter: newValue } });
  };

  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value);
  };

  const handleTranslationModelChange = (event: any) => {
    const newValue = event.target.value;
    setTranslationModel(newValue);
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: { translationModel: newValue },
    });
  };

  const handleAllowEditsChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = event.target.checked;
    setAllowEdits(newValue);
    dispatch({ type: "UPDATE_SETTINGS", payload: { allowEdits: newValue } });
  };

  const saveApiKey = () => {
    localStorage.setItem("apiKey", apiKey);
    alert("API Key saved successfully.");
    window.dispatchEvent(new CustomEvent("apiKeyUpdated", { detail: apiKey }));
  };

  const handleExportTxt = () => {
    if (state.chapters.length === 0) return;
    exportToTxt(state.chapters, state.translations);
  };

  const handleExportZip = async () => {
    if (state.chapters.length === 0) return;
    await exportToZip(state.chapters, state.translations);
  };

  const handleExportProgress = () => {
    if (state.chapters.length === 0) return;
    exportProgress(state.chapters, state.translations, state.glossary);
  };

  const handleTxtFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportFileName(file.name);
        setImportFileContent(content);
        setImportRegex(chapterRegex);
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

  if (!isOpen) return null;

  const translationModels = [
    { label: "4.1-nano (1¢~/10k chinese char.)", value: "gpt-4.1-nano" },
    { label: "4.1-mini (4x cost)", value: "gpt-4.1-mini" },
    { label: "4.1 (20x cost)", value: "gpt-4.1" },
    { label: "4o-mini (1.5x cost)", value: "gpt-4o-mini" },
    { label: "4o (25x cost)", value: "gpt-4o" },
  ];

  const hasTranslations = Object.keys(state.translations).length > 0;

  const fontSizeMarks = fontSizeOptions.map((val, idx) =>
    idx % 2 === 0 ? { value: idx, label: String(val) } : { value: idx }
  );
  const paddingMarks = paddingOptions.map((val, idx) =>
    idx % 2 === 0 ? { value: idx, label: String(val) } : { value: idx }
  );
  const chunkSizeMarks = chunkSizeOptions.map((val, idx) =>
    idx % 2 === 0 ? { value: idx, label: String(val) } : { value: idx }
  );

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Settings />
        Settings
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {/* Display Settings */}
          <Accordion defaultExpanded sx={{ boxShadow: "none" }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Visibility />
                <Typography variant="h6">Display Settings</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showChapterList}
                      onChange={handleShowChapterListChange}
                      color="primary"
                    />
                  }
                  label="Show Chapters"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={showFooter}
                      onChange={handleShowFooterChange}
                      color="primary"
                    />
                  }
                  label="Show Footer"
                />

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Font Size: {fontSize}px
                  </Typography>
                  <Slider
                    value={fontSizeIndex}
                    min={0}
                    max={fontSizeOptions.length - 1}
                    step={1}
                    marks={fontSizeMarks}
                    onChange={handleFontSizeChange}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(idx) => fontSizeOptions[idx]}
                  />
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Viewer Padding: {viewerPadding}px
                  </Typography>
                  <Slider
                    value={paddingIndex}
                    min={0}
                    max={paddingOptions.length - 1}
                    step={1}
                    marks={paddingMarks}
                    onChange={handleViewerPaddingChange}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(idx) => paddingOptions[idx]}
                  />
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Translation Settings */}
          <Accordion defaultExpanded sx={{ boxShadow: "none" }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Translate />
                <Typography variant="h6">Translation Settings</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoTranslateNext}
                      onChange={handleAutoTranslateNextChange}
                      color="primary"
                    />
                  }
                  label="Auto Translate Next"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={showTranslationBelow}
                      onChange={handleShowTranslationBelowChange}
                      color="primary"
                    />
                  }
                  label="Show Translation Inline"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={allowEdits}
                      onChange={handleAllowEditsChange}
                      color="primary"
                    />
                  }
                  label="Allow Edits"
                />

                <FormControl fullWidth>
                  <InputLabel>Translation Model</InputLabel>
                  <Select
                    value={translationModel}
                    onChange={handleTranslationModelChange}
                    label="Translation Model"
                  >
                    {translationModels.map((model, idx) => (
                      <MenuItem key={idx} value={model.value}>
                        {model.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Max Lines Per Chunk: {maxLinesPerChunk}
                  </Typography>
                  <Slider
                    value={chunkSizeIndex}
                    min={0}
                    max={chunkSizeOptions.length - 1}
                    step={1}
                    marks={chunkSizeMarks}
                    onChange={handleMaxLinesPerChunkChange}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(idx) => chunkSizeOptions[idx]}
                  />
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Text Display Settings */}
          <Accordion defaultExpanded sx={{ boxShadow: "none" }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Visibility />
                <Typography variant="h6">Text Display</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showPinyin}
                      onChange={handleShowPinyinChange}
                      color="primary"
                    />
                  }
                  label="Show Pinyin"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={useBlockTextPinyin}
                      onChange={handleUseBlockTextPinyinChange}
                      color="primary"
                    />
                  }
                  label="Block Text Pinyin"
                />

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Character Type
                  </Typography>
                  <FormControl component="fieldset">
                    <RadioGroup
                      row
                      name="character-type"
                      value={characterType}
                      onChange={handleCharacterTypeChange}
                    >
                      <FormControlLabel
                        value="original"
                        control={<Radio />}
                        label="Original"
                      />
                      <FormControlLabel
                        value="simplified"
                        control={<Radio />}
                        label="Simplified"
                      />
                      <FormControlLabel
                        value="traditional"
                        control={<Radio />}
                        label="Traditional"
                      />
                    </RadioGroup>
                  </FormControl>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* API Configuration */}
          <Accordion sx={{ boxShadow: "none" }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Storage />
                <Typography variant="h6">API Configuration</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="API Key"
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  placeholder="Enter your API key"
                  type="password"
                  size="small"
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={saveApiKey}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Save API Key
                </Button>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* File Management */}
          <Accordion sx={{ boxShadow: "none" }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FileUpload />
                <Typography variant="h6">File Management</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Import New File
                  </Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    startIcon={<FileUpload />}
                  >
                    Choose .txt File
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleTxtFileImport}
                      style={{ display: "none" }}
                    />
                  </Button>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Export Translations
                  </Typography>
                  <Stack spacing={1}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleExportTxt}
                      disabled={!hasTranslations}
                      startIcon={<FileDownload />}
                      fullWidth
                    >
                      Export All to TXT
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={handleExportZip}
                      disabled={!hasTranslations}
                      startIcon={<FileDownload />}
                      fullWidth
                    >
                      Export All to ZIP
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleExportProgress}
                      disabled={state.chapters.length === 0}
                      fullWidth
                    >
                      Export Progress
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
      </DialogActions>

      {/* Import Preview Dialog */}
      <ImportDialog
        open={importDialogOpen}
        fileName={importFileName}
        fileContent={importFileContent}
        initialRegex={importRegex}
        onClose={handleImportDialogClose}
        onConfirm={handleImportDialogConfirm}
      />
    </Dialog>
  );
};

export default SettingsMenu;
