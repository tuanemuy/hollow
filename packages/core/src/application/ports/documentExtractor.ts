import type { ImportFormat } from "@repo/core/domain/import/entity";

export type { ImportFormat } from "@repo/core/domain/import/entity";
export type ExtractionNotice = Readonly<{
  code: string;
  location: string;
  message: string;
}>;
export type Extraction = Readonly<{
  html: string;
  coverage: "complete" | "partial" | "no_text";
  notices: readonly ExtractionNotice[];
}>;
export interface DocumentExtractor {
  extract(input: {
    bytes: Uint8Array;
    format: ImportFormat;
  }): Promise<Extraction>;
}
