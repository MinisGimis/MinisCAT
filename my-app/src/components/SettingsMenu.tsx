import React, { useState, useEffect } from 'react';
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
    Stack
} from '@mui/material';
import { ExpandMore, Settings, Visibility, Translate, Storage, FileUpload, Download } from '@mui/icons-material';
import { useAppContext } from '../contexts/AppContext';
import ImportDialog from './ImportDialog';
import { ChapterContents } from '../types';
import '../styles/SettingsMenu.css';

interface SettingsMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsMenu = ({ isOpen, onClose }: SettingsMenuProps) => {
    const { state, dispatch, updateSettings } = useAppContext();

    const [localApiKey, setLocalApiKey] = useState(state.apiKey);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importFileName, setImportFileName] = useState('');
    const [importFileContent, setImportFileContent] = useState('');
    const [importRegex, setImportRegex] = useState(state.settings.chapterRegex);

    useEffect(() => {
        setLocalApiKey(state.apiKey);
        setImportRegex(state.settings.chapterRegex);
    }, [state.apiKey, state.settings.chapterRegex]);

    const fontSizeOptions = [4, 8, 12, 16, 20, 24, 32, 40, 48, 54, 60];
    const paddingOptions = [0, 2, 4, 8, 16, 24, 32, 40, 48, 60, 64, 72, 80, 100, 120, 160];
    const chunkSizeOptions = [1, 2, 4, 6, 8, 10, 16, 32, 50, 100];

    const handleFontSizeChange = (_: Event, value: number | number[]) => {
        const index = Array.isArray(value) ? value[0] : value;
        const newValue = fontSizeOptions[index] || 16;
        updateSettings({ fontSize: newValue });
    };

    const handleViewerPaddingChange = (_: Event, value: number | number[]) => {
        const index = Array.isArray(value) ? value[0] : value;
        const newValue = paddingOptions[index] || 16;
        updateSettings({ viewerPadding: newValue });
    };

    const handleMaxLinesPerChunkChange = (_: Event, value: number | number[]) => {
        const index = Array.isArray(value) ? value[0] : value;
        const newValue = chunkSizeOptions[index] || 10;
        updateSettings({ maxLinesPerChunk: newValue });
    };

    const handleShowPinyinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        updateSettings({ showPinyin: event.target.checked });
    };

    const handleUseBlockTextPinyinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        updateSettings({ useBlockTextPinyin: event.target.checked });
    };

    const handleShowTranslationBelowChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        updateSettings({ showTranslationBelow: event.target.checked });
    };

    const handleCharacterTypeChange = (event: any) => {
        updateSettings({ characterType: event.target.value });
    };

    const handleAutoTranslateNextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        updateSettings({ autoTranslateNext: event.target.checked });
    };

    const handleShowChapterListChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        updateSettings({ showChapterList: event.target.checked });
    };

    const handleShowFooterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        updateSettings({ showFooter: event.target.checked });
    };

    const handleTranslationModelChange = (event: any) => {
        updateSettings({ translationModel: event.target.value });
    };

    const handleAllowEditsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        updateSettings({ allowEdits: event.target.checked });
    };

    const handleChapterRegexChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        updateSettings({ chapterRegex: event.target.value });
    };

    const saveApiKey = () => {
        dispatch({ type: 'UPDATE_API_KEY', payload: localApiKey });
        alert('API Key saved successfully.');
    };

    const handleTxtFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            setImportFileName(file.name);
            setImportFileContent(content);
            setImportRegex(state.settings.chapterRegex);
            setImportDialogOpen(true);
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleImportDialogClose = () => {
        setImportDialogOpen(false);
        setImportFileName('');
        setImportFileContent('');
    };

    const handleImportDialogConfirm = (chapters: ChapterContents[]) => {
        dispatch({ type: 'SET_ORIGINAL_CHAPTER_CONTENTS', payload: [] });
        dispatch({ type: 'SET_TRANSLATED_CHAPTER_CONTENTS', payload: [] });
        dispatch({ type: 'SET_GLOSSARY', payload: { terms: [], characters: [] } });
        dispatch({ type: 'SET_SELECTED_CHAPTER', payload: null });

        const translatedContents: ChapterContents[] = chapters.map(chapter => {
            return chapter.map((line, index) => {
                if (index === 0) {
                    return line;
                }
                return '';
            });
        });

        dispatch({ type: 'SET_ORIGINAL_CHAPTER_CONTENTS', payload: chapters });
        dispatch({ type: 'SET_TRANSLATED_CHAPTER_CONTENTS', payload: translatedContents });
        if (chapters.length > 0) {
            dispatch({ type: 'SET_SELECTED_CHAPTER', payload: 0 });
        }

        handleImportDialogClose();
    };

    const handleExportTranslatedChapters = () => {
        if (!hasTranslations) {
            alert('No translated chapters to export.');
            return;
        }

        const translatedChapters = [];
        for (let index = 0; index < state.translatedChapterContents.length; index++) {
            const translatedChapter = state.translatedChapterContents[index];
            const originalChapter = state.originalChapterContents[index];

            if (!originalChapter) {
                continue;
            }

            let hasTranslatedContent = false;
            for (let lineIndex = 1; lineIndex < translatedChapter.length; lineIndex++) {
                const line = translatedChapter[lineIndex];
                if (line && line.trim().length > 0) {
                    hasTranslatedContent = true;
                    break;
                }
            }

            if (!hasTranslatedContent) {
                continue;
            }

            const chapterLines = [originalChapter[0]];

            for (let i = 1; i < originalChapter.length; i++) {
                const translatedLine = translatedChapter[i]?.trim();
                if (translatedLine && translatedLine.length > 0) {
                    chapterLines.push(translatedLine);
                } else {
                    continue;
                }
            }

            if (chapterLines.length > 1) {
                translatedChapters.push(chapterLines);
            }
        }

        if (translatedChapters.length === 0) {
            alert('No chapters with complete translations found.');
            return;
        }

        const content = translatedChapters
            .map(chapter => chapter.join('\n'))
            .join('\n\n');

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `translated_chapters_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        alert(`Exported ${translatedChapters.length} translated chapters to TXT file.`);
    };

    if (!isOpen) {
        return null;
    }

    const translationModels = [
        { label: '5-nano (1¢~/10k chinese char.)', value: 'gpt-5-nano' },
        { label: '5-mini (4x cost)', value: 'gpt-5-mini' },
        { label: '5 (20x cost)', value: 'gpt-5' },
        { label: '4.1-nano (1¢~/10k chinese char.)', value: 'gpt-4.1-nano' },
        { label: '4.1-mini (4x cost)', value: 'gpt-4.1-mini' },
        { label: '4.1 (20x cost)', value: 'gpt-4.1' },
        { label: '4o-mini (1.5x cost)', value: 'gpt-4o-mini' },
        { label: '4o (25x cost)', value: 'gpt-4o' }
    ];

    let hasTranslations = false;
    for (const chapter of state.translatedChapterContents) {
        for (let index = 1; index < chapter.length; index++) {
            const line = chapter[index];
            if (line && line.trim().length > 0) {
                hasTranslations = true;
                break;
            }
        }
        if (hasTranslations) {
            break;
        }
    }

    const getExportStats = () => {
        const translatedChapters = [];

        for (let index = 0; index < state.translatedChapterContents.length; index++) {
            const translatedChapter = state.translatedChapterContents[index];
            const originalChapter = state.originalChapterContents[index];

            if (!originalChapter) {
                continue;
            }

            const translatedLines = [];
            for (let lineIndex = 1; lineIndex < translatedChapter.length; lineIndex++) {
                const line = translatedChapter[lineIndex];
                if (line && line.trim().length > 0) {
                    translatedLines.push(line);
                }
            }

            if (translatedLines.length > 0) {
                translatedChapters.push({
                    title: originalChapter[0],
                    translatedLines: translatedLines.length,
                    totalLines: originalChapter.length - 1
                });
            }
        }

        let totalTranslatedLines = 0;
        let totalOriginalLines = 0;
        for (const chapter of translatedChapters) {
            totalTranslatedLines += chapter.translatedLines;
            totalOriginalLines += chapter.totalLines;
        }

        return {
            totalChapters: translatedChapters.length,
            totalTranslatedLines: totalTranslatedLines,
            totalOriginalLines: totalOriginalLines
        };
    };

    const exportStats = getExportStats();

    const fontSizeMarks = fontSizeOptions.map((val, idx) => {
        if (idx % 2 === 0) {
            return { value: idx, label: String(val) };
        }
        return { value: idx };
    });

    const paddingMarks = paddingOptions.map((val, idx) => {
        if (idx % 2 === 0) {
            return { value: idx, label: String(val) };
        }
        return { value: idx };
    });

    const chunkSizeMarks = chunkSizeOptions.map((val, idx) => {
        if (idx % 2 === 0) {
            return { value: idx, label: String(val) };
        }
        return { value: idx };
    });

    const fontSizeIndex = fontSizeOptions.indexOf(state.settings.fontSize);
    const paddingIndex = paddingOptions.indexOf(state.settings.viewerPadding);
    const chunkSizeIndex = chunkSizeOptions.indexOf(state.settings.maxLinesPerChunk);

    const renderTranslationModels = () => {
        const items = [];
        for (let idx = 0; idx < translationModels.length; idx++) {
            const model = translationModels[idx];
            items.push(
                <MenuItem key={idx} value={model.value}>{model.label}</MenuItem>
            );
        }
        return items;
    };

    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle className="settings-dialog-title">
                <Settings />
                Settings
            </DialogTitle>
            <DialogContent>
                <Stack spacing={3}>
                    <Accordion defaultExpanded className="settings-accordion">
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box className="settings-accordion-summary">
                                <Visibility />
                                <Typography variant="h6">Display Settings</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Stack spacing={2}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={state.settings.showChapterList}
                                            onChange={handleShowChapterListChange}
                                            color="primary"
                                        />
                                    }
                                    label="Show Chapters"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={state.settings.showFooter}
                                            onChange={handleShowFooterChange}
                                            color="primary"
                                        />
                                    }
                                    label="Show Footer"
                                />

                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Font Size: {state.settings.fontSize}px
                                    </Typography>
                                    <Slider
                                        value={fontSizeIndex}
                                        min={0}
                                        max={fontSizeOptions.length - 1}
                                        step={1}
                                        marks={fontSizeMarks}
                                        onChange={handleFontSizeChange}
                                        valueLabelDisplay="auto"
                                        valueLabelFormat={idx => fontSizeOptions[idx]}
                                    />
                                </Box>

                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Viewer Padding: {state.settings.viewerPadding}px
                                    </Typography>
                                    <Slider
                                        value={paddingIndex}
                                        min={0}
                                        max={paddingOptions.length - 1}
                                        step={1}
                                        marks={paddingMarks}
                                        onChange={handleViewerPaddingChange}
                                        valueLabelDisplay="auto"
                                        valueLabelFormat={idx => paddingOptions[idx]}
                                    />
                                </Box>
                            </Stack>
                        </AccordionDetails>
                    </Accordion>


                    <Accordion defaultExpanded className="settings-accordion">
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box className="settings-accordion-summary">
                                <Translate />
                                <Typography variant="h6">Translation Settings</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Stack spacing={2}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={state.settings.autoTranslateNext}
                                            onChange={handleAutoTranslateNextChange}
                                            color="primary"
                                        />
                                    }
                                    label="Auto Translate Next"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={state.settings.showTranslationBelow}
                                            onChange={handleShowTranslationBelowChange}
                                            color="primary"
                                        />
                                    }
                                    label="Show Translation Inline"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={state.settings.allowEdits}
                                            onChange={handleAllowEditsChange}
                                            color="primary"
                                        />
                                    }
                                    label="Allow Edits"
                                />

                                <FormControl fullWidth>
                                    <InputLabel>Translation Model</InputLabel>
                                    <Select
                                        value={state.settings.translationModel}
                                        onChange={handleTranslationModelChange}
                                        label="Translation Model"
                                    >
                                        {renderTranslationModels()}
                                    </Select>
                                </FormControl>

                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Max Lines Per Chunk: {state.settings.maxLinesPerChunk}
                                    </Typography>
                                    <Slider
                                        value={chunkSizeIndex}
                                        min={0}
                                        max={chunkSizeOptions.length - 1}
                                        step={1}
                                        marks={chunkSizeMarks}
                                        onChange={handleMaxLinesPerChunkChange}
                                        valueLabelDisplay="auto"
                                        valueLabelFormat={idx => chunkSizeOptions[idx]}
                                    />
                                </Box>
                            </Stack>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion defaultExpanded className="settings-accordion">
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box className="settings-accordion-summary">
                                <Visibility />
                                <Typography variant="h6">Text Display</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Stack spacing={2}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={state.settings.showPinyin}
                                            onChange={handleShowPinyinChange}
                                            color="primary"
                                        />
                                    }
                                    label="Show Pinyin"
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={state.settings.useBlockTextPinyin}
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
                                            value={state.settings.characterType}
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
                    <Accordion className="settings-accordion">
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box className="settings-accordion-summary">
                                <Storage />
                                <Typography variant="h6">API Configuration</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Stack spacing={2}>
                                <TextField
                                    fullWidth
                                    label="API Key"
                                    value={localApiKey}
                                    onChange={(e) => setLocalApiKey(e.target.value)}
                                    placeholder="Enter your API key"
                                    type="password"
                                    size="small"
                                />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={saveApiKey}
                                    className="settings-save-api-key-button"
                                >
                                    Save API Key
                                </Button>
                            </Stack>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion className="settings-accordion">
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box className="settings-accordion-summary">
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
                                            className="settings-file-input"
                                        />
                                    </Button>
                                </Box>

                                <Divider />

                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Export Translations
                                    </Typography>
                                    <Stack spacing={1}>
                                        {hasTranslations && (
                                            <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    Ready to export: {exportStats.totalChapters} chapters
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    Translated lines: {exportStats.totalTranslatedLines} / {exportStats.totalOriginalLines}
                                                </Typography>
                                            </Box>
                                        )}
                                        <Button
                                            variant="contained"
                                            color="success"
                                            onClick={handleExportTranslatedChapters}
                                            disabled={!hasTranslations}
                                            startIcon={<Download />}
                                            fullWidth
                                        >
                                            Export Translated Chapters to TXT
                                        </Button>
                                        <Typography variant="caption" color="text.secondary">
                                            Only exports chapters that have been translated
                                        </Typography>
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