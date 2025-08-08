import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Glossary, AppSettings, ViewerState, ChapterContents, GlossaryTerm, GlossaryCharacter } from '../types';
import { loadGlossaryFromStorage, saveGlossaryToStorage } from '../services/glossaryService';

interface AppState {
    originalChapterContents: ChapterContents[];
    translatedChapterContents: ChapterContents[];
    selectedChapter: number | null;
    glossary: Glossary;
    settings: AppSettings;
    viewerState: ViewerState;
    apiKey: string;
}

type AppAction =
    | { type: 'SET_ORIGINAL_CHAPTER_CONTENTS'; payload: ChapterContents[] }
    | { type: 'SET_TRANSLATED_CHAPTER_CONTENTS'; payload: ChapterContents[] }
    | { type: 'UPDATE_TRANSLATED_CHAPTER_CONTENT'; payload: { chapterIndex: number; lineIndex: number; content: string } }
    | { type: 'SET_SELECTED_CHAPTER'; payload: number | null }
    | { type: 'CLEAR_CHAPTER_TRANSLATION'; payload: number }
    | { type: 'CLEAR_ALL_TRANSLATIONS'; payload: void }
    | { type: 'SET_GLOSSARY'; payload: Glossary }
    | { type: 'ADD_GLOSSARY_TERM'; payload: { original: string; translation: string } }
    | { type: 'ADD_GLOSSARY_CHARACTER'; payload: { original_name: string; translated_name: string; gender: 'man' | 'woman' | 'it' } }
    | { type: 'REMOVE_GLOSSARY_TERM'; payload: number }
    | { type: 'REMOVE_GLOSSARY_CHARACTER'; payload: number }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
    | { type: 'SET_VIEWER_STATE'; payload: Partial<ViewerState> }
    | { type: 'DELETE_LINE_FROM_ALL_CHAPTERS'; payload: string }
    | { type: 'SET_CLICKED_LINE'; payload: string | null }
    | { type: 'SET_LINE_MODAL_OPEN'; payload: boolean }
    | { type: 'SET_GLOSSARY_MODAL_OPEN'; payload: boolean }
    | { type: 'SET_CLEAR_TRANSLATION_MODAL_OPEN'; payload: boolean }
    | { type: 'UPDATE_API_KEY'; payload: string };

const defaultSettings: AppSettings = {
    fontSize: 16,
    viewerPadding: 16,
    chapterRegex: '(第[一二三四五六七八九十百千零0-9]+章[sS]*?)(?=第[一二三四五六七八九十百千零0-9]+章|$)',
    showPinyin: false,
    useBlockTextPinyin: true,
    showTranslationBelow: false,
    characterType: 'original',
    autoTranslateNext: false,
    translationModel: 'gpt-4.1-nano',
    showChapterList: false,
    showFooter: false,
    maxLinesPerChunk: 10,
    allowEdits: false
};

const fontSizeOptions = [4, 8, 12, 16, 20, 24, 32, 40, 48, 54, 60];
const paddingOptions = [0, 2, 4, 8, 16, 24, 32, 40, 48, 60, 64, 72, 80, 100, 120, 160];
const chunkSizeOptions = [1, 2, 4, 6, 8, 10, 16, 32, 50, 100];

const validateSettings = (settings: Partial<AppSettings>): AppSettings => {
    return {
        fontSize: fontSizeOptions.includes(settings.fontSize ?? 16) ? settings.fontSize! : 16,
        viewerPadding: paddingOptions.includes(settings.viewerPadding ?? 16) ? settings.viewerPadding! : 16,
        chapterRegex: settings.chapterRegex ?? defaultSettings.chapterRegex,
        showPinyin: settings.showPinyin ?? defaultSettings.showPinyin,
        useBlockTextPinyin: settings.useBlockTextPinyin ?? defaultSettings.useBlockTextPinyin,
        showTranslationBelow: settings.showTranslationBelow ?? defaultSettings.showTranslationBelow,
        characterType: ['original', 'simplified', 'traditional'].includes(settings.characterType ?? 'original')
            ? settings.characterType! : 'original',
        autoTranslateNext: settings.autoTranslateNext ?? defaultSettings.autoTranslateNext,
        translationModel: settings.translationModel ?? 'gpt-4.1-nano',
        showChapterList: settings.showChapterList ?? defaultSettings.showChapterList,
        showFooter: settings.showFooter ?? defaultSettings.showFooter,
        maxLinesPerChunk: chunkSizeOptions.includes(settings.maxLinesPerChunk ?? 10) ? settings.maxLinesPerChunk! : 10,
        allowEdits: settings.allowEdits ?? defaultSettings.allowEdits
    };
};

const initialState: AppState = {
    originalChapterContents: [],
    translatedChapterContents: [],
    selectedChapter: null,
    glossary: { terms: [], characters: [] },
    apiKey: '',
    settings: defaultSettings,
    viewerState: {
        isTranslating: false,
        showChapterList: true,
        clickedLine: null,
        isLineModalOpen: false,
        isGlossaryModalOpen: false,
        isClearTranslationModalOpen: false,
        isCleaningGlossary: false,
        editingTerm: null,
        editedOriginal: '',
        editedTranslation: '',
        editedGender: '',
        isConfirmingDeleteAll: false
    }
};

function appReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case 'SET_ORIGINAL_CHAPTER_CONTENTS':
            return { ...state, originalChapterContents: action.payload };

        case 'SET_TRANSLATED_CHAPTER_CONTENTS':
            return { ...state, translatedChapterContents: action.payload };

        case 'UPDATE_TRANSLATED_CHAPTER_CONTENT':
            const updatedChapters = [];
            for (let chapterIndex = 0; chapterIndex < state.translatedChapterContents.length; chapterIndex++) {
                const chapter = state.translatedChapterContents[chapterIndex];
                if (chapterIndex === action.payload.chapterIndex) {
                    const updatedLines = [];
                    for (let lineIndex = 0; lineIndex < chapter.length; lineIndex++) {
                        if (lineIndex === action.payload.lineIndex) {
                            updatedLines.push(action.payload.content);
                        } else {
                            updatedLines.push(chapter[lineIndex]);
                        }
                    }
                    updatedChapters.push(updatedLines);
                } else {
                    updatedChapters.push(chapter);
                }
            }
            return { ...state, translatedChapterContents: updatedChapters };

        case 'SET_SELECTED_CHAPTER':
            return { ...state, selectedChapter: action.payload };

        case 'CLEAR_CHAPTER_TRANSLATION':
            const clearedChapters = [];
            for (let index = 0; index < state.translatedChapterContents.length; index++) {
                const chapter = state.translatedChapterContents[index];
                if (index === action.payload) {
                    const clearedLines = [];
                    for (let lineIndex = 0; lineIndex < chapter.length; lineIndex++) {
                        clearedLines.push('');
                    }
                    clearedChapters.push(clearedLines);
                } else {
                    clearedChapters.push(chapter);
                }
            }
            return { ...state, translatedChapterContents: clearedChapters };

        case 'CLEAR_ALL_TRANSLATIONS':
            const allClearedChapters = [];
            for (const chapter of state.translatedChapterContents) {
                const clearedLines = [];
                for (let lineIndex = 0; lineIndex < chapter.length; lineIndex++) {
                    clearedLines.push('');
                }
                allClearedChapters.push(clearedLines);
            }
            return { ...state, translatedChapterContents: allClearedChapters };

        case 'SET_GLOSSARY':
            return { ...state, glossary: action.payload };

        case 'ADD_GLOSSARY_TERM':
            const existingTermOriginals = new Set();
            for (const term of state.glossary.terms) {
                existingTermOriginals.add(term.original);
            }

            if (!existingTermOriginals.has(action.payload.original)) {
                return {
                    ...state,
                    glossary: {
                        ...state.glossary,
                        terms: [...state.glossary.terms, action.payload]
                    }
                };
            }
            return state;

        case 'ADD_GLOSSARY_CHARACTER':
            const existingCharacterOriginals = new Set();
            for (const character of state.glossary.characters) {
                existingCharacterOriginals.add(character.original_name);
            }

            if (!existingCharacterOriginals.has(action.payload.original_name)) {
                return {
                    ...state,
                    glossary: {
                        ...state.glossary,
                        characters: [...state.glossary.characters, action.payload]
                    }
                };
            }
            return state;

        case 'REMOVE_GLOSSARY_TERM':
            const filteredTerms = [];
            for (let index = 0; index < state.glossary.terms.length; index++) {
                if (index !== action.payload) {
                    filteredTerms.push(state.glossary.terms[index]);
                }
            }
            return {
                ...state,
                glossary: {
                    ...state.glossary,
                    terms: filteredTerms
                }
            };

        case 'REMOVE_GLOSSARY_CHARACTER':
            const filteredCharacters = [];
            for (let index = 0; index < state.glossary.characters.length; index++) {
                if (index !== action.payload) {
                    filteredCharacters.push(state.glossary.characters[index]);
                }
            }
            return {
                ...state,
                glossary: {
                    ...state.glossary,
                    characters: filteredCharacters
                }
            };

        case 'UPDATE_SETTINGS':
            const updatedSettings = validateSettings({ ...state.settings, ...action.payload });
            return {
                ...state,
                settings: updatedSettings
            };

        case 'SET_VIEWER_STATE':
            return {
                ...state,
                viewerState: { ...state.viewerState, ...action.payload }
            };

        case 'DELETE_LINE_FROM_ALL_CHAPTERS':
            const filteredOriginalChapters = [];
            for (const chapter of state.originalChapterContents) {
                const filteredLines = [];
                for (const line of chapter) {
                    if (line.trim() !== action.payload.trim()) {
                        filteredLines.push(line);
                    }
                }
                filteredOriginalChapters.push(filteredLines);
            }

            const filteredTranslatedChapters = [];
            for (const chapter of state.translatedChapterContents) {
                const filteredLines = [];
                for (const line of chapter) {
                    if (line.trim() !== action.payload.trim()) {
                        filteredLines.push(line);
                    }
                }
                filteredTranslatedChapters.push(filteredLines);
            }

            return {
                ...state,
                originalChapterContents: filteredOriginalChapters,
                translatedChapterContents: filteredTranslatedChapters
            };

        case 'SET_CLICKED_LINE':
            return {
                ...state,
                viewerState: { ...state.viewerState, clickedLine: action.payload }
            };

        case 'SET_LINE_MODAL_OPEN':
            return {
                ...state,
                viewerState: { ...state.viewerState, isLineModalOpen: action.payload }
            };

        case 'SET_GLOSSARY_MODAL_OPEN':
            return {
                ...state,
                viewerState: { ...state.viewerState, isGlossaryModalOpen: action.payload }
            };

        case 'SET_CLEAR_TRANSLATION_MODAL_OPEN':
            return {
                ...state,
                viewerState: { ...state.viewerState, isClearTranslationModalOpen: action.payload }
            };

        case 'UPDATE_API_KEY':
            return {
                ...state,
                apiKey: action.payload
            };

        default:
            return state;
    }
}

interface AppContextType {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    clearAllLocalStorage: () => void;
    updateSettings: (settings: Partial<AppSettings>) => void;
    initializeTranslatedContents: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

interface AppProviderProps {
    children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
    const loadSavedData = (): Partial<AppState> => {
        try {
            const savedOriginalChapters = localStorage.getItem('originalChapters');
            const savedTranslatedChapters = localStorage.getItem('translatedChapters');
            const savedSelectedChapter = localStorage.getItem('selectedChapter');
            const savedApiKey = localStorage.getItem('apiKey') || '';
            const savedSettings = localStorage.getItem('settings');

            return {
                originalChapterContents: savedOriginalChapters ? JSON.parse(savedOriginalChapters) : [],
                translatedChapterContents: savedTranslatedChapters ? JSON.parse(savedTranslatedChapters) : [],
                glossary: loadGlossaryFromStorage(),
                selectedChapter: savedSelectedChapter ? parseInt(savedSelectedChapter) : null,
                apiKey: savedApiKey,
                settings: savedSettings ? validateSettings(JSON.parse(savedSettings)) : defaultSettings
            };
        } catch (error) {
            console.error('Error loading data from localStorage:', error);
            return {
                originalChapterContents: [],
                translatedChapterContents: [],
                glossary: loadGlossaryFromStorage(),
                selectedChapter: null,
                apiKey: '',
                settings: defaultSettings
            };
        }
    };

    const saveDataToStorage = (state: AppState) => {
        try {
            localStorage.setItem('originalChapters', JSON.stringify(state.originalChapterContents));
            localStorage.setItem('translatedChapters', JSON.stringify(state.translatedChapterContents));
            saveGlossaryToStorage(state.glossary);
            localStorage.setItem('selectedChapter', state.selectedChapter?.toString() || '');
            localStorage.setItem('apiKey', state.apiKey);
            localStorage.setItem('settings', JSON.stringify(state.settings));
        } catch (error) {
            console.error('Error saving data to localStorage:', error);
        }
    };

    const clearAllLocalStorage = () => {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
    };

    const updateSettings = (settings: Partial<AppSettings>) => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    };

    const initializeTranslatedContents = () => {
        const translatedContents = [];
        for (const chapter of state.originalChapterContents) {
            const translatedChapter = [];
            for (let index = 0; index < chapter.length; index++) {
                if (index === 0) {
                    translatedChapter.push(chapter[index]);
                } else {
                    translatedChapter.push('');
                }
            }
            translatedContents.push(translatedChapter);
        }
        dispatch({ type: 'SET_TRANSLATED_CHAPTER_CONTENTS', payload: translatedContents });
    };

    const [state, dispatch] = useReducer(appReducer, {
        ...initialState,
        ...loadSavedData()
    });

    useEffect(() => {
        saveDataToStorage(state);
    }, [state.originalChapterContents, state.translatedChapterContents, state.glossary, state.selectedChapter, state.apiKey, state.settings]);

    return (
        <AppContext.Provider value={{ state, dispatch, clearAllLocalStorage, updateSettings, initializeTranslatedContents }}>
            {children}
        </AppContext.Provider>
    );
}; 