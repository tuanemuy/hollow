export type ExportFormat = "html" | "markdown";

export type ExportMediaSlot = Readonly<{
  id: string;
  url: string;
  mime: string;
  bytes: number;
}>;

export type ExportDocumentInput = Readonly<{
  noteId: string;
  title: string;
  html: string;
  style: "default" | "original";
  defaultCss: string;
  appUrl: string;
  format: ExportFormat;
  media: readonly ExportMediaSlot[];
  external: Readonly<{
    images: readonly string[];
    media: readonly string[];
    backgrounds: readonly string[];
    fonts: readonly string[];
  }>;
}>;

export type ExportSegment =
  | Readonly<{ kind: "text"; value: string }>
  | Readonly<{ kind: "media"; id: string }>;

export type ExportDocumentPlan = Readonly<{
  profile: string;
  filename: string;
  mime: string;
  segments: readonly ExportSegment[];
  maxBytes: number;
  notices: readonly string[];
}>;

/** Plans a bounded source AST; media segments contain no materialized base64. */
export interface ExportDocumentWriter {
  plan(
    input: ExportDocumentInput,
    signal: AbortSignal,
  ): Promise<ExportDocumentPlan>;
}
export const EXPORT_DOCUMENT_PROFILE = "hollow-export-document-v2";
