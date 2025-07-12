import React, { createContext, useContext, useReducer, ReactNode } from "react";
import {
  Chapter,
  Translation,
  Glossary,
  AppSettings,
  ViewerState,
} from "../types";

interface AppState {
  chapters: Chapter[];
  selectedChapter: number | null;
  translations: Translation;
  glossary: Glossary;
  settings: AppSettings;
  viewerState: ViewerState;
}

type AppAction =
  | { type: "SET_CHAPTERS"; payload: Chapter[] }
  | { type: "SET_SELECTED_CHAPTER"; payload: number | null }
  | { type: "SET_TRANSLATIONS"; payload: Translation }
  | {
      type: "UPDATE_TRANSLATION";
      payload: { chapterId: number; translation: string };
    }
  | { type: "CLEAR_CHAPTER_TRANSLATION"; payload: number }
  | { type: "CLEAR_ALL_TRANSLATIONS"; payload: void }
  | { type: "SET_GLOSSARY"; payload: Glossary }
  | {
      type: "ADD_GLOSSARY_TERM";
      payload: { original: string; translation: string };
    }
  | {
      type: "ADD_GLOSSARY_CHARACTER";
      payload: {
        original_name: string;
        translated_name: string;
        gender: "man" | "woman" | "it";
      };
    }
  | { type: "REMOVE_GLOSSARY_TERM"; payload: number }
  | { type: "REMOVE_GLOSSARY_CHARACTER"; payload: number }
  | { type: "UPDATE_SETTINGS"; payload: Partial<AppSettings> }
  | { type: "SET_VIEWER_STATE"; payload: Partial<ViewerState> }
  | { type: "DELETE_LINE_FROM_ALL_CHAPTERS"; payload: string }
  | { type: "SET_CLICKED_LINE"; payload: string | null }
  | { type: "SET_LINE_MODAL_OPEN"; payload: boolean }
  | { type: "SET_GLOSSARY_MODAL_OPEN"; payload: boolean }
  | { type: "SET_CLEAR_TRANSLATION_MODAL_OPEN"; payload: boolean };

const initialState: AppState = {
  chapters: [],
  selectedChapter: null,
  translations: {},
  glossary: { terms: [], characters: [] },
  settings: {
    fontSize: 16,
    viewerPadding: 16,
    chapterRegex:
      "(第[一二三四五六七八九十百千零0-9]+章[sS]*?)(?=第[一二三四五六七八九十百千零0-9]+章|$)",
    showPinyin: false,
    useBlockTextPinyin: true,
    showTranslationBelow: false,
    characterType: "original",
    autoTranslateNext: false,
    translationModel: "gpt-4.1-nano",
    showChapterList: false,
    showFooter: false,
    maxLinesPerChunk: 10,
    allowEdits: false,
  },
  viewerState: {
    chapters: [],
    selectedChapter: null,
    translations: {},
    glossary: { terms: [], characters: [] },
    isTranslating: false,
    showChapterList: true,
    clickedLine: null,
    isLineModalOpen: false,
    isGlossaryModalOpen: false,
    isClearTranslationModalOpen: false,
    isCleaningGlossary: false,
    editingTerm: null,
    editedOriginal: "",
    editedTranslation: "",
    editedGender: "",
    isConfirmingDeleteAll: false,
  },
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_CHAPTERS":
      return { ...state, chapters: action.payload };

    case "SET_SELECTED_CHAPTER":
      return { ...state, selectedChapter: action.payload };

    case "SET_TRANSLATIONS":
      return { ...state, translations: action.payload };

    case "UPDATE_TRANSLATION":
      return {
        ...state,
        translations: {
          ...state.translations,
          [action.payload.chapterId]: action.payload.translation,
        },
      };

    case "CLEAR_CHAPTER_TRANSLATION":
      const { [action.payload]: removed, ...remainingTranslations } =
        state.translations;
      return {
        ...state,
        translations: remainingTranslations,
      };

    case "CLEAR_ALL_TRANSLATIONS":
      return {
        ...state,
        translations: {},
      };

    case "SET_GLOSSARY":
      return { ...state, glossary: action.payload };

    case "ADD_GLOSSARY_TERM":
      return {
        ...state,
        glossary: {
          ...state.glossary,
          terms: [...state.glossary.terms, action.payload],
        },
      };

    case "ADD_GLOSSARY_CHARACTER":
      return {
        ...state,
        glossary: {
          ...state.glossary,
          characters: [...state.glossary.characters, action.payload],
        },
      };

    case "REMOVE_GLOSSARY_TERM":
      return {
        ...state,
        glossary: {
          ...state.glossary,
          terms: state.glossary.terms.filter(
            (_, index) => index !== action.payload
          ),
        },
      };

    case "REMOVE_GLOSSARY_CHARACTER":
      return {
        ...state,
        glossary: {
          ...state.glossary,
          characters: state.glossary.characters.filter(
            (_, index) => index !== action.payload
          ),
        },
      };

    case "UPDATE_SETTINGS":
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    case "SET_VIEWER_STATE":
      return {
        ...state,
        viewerState: { ...state.viewerState, ...action.payload },
      };

    case "DELETE_LINE_FROM_ALL_CHAPTERS":
      return {
        ...state,
        chapters: state.chapters.map((chapter) => ({
          ...chapter,
          content: chapter.content
            .split("\n")
            .filter((line) => line.trim() !== action.payload.trim())
            .join("\n"),
        })),
        translations: Object.fromEntries(
          Object.entries(state.translations).map(([chapterId, translation]) => {
            if (!translation) return [chapterId, translation];

            const originalLines =
              state.chapters[parseInt(chapterId)]?.content.split("\n") || [];
            const translationLines = translation.split("\n");

            const lineToDelete = action.payload.trim();
            const originalLineIndex = originalLines.findIndex(
              (line) => line.trim() === lineToDelete
            );

            if (originalLineIndex === -1) {
              return [chapterId, translation];
            }

            const updatedTranslationLines = translationLines.filter(
              (_: string, index: number) => index !== originalLineIndex
            );

            return [chapterId, updatedTranslationLines.join("\n")];
          })
        ),
      };

    case "SET_CLICKED_LINE":
      return {
        ...state,
        viewerState: { ...state.viewerState, clickedLine: action.payload },
      };

    case "SET_LINE_MODAL_OPEN":
      return {
        ...state,
        viewerState: { ...state.viewerState, isLineModalOpen: action.payload },
      };

    case "SET_GLOSSARY_MODAL_OPEN":
      return {
        ...state,
        viewerState: {
          ...state.viewerState,
          isGlossaryModalOpen: action.payload,
        },
      };

    case "SET_CLEAR_TRANSLATION_MODAL_OPEN":
      return {
        ...state,
        viewerState: {
          ...state.viewerState,
          isClearTranslationModalOpen: action.payload,
        },
      };

    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const loadSettingsFromStorage = (): AppSettings => {
    try {
      const defaultSettings: AppSettings = {
        fontSize: 16,
        viewerPadding: 16,
        chapterRegex:
          "(第[一二三四五六七八九十百千零0-9]+章[\\s\\S]*?)(?=第[一二三四五六七八九十百千零0-9]+章|$)",
        showPinyin: false,
        useBlockTextPinyin: true,
        showTranslationBelow: false,
        characterType: "original",
        autoTranslateNext: false,
        translationModel: "gpt-4.1-nano",
        showChapterList: false,
        showFooter: false,
        maxLinesPerChunk: 10,
      };

      const fontSizeOptions = [4, 8, 12, 16, 20, 24, 32, 40, 48, 54, 60];
      const paddingOptions = [
        0, 2, 4, 8, 16, 24, 32, 40, 48, 60, 64, 72, 80, 100, 120, 160,
      ];
      const chunkSizeOptions = [1, 2, 4, 6, 8, 10, 16, 32, 50, 100];

      const fontSize = fontSizeOptions.includes(
        parseInt(localStorage.getItem("fontSize") || "16")
      )
        ? parseInt(localStorage.getItem("fontSize") || "16")
        : 16;
      const viewerPadding = paddingOptions.includes(
        parseInt(localStorage.getItem("viewerPadding") || "16")
      )
        ? parseInt(localStorage.getItem("viewerPadding") || "16")
        : 16;
      const maxLinesPerChunk = chunkSizeOptions.includes(
        parseInt(localStorage.getItem("maxLinesPerChunk") || "10")
      )
        ? parseInt(localStorage.getItem("maxLinesPerChunk") || "10")
        : 10;

      const chapterRegex =
        localStorage.getItem("chapterRegex") || defaultSettings.chapterRegex;
      const showPinyin = localStorage.getItem("showPinyin") === "true";
      const useBlockTextPinyin =
        localStorage.getItem("useBlockTextPinyin") !== "false";
      const showTranslationBelow =
        localStorage.getItem("showTranslationBelow") === "true";
      const characterTypeRaw =
        localStorage.getItem("characterType") || "original";
      const characterType =
        characterTypeRaw === "simplified" || characterTypeRaw === "traditional"
          ? characterTypeRaw
          : "original";
      const autoTranslateNext =
        localStorage.getItem("autoTranslateNext") === "true";
      const translationModel =
        localStorage.getItem("translationModel") || "gpt-4.1-nano";
      const showChapterList =
        localStorage.getItem("showChapterList") !== "false";
      const showFooter = localStorage.getItem("showFooter") === "true";

      return {
        fontSize,
        viewerPadding,
        chapterRegex,
        showPinyin,
        useBlockTextPinyin,
        showTranslationBelow,
        characterType,
        autoTranslateNext,
        translationModel,
        showChapterList,
        showFooter,
        maxLinesPerChunk,
      };
    } catch (error) {
      console.error("Error loading settings from localStorage:", error);
      return initialState.settings;
    }
  };

  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    settings: loadSettingsFromStorage(),
  });

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};
