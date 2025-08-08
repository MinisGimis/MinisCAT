import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    TextField
} from '@mui/material';
import { ChapterContents } from '../types';
import { extractChapters } from '../services/fileService';
import '../styles/ImportDialog.css';

interface ImportDialogProps {
    open: boolean;
    fileName: string;
    fileContent: string;
    initialRegex: string;
    onClose: () => void;
    onConfirm: (chapters: ChapterContents[]) => void;
}

const ImportDialog = ({ open, fileName, fileContent, initialRegex, onClose, onConfirm }: ImportDialogProps) => {
    const [regex, setRegex] = useState(initialRegex);
    const [chapters, setChapters] = useState<ChapterContents[]>([]);
    const [regexError, setRegexError] = useState<string | null>(null);

    useEffect(() => {
        if (!fileContent || !regex) {
            return;
        }

        try {
            const extractedChapters = extractChapters(fileContent, regex);
            setChapters(extractedChapters);
            setRegexError(null);
        } catch (error) {
            if (error instanceof Error) {
                setRegexError(error.message);
            } else {
                setRegexError('Invalid regex');
            }
            setChapters([]);
        }
    }, [fileContent, regex]);

    const suggestedRegexes = [
        {
            label: 'Numeric Chapters (e.g., 001., 002.)',
            value: '^\\d{3}\\.[^\\n]*'
        },
        {
            label: 'Chinese Chapters (e.g., 第一章)',
            value: '第[一二三四五六七八九十百千零0-9]+章[^\\n]*'
        },
        {
            label: 'Simple Chapter (e.g., Chapter 1)',
            value: '^Chapter\\s+\\d+[^\\n]*'
        },
        {
            label: 'Any line starting with number and dot',
            value: '^\\d+\\.[^\\n]*'
        },
        {
            label: 'Chapter with hash (e.g., # Chapter 1)',
            value: '^#\\s+[^\\n]*'
        },
        {
            label: 'Chapter with asterisk (e.g., * Chapter 1)',
            value: '^\\*\\s+[^\\n]*'
        }
    ];

    const renderFilePreview = () => {
        const lines = fileContent.split('\n').slice(0, 30);
        const previewLines = [];

        for (let idx = 0; idx < lines.length; idx++) {
            const line = lines[idx];
            previewLines.push(<div key={idx}>{line}</div>);
        }

        return previewLines;
    };

    const renderSuggestions = () => {
        const buttons = [];

        for (let i = 0; i < suggestedRegexes.length; i++) {
            const regexOpt = suggestedRegexes[i];
            buttons.push(
                <Button
                    key={regexOpt.label}
                    variant="outlined"
                    size="small"
                    onClick={() => setRegex(regexOpt.value)}
                    className="import-dialog-suggestion-button"
                >
                    {regexOpt.label}
                </Button>
            );
        }

        return buttons;
    };

    const renderTableOfContents = () => {
        if (chapters.length === 0 && !regexError) {
            return <div className="import-dialog-no-chapters">(No chapters found with current regex)</div>;
        }

        const tocItems = [];
        for (let idx = 0; idx < chapters.length; idx++) {
            const chapter = chapters[idx];
            const title = chapter[0] || '(Untitled Chapter)';
            tocItems.push(<div key={idx}>{idx + 1}. {title}</div>);
        }

        return tocItems;
    };

    const renderChapterPreview = () => {
        if (chapters.length === 0) {
            return null;
        }

        const firstChapter = chapters[0];
        const chapterContent = firstChapter.slice(1).join('\n');
        const contentLength = chapterContent.length;
        const previewText = chapterContent.substring(0, 300);
        const hasMoreContent = contentLength > 300;

        return (
            <>
                <Typography variant="subtitle1" className="import-dialog-preview-title import-dialog-chapter-preview-section">First Chapter Preview:</Typography>
                <Box className="import-dialog-chapter-preview">
                    <div className="import-dialog-chapter-preview-title">Title: {firstChapter[0]}</div>
                    <div className="import-dialog-chapter-preview-title">Content length: {contentLength} characters</div>
                    <div className="import-dialog-chapter-preview-content">
                        {previewText}
                        {hasMoreContent && '...'}
                    </div>
                </Box>
            </>
        );
    };

    const isConfirmButtonDisabled = () => {
        if (regexError) {
            return true;
        }
        if (chapters.length === 0) {
            return true;
        }
        return false;
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Import Preview: {fileName}</DialogTitle>
            <DialogContent>
                <Typography variant="subtitle1" className="import-dialog-preview-title">File Preview (first 30 lines):</Typography>
                <Box className="import-dialog-file-preview">
                    {renderFilePreview()}
                </Box>
                <Typography variant="subtitle1" className="import-dialog-preview-title">Chapter Extraction Regex:</Typography>
                <TextField
                    value={regex}
                    onChange={e => setRegex(e.target.value)}
                    fullWidth
                    size="small"
                    className="import-dialog-regex-field"
                />
                <Box className="import-dialog-suggestions-container">
                    <Typography variant="body2" className="import-dialog-suggestions-label">Suggestions:</Typography>
                    {renderSuggestions()}
                </Box>
                {regexError && (
                    <Typography color="error" variant="body2" className="import-dialog-error">
                        {regexError}
                    </Typography>
                )}
                <Typography variant="subtitle1" className="import-dialog-preview-title">Extracted Chapters TOC:</Typography>
                <Box className="import-dialog-toc">
                    {renderTableOfContents()}
                </Box>
                {renderChapterPreview()}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={() => onConfirm(chapters)}
                    variant="contained"
                    color="primary"
                    disabled={isConfirmButtonDisabled()}
                >
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ImportDialog; 