import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useAppContext } from '../contexts/AppContext';

const Footer = () => {
    const { state, dispatch } = useAppContext();
    const { originalChapterContents, selectedChapter } = state;

    const handlePreviousChapter = () => {
        if (selectedChapter === null) {
            return;
        }
        if (selectedChapter <= 0) {
            return;
        }
        dispatch({ type: 'SET_SELECTED_CHAPTER', payload: selectedChapter - 1 });
    };

    const handleNextChapter = () => {
        if (selectedChapter === null) {
            return;
        }
        if (selectedChapter >= originalChapterContents.length - 1) {
            return;
        }
        dispatch({ type: 'SET_SELECTED_CHAPTER', payload: selectedChapter + 1 });
    };

    const isFirstChapter = () => {
        return selectedChapter === 0;
    };

    const isLastChapter = () => {
        return selectedChapter === originalChapterContents.length - 1;
    };

    const getChapterInfo = () => {
        let chapterNumber = 0;
        if (selectedChapter !== null) {
            chapterNumber = selectedChapter + 1;
        }
        return `Chapter ${chapterNumber} of ${originalChapterContents.length}`;
    };

    return (
        <Box className="footer">
            <Button
                variant="outlined"
                onClick={handlePreviousChapter}
                disabled={isFirstChapter()}
                className="nav-button"
            >
                Previous Chapter
            </Button>

            <Typography variant="body2" className="chapter-info">
                {getChapterInfo()}
            </Typography>

            <Button
                variant="outlined"
                onClick={handleNextChapter}
                disabled={isLastChapter()}
                className="nav-button"
            >
                Next Chapter
            </Button>
        </Box>
    );
};

export default Footer; 