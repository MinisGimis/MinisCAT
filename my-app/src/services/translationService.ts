import axios from "axios";
import { TranslationResponse, GlossaryTerm, GlossaryCharacter } from "../types";

const TRANSLATION_ENDPOINT = "https://api.openai.com/v1/chat/completions";

export const TRANSLATE_TO_ENGLISH_PROMPT =
  "Can you translate this chinese web novel into English? This is in third person. YOU MUST KEEP THE punctuation, swearing, meaning, and connotation the same. YOU MUST KEEP THE NEWLINES AND PARAGRAPH SPACING THE SAME, DO NOT CONCATENATE THEM! DO NOT ADD TRANSLATION NOTES OR EXPLAIN WHAT A TERM MEANS. Some words might be internet slang or have sexual meanings. Please make it in normal English rather than a formal essay. Note that this is in past tense. DO NOT LEAVE ANYTHING UNTRANSLATED!";

export const TRANSLATION_FORMAT_PROMPT =
  'Please translate the following text. Use existing translations for terms and character names if they are available. YOU MUST KEEP THE NEWLINES AND PARAGRAPH SPACING THE SAME, DO NOT CONCATENATE THEM! Maintain any newlines from the original text in the translation. Your output MUST include: \n1. The translated text. \n2. Any NEW TERMS introduced in this passage that are not already in the existing translations. \n3. Any NEW CHARACTERS introduced, with gender specified. Do not return terms or characters that are already in the glossary.\nReturn your result in the following strict JSON format (DO NOT include any newlines or extra spaces outside the "TRANSLATION" field): \n{"TRANSLATION": "TRANSLATED STRING (with preserved newlines)", "NEW_TERMS": [{"original": "original term", "translation": "translated term"}], "NEW_CHARACTERS": [{"original_name": "original name", "translated_name": "translated name", "gender": "man" | "woman" | "it"}]}';

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

export const getTranslationModel = (): string => {
  const model = localStorage.getItem("translationModel") || "gpt-4.1-nano";
  const cleanedModel = model.replace(/^"|"$/g, "");
  console.log("Translation model being used:", cleanedModel);
  return cleanedModel;
};

export const getTranslationModelFromState = (settings: any): string => {
  const model = settings?.translationModel || "gpt-4.1-nano";
  const cleanedModel = model.replace(/^"|"$/g, "");
  console.log("Translation model from state:", cleanedModel);
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
  const timeoutSeconds = 5 + additionalSeconds;
  return Math.min(timeoutSeconds, 30) * 1000;
};

const calculateCleanupTimeout = (termCount: number): number => {
  const additionalSeconds = Math.floor(termCount / 10);
  const timeoutSeconds = 5 + additionalSeconds;
  return Math.min(timeoutSeconds, 15) * 1000;
};

export const splitTextIntoChunks = (
  text: string,
  maxLinesPerChunk: number
): string[] => {
  console.log(
    "[splitTextIntoChunks] maxLinesPerChunk:",
    maxLinesPerChunk,
    "type:",
    typeof maxLinesPerChunk
  );

  maxLinesPerChunk = Math.max(1, maxLinesPerChunk || 10);

  const lines = text.split("\n");
  const chunks: string[] = [];

  for (let i = 0; i < lines.length; i += maxLinesPerChunk) {
    const chunk = lines.slice(i, i + maxLinesPerChunk).join("\n");
    chunks.push(chunk);
  }
  console.log(
    "[splitTextIntoChunks] chunk count:",
    chunks.length,
    "chunk sizes:",
    chunks.map((c) => c.split("\n").length)
  );
  return chunks;
};

export const translateChunk = async (
  chunk: string,
  apiKey: string,
  glossary?: { terms: GlossaryTerm[]; characters: GlossaryCharacter[] },
  settings?: any,
  attempt: number = 1
): Promise<TranslationResponse> => {
  if (!apiKey) {
    throw new Error("API key is required for translation");
  }

  if (!chunk || chunk.trim().length === 0) {
    throw new Error("No content to translate");
  }

  let glossaryContext = "";
  if (glossary) {
    const glossaryTerms = glossary.terms
      .map((term) => `"${term.original}": "${term.translation}"`)
      .join(",\n");

    const glossaryCharacters = glossary.characters
      .map(
        (char) =>
          `{"original_name": "${char.original_name}", "translated_name": "${char.translated_name}", "gender": "${char.gender}"}`
      )
      .join(",\n");

    glossaryContext = `\nHere is the existing glossary of terms:\n${glossaryTerms}\n\nHere is the existing characters:\n${glossaryCharacters}\n\n`;
  }

  try {
    const response = await axios.post(
      TRANSLATION_ENDPOINT,
      {
        model: settings
          ? getTranslationModelFromState(settings)
          : getTranslationModel(),
        messages: [
          {
            role: "user",
            content: `${TRANSLATE_TO_ENGLISH_PROMPT} \n ${TRANSLATION_FORMAT_PROMPT} ${glossaryContext} YOU MUST KEEP THE NEWLINES AND PARAGRAPH SPACING THE SAME, DO NOT CONCATENATE THEM! DO NOT ADD TRANSLATION NOTES OR EXPLAIN WHAT A TERM MEANS.`,
          },
          {
            role: "user",
            content: chunk,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: calculateTranslationTimeout(chunk),
      }
    );

    if (!response.data.choices || response.data.choices.length === 0) {
      throw new Error("No response from translation service");
    }

    const rawContent = response.data.choices[0].message.content;

    if (!rawContent) {
      throw new Error("Empty response from translation service");
    }

    let parsedResponse: TranslationResponse;
    try {
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (match) {
        parsedResponse = JSON.parse(match[0]) as TranslationResponse;
      } else {
        throw new Error("No valid JSON object found in translation response");
      }
    } catch (parseError) {
      console.error("Failed to parse translation response:", parseError);
      console.error("Raw response:", rawContent);
      throw new Error("Invalid translation response format. Please try again.");
    }

    if (!parsedResponse.TRANSLATION) {
      throw new Error(
        "Invalid translation response: missing TRANSLATION field"
      );
    }

    const originalLines = chunk.split("\n").length;
    const translatedLines = parsedResponse.TRANSLATION.split("\n").length;

    if (originalLines !== translatedLines) {
      throw new Error(
        `Translation validation failed: line count mismatch (original: ${originalLines}, translated: ${translatedLines})`
      );
    }

    if (containsChinese(parsedResponse.TRANSLATION)) {
      throw new Error(
        "Translation validation failed: untranslated Chinese characters detected in translation"
      );
    }

    return parsedResponse;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error(
          "Invalid API key. Please check your OpenAI API key in settings."
        );
      } else if (error.response?.status === 429) {
        throw new Error(
          "Rate limit exceeded. Please wait a moment and try again."
        );
      } else if (error.response?.status === 400) {
        throw new Error(
          "Invalid request. Please check your API key and try again."
        );
      } else if (error.code === "ECONNABORTED") {
        throw new Error("Request timeout. Please try again.");
      } else {
        throw new Error(`Translation failed: ${error.message}`);
      }
    } else if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("An unexpected error occurred during translation");
    }
  }
};

export const translateChapter = async (
  chapterContent: string,
  apiKey: string,
  glossary?: { terms: GlossaryTerm[]; characters: GlossaryCharacter[] },
  settings?: any,
  onChunkComplete?: (
    chunkIndex: number,
    translation: string,
    newTerms: GlossaryTerm[],
    newCharacters: GlossaryCharacter[]
  ) => void
): Promise<TranslationResponse> => {
  if (!apiKey) {
    throw new Error("API key is required for translation");
  }

  if (!chapterContent || chapterContent.trim().length === 0) {
    throw new Error("No content to translate");
  }

  console.log(
    "[translateChapter] settings.maxLinesPerChunk:",
    settings?.maxLinesPerChunk,
    "type:",
    typeof settings?.maxLinesPerChunk
  );
  let maxLinesPerChunk = settings?.maxLinesPerChunk;
  if (typeof maxLinesPerChunk !== "number") {
    maxLinesPerChunk = Number(maxLinesPerChunk);
  }
  maxLinesPerChunk = Math.max(1, maxLinesPerChunk || 10);
  console.log(
    "[translateChapter] using maxLinesPerChunk:",
    maxLinesPerChunk,
    "type:",
    typeof maxLinesPerChunk
  );
  const chunks = splitTextIntoChunks(chapterContent, maxLinesPerChunk);

  if (chunks.length === 1) {
    const response = await translateChunk(
      chapterContent,
      apiKey,
      glossary,
      settings
    );

    if (onChunkComplete) {
      onChunkComplete(
        0,
        response.TRANSLATION,
        response.NEW_TERMS,
        response.NEW_CHARACTERS
      );
    }

    return response;
  }

  const finalChunks: string[] = [];
  const allNewTerms: GlossaryTerm[] = [];
  const allNewCharacters: GlossaryCharacter[] = [];

  let currentGlossary = glossary
    ? {
        terms: [...glossary.terms],
        characters: [...glossary.characters],
      }
    : { terms: [], characters: [] };

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const response = await translateChunk(
        chunk,
        apiKey,
        currentGlossary,
        settings
      );
      finalChunks[i] = response.TRANSLATION;
      allNewTerms.push(...(response.NEW_TERMS || []));
      allNewCharacters.push(...(response.NEW_CHARACTERS || []));

      if (response.NEW_TERMS && response.NEW_TERMS.length > 0) {
        const existingTerms = new Set(
          currentGlossary.terms.map((term) => term.original)
        );
        response.NEW_TERMS.forEach((term) => {
          if (!existingTerms.has(term.original)) {
            currentGlossary.terms.push(term);
            existingTerms.add(term.original);
          }
        });
      }
      if (response.NEW_CHARACTERS && response.NEW_CHARACTERS.length > 0) {
        const existingCharacters = new Set(
          currentGlossary.characters.map((character) => character.original_name)
        );
        response.NEW_CHARACTERS.forEach((character) => {
          if (!existingCharacters.has(character.original_name)) {
            currentGlossary.characters.push(character);
            existingCharacters.add(character.original_name);
          }
        });
      }

      if (onChunkComplete) {
        onChunkComplete(
          i,
          response.TRANSLATION,
          response.NEW_TERMS,
          response.NEW_CHARACTERS
        );
      }
    } catch (error) {
      console.error(
        `Failed to translate chunk ${i + 1}/${chunks.length}:`,
        error
      );

      console.log(
        "[translateChapter] retrying failed chunk with size:",
        Math.floor(maxLinesPerChunk / 2)
      );
      const retryResult = await retryChunkWithSmallerSize(
        chunk,
        apiKey,
        Math.floor(maxLinesPerChunk / 2),
        currentGlossary,
        settings,
        0
      );
      finalChunks[i] = retryResult.translation;
      allNewTerms.push(...retryResult.newTerms);
      allNewCharacters.push(...retryResult.newCharacters);

      if (retryResult.newTerms && retryResult.newTerms.length > 0) {
        const existingTerms = new Set(
          currentGlossary.terms.map((term) => term.original)
        );
        retryResult.newTerms.forEach((term) => {
          if (!existingTerms.has(term.original)) {
            currentGlossary.terms.push(term);
            existingTerms.add(term.original);
          }
        });
      }
      if (retryResult.newCharacters && retryResult.newCharacters.length > 0) {
        const existingCharacters = new Set(
          currentGlossary.characters.map((character) => character.original_name)
        );
        retryResult.newCharacters.forEach((character) => {
          if (!existingCharacters.has(character.original_name)) {
            currentGlossary.characters.push(character);
            existingCharacters.add(character.original_name);
          }
        });
      }

      if (onChunkComplete) {
        onChunkComplete(
          i,
          retryResult.translation,
          retryResult.newTerms,
          retryResult.newCharacters
        );
      }
    }
  }

  return {
    TRANSLATION: finalChunks.join("\n"),
    NEW_TERMS: allNewTerms,
    NEW_CHARACTERS: allNewCharacters,
  };
};

const retryChunkWithSmallerSize = async (
  chunkText: string,
  apiKey: string,
  maxLines: number,
  glossary?: { terms: GlossaryTerm[]; characters: GlossaryCharacter[] },
  settings?: any,
  attemptCount: number = 0
): Promise<{
  translation: string;
  newTerms: GlossaryTerm[];
  newCharacters: GlossaryCharacter[];
}> => {
  console.log(
    `[retryChunkWithSmallerSize] called with maxLines: ${maxLines}, attempt: ${attemptCount}`
  );
  maxLines = Math.max(1, maxLines);

  if (maxLines === 1 && attemptCount >= 2) {
    console.log(
      "[retryChunkWithSmallerSize] Giving up after 2 attempts with chunk size 1"
    );
    return {
      translation: chunkText,
      newTerms: [],
      newCharacters: [],
    };
  }

  try {
    const response = await translateChunk(
      chunkText,
      apiKey,
      glossary,
      settings
    );
    return {
      translation: response.TRANSLATION,
      newTerms: response.NEW_TERMS,
      newCharacters: response.NEW_CHARACTERS,
    };
  } catch (error) {
    console.log(
      `[retryChunkWithSmallerSize] Translation failed for chunk with ${maxLines} lines, attempt ${
        attemptCount + 1
      }`
    );

    if (maxLines === 1) {
      console.log(
        `[retryChunkWithSmallerSize] Retrying with chunk size 1, attempt ${
          attemptCount + 1
        }`
      );
      return await retryChunkWithSmallerSize(
        chunkText,
        apiKey,
        maxLines,
        glossary,
        settings,
        attemptCount + 1
      );
    }

    const smallerSize = Math.max(1, Math.floor(maxLines / 2));
    console.log(
      `[retryChunkWithSmallerSize] Trying with smaller chunk size: ${smallerSize} lines`
    );

    const smallerChunks = splitTextIntoChunks(chunkText, smallerSize);
    if (smallerChunks.length === 1) {
      return await retryChunkWithSmallerSize(
        chunkText,
        apiKey,
        smallerSize,
        glossary,
        settings,
        attemptCount
      );
    }

    let currentSubGlossary = glossary
      ? {
          terms: [...glossary.terms],
          characters: [...glossary.characters],
        }
      : { terms: [], characters: [] };

    const subChunkResults = [];
    for (const subChunk of smallerChunks) {
      try {
        const response = await translateChunk(
          subChunk,
          apiKey,
          currentSubGlossary,
          settings
        );
        subChunkResults.push({
          success: true,
          translation: response.TRANSLATION,
          newTerms: response.NEW_TERMS,
          newCharacters: response.NEW_CHARACTERS,
        });

        if (response.NEW_TERMS && response.NEW_TERMS.length > 0) {
          const existingTerms = new Set(
            currentSubGlossary.terms.map((term) => term.original)
          );
          response.NEW_TERMS.forEach((term) => {
            if (!existingTerms.has(term.original)) {
              currentSubGlossary.terms.push(term);
              existingTerms.add(term.original);
            }
          });
        }
        if (response.NEW_CHARACTERS && response.NEW_CHARACTERS.length > 0) {
          const existingCharacters = new Set(
            currentSubGlossary.characters.map(
              (character) => character.original_name
            )
          );
          response.NEW_CHARACTERS.forEach((character) => {
            if (!existingCharacters.has(character.original_name)) {
              currentSubGlossary.characters.push(character);
              existingCharacters.add(character.original_name);
            }
          });
        }
      } catch (error) {
        console.log(
          `[retryChunkWithSmallerSize] Sub-chunk translation failed, trying with smaller size`
        );
        const retryResult = await retryChunkWithSmallerSize(
          subChunk,
          apiKey,
          Math.max(1, Math.floor(smallerSize / 2)),
          currentSubGlossary,
          settings
        );
        subChunkResults.push({
          success: true,
          translation: retryResult.translation,
          newTerms: retryResult.newTerms,
          newCharacters: retryResult.newCharacters,
        });

        if (retryResult.newTerms && retryResult.newTerms.length > 0) {
          const existingTerms = new Set(
            currentSubGlossary.terms.map((term) => term.original)
          );
          retryResult.newTerms.forEach((term) => {
            if (!existingTerms.has(term.original)) {
              currentSubGlossary.terms.push(term);
              existingTerms.add(term.original);
            }
          });
        }
        if (retryResult.newCharacters && retryResult.newCharacters.length > 0) {
          const existingCharacters = new Set(
            currentSubGlossary.characters.map(
              (character) => character.original_name
            )
          );
          retryResult.newCharacters.forEach((character) => {
            if (!existingCharacters.has(character.original_name)) {
              currentSubGlossary.characters.push(character);
              existingCharacters.add(character.original_name);
            }
          });
        }
      }
    }

    const combinedTranslation = subChunkResults
      .map((r) => r.translation)
      .join("\n");
    const combinedNewTerms = subChunkResults.flatMap((r) => r.newTerms);
    const combinedNewCharacters = subChunkResults.flatMap(
      (r) => r.newCharacters
    );
    return {
      translation: combinedTranslation,
      newTerms: combinedNewTerms,
      newCharacters: combinedNewCharacters,
    };
  }
};

export const cleanupGlossary = async (
  glossary: { terms: GlossaryTerm[]; characters: GlossaryCharacter[] },
  apiKey: string
): Promise<{
  cleaned_terms: GlossaryTerm[];
  cleaned_characters: GlossaryCharacter[];
}> => {
  if (!apiKey) {
    throw new Error("API key is required for glossary cleanup");
  }

  if (glossary.terms.length === 0 && glossary.characters.length === 0) {
    throw new Error("No glossary items to clean up");
  }

  try {
    const response = await axios.post(
      TRANSLATION_ENDPOINT,
      {
        model: getTranslationModel(),
        messages: [
          {
            role: "system",
            content: CLEANUP_GLOSSARY_PROMPT,
          },
          {
            role: "user",
            content: JSON.stringify(glossary),
          },
        ],
        temperature: 1.0,
        max_tokens: 2000,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: calculateCleanupTimeout(
          glossary.terms.length + glossary.characters.length
        ),
      }
    );

    if (!response.data.choices || response.data.choices.length === 0) {
      throw new Error("No response from glossary cleanup service");
    }

    const content = response.data.choices[0].message.content;

    if (!content) {
      throw new Error("Empty response from glossary cleanup service");
    }

    try {
      const parsedResponse = JSON.parse(content) as {
        cleaned_terms: GlossaryTerm[];
        cleaned_characters: GlossaryCharacter[];
      };

      if (
        !Array.isArray(parsedResponse.cleaned_terms) ||
        !Array.isArray(parsedResponse.cleaned_characters)
      ) {
        throw new Error("Invalid glossary cleanup response format");
      }

      return parsedResponse;
    } catch (parseError) {
      console.error("Failed to parse glossary cleanup response:", parseError);
      console.error("Raw response:", content);
      throw new Error(
        "Invalid glossary cleanup response format. Please try again."
      );
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error(
          "Invalid API key. Please check your OpenAI API key in settings."
        );
      } else if (error.response?.status === 429) {
        throw new Error(
          "Rate limit exceeded. Please wait a moment and try again."
        );
      } else if (error.response?.status === 400) {
        throw new Error(
          "Invalid request. Please check your API key and try again."
        );
      } else if (error.code === "ECONNABORTED") {
        throw new Error("Request timeout. Please try again.");
      } else {
        throw new Error(`Glossary cleanup failed: ${error.message}`);
      }
    } else if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("An unexpected error occurred during glossary cleanup");
    }
  }
};
