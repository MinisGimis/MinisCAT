import JSZip from "jszip";
import { Chapter } from "../types";

export const extractChapters = (
  content: string,
  chapterRegex: string
): Chapter[] => {
  try {
    const regex = new RegExp(chapterRegex, "gm");

    const chapterPositions: number[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      chapterPositions.push(match.index);
    }

    if (chapterPositions.length === 0) {
      return [
        {
          id: 0,
          content: content,
          title: "Chapter 1",
        },
      ];
    }

    const chapters: Chapter[] = [];
    for (let i = 0; i < chapterPositions.length; i++) {
      const startPos = chapterPositions[i];
      const endPos =
        i < chapterPositions.length - 1
          ? chapterPositions[i + 1]
          : content.length;

      const chapterContent = content.substring(startPos, endPos).trim();

      const cleanedContent = chapterContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join("\n");

      const lines = cleanedContent.split("\n");
      let title = `Chapter ${i + 1}`;

      for (const line of lines) {
        if (line.trim()) {
          title = line.trim();
          break;
        }
      }

      chapters.push({
        id: i,
        content: cleanedContent,
        title: title,
      });
    }

    return chapters;
  } catch (error) {
    return [
      {
        id: 0,
        content: content,
        title: "Chapter 1",
      },
    ];
  }
};

export const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportToTxt = (
  chapters: Chapter[],
  translations: { [key: number]: string }
): void => {
  let content = "";

  chapters.forEach((chapter, index) => {
    content += `\n\n${chapter.title}\n`;
    content += "=".repeat(chapter.title.length) + "\n\n";
    content += chapter.content + "\n\n";

    if (translations[index]) {
      content += "--- TRANSLATION ---\n\n";
      content += translations[index] + "\n\n";
    }
  });

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, "novel_translation.txt");
};

export const exportToZip = async (
  chapters: Chapter[],
  translations: { [key: number]: string }
): Promise<void> => {
  const zip = new JSZip();

  const originalFolder = zip.folder("original");
  chapters.forEach((chapter, index) => {
    originalFolder?.file(`chapter_${index + 1}.txt`, chapter.content);
  });

  const translationFolder = zip.folder("translations");
  chapters.forEach((chapter, index) => {
    if (translations[index]) {
      translationFolder?.file(`chapter_${index + 1}.txt`, translations[index]);
    }
  });

  let combinedContent = "";
  chapters.forEach((chapter, index) => {
    combinedContent += `\n\n${chapter.title}\n`;
    combinedContent += "=".repeat(chapter.title.length) + "\n\n";
    combinedContent += chapter.content + "\n\n";

    if (translations[index]) {
      combinedContent += "--- TRANSLATION ---\n\n";
      combinedContent += translations[index] + "\n\n";
    }
  });

  zip.file("combined_novel.txt", combinedContent);

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, "novel_translation.zip");
};

export const exportProgress = (
  chapters: Chapter[],
  translations: { [key: number]: string },
  glossary: any
): void => {
  const progressData = {
    chapters,
    translations,
    glossary,
    exportDate: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(progressData, null, 2)], {
    type: "application/json",
  });
  triggerDownload(blob, "translation_progress.json");
};

export const importProgress = (
  file: File
): Promise<{
  chapters: Chapter[];
  translations: { [key: number]: string };
  glossary: any;
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (error) {
        reject(new Error("Invalid progress file format"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};
