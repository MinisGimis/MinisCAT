import React from 'react';
import {
    Box,
    Typography
} from '@mui/material';

interface WelcomeScreenProps {
    onFileUpload: (file: File) => void;
}

const WelcomeScreen = ({ onFileUpload }: WelcomeScreenProps) => {
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onFileUpload(file);
        }
    };

    return (
        <Box className="welcome-container">
            <Typography variant="h5" className="welcome-title">
                Welcome to MinisTranslator
            </Typography>
            <Typography variant="body1" className="welcome-subtitle">
                Upload a novel to get started
            </Typography>
            <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="file-upload-input"
            />
        </Box>
    );
};

export default WelcomeScreen; 