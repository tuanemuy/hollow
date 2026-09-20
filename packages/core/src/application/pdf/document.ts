export type PdfMediaSlot = Readonly<{
  id: string;
  url: string;
  mime: string;
  bytes: number;
}>;

export type PdfDocumentInput = Readonly<{
  noteId: string;
  title: string;
  html: string;
  style: "default" | "original";
  defaultCss: string;
  appUrl: string;
  media: readonly PdfMediaSlot[];
}>;

export type PdfDocumentSegment =
  | Readonly<{ kind: "text"; value: string }>
  | Readonly<{ kind: "media"; id: string }>;

export type PdfDocumentPlan = Readonly<{
  profile: string;
  filename: string;
  segments: readonly PdfDocumentSegment[];
  mediaIds: readonly string[];
  notices: readonly string[];
}>;

export interface PdfDocumentWriter {
  plan(input: PdfDocumentInput, signal: AbortSignal): Promise<PdfDocumentPlan>;
}

export const PDF_DOCUMENT_PROFILE = "hollow-pdf-document-v1";
