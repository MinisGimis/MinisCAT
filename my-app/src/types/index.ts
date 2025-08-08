export type ChapterContents = string[];

export interface GlossaryTerm {
    original: string;
    translation: string;
}

export interface GlossaryCharacter {
    original_name: string;
    translated_name: string;
    gender: 'man' | 'woman' | 'it';
}

export interface Glossary {
    terms: GlossaryTerm[];
    characters: GlossaryCharacter[];
}

export interface TranslationResponse {
    TRANSLATION: string;
    NEW_TERMS: GlossaryTerm[];
    NEW_CHARACTERS: GlossaryCharacter[];
}

export interface AppSettings {
    fontSize: number;
    viewerPadding: number;
    chapterRegex: string;
    showPinyin: boolean;
    useBlockTextPinyin: boolean;
    showTranslationBelow: boolean;
    characterType: 'original' | 'simplified' | 'traditional';
    autoTranslateNext: boolean;
    translationModel: string;
    showChapterList: boolean;
    showFooter: boolean;
    apiKey?: string;
    maxLinesPerChunk: number;
    allowEdits?: boolean;
}

export interface ViewerState {
    isTranslating: boolean;
    showChapterList: boolean;
    clickedLine: string | null;
    isLineModalOpen: boolean;
    isGlossaryModalOpen: boolean;
    isClearTranslationModalOpen: boolean;
    isCleaningGlossary: boolean;
    editingTerm: GlossaryTerm | GlossaryCharacter | null;
    editedOriginal: string;
    editedTranslation: string;
    editedGender: string;
    isConfirmingDeleteAll: boolean;
}

export interface LineWithPinyin {
    text: string;
    pinyin: string[][];
} 