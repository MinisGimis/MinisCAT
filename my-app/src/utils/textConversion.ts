import pinyinDefault from "pinyin";
import { Converter } from "opencc-js";
import { LineWithPinyin } from "../types";

const toSimplified = new Converter({ from: "t", to: "cn" });
const toTraditional = new Converter({ from: "cn", to: "t" });

export const convertToSimplified = (text: string): string => {
  // @ts-ignore
  return toSimplified(text);
};

export const convertToTraditional = (text: string): string => {
  // @ts-ignore
  return toTraditional(text);
};

export const getPinyin = (text: string): string[][] => {
  if (!text || typeof text !== "string") {
    return [];
  }

  return pinyinDefault(text, {
    style: pinyinDefault.STYLE_TONE,
    segment: true,
    heteronym: false,
  });
};

export const segmentLineForPinyin = (line: string): LineWithPinyin => {
  const pinyinResult = getPinyin(line);
  return {
    text: line,
    pinyin: pinyinResult,
  };
};
