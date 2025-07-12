import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAppContext } from "../contexts/AppContext";
import ChapterList from "./ui/ChapterList";
import Footer from "./layout/Footer";
import ChapterViewer from "./ui/ChapterViewer";
import LineDeleteModal from "./ui/LineDeleteModal";
import { extractChapters } from "../services/fileService";
import { translateChapter } from "../services/translationService";

const Viewer: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [apiKey, setApiKey] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);
  const [translatingChapters, setTranslatingChapters] = useState<Set<number>>(
    new Set()
  );
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedApiKey = localStorage.getItem("apiKey");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }

    const handleApiKeyUpdate = (event: CustomEvent) => {
      setApiKey(event.detail);
    };

    window.addEventListener(
      "apiKeyUpdated",
      handleApiKeyUpdate as EventListener
    );
    return () =>
      window.removeEventListener(
        "apiKeyUpdated",
        handleApiKeyUpdate as EventListener
      );
  }, []);

  useEffect(() => {
    const savedChapters = localStorage.getItem("chapters");
    const savedTranslations = localStorage.getItem("translations");
    const savedSelectedChapter = localStorage.getItem("selectedChapter");
    const savedGlossary = localStorage.getItem("glossary");

    if (savedChapters && state.chapters.length === 0) {
      const chapters = JSON.parse(savedChapters);
      dispatch({ type: "SET_CHAPTERS", payload: chapters });
    }

    if (savedTranslations && Object.keys(state.translations).length === 0) {
      const translations = JSON.parse(savedTranslations);
      dispatch({ type: "SET_TRANSLATIONS", payload: translations });
    }

    if (savedSelectedChapter && state.selectedChapter === null) {
      dispatch({
        type: "SET_SELECTED_CHAPTER",
        payload: parseInt(savedSelectedChapter),
      });
    }

    if (
      savedGlossary &&
      state.glossary.terms.length === 0 &&
      state.glossary.characters.length === 0
    ) {
      const glossary = JSON.parse(savedGlossary);
      dispatch({ type: "SET_GLOSSARY", payload: glossary });
    }
  }, [
    dispatch,
    state.chapters.length,
    state.glossary.characters.length,
    state.glossary.terms.length,
    state.selectedChapter,
    state.translations,
  ]);

  useEffect(() => {
    if (state.chapters.length > 0) {
      localStorage.setItem("chapters", JSON.stringify(state.chapters));
    }
  }, [state.chapters]);

  useEffect(() => {
    if (state.selectedChapter !== null) {
      localStorage.setItem("selectedChapter", state.selectedChapter.toString());
    }
  }, [state.selectedChapter]);

  useEffect(() => {
    if (Object.keys(state.translations).length > 0) {
      localStorage.setItem("translations", JSON.stringify(state.translations));
    }
  }, [state.translations]);

  useEffect(() => {
    if (
      state.glossary.terms.length > 0 ||
      state.glossary.characters.length > 0
    ) {
      localStorage.setItem("glossary", JSON.stringify(state.glossary));
    } else {
      localStorage.removeItem("glossary");
    }
  }, [state.glossary]);

  useEffect(() => {
    const savedFileContent = localStorage.getItem("fileContent");
    if (savedFileContent && state.chapters.length === 0) {
      const extractedChapters = extractChapters(
        savedFileContent,
        state.settings.chapterRegex
      );
      dispatch({ type: "SET_CHAPTERS", payload: extractedChapters });
    }
  }, [state.chapters.length, state.settings.chapterRegex, dispatch]);

  const handleAutoTranslateNext = useCallback(
    async (nextChapter: number) => {
      if (
        !apiKey ||
        nextChapter >= state.chapters.length ||
        state.translations[nextChapter] ||
        translatingChapters.has(nextChapter)
      ) {
        return;
      }

      setTranslatingChapters((prev) => new Set(prev).add(nextChapter));

      const chapter = state.chapters[nextChapter];
      const chunks = chapter.content.split("\n");
      const maxLinesPerChunk = state.settings.maxLinesPerChunk || 10;
      const chunkCount = Math.ceil(chunks.length / maxLinesPerChunk);

      let currentTranslation = "";
      for (let i = 0; i < chunkCount; i++) {
        currentTranslation += "\n".repeat(
          Math.min(maxLinesPerChunk, chunks.length - i * maxLinesPerChunk)
        );
      }

      dispatch({
        type: "UPDATE_TRANSLATION",
        payload: {
          chapterId: nextChapter,
          translation: currentTranslation,
        },
      });

      try {
        const response = await translateChapter(
          chapter.content,
          apiKey,
          state.glossary,
          state.settings,
          (chunkIndex, translation, newTerms, newCharacters) => {
            const currentChunks = currentTranslation.split("\n");
            const translationChunks = translation.split("\n");

            const startLine = chunkIndex * maxLinesPerChunk;
            const endLine = Math.min(
              startLine + maxLinesPerChunk,
              chunks.length
            );
            const chunkSize = endLine - startLine;

            while (currentChunks.length < startLine + chunkSize) {
              currentChunks.push("");
            }

            for (
              let i = 0;
              i < chunkSize && i < translationChunks.length;
              i++
            ) {
              currentChunks[startLine + i] = translationChunks[i] || "";
            }

            currentTranslation = currentChunks.join("\n");

            dispatch({
              type: "UPDATE_TRANSLATION",
              payload: {
                chapterId: nextChapter,
                translation: currentTranslation,
              },
            });
          }
        );

        if (response.NEW_TERMS && response.NEW_TERMS.length > 0) {
          dispatch({
            type: "SET_GLOSSARY",
            payload: {
              terms: [...state.glossary.terms, ...response.NEW_TERMS],
              characters: [
                ...state.glossary.characters,
                ...(response.NEW_CHARACTERS || []),
              ],
            },
          });
        }
      } catch (error) {
        console.error("Translation failed:", error);
        alert("Translation failed. Please check your API key and try again.");
      } finally {
        setTranslatingChapters((prev) => {
          const newSet = new Set(prev);
          newSet.delete(nextChapter);
          return newSet;
        });
      }
    },
    [
      apiKey,
      state.chapters,
      state.translations,
      state.glossary,
      state.settings,
      translatingChapters,
      dispatch,
    ]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          if (state.selectedChapter !== null && state.selectedChapter > 0) {
            dispatch({
              type: "SET_SELECTED_CHAPTER",
              payload: state.selectedChapter - 1,
            });
          }
          break;
        case "ArrowRight":
          event.preventDefault();
          if (
            state.selectedChapter !== null &&
            state.selectedChapter < state.chapters.length - 1
          ) {
            dispatch({
              type: "SET_SELECTED_CHAPTER",
              payload: state.selectedChapter + 1,
            });
          }
          break;
        case "t":
        case "T":
          event.preventDefault();
          if (
            state.selectedChapter !== null &&
            apiKey &&
            !state.translations[state.selectedChapter]
          ) {
            handleAutoTranslateNext(state.selectedChapter);
          }
          break;
        case "Escape":
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    state.selectedChapter,
    state.chapters.length,
    state.translations,
    apiKey,
    dispatch,
    handleAutoTranslateNext,
  ]);

  useEffect(() => {
    if (
      state.settings.autoTranslateNext &&
      state.selectedChapter !== null &&
      state.chapters.length > 0 &&
      apiKey
    ) {
      const selectedChapter = state.selectedChapter;
      const translateCurrentIfNeeded = async () => {
        if (
          !state.translations[selectedChapter] &&
          state.chapters[selectedChapter]
        ) {
          console.log("Auto-translating current chapter:", selectedChapter);
          await handleAutoTranslateNext(selectedChapter);
        }
      };

      translateCurrentIfNeeded().then(() => {
        const nextChapterIndex = selectedChapter + 1;
        if (
          nextChapterIndex < state.chapters.length &&
          !state.translations[nextChapterIndex] &&
          state.chapters[nextChapterIndex] &&
          !translatingChapters.has(nextChapterIndex)
        ) {
          console.log(
            "Auto-translating next chapter in background:",
            nextChapterIndex
          );
          handleAutoTranslateNext(nextChapterIndex);
        }
      });
    }
  }, [
    state.selectedChapter,
    state.chapters,
    state.translations,
    apiKey,
    state.settings.autoTranslateNext,
    translatingChapters,
    handleAutoTranslateNext,
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
      localStorage.setItem("fileContent", content);
      const extractedChapters = extractChapters(
        content,
        state.settings.chapterRegex
      );

      localStorage.removeItem("chapters");
      localStorage.removeItem("translations");
      localStorage.removeItem("glossary");
      localStorage.removeItem("selectedChapter");

      dispatch({ type: "SET_CHAPTERS", payload: extractedChapters });
      dispatch({ type: "SET_TRANSLATIONS", payload: {} });
      dispatch({
        type: "SET_GLOSSARY",
        payload: { terms: [], characters: [] },
      });
      dispatch({ type: "SET_SELECTED_CHAPTER", payload: 0 });
    };
    reader.readAsText(file);
  };

  const handleScroll = () => {};

  return (
    <div className="viewer-container">
      <div className="viewer-content">
        {state.settings.showChapterList && <ChapterList />}
        <div
          className="chapter-viewer"
          ref={contentRef}
          onScroll={handleScroll}
          style={{
            fontSize: state.settings.fontSize,
          }}
        >
          <ChapterViewer apiKey={apiKey} onFileUpload={handleFileUpload} />
        </div>
      </div>
      {state.settings.showFooter && <Footer />}
      <LineDeleteModal />
    </div>
  );
};

export default Viewer;
