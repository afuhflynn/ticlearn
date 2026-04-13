declare module "scribe.js-ocr" {
  interface ScribeOptions {
    logger?: boolean;
    language?: string;
  }

  interface ExtractResult {
    text: string;
    confidence?: number;
  }

  function extractText(
    files: Uint8Array[],
    options?: ScribeOptions,
  ): Promise<string>;

  const scribe: {
    extractText: typeof extractText;
  };

  export default scribe;
  export { extractText };
}
