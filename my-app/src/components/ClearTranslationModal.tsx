import React from 'react';
import { Box, Modal, Typography, Button, Divider } from '@mui/material';
import { useAppContext } from '../contexts/AppContext';
import '../styles/ClearTranslationModal.css';

interface ClearTranslationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ClearTranslationModal = ({ isOpen, onClose }: ClearTranslationModalProps) => {
    const { state, dispatch } = useAppContext();

    const handleClearCurrentChapter = () => {
        if (state.selectedChapter !== null) {
            dispatch({ type: 'CLEAR_CHAPTER_TRANSLATION', payload: state.selectedChapter });
        }
        onClose();
    };

    const handleClearAllTranslations = () => {
        dispatch({ type: 'CLEAR_ALL_TRANSLATIONS', payload: undefined });
        onClose();
    };

    const hasCurrentChapterTranslation = () => {
        if (state.selectedChapter === null) {
            return false;
        }
        if (!state.translatedChapterContents[state.selectedChapter]) {
            return false;
        }

        for (const line of state.translatedChapterContents[state.selectedChapter]) {
            if (line.trim() !== '') {
                return true;
            }
        }
        return false;
    };

    const hasAnyTranslations = () => {
        for (const chapter of state.translatedChapterContents) {
            for (const line of chapter) {
                if (line.trim() !== '') {
                    return true;
                }
            }
        }
        return false;
    };



    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            aria-labelledby="clear-translation-modal-title"
            aria-describedby="clear-translation-modal-description"
        >
            <Box className="clear-translation-modal">
                <Typography id="clear-translation-modal-title" variant="h6" component="h2" gutterBottom>
                    Clear Translation Options
                </Typography>
                <Typography id="clear-translation-modal-description" className="clear-translation-modal-description">
                    Choose an option to clear translations:
                </Typography>

                <Box className="clear-translation-options">
                    <Button
                        variant="outlined"
                        color="warning"
                        onClick={handleClearCurrentChapter}
                        disabled={!hasCurrentChapterTranslation}
                        fullWidth
                    >
                        Clear This Chapter Only
                        {!hasCurrentChapterTranslation && ' (No translation for current chapter)'}
                    </Button>

                    <Divider />

                    <Button
                        variant="outlined"
                        color="error"
                        onClick={handleClearAllTranslations}
                        disabled={!hasAnyTranslations()}
                        fullWidth
                    >
                        Clear All Translations
                        {!hasAnyTranslations && ' (No translations to clear)'}
                    </Button>
                </Box>

                <Box className="clear-translation-actions">
                    <Button onClick={onClose}>
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default ClearTranslationModal; 