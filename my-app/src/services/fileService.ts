import { ChapterContents } from '../types';

export const extractChapters = (content: string, chapterRegex: string): ChapterContents[] => {
    const regex = new RegExp(chapterRegex, 'gm');
    const chapterPositions: number[] = [];

    let match;
    while ((match = regex.exec(content)) !== null) {
        if (match.index !== undefined) {
            chapterPositions.push(match.index);
        }
    }

    if (chapterPositions.length === 0) {
        return [['Chapter 1', content.trim()]];
    }

    const chapters: ChapterContents[] = [];
    for (let i = 0; i < chapterPositions.length; i++) {
        const startPos = chapterPositions[i];
        const endPos = i < chapterPositions.length - 1 ? chapterPositions[i + 1] : content.length;

        const chapterContent = content.substring(startPos, endPos).trim();

        const cleanedContent = chapterContent
            .split('\n')
            .filter(line => line.trim().length > 0)
            .join('\n');

        const lines = chapterContent.split('\n');
        let title = `Chapter ${i + 1}`;

        if (lines.length > 0) {
            const firstLine = lines[0].trim();
            if (firstLine.length > 0) {
                title = firstLine;
            }
        }

        const contentLines = cleanedContent.split('\n').filter(line => line.trim().length > 0);
        chapters.push([title, ...contentLines]);
    }

    return chapters;
};

export const extractChaptersFallback = (content: string): ChapterContents[] => {
    return [['Chapter 1', content.trim()]];
}; 