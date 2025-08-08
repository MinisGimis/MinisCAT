import React, { useRef, useEffect } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    TextField
} from '@mui/material';
import { useAppContext } from '../contexts/AppContext';
import { containsChinese } from '../services/translationService';
import { getPinyin, convertToSimplified, convertToTraditional } from '../utils/textConversion';
import { ChapterContents } from '../types';
import '../styles/ChapterViewer.css';

interface ChapterViewerProps {
    onScroll: () => void;
    onLineClick?: (line: string) => void;
    onTranslationLineClick?: (line: string, lineIndex: number) => void;
    onTranslationEdit?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onTranslationSave?: () => void;
    onTranslationCancel?: () => void;
    onKeyPress?: (event: React.KeyboardEvent) => void;
    editingLineIndex: number | null;
    editingText: string;
    translatingChunks: Set<number>;
}

const ChapterViewer = ({
    onScroll,
    onLineClick,
    onTranslationLineClick,
    onTranslationEdit,
    onTranslationSave,
    onTranslationCancel,
    onKeyPress,
    editingLineIndex,
    editingText,
    translatingChunks
}: ChapterViewerProps) => {
    const { state } = useAppContext();
    const { originalChapterContents, translatedChapterContents, selectedChapter, settings } = state;
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [selectedChapter]);

    const renderLineWithPinyin = (line: string, isOriginal: boolean = true, indexOverride?: number) => {
        if (!settings.showPinyin || !containsChinese(line)) {
            return <span>{renderContent(line, settings.characterType)}</span>;
        }

        if (settings.useBlockTextPinyin) {
            const pinyinResult = getPinyin(line).map(arr => arr[0]).join(' ');
            return (
                <span>
                    <span className="block-pinyin-text">{pinyinResult}</span>
                    <span className="block-char-text">{renderContent(line, settings.characterType)}</span>
                </span>
            );
        }

        const convertedLine = renderContent(line, settings.characterType);
        const chars = convertedLine.split('');
        const pinyinChars: JSX.Element[] = [];

        for (let index = 0; index < chars.length; index++) {
            const char = chars[index];
            const isChineseChar = (char: string) => /[\u4e00-\u9fff]/.test(char);

            if (isChineseChar(char)) {
                const pinyin = getPinyin(char);
                const pinyinText = pinyin;

                pinyinChars.push(
                    <span
                        key={index}
                        className="char-pinyin-container"
                    >
                        <span className="pinyin-text">{pinyinText}</span>
                        <span className="char-text">{char}</span>
                    </span>
                );
            } else {
                pinyinChars.push(<span key={index}>{char}</span>);
            }
        }

        return <span>{pinyinChars}</span>;
    };

    const renderContent = (content: string, characterType: string) => {
        if (characterType === 'simplified') {
            return convertToSimplified(content);
        } else if (characterType === 'traditional') {
            return convertToTraditional(content);
        }
        return content;
    };

    const isLineBeingTranslated = (lineIndex: number): boolean => {
        return translatingChunks.has(lineIndex);
    };

    const renderLines = () => {
        if (!currentChapter) {
            return null;
        }

        const lines = currentChapter.slice(1);
        const hasTranslation = currentTranslation && currentTranslation.length > 1;
        const translationLines = hasTranslation ? currentTranslation : [];

        if (!settings.showTranslationBelow) {
            const result = [];
            for (let index = 0; index < lines.length; index++) {
                const line = lines[index];

                if (line.trim() === '') {
                    result.push(<div key={`empty-${index}`} className="line empty-line" />);
                    continue;
                }

                const isTranslating = isLineBeingTranslated(index);
                const translationLine = translationLines[index + 1];

                let displayLine;
                let isTranslated;
                if (translationLine && translationLine.trim().length > 0) {
                    displayLine = translationLine.trim();
                    isTranslated = true;
                } else {
                    displayLine = line;
                    isTranslated = false;
                }

                result.push(
                    <div key={`line-container-${index}`} className="line-pair">
                        <Box className={isTranslating ? 'original-line-translating' : ''}>
                            {renderLineWithPinyin(displayLine, !isTranslated, index)}
                            {isTranslating && (
                                <CircularProgress
                                    size={16}
                                    className="translation-progress"
                                />
                            )}
                        </Box>
                    </div>
                );
            }
            return result;
        }

        const result = [];
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index];

            if (line.trim() === '') {
                result.push(<div key={`empty-${index}`} className="line empty-line" />);
                continue;
            }

            const originalLine = renderLineWithPinyin(line, true, index);
            let translationLine: string | null = null;
            if (hasTranslation && translationLines[index + 1] && translationLines[index + 1].trim().length > 0) {
                translationLine = translationLines[index + 1];
            }
            const isTranslating = isLineBeingTranslated(index);

            if (settings.showTranslationBelow && translationLine) {
                if (settings.allowEdits && editingLineIndex === index + 1) {
                    result.push(
                        <div key={`line-container-${index}`} className="line-pair">
                            {originalLine}
                            <TextField
                                value={editingText}
                                onChange={onTranslationEdit}
                                onKeyDown={onKeyPress}
                                onBlur={onTranslationSave}
                                autoFocus
                                multiline
                                variant="standard"
                                fullWidth
                                className="translation-edit-field-translation"
                            />
                        </div>
                    );
                    continue;
                }

                let translationLineClassName;
                if (settings.allowEdits) {
                    if (isTranslating) {
                        translationLineClassName = 'translation-line-translating-clickable';
                    } else {
                        translationLineClassName = 'translation-line-clickable';
                    }
                } else {
                    if (isTranslating) {
                        translationLineClassName = 'translation-line-translating';
                    } else {
                        translationLineClassName = 'translation-line';
                    }
                }

                result.push(
                    <div key={`line-container-${index}`} className="line-pair">
                        {originalLine}
                        <Box
                            className={translationLineClassName}
                            onClick={settings.allowEdits && translationLine ? () => onTranslationLineClick?.(translationLine!, index + 1) : undefined}
                        >
                            {translationLine}
                            {isTranslating && (
                                <CircularProgress
                                    size={16}
                                    className="translation-progress"
                                />
                            )}
                        </Box>
                    </div>
                );
                continue;
            }

            result.push(
                <div key={`line-container-${index}`} className="line-pair">
                    <Box className={isTranslating ? 'original-line-translating' : ''}>
                        {originalLine}
                        {isTranslating && (
                            <CircularProgress
                                size={16}
                                className="translation-progress"
                            />
                        )}
                    </Box>
                </div>
            );
        }
        return result;
    };

    if (originalChapterContents.length === 0) {
        return null;
    }

    const currentChapter = originalChapterContents[selectedChapter!];
    const currentTranslation = translatedChapterContents[selectedChapter!];

    return (
        <Box
            ref={contentRef}
            onScroll={onScroll}
            className="content-container chapter-viewer-content dynamic-padding dynamic-font-size"
            style={{
                '--viewer-padding': `${settings.viewerPadding}px`,
                '--font-size': `${settings.fontSize}px`
            } as React.CSSProperties}
        >
            <Box className="chapter-header">
                <Typography variant="h6" className="chapter-title-text">
                    {currentChapter[0]}
                </Typography>
            </Box>

            {renderLines()}

            <Box className="scroll-continue-container">
                <Typography className="scroll-continue-text">
                    Scroll to continue
                </Typography>
            </Box>
        </Box>
    );
};

export default ChapterViewer; 