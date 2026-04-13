declare module "scribe.js-ocr" {
  interface ScribeOptions {
    skipRecPDFTextNative?: boolean;
    skipRecPDFTextOCR?: boolean;
  }

  interface ScribeExportResult {
    text?: string;
    hocr?: string;
    [key: string]: unknown;
  }

  function extractText(
    files: string[],
    langs?: string[],
    outputFormat?: string,
    options?: ScribeOptions,
  ): Promise<string>;

  const scribe: {
    extractText: typeof extractText;
    init: (params?: {
      pdf?: boolean;
      ocr?: boolean;
      font?: boolean;
      ocrParams?: Record<string, unknown>;
    }) => Promise<void>;
    terminate: () => Promise<void>;
    clear: () => Promise<void>;
  };

  export default scribe;
  export { extractText };
}
