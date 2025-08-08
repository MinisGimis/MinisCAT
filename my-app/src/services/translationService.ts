import axios from 'axios';
import { TranslationResponse, GlossaryTerm, GlossaryCharacter, Glossary } from '../types';
import { formatGlossaryForTranslation, mergeNewGlossaryItems } from './glossaryService';

const TRANSLATION_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export const TRANSLATE_TO_ENGLISH_PROMPT =
    "Can you translate this chinese web novel into English? YOU MUST KEEP THE punctuation, swearing, meaning, and connotation the same. YOU MUST KEEP THE NEWLINES AND PARAGRAPH SPACING THE SAME, DO NOT CONCATENATE THEM! DO NOT ADD TRANSLATION NOTES OR EXPLAIN WHAT A TERM MEANS. Some words might be internet slang or have sexual meanings. Please make it in normal English rather than a formal essay. Note that this is in past tense. DO NOT LEAVE ANYTHING UNTRANSLATED!";

export const TRANSLATION_FORMAT_PROMPT =
    'Please translate the following text. Use existing translations for terms and character names if they are available. YOU MUST KEEP THE NEWLINES AND PARAGRAPH SPACING THE SAME, DO NOT CONCATENATE THEM! Maintain any newlines from the original text in the translation. Your output MUST include: \n1. The translated text. \n2. Any NEW TERMS introduced in this passage that are not already in the existing translations. \n3. Any NEW CHARACTERS introduced, with gender specified. Do not return terms or characters that are already in the glossary.\nReturn your result in the following strict JSON format (DO NOT include any newlines or extra spaces outside the "TRANSLATION" field): \n{"TRANSLATION": "TRANSLATED STRING (with preserved newlines)", "NEW_TERMS": [{"original": "original term", "translation": "translated term"}], "NEW_CHARACTERS": [{"original_name": "original name", "translated_name": "translated name", "gender": "man" | "woman" | "it"}]}';

export const getTranslationModelFromState = (settings: any): string => {
    const model = settings?.translationModel || 'gpt-4.1-nano';
    const cleanedModel = model.replace(/^"|"$/g, '');
    console.log('using model:', cleanedModel);
    return cleanedModel;
};

export const containsChinese = (text: string): boolean => {
    return /[\u4e00-\u9fff]/.test(text);
};

const countChineseCharacters = (text: string): number => {
    return (text.match(/[\u4e00-\u9fff]/g) || []).length;
};

const calculateTranslationTimeout = (text: string): number => {
    const chineseCharCount = countChineseCharacters(text);
    const additionalSeconds = Math.floor(chineseCharCount / 20);
    const timeoutSeconds = 10 + additionalSeconds;
    return Math.min(timeoutSeconds, 30) * 1000;
};

export const splitTextIntoChunks = (text: string, maxLinesPerChunk: number): string[] => {
    maxLinesPerChunk = Math.max(1, maxLinesPerChunk || 10);

    const lines = text.split('\n');
    const chunks: string[] = [];

    for (let i = 0; i < lines.length; i += maxLinesPerChunk) {
        const chunk = lines.slice(i, i + maxLinesPerChunk).join('\n');
        chunks.push(chunk);
    }
    console.log(`split into ${chunks.length} chunks`);
    return chunks;
};

export const translateChunk = async (
    chunk: string,
    apiKey: string,
    glossary?: Glossary,
    settings?: any,
    attempt: number = 1
): Promise<TranslationResponse> => {
    if (!apiKey) {
        throw new Error('API key is required for translation');
    }

    if (!chunk || chunk.trim().length === 0) {
        throw new Error('No content to translate');
    }

    const glossaryContext = formatGlossaryForTranslation(glossary || { terms: [], characters: [] });

    try {
        const response = await axios.post(
            TRANSLATION_ENDPOINT,
            {
                model: getTranslationModelFromState(settings),
                messages: [
                    {
                        role: 'user',
                        content: `${TRANSLATE_TO_ENGLISH_PROMPT} \n ${TRANSLATION_FORMAT_PROMPT} ${glossaryContext} YOU MUST KEEP THE NEWLINES AND PARAGRAPH SPACING THE SAME, DO NOT CONCATENATE THEM! DO NOT ADD TRANSLATION NOTES OR EXPLAIN WHAT A TERM MEANS.`
                    },
                    {
                        role: 'user',
                        content: chunk
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: calculateTranslationTimeout(chunk)
            }
        );

        if (!response.data.choices || response.data.choices.length === 0) {
            throw new Error('No response from translation service');
        }

        const rawContent = response.data.choices[0].message.content;

        if (!rawContent) {
            throw new Error('Empty response from translation service');
        }

        let parsedResponse: TranslationResponse;
        try {
            const match = rawContent.match(/\{[\s\S]*\}/);
            if (match) {
                parsedResponse = JSON.parse(match[0]) as TranslationResponse;
            } else {
                throw new Error('No valid JSON object found in translation response');
            }
        } catch (parseError) {
            console.error('Failed to parse translation response:', parseError);
            console.error('Raw response:', rawContent);
            throw new Error('Invalid translation response format. Please try again.');
        }

        if (!parsedResponse.TRANSLATION) {
            throw new Error('Invalid translation response: missing TRANSLATION field');
        }

        parsedResponse.TRANSLATION = parsedResponse.TRANSLATION
            .split('\n')
            .map(line => line.trim())
            .join('\n');

        const originalLines = chunk.split("\n").length;
        const translatedLines = parsedResponse.TRANSLATION.split("\n").length;

        if (originalLines !== translatedLines) {
            throw new Error(`Translation validation failed: line count mismatch (original: ${originalLines}, translated: ${translatedLines})`);
        }

        if (containsChinese(parsedResponse.TRANSLATION)) {
            throw new Error('Translation validation failed: untranslated Chinese characters detected in translation');
        }

        return parsedResponse;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
                throw new Error('Invalid API key. Please check your OpenAI API key in settings.');
            } else if (error.response?.status === 429) {
                throw new Error('Rate limit exceeded. Please wait a moment and try again.');
            } else if (error.response?.status === 400) {
                throw new Error('Invalid request. Please check your API key and try again.');
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('Request timeout. Please try again.');
            } else {
                throw new Error(`Translation failed: ${error.message}`);
            }
        } else if (error instanceof Error) {
            throw error;
        } else {
            throw new Error('An unexpected error occurred during translation');
        }
    }
};

interface ChunkResult {
    translation: string;
    newTerms: GlossaryTerm[];
    newCharacters: GlossaryCharacter[];
}

const translateChunkWithRetry = async (
    chunk: string,
    apiKey: string,
    glossary?: Glossary,
    settings?: any,
    maxRetries: number = 3
): Promise<ChunkResult> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await translateChunk(chunk, apiKey, glossary, settings, attempt);
            return {
                translation: response.TRANSLATION,
                newTerms: response.NEW_TERMS || [],
                newCharacters: response.NEW_CHARACTERS || []
            };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown error');
            console.log(`retry ${attempt} failed:`, lastError.message);

            if (attempt === maxRetries) {
                throw lastError;
            }
        }
    }

    throw lastError || new Error('Translation failed after all retries');
};

const splitAndTranslateChunk = async (
    chunk: string,
    apiKey: string,
    glossary?: Glossary,
    settings?: any,
    onChunkComplete?: (chunkIndex: number, translation: string, newTerms: GlossaryTerm[], newCharacters: GlossaryCharacter[]) => void,
    chunkIndex?: number,
    depth: number = 0
): Promise<ChunkResult> => {
    const lines = chunk.split('\n');
    const maxDepth = 15;

    if (depth >= maxDepth) {
        try {
            return await translateChunkWithRetry(chunk, apiKey, glossary, settings);
        } catch (error) {
            console.log('max depth reached, returning original');
            return {
                translation: chunk,
                newTerms: [],
                newCharacters: []
            };
        }
    }

    if (lines.length === 1) {
        console.log('single line chunk, retrying 3 times');
        for (let retry = 1; retry <= 3; retry++) {
            try {
                const result = await translateChunkWithRetry(chunk, apiKey, glossary, settings);
                console.log(`single line succeeded on retry ${retry}`);
                return result;
            } catch (error) {
                console.log(`single line retry ${retry} failed:`, error);
                if (retry === 3) {
                    console.log('single line failed all retries, returning original');
                    return {
                        translation: chunk,
                        newTerms: [],
                        newCharacters: []
                    };
                }
            }
        }
    }

    if (lines.length <= 1) {
        return {
            translation: chunk,
            newTerms: [],
            newCharacters: []
        };
    }

    const midPoint = Math.floor(lines.length / 2);
    const firstHalf = lines.slice(0, midPoint).join('\n');
    const secondHalf = lines.slice(midPoint).join('\n');

    console.log(`depth ${depth}: splitting ${lines.length} lines into ${midPoint} and ${lines.length - midPoint}`);

    const [firstResult, secondResult] = await Promise.all([
        translateChunkWithRetry(firstHalf, apiKey, glossary, settings)
            .catch(async (error) => {
                console.log('first half failed, splitting recursively:', error);
                return await splitAndTranslateChunk(firstHalf, apiKey, glossary, settings, onChunkComplete, chunkIndex, depth + 1);
            }),
        translateChunkWithRetry(secondHalf, apiKey, glossary, settings)
            .catch(async (error) => {
                console.log('second half failed, splitting recursively:', error);
                return await splitAndTranslateChunk(secondHalf, apiKey, glossary, settings, onChunkComplete, chunkIndex, depth + 1);
            })
    ]);

    const combinedTranslation = firstResult.translation + '\n' + secondResult.translation;
    const combinedNewTerms = [...firstResult.newTerms, ...secondResult.newTerms];
    const combinedNewCharacters = [...firstResult.newCharacters, ...secondResult.newCharacters];

    const result: ChunkResult = {
        translation: combinedTranslation,
        newTerms: combinedNewTerms,
        newCharacters: combinedNewCharacters
    };

    if (onChunkComplete && chunkIndex !== undefined) {
        onChunkComplete(chunkIndex, result.translation, result.newTerms, result.newCharacters);
    }

    return result;
};

export const translateChapter = async (
    chapterContent: string,
    apiKey: string,
    glossary?: Glossary,
    settings?: any,
    onChunkComplete?: (chunkIndex: number, translation: string, newTerms: GlossaryTerm[], newCharacters: GlossaryCharacter[]) => void
): Promise<TranslationResponse> => {
    if (!apiKey) {
        throw new Error('API key is required for translation');
    }

    if (!chapterContent || chapterContent.trim().length === 0) {
        throw new Error('No content to translate');
    }

    let maxLinesPerChunk = settings?.maxLinesPerChunk;
    if (typeof maxLinesPerChunk !== 'number') {
        maxLinesPerChunk = Number(maxLinesPerChunk);
    }
    maxLinesPerChunk = Math.max(1, maxLinesPerChunk || 10);

    console.log(`processing chapter with ${maxLinesPerChunk} lines per chunk`);

    const initialChunks = splitTextIntoChunks(chapterContent, maxLinesPerChunk);

    const finalChunks: string[] = new Array(initialChunks.length).fill('');
    const allNewTerms: GlossaryTerm[] = [];
    const allNewCharacters: GlossaryCharacter[] = [];

    let currentGlossary = glossary ? { ...glossary } : { terms: [], characters: [] };

    const chunkPromises = initialChunks.map(async (chunk, chunkIndex) => {
        if (!chunk || chunk.trim().length === 0) {
            finalChunks[chunkIndex] = '';
            return;
        }

        try {
            const result = await translateChunkWithRetry(chunk, apiKey, currentGlossary, settings);

            finalChunks[chunkIndex] = result.translation;

            if (result.newTerms && result.newTerms.length > 0) {
                allNewTerms.push(...result.newTerms);
                currentGlossary = mergeNewGlossaryItems(currentGlossary, result.newTerms, []);
            }

            if (result.newCharacters && result.newCharacters.length > 0) {
                allNewCharacters.push(...result.newCharacters);
                currentGlossary = mergeNewGlossaryItems(currentGlossary, [], result.newCharacters);
            }

            if (onChunkComplete) {
                onChunkComplete(chunkIndex, result.translation, result.newTerms, result.newCharacters);
            }

            console.log(`chunk ${chunkIndex} completed`);

        } catch (error) {
            console.log(`chunk ${chunkIndex} failed, splitting and retrying:`, error);

            try {
                const splitResult = await splitAndTranslateChunk(
                    chunk,
                    apiKey,
                    currentGlossary,
                    settings,
                    onChunkComplete,
                    chunkIndex
                );

                finalChunks[chunkIndex] = splitResult.translation;

                if (splitResult.newTerms && splitResult.newTerms.length > 0) {
                    allNewTerms.push(...splitResult.newTerms);
                    currentGlossary = mergeNewGlossaryItems(currentGlossary, splitResult.newTerms, []);
                }

                if (splitResult.newCharacters && splitResult.newCharacters.length > 0) {
                    allNewCharacters.push(...splitResult.newCharacters);
                    currentGlossary = mergeNewGlossaryItems(currentGlossary, [], splitResult.newCharacters);
                }

                console.log(`chunk ${chunkIndex} completed after splitting`);

            } catch (splitError) {
                console.error(`chunk ${chunkIndex} failed even after splitting:`, splitError);
                finalChunks[chunkIndex] = chunk;
            }
        }
    });

    await Promise.all(chunkPromises);

    return {
        TRANSLATION: finalChunks.join('\n'),
        NEW_TERMS: allNewTerms,
        NEW_CHARACTERS: allNewCharacters
    };
}; 