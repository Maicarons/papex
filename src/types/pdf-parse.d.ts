declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    text: string;
    version?: string;
  }
  function pdfParse(
    data: Buffer | Uint8Array | ArrayBuffer,
    options?: Record<string, unknown>,
  ): Promise<PdfParseResult>;
  export default pdfParse;
}
