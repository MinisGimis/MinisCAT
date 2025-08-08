import React, { useState } from 'react';
import { Box, Modal, Typography, Button, Divider, IconButton, TextField, FormControl, Select, MenuItem, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAppContext } from '../contexts/AppContext';
import { cleanupGlossary } from '../services/glossaryService';
import '../styles/GlossaryModal.css';

interface GlossaryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Gender = 'man' | 'woman' | 'it';

const GlossaryModal = ({ isOpen, onClose }: GlossaryModalProps) => {
    const { state, dispatch } = useAppContext();
    const [editingTermIndex, setEditingTermIndex] = useState<number | null>(null);
    const [editingCharIndex, setEditingCharIndex] = useState<number | null>(null);
    const [editTerm, setEditTerm] = useState('');
    const [editTranslation, setEditTranslation] = useState('');
    const [editCharName, setEditCharName] = useState('');
    const [editCharTranslation, setEditCharTranslation] = useState('');
    const [editCharGender, setEditCharGender] = useState<Gender>('man');
    const [isCleaningGlossary, setIsCleaningGlossary] = useState(false);

    const handleEditTerm = (index: number) => {
        setEditingTermIndex(index);
        setEditTerm(state.glossary.terms[index].original);
        setEditTranslation(state.glossary.terms[index].translation);
    };

    const handleEditChar = (index: number) => {
        setEditingCharIndex(index);
        setEditCharName(state.glossary.characters[index].original_name);
        setEditCharTranslation(state.glossary.characters[index].translated_name);
        setEditCharGender(state.glossary.characters[index].gender as Gender);
    };

    const handleSaveTerm = () => {
        if (editingTermIndex !== null) {
            const updatedTerms = [...state.glossary.terms];
            updatedTerms[editingTermIndex] = { original: editTerm, translation: editTranslation };
            dispatch({ type: 'SET_GLOSSARY', payload: { ...state.glossary, terms: updatedTerms } });
            setEditingTermIndex(null);
        }
    };

    const handleSaveChar = () => {
        if (editingCharIndex !== null) {
            const updatedChars = [...state.glossary.characters];
            updatedChars[editingCharIndex] = { original_name: editCharName, translated_name: editCharTranslation, gender: editCharGender };
            dispatch({ type: 'SET_GLOSSARY', payload: { ...state.glossary, characters: updatedChars } });
            setEditingCharIndex(null);
        }
    };

    const handleDeleteTerm = (index: number) => {
        const updatedTerms = [];
        for (let i = 0; i < state.glossary.terms.length; i++) {
            if (i !== index) {
                updatedTerms.push(state.glossary.terms[i]);
            }
        }
        dispatch({ type: 'SET_GLOSSARY', payload: { ...state.glossary, terms: updatedTerms } });
    };

    const handleDeleteChar = (index: number) => {
        const updatedChars = [];
        for (let i = 0; i < state.glossary.characters.length; i++) {
            if (i !== index) {
                updatedChars.push(state.glossary.characters[i]);
            }
        }
        dispatch({ type: 'SET_GLOSSARY', payload: { ...state.glossary, characters: updatedChars } });
    };

    const handleDeleteAll = () => {
        dispatch({ type: 'SET_GLOSSARY', payload: { terms: [], characters: [] } });
    };

    const handleCleanupGlossary = async () => {
        if (!state.apiKey) {
            return;
        }
        if (state.glossary.terms.length === 0 && state.glossary.characters.length === 0) {
            return;
        }

        setIsCleaningGlossary(true);
        try {
            const cleanedGlossary = await cleanupGlossary(state.glossary, state.apiKey, state.settings);
            dispatch({
                type: 'SET_GLOSSARY',
                payload: {
                    terms: cleanedGlossary.cleaned_terms,
                    characters: cleanedGlossary.cleaned_characters
                }
            });
        } catch (error) {
            console.error('Glossary cleanup failed:', error);
            alert('Glossary cleanup failed. Please check your API key and try again.');
        } finally {
            setIsCleaningGlossary(false);
        }
    };

    const handleAddTerm = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') {
            return;
        }
        if (!event.currentTarget.value.trim()) {
            return;
        }

        const [original, translated] = event.currentTarget.value.split(':');
        if (original && translated) {
            dispatch({
                type: 'ADD_GLOSSARY_TERM',
                payload: { original: original.trim(), translation: translated.trim() }
            });
            event.currentTarget.value = '';
        }
    };

    const handleAddCharacter = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') {
            return;
        }
        if (!event.currentTarget.value.trim()) {
            return;
        }

        const [original, translated] = event.currentTarget.value.split(':');
        if (original && translated) {
            dispatch({
                type: 'ADD_GLOSSARY_CHARACTER',
                payload: { original_name: original.trim(), translated_name: translated.trim(), gender: 'man' }
            });
            event.currentTarget.value = '';
        }
    };

    const renderTerms = () => {
        if (state.glossary.terms.length === 0) {
            return <Typography color="text.secondary" className="glossary-no-items">No terms.</Typography>;
        }

        const termItems = [];
        for (let idx = 0; idx < state.glossary.terms.length; idx++) {
            const term = state.glossary.terms[idx];

            if (editingTermIndex === idx) {
                termItems.push(
                    <Box key={idx} className="glossary-item">
                        <Box className="glossary-item-edit-form">
                            <TextField
                                size="small"
                                value={editTerm}
                                onChange={e => setEditTerm(e.target.value)}
                                className="glossary-item-edit-input"
                                label="Original"
                            />
                            <TextField
                                size="small"
                                value={editTranslation}
                                onChange={e => setEditTranslation(e.target.value)}
                                className="glossary-item-edit-input"
                                label="Translation"
                            />
                            <Box className="glossary-item-edit-actions">
                                <Button size="small" onClick={handleSaveTerm}>Save</Button>
                                <Button size="small" onClick={() => setEditingTermIndex(null)}>Cancel</Button>
                            </Box>
                        </Box>
                    </Box>
                );
            } else {
                termItems.push(
                    <Box key={idx} className="glossary-item">
                        <Box className="glossary-item-content" onClick={() => handleEditTerm(idx)}>
                            <Typography className="glossary-item-original">
                                {term.original}
                            </Typography>
                            <Typography className="glossary-item-translation">
                                {term.translation}
                            </Typography>
                        </Box>
                        <Box className="glossary-item-actions">
                            <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTerm(idx);
                                }}
                                className="glossary-item-button delete"
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>
                );
            }
        }
        return termItems;
    };

    const renderCharacters = () => {
        if (state.glossary.characters.length === 0) {
            return <Typography color="text.secondary" className="glossary-no-items">No characters.</Typography>;
        }

        const charItems = [];
        for (let idx = 0; idx < state.glossary.characters.length; idx++) {
            const char = state.glossary.characters[idx];

            if (editingCharIndex === idx) {
                charItems.push(
                    <Box key={idx} className="glossary-item">
                        <Box className="glossary-character-form">
                            <Box className="glossary-character-form-row">
                                <TextField
                                    size="small"
                                    value={editCharName}
                                    onChange={e => setEditCharName(e.target.value)}
                                    className="glossary-character-form-field"
                                    label="Original Name"
                                />
                                <TextField
                                    size="small"
                                    value={editCharTranslation}
                                    onChange={e => setEditCharTranslation(e.target.value)}
                                    className="glossary-character-form-field"
                                    label="Translated Name"
                                />
                                <FormControl size="small" className="glossary-character-form-gender">
                                    <Select
                                        value={editCharGender}
                                        onChange={e => setEditCharGender(e.target.value as Gender)}
                                    >
                                        <MenuItem value="man">Man</MenuItem>
                                        <MenuItem value="woman">Woman</MenuItem>
                                        <MenuItem value="it">It</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                            <Box className="glossary-character-form-actions">
                                <Button size="small" onClick={handleSaveChar}>Save</Button>
                                <Button size="small" onClick={() => setEditingCharIndex(null)}>Cancel</Button>
                            </Box>
                        </Box>
                    </Box>
                );
            } else {
                charItems.push(
                    <Box key={idx} className="glossary-item">
                        <Box className="glossary-item-content" onClick={() => handleEditChar(idx)}>
                            <Typography className="glossary-item-original">
                                {char.original_name}
                            </Typography>
                            <Typography className="glossary-item-translation">
                                {char.translated_name} ({char.gender})
                            </Typography>
                        </Box>
                        <Box className="glossary-item-actions">
                            <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteChar(idx);
                                }}
                                className="glossary-item-button delete"
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>
                );
            }
        }
        return charItems;
    };

    const isCleanupButtonDisabled = () => {
        if (isCleaningGlossary) {
            return true;
        }
        if (!state.apiKey) {
            return true;
        }
        if (state.glossary.terms.length === 0 && state.glossary.characters.length === 0) {
            return true;
        }
        return false;
    };

    const getCleanupButtonText = () => {
        if (isCleaningGlossary) {
            return 'Cleaning...';
        }
        return 'Cleanup';
    };

    const getCleanupButtonIcon = () => {
        if (isCleaningGlossary) {
            return <CircularProgress size={16} />;
        }
        return null;
    };

    return (
        <Modal open={isOpen} onClose={onClose}>
            <Box className="glossary-modal">
                <Box className="glossary-modal-header">
                    <Typography variant="h6" className="glossary-modal-title">Glossary</Typography>
                    <IconButton
                        onClick={onClose}
                        className="glossary-modal-close-button"
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>

                <Box className="glossary-modal-content">
                    <Box className="glossary-section">
                        <Typography variant="subtitle1" className="glossary-section-title responsive">
                            Terms ({state.glossary.terms.length})
                        </Typography>
                        {renderTerms()}
                    </Box>

                    <Divider className="glossary-divider" />

                    <Box className="glossary-section">
                        <Typography variant="subtitle1" className="glossary-section-title responsive">
                            Characters ({state.glossary.characters.length})
                        </Typography>
                        {renderCharacters()}
                    </Box>

                    <Box className="glossary-cleanup-section">
                        <Typography variant="subtitle1" className="glossary-cleanup-title">
                            Cleanup Glossary
                        </Typography>
                        <Typography className="glossary-cleanup-description">
                            This will use AI to clean up and improve your glossary entries.
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={handleCleanupGlossary}
                            disabled={isCleanupButtonDisabled()}
                            startIcon={getCleanupButtonIcon()}
                            className="glossary-cleanup-button"
                        >
                            {getCleanupButtonText()}
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Modal>
    );
};

export default GlossaryModal; 