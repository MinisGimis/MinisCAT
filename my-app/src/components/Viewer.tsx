import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, IconButton, Tooltip, Alert, Button, CircularProgress } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAppContext } from '../contexts/AppContext';
import ChapterList from './ChapterList';
import Footer from './Footer';
import ChapterViewer from './ChapterViewer';
import ChapterHeader from './ChapterHeader';
import WelcomeScreen from './WelcomeScreen';
import LineDeleteModal from './LineDeleteModal';
import SettingsMenu from './SettingsMenu';
import GlossaryModal from './GlossaryModal';
import ClearTranslationModal from './ClearTranslationModal';
import ImportDialog from './ImportDialog';
import { extractChapters } from '../services/fileService';
import { translateChapter } from '../services/translationService';
import { ChapterContents, GlossaryTerm, GlossaryCharacter } from '../types';
import '../styles/Viewer.css';

const Viewer = () => {
    const { state, dispatch } = useAppContext();
    const { apiKey, originalChapterContents, translatedChapterContents, selectedChapter, settings } = state;
    const contentRef = useRef<HTMLDivElement>(null);
    const [translatingChapters, setTranslatingChapters] = useState<Set<number>>(new Set());
    const [translatingChunks, setTranslatingChunks] = useState<Set<number>>(new Set());
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const currentTranslatedContentsRef = useRef<ChapterContents[]>(state.translatedChapterContents);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [translationError, setTranslationError] = useState<string | null>(null);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importFileName, setImportFileName] = useState('');
    const [importFileContent, setImportFileContent] = useState('');
    const [importRegex, setImportRegex] = useState(settings.chapterRegex);
    const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
    const [editingText, setEditingText] = useState<string>('');

    const chapterNeedsTranslation = useCallback((chapterIndex: number): boolean => {
        if (chapterIndex >= state.translatedChapterContents.length) {
            return false;
        }
        const chapterTranslated = state.translatedChapterContents[chapterIndex];
        if (!chapterTranslated) {
            return false;
        }

        for (let index = 1; index < chapterTranslated.length; index++) {
            const line = chapterTranslated[index];
            if (!line || line.trim().length === 0) {
                return true;
            }
        }
        return false;
    }, [state.translatedChapterContents]);

    const handleAutoTranslateNext = useCallback(async (nextChapter: number) => {
        if (!apiKey) {
            return;
        }
        if (nextChapter >= state.originalChapterContents.length) {
            return;
        }
        if (translatingChapters.has(nextChapter)) {
            return;
        }

        if (!chapterNeedsTranslation(nextChapter)) {
            console.log(`chapter ${nextChapter} already translated, skipping`);
            return;
        }

        setTranslatingChapters(prev => {
            const newSet = new Set(prev);
            newSet.add(nextChapter);
            return newSet;
        });

        const chapterContent = state.originalChapterContents[nextChapter];
        const contentText = chapterContent.slice(1).join('\n');
        const chunks = contentText.split('\n');
        const maxLinesPerChunk = state.settings.maxLinesPerChunk || 10;
        const chunkCount = Math.ceil(chunks.length / maxLinesPerChunk);

        const initialTranslatedContent = chapterContent.map((line, index) => {
            if (index === 0) {
                return line;
            }
            return '';
        });

        dispatch({
            type: 'SET_TRANSLATED_CHAPTER_CONTENTS',
            payload: state.translatedChapterContents.map((chapter, index) => {
                if (index === nextChapter) {
                    return initialTranslatedContent;
                }
                return chapter;
            })
        });

        try {
            const response = await translateChapter(
                contentText,
                apiKey,
                state.glossary,
                state.settings,
                (chunkIndex: number, translation: string, newTerms: GlossaryTerm[], newCharacters: GlossaryCharacter[]) => {
                    console.log(`chunk ${chunkIndex} callback - ${translation.split('\n').length} lines`);

                    const translationLines = translation.split('\n');

                    const startLine = chunkIndex * maxLinesPerChunk;
                    const endLine = Math.min(startLine + maxLinesPerChunk, chunks.length);
                    const chunkSize = endLine - startLine;

                    const currentTranslatedContents = currentTranslatedContentsRef.current;
                    const currentChapter = currentTranslatedContents[nextChapter] || [];
                    const updatedTranslatedContent = [...currentChapter];

                    for (let i = 0; i < chunkSize && i < translationLines.length; i++) {
                        updatedTranslatedContent[startLine + i + 1] = translationLines[i] || '';
                    }

                    currentTranslatedContentsRef.current = currentTranslatedContents.map((chapter, index) => {
                        if (index === nextChapter) {
                            return updatedTranslatedContent;
                        }
                        return chapter;
                    });

                    dispatch({
                        type: 'SET_TRANSLATED_CHAPTER_CONTENTS',
                        payload: currentTranslatedContentsRef.current
                    });
                }
            );

            if (response.NEW_TERMS && response.NEW_TERMS.length > 0) {
                for (const term of response.NEW_TERMS) {
                    dispatch({
                        type: 'ADD_GLOSSARY_TERM',
                        payload: term
                    });
                }
            }
            if (response.NEW_CHARACTERS && response.NEW_CHARACTERS.length > 0) {
                for (const character of response.NEW_CHARACTERS) {
                    dispatch({
                        type: 'ADD_GLOSSARY_CHARACTER',
                        payload: character
                    });
                }
            }
        } catch (error) {
            console.error('Translation failed:', error);
            alert('Translation failed. Please check your API key and try again.');
        } finally {
            setTranslatingChapters(prev => {
                const newSet = new Set(prev);
                newSet.delete(nextChapter);
                return newSet;
            });
        }
    }, [apiKey, state.originalChapterContents, state.translatedChapterContents, state.glossary, state.settings, translatingChapters, dispatch]);

    useEffect(() => {
        currentTranslatedContentsRef.current = state.translatedChapterContents;
    }, [state.translatedChapterContents]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                if (state.selectedChapter !== null && state.selectedChapter > 0) {
                    dispatch({ type: 'SET_SELECTED_CHAPTER', payload: state.selectedChapter - 1 });
                }
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                if (state.selectedChapter !== null && state.selectedChapter < state.originalChapterContents.length - 1) {
                    dispatch({ type: 'SET_SELECTED_CHAPTER', payload: state.selectedChapter + 1 });
                }
            } else if (event.key === 't' || event.key === 'T') {
                if (state.selectedChapter !== null && apiKey) {
                    handleAutoTranslateNext(state.selectedChapter);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [state.selectedChapter, state.originalChapterContents.length, apiKey, dispatch, handleAutoTranslateNext]);

    useEffect(() => {
        if (!state.settings.autoTranslateNext) {
            return;
        }
        if (state.selectedChapter === null) {
            return;
        }
        if (state.originalChapterContents.length === 0) {
            return;
        }
        if (!apiKey) {
            return;
        }

        const selectedChapter = state.selectedChapter;
        const currentChapterNeedsTranslation = chapterNeedsTranslation(selectedChapter);
        const nextChapterIndex = selectedChapter + 1;
        const nextChapterExists = nextChapterIndex < state.originalChapterContents.length;
        const nextChapterNeedsTranslation = nextChapterExists && chapterNeedsTranslation(nextChapterIndex);

        const translateCurrentIfNeeded = async () => {
            if (state.originalChapterContents[selectedChapter] && currentChapterNeedsTranslation) {
                console.log("auto-translating current chapter:", selectedChapter);
                await handleAutoTranslateNext(selectedChapter);
            }
        };

        const translateNextIfNeeded = async () => {
            if (nextChapterExists && nextChapterNeedsTranslation && !translatingChapters.has(nextChapterIndex)) {
                console.log("auto-translating next chapter:", nextChapterIndex);
                await handleAutoTranslateNext(nextChapterIndex);
            }
        };

        Promise.all([
            translateCurrentIfNeeded(),
            translateNextIfNeeded()
        ]).catch(error => {
            console.error("Error in concurrent auto-translation:", error);
        });
    }, [
        state.selectedChapter,
        state.originalChapterContents,
        state.translatedChapterContents,
        apiKey,
        state.settings.autoTranslateNext,
        translatingChapters,
        handleAutoTranslateNext,
        chapterNeedsTranslation
    ]);

    useEffect(() => {
        const timeoutRef = scrollTimeoutRef.current;
        return () => {
            if (timeoutRef) {
                clearTimeout(timeoutRef);
            }
        };
    }, []);

    const handleFileUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const extractedChapters = extractChapters(content, state.settings.chapterRegex);

            const translatedContents: ChapterContents[] = extractedChapters.map(chapter => {
                return chapter.map((line, index) => {
                    if (index === 0) {
                        return line;
                    }
                    return '';
                });
            });

            dispatch({ type: 'SET_ORIGINAL_CHAPTER_CONTENTS', payload: extractedChapters });
            dispatch({ type: 'SET_TRANSLATED_CHAPTER_CONTENTS', payload: translatedContents });
            dispatch({ type: 'SET_GLOSSARY', payload: { terms: [], characters: [] } });
            dispatch({ type: 'SET_SELECTED_CHAPTER', payload: 0 });
        };
        reader.readAsText(file);
    };

    const handleTranslate = async () => {
        if (!apiKey) {
            setTranslationError('API key not set or no chapter selected');
            return;
        }
        if (selectedChapter === null) {
            setTranslationError('API key not set or no chapter selected');
            return;
        }

        setIsTranslating(true);
        setTranslationError(null);

        try {
            const chapterContent = originalChapterContents[selectedChapter];
            const currentTranslation = translatedChapterContents[selectedChapter] || [];

            const untranslatedLines: string[] = [];
            const untranslatedLineIndices: number[] = [];

            for (let i = 1; i < chapterContent.length; i++) {
                const originalLine = chapterContent[i];
                const translatedLine = currentTranslation[i];

                if (!translatedLine || translatedLine.trim().length === 0) {
                    untranslatedLines.push(originalLine);
                    untranslatedLineIndices.push(i);
                }
            }

            if (untranslatedLines.length === 0) {
                setTranslationError('All lines in this chapter are already translated.');
                return;
            }

            const contentText = untranslatedLines.join('\n');
            console.log(`translating ${untranslatedLines.length} lines out of ${chapterContent.length - 1}`);

            const response = await translateChapter(
                contentText,
                apiKey,
                state.glossary,
                settings,
                (chunkIndex: number, translation: string, newTerms: GlossaryTerm[], newCharacters: GlossaryCharacter[]) => {
                    console.log(`chunk ${chunkIndex} callback - ${translation.split('\n').length} lines`);

                    const translationLines = translation.split('\n');
                    const maxLinesPerChunk = settings.maxLinesPerChunk || 10;
                    const startLine = chunkIndex * maxLinesPerChunk;
                    const endLine = Math.min(startLine + maxLinesPerChunk, untranslatedLines.length);
                    const chunkSize = endLine - startLine;

                    const currentTranslatedContents = currentTranslatedContentsRef.current;
                    const currentChapter = currentTranslatedContents[selectedChapter] || [];
                    const updatedTranslatedContent = [...currentChapter];

                    for (let i = 0; i < chunkSize && i < translationLines.length; i++) {
                        const originalLineIndex = untranslatedLineIndices[startLine + i];
                        if (originalLineIndex !== undefined) {
                            updatedTranslatedContent[originalLineIndex] = translationLines[i] || '';
                        }
                    }

                    currentTranslatedContentsRef.current = currentTranslatedContents.map((chapter, index) => {
                        if (index === selectedChapter) {
                            return updatedTranslatedContent;
                        }
                        return chapter;
                    });

                    dispatch({
                        type: 'SET_TRANSLATED_CHAPTER_CONTENTS',
                        payload: currentTranslatedContentsRef.current
                    });

                    if (newTerms && newTerms.length > 0) {
                        for (const term of newTerms) {
                            dispatch({
                                type: 'ADD_GLOSSARY_TERM',
                                payload: term
                            });
                        }
                    }
                    if (newCharacters && newCharacters.length > 0) {
                        for (const character of newCharacters) {
                            dispatch({
                                type: 'ADD_GLOSSARY_CHARACTER',
                                payload: character
                            });
                        }
                    }
                }
            );

            if (response.NEW_TERMS && response.NEW_TERMS.length > 0) {
                for (const term of response.NEW_TERMS) {
                    dispatch({
                        type: 'ADD_GLOSSARY_TERM',
                        payload: term
                    });
                }
            }
            if (response.NEW_CHARACTERS && response.NEW_CHARACTERS.length > 0) {
                for (const character of response.NEW_CHARACTERS) {
                    dispatch({
                        type: 'ADD_GLOSSARY_CHARACTER',
                        payload: character
                    });
                }
            }
        } catch (error) {
            console.error('Translation failed:', error);
            setTranslationError('Translation failed. Please check your API key and try again.');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleImportDialogClose = () => {
        setImportDialogOpen(false);
        setImportFileName('');
        setImportFileContent('');
    };

    const handleImportDialogConfirm = (chapters: ChapterContents[]) => {
        dispatch({ type: 'SET_ORIGINAL_CHAPTER_CONTENTS', payload: chapters });
        dispatch({
            type: 'SET_TRANSLATED_CHAPTER_CONTENTS',
            payload: chapters.map(chapter => {
                return chapter.map((line, index) => {
                    if (index === 0) {
                        return line;
                    }
                    return '';
                });
            })
        });
        dispatch({ type: 'SET_GLOSSARY', payload: { terms: [], characters: [] } });
        dispatch({ type: 'SET_SELECTED_CHAPTER', payload: 0 });
        setImportDialogOpen(false);
    };

    const handleScroll = () => {
        if (!contentRef.current) {
            return;
        }

        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        const nearBottom = scrollHeight - scrollTop - clientHeight < 50;

        if (nearBottom && selectedChapter !== null && selectedChapter < originalChapterContents.length - 1) {
            dispatch({ type: 'SET_SELECTED_CHAPTER', payload: selectedChapter + 1 });
            contentRef.current.scrollTop = 0;
        }
    };

    const handleLineClick = (line: string) => {
        dispatch({ type: 'SET_CLICKED_LINE', payload: line });
        dispatch({ type: 'SET_LINE_MODAL_OPEN', payload: true });
    };

    const handleTranslationLineClick = (line: string, lineIndex: number) => {
        setEditingLineIndex(lineIndex);
        setEditingText(line);
    };

    const handleTranslationEdit = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEditingText(event.target.value);
    };

    const handleTranslationSave = () => {
        if (editingLineIndex !== null && selectedChapter !== null) {
            dispatch({
                type: 'UPDATE_TRANSLATED_CHAPTER_CONTENT',
                payload: {
                    chapterIndex: selectedChapter,
                    lineIndex: editingLineIndex,
                    content: editingText
                }
            });
        }
        setEditingLineIndex(null);
        setEditingText('');
    };

    const handleTranslationCancel = () => {
        setEditingLineIndex(null);
        setEditingText('');
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleTranslationSave();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            handleTranslationCancel();
        }
    };

    const renderContent = () => {
        if (originalChapterContents.length === 0) {
            return <WelcomeScreen onFileUpload={handleFileUpload} />;
        }

        return (
            <>
                <ChapterHeader
                    apiKey={apiKey}
                    isTranslating={isTranslating}
                    onTranslate={handleTranslate}
                />
                <ChapterViewer
                    onScroll={handleScroll}
                    onLineClick={handleLineClick}
                    onTranslationLineClick={handleTranslationLineClick}
                    onTranslationEdit={handleTranslationEdit}
                    onTranslationSave={handleTranslationSave}
                    onTranslationCancel={handleTranslationCancel}
                    onKeyPress={handleKeyPress}
                    editingLineIndex={editingLineIndex}
                    editingText={editingText}
                    translatingChunks={translatingChunks}
                />
            </>
        );
    };

    return (
        <div className="viewer-container">
            <Box className="settings-button">
                <Tooltip title="Settings">
                    <IconButton
                        onClick={() => setIsSettingsOpen(true)}
                        size="large"
                    >
                        <SettingsIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            {translationError && (
                <Alert severity="error" className="error-alert" onClose={() => setTranslationError(null)}>
                    {translationError}
                </Alert>
            )}

            <div className="viewer-content">
                {state.settings.showChapterList && <ChapterList />}
                <div
                    className="chapter-viewer viewer-chapter-viewer dynamic-font-size"
                    ref={contentRef}
                    style={{
                        '--font-size': `${state.settings.fontSize}px`
                    } as React.CSSProperties}
                >
                    {renderContent()}
                </div>
            </div>
            {state.settings.showFooter && <Footer />}
            <LineDeleteModal />
            <SettingsMenu
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
            <GlossaryModal
                isOpen={state.viewerState.isGlossaryModalOpen}
                onClose={() => dispatch({ type: 'SET_GLOSSARY_MODAL_OPEN', payload: false })}
            />
            <ClearTranslationModal
                isOpen={state.viewerState.isClearTranslationModalOpen}
                onClose={() => dispatch({ type: 'SET_CLEAR_TRANSLATION_MODAL_OPEN', payload: false })}
            />
            <ImportDialog
                open={importDialogOpen}
                onClose={handleImportDialogClose}
                onConfirm={handleImportDialogConfirm}
                fileName={importFileName}
                fileContent={importFileContent}
                initialRegex={importRegex}
            />
        </div>
    );
};

export default Viewer; 