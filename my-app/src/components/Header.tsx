import React from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAppContext } from '../contexts/AppContext';

interface HeaderProps {
    onSettingsClick: () => void;
}

const Header = ({ onSettingsClick }: HeaderProps) => {
    const { state } = useAppContext();
    const { originalChapterContents, selectedChapter } = state;

    const novelTitle = selectedChapter !== null && originalChapterContents[selectedChapter]
        ? originalChapterContents[selectedChapter][0]
        : 'Select a Chapter';
    const chaptersCount = originalChapterContents.length;

    return (
        <Box className="header">
            <Box className="dynamic-header">
                <Typography variant="h4" className="chapter-title">
                    MinisTranslator
                </Typography>
                <Box className="settings-container">
                    <Tooltip title="Settings">
                        <IconButton
                            onClick={onSettingsClick}
                            size="large"
                            color="inherit"
                        >
                            <SettingsIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
            {chaptersCount > 0 ? (
                <Box>
                    <h1 className="chapter-title">{novelTitle}</h1>
                    <Typography variant="body2" color="textSecondary">
                        {chaptersCount} chapter{chaptersCount !== 1 ? 's' : ''} loaded
                    </Typography>
                </Box>
            ) : (
                <Typography variant="body1" color="textSecondary">
                    Upload a novel to get started
                </Typography>
            )}
        </Box>
    );
};

export default Header; 