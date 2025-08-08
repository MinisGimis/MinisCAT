import axios from 'axios';
import { GlossaryTerm, GlossaryCharacter, Glossary } from '../types';
import { getTranslationModelFromState } from './translationService';

const TRANSLATION_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export const CLEANUP_GLOSSARY_PROMPT = `
Review the provided glossary list, which is a JSON string containing "terms" and "characters" arrays.
Your task is to:
1. Identify and remove duplicate entries. For terms, a duplicate is based on the original term. For characters, a duplicate is based on the original name. If duplicates are found, keep the entry with the most accurate or common translation.
2. Remove any duplicate terms that appear in both the terms and characters arrays. Decide whether the term is a term or a character.
3. Remove any common sense translations that are extremely obvious and not necessary in the glossary. The glossary should only be for characters and special terms that are slang or for consistency. Obvious ones like 你好 for hello are not necessary.
4. Check and update the translations to reflect if they are slang, some existing fictional character name, some reference, etc.
5. Ensure consistent and clean formatting for each term and character (e.g., capitalization, spacing).
6. Return a single JSON object with exactly two keys: "cleaned_terms" and "cleaned_characters". DO NOT INCLUDE ANY OTHER TEXT OR EXPLANATIONS.

- "cleaned_terms": This must be an array of objects. Each object in this array must have exactly two keys:
  - "original": The original term (string).
  - "translation": The cleaned and corrected translation (string).

- "cleaned_characters": This must be an array of objects. Each object in this array must have exactly three keys:
  - "original_name": The original character name (string).
  - "translated_name": The cleaned and corrected translated name (string).
  - "gender": The character's gender (string, e.g., "man", "woman", "it").

Example of the required output format:
{
  "cleaned_terms": [
    {"original": "你好", "translation": "Hello"},
    {"original": "世界", "translation": "World"}
  ],
  "cleaned_characters": [
    {"original_name": "张三", "translated_name": "Zhang San", "gender": "man"}
  ]
}

Ensure your response is ONLY this JSON object, with no other text or explanations before or after it. The input JSON structure may differ from this output structure; you must transform it.
`;

const calculateCleanupTimeout = (termCount: number): number => {
    const additionalSeconds = Math.floor(termCount / 5);
    const timeoutSeconds = 10 + additionalSeconds;
    return Math.min(timeoutSeconds, 30) * 1000;
};

export const cleanupGlossary = async (
    glossary: Glossary,
    apiKey: string,
    settings?: any
): Promise<{ cleaned_terms: GlossaryTerm[]; cleaned_characters: GlossaryCharacter[] }> => {
    if (!apiKey) {
        throw new Error('API key is required for glossary cleanup');
    }

    if (glossary.terms.length === 0 && glossary.characters.length === 0) {
        throw new Error('No glossary items to clean up');
    }

    try {
        const response = await axios.post(
            TRANSLATION_ENDPOINT,
            {
                model: getTranslationModelFromState(settings),
                messages: [
                    {
                        role: 'system',
                        content: CLEANUP_GLOSSARY_PROMPT
                    },
                    {
                        role: 'user',
                        content: JSON.stringify(glossary)
                    }
                ],
                temperature: 1.0,
                max_tokens: 2000
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: calculateCleanupTimeout(glossary.terms.length + glossary.characters.length)
            }
        );

        if (!response.data.choices || response.data.choices.length === 0) {
            throw new Error('No response from glossary cleanup service');
        }

        const content = response.data.choices[0].message.content;

        if (!content) {
            throw new Error('Empty response from glossary cleanup service');
        }

        try {
            const parsedResponse = JSON.parse(content) as { cleaned_terms: GlossaryTerm[]; cleaned_characters: GlossaryCharacter[] };

            if (!Array.isArray(parsedResponse.cleaned_terms) || !Array.isArray(parsedResponse.cleaned_characters)) {
                throw new Error('Invalid glossary cleanup response format');
            }

            return parsedResponse;
        } catch (parseError) {
            console.error('Failed to parse glossary cleanup response:', parseError);
            console.error('Raw response:', content);
            throw new Error('Invalid glossary cleanup response format. Please try again.');
        }
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
                throw new Error(`Glossary cleanup failed: ${error.message}`);
            }
        } else if (error instanceof Error) {
            throw error;
        } else {
            throw new Error('An unexpected error occurred during glossary cleanup');
        }
    }
};

export const formatGlossaryForTranslation = (glossary: Glossary): string => {
    if (!glossary || (glossary.terms.length === 0 && glossary.characters.length === 0)) {
        return '';
    }

    const glossaryTerms = glossary.terms
        .map((term) => `"${term.original}": "${term.translation}"`)
        .join(",\n");

    const glossaryCharacters = glossary.characters
        .map(
            (char) =>
                `{"original_name": "${char.original_name}", "translated_name": "${char.translated_name}", "gender": "${char.gender}"}`
        )
        .join(",\n");

    return `\nHere is the existing glossary of terms:\n${glossaryTerms}\n\nHere is the existing characters:\n${glossaryCharacters}\n\n`;
};

export const mergeNewGlossaryItems = (
    currentGlossary: Glossary,
    newTerms: GlossaryTerm[],
    newCharacters: GlossaryCharacter[]
): Glossary => {
    const updatedGlossary = {
        terms: [...currentGlossary.terms],
        characters: [...currentGlossary.characters]
    };

    if (newTerms && newTerms.length > 0) {
        const existingTerms = new Set(currentGlossary.terms.map(term => term.original));
        newTerms.forEach(term => {
            if (!existingTerms.has(term.original)) {
                updatedGlossary.terms.push(term);
                existingTerms.add(term.original);
            }
        });
    }

    if (newCharacters && newCharacters.length > 0) {
        const existingCharacters = new Set(currentGlossary.characters.map(character => character.original_name));
        newCharacters.forEach(character => {
            if (!existingCharacters.has(character.original_name)) {
                updatedGlossary.characters.push(character);
                existingCharacters.add(character.original_name);
            }
        });
    }

    return updatedGlossary;
};

export const saveGlossaryToStorage = (glossary: Glossary): void => {
    try {
        localStorage.setItem('glossary', JSON.stringify(glossary));
    } catch (error) {
        console.error('Failed to save glossary to localStorage:', error);
    }
};

export const loadGlossaryFromStorage = (): Glossary => {
    try {
        const savedGlossary = localStorage.getItem('glossary');
        if (savedGlossary) {
            const parsed = JSON.parse(savedGlossary);
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.terms) && Array.isArray(parsed.characters)) {
                return parsed;
            }
        }
    } catch (error) {
        console.error('Failed to load glossary from localStorage:', error);
    }

    return { terms: [], characters: [] };
}; 