import React from 'react';
import {
    Box,
    Typography,
    Button,
    CircularProgress
} from '@mui/material';
import { useAppContext } from '../contexts/AppContext';

interface ChapterHeaderProps {
    apiKey: string;
    isTranslating: boolean;
    onTranslate: () => void;
}

const ChapterHeader = ({ apiKey, isTranslating, onTranslate }: ChapterHeaderProps) => {
    const { state, dispatch } = useAppContext();
    const { originalChapterContents, translatedChapterContents, selectedChapter } = state;

    if (selectedChapter === null) {
        return null;
    }
    if (originalChapterContents.length === 0) {
        return null;
    }

    const currentChapter = originalChapterContents[selectedChapter];
    const currentTranslation = translatedChapterContents[selectedChapter] || [];
    const totalLines = currentChapter.length - 1;

    let translatedLines = 0;
    for (let i = 1; i < currentTranslation.length; i++) {
        const line = currentTranslation[i];
        if (line && line.trim().length > 0) {
            translatedLines++;
        }
    }

    const untranslatedLines = totalLines - translatedLines;

    return (
        <Box className="chapter-header">
            <Typography variant="h6" className="chapter-title-text">
                {currentChapter[0]}
            </Typography>
            <Box className="translation-info">
                <Typography variant="body2" color="textSecondary">
                    {translatedLines}/{totalLines} lines translated ({untranslatedLines} remaining)
                </Typography>
            </Box>
            <Button
                variant="contained"
                onClick={onTranslate}
                disabled={isTranslating || !apiKey || translatedLines === totalLines}
                startIcon={isTranslating ? <CircularProgress size={20} /> : null}
                className="translate-button"
            >
                {isTranslating ? 'Translating...' : `Translate ${apiKey ? '' : '(API KEY NOT Set)'}`}
            </Button>
            <Button
                variant="outlined"
                color="warning"
                onClick={() => dispatch({ type: 'SET_CLEAR_TRANSLATION_MODAL_OPEN', payload: true })}
                className="clear-translation-button"
            >
                Clear Translation
            </Button>
            <Button
                variant="outlined"
                onClick={() => dispatch({ type: 'SET_GLOSSARY_MODAL_OPEN', payload: true })}
                className="glossary-button"
            >
                Glossary ({state.glossary.terms.length + state.glossary.characters.length})
            </Button>
        </Box>
    );
};

export default ChapterHeader; 