declare module "opencc-js" {
  export class Converter {
    constructor(options: { from: string; to: string });
    convert(text: string): string;
  }
}

declare module "pinyin" {
  function pinyin(text: string, options?: any): string[][];
  namespace pinyin {
    const STYLE_TONE: string;
  }
  export default pinyin;
}

declare module "jszip" {
  export default class JSZip {
    folder(name: string): JSZip | null;
    file(name: string, content: string): JSZip;
    generateAsync(options: { type: string }): Promise<Blob>;
  }
}
