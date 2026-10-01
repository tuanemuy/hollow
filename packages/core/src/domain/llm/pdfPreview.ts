import { BusinessRuleError } from "../error";
import type {
  SourceAccess,
  SourceInputReceipt,
  SourceMemoryBytes,
} from "../regeneration/source";
import type { LlmFailure, LlmOwnership, LlmSourceIdentity } from "./entity";

export const PDF_LLM_LIMITS = {
  pages: 32,
  dimension: 1728,
  pageBytes: 4 * 1024 * 1024,
  totalBytes: 64 * 1024 * 1024,
  requestBytes: 6 * 1024 * 1024,
  pageMs: 10_000,
  prepareMs: 120_000,
  previewMs: 300_000,
  receiptMs: 600_000,
  receipts: 100,
  manifestBytes: 64 * 1024,
} as const;

export const PDF_PAGE_POLICY = "display-crop-white-144dpi-v1";
export const PDF_PAGE_RENDERER = "pdfjs-6.3.289-canvas-1.0.8-v1";

export type PdfPageIdentity = Readonly<{
  ordinal: number;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
}>;
export type PdfPageManifest = Readonly<{
  kind: "pdf-pages";
  preparationVersion: 4;
  source: LlmSourceIdentity<"pdf">;
  policy: typeof PDF_PAGE_POLICY;
  renderer: typeof PDF_PAGE_RENDERER;
  total: number;
  pages: readonly PdfPageIdentity[];
  sha256: string;
}>;
export type PdfChoice =
  | Readonly<{
      kind: "strict-text";
      preparationVersion: 2;
      promptVersion: 1;
      modelKind: "chat-text";
      preparedDocumentHash: string;
      pages: number;
      policy: "strict-text-v1";
    }>
  | Readonly<{
      kind: "pages";
      preparationVersion: 4;
      promptVersion: 3;
      modelKind: "chat-image";
      manifest: PdfPageManifest;
      reason: "VISUAL_CONTENT" | "ORDER_UNPROVEN";
    }>;
export type PdfCandidateModels = Readonly<{
  settingsVersion: number;
  textModelId: string;
  imageModelId: string;
}>;
export type PdfSourceBinding = Readonly<{
  source: LlmSourceIdentity<"pdf">;
  accountId: string;
  noteId: string;
  noteVersion: number;
  ownershipGeneration: number;
  credentialEpoch: number;
}>;
export type PdfClassificationFailure = Extract<
  LlmFailure,
  | "LLM_DOCUMENT_CORRUPT"
  | "LLM_DOCUMENT_ENCRYPTED"
  | "LLM_DOCUMENT_UNSUPPORTED"
  | "LLM_DOCUMENT_NO_TEXT"
  | "LLM_RESOURCE_LIMIT"
  | "LLM_TIMEOUT"
  | "LLM_SOURCE_CHANGED"
  | "LLM_UNAVAILABLE"
>;
type ClosedOwner = Extract<LlmOwnership, { state: "closed" }>;
type IdleOwner = Extract<LlmOwnership, { state: "idle" }>;
type WorkingOwner = Readonly<{
  state: "active";
  runtimeId: string;
  token: string;
}>;
type UnknownOwner = Readonly<{
  state: "unknown";
  runtimeId: string;
  token: string;
}>;
export type PdfPreview = PdfSourceBinding &
  Readonly<{
    access: SourceAccess;
    sourceMemoryBytes: SourceMemoryBytes;
    inputReceipt: SourceInputReceipt | null;
    id: string;
    commandId: string;
    requestDigest: string;
    createdAt: Date;
    expiresAt: Date;
    updatedAt: Date;
    cancelGeneration: number;
    version: number;
  }> &
  (
    | Readonly<{ state: "queued"; owner: IdleOwner }>
    | Readonly<{ state: "running"; owner: WorkingOwner }>
    | Readonly<{ state: "ready"; owner: ClosedOwner; result: PdfChoice }>
    | Readonly<{ state: "consumed"; owner: ClosedOwner; jobId: string }>
    | Readonly<{
        state: "failed";
        owner: IdleOwner | ClosedOwner;
        code: PdfClassificationFailure;
      }>
    | Readonly<{
        state: "cancelled" | "expired";
        owner: IdleOwner | ClosedOwner;
      }>
    | Readonly<{ state: "unknown"; owner: UnknownOwner }>
  );

function invalid(): never {
  throw new BusinessRuleError(
    "LLM_SOURCE_INVALID",
    "PDFの準備情報が不正です。",
  );
}
function record(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function integer(
  value: unknown,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= min &&
    value <= max
  );
}
function hash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}
export function pdfSourceIdentity(value: unknown): LlmSourceIdentity<"pdf"> {
  if (
    !record(value) ||
    value.kind !== "original" ||
    value.format !== "pdf" ||
    typeof value.originalId !== "string" ||
    !value.originalId.length ||
    !hash(value.sha256) ||
    !integer(value.bytes, 1, 50 * 1024 * 1024)
  )
    invalid();
  return {
    kind: "original",
    format: "pdf",
    originalId: value.originalId,
    sha256: value.sha256,
    bytes: value.bytes,
  };
}
export function pdfPageManifest(value: unknown): PdfPageManifest {
  if (
    !record(value) ||
    value.kind !== "pdf-pages" ||
    value.preparationVersion !== 4 ||
    value.policy !== PDF_PAGE_POLICY ||
    value.renderer !== PDF_PAGE_RENDERER ||
    !integer(value.total, 1, PDF_LLM_LIMITS.pages) ||
    !hash(value.sha256) ||
    !Array.isArray(value.pages) ||
    value.pages.length !== value.total
  )
    invalid();
  const source = pdfSourceIdentity(value.source);
  let totalBytes = 0;
  const pages = value.pages.map((page: unknown, ordinal): PdfPageIdentity => {
    if (
      !record(page) ||
      page.ordinal !== ordinal ||
      !integer(page.width, 1, PDF_LLM_LIMITS.dimension) ||
      !integer(page.height, 1, PDF_LLM_LIMITS.dimension) ||
      !integer(page.bytes, 1, PDF_LLM_LIMITS.pageBytes) ||
      !hash(page.sha256)
    )
      invalid();
    totalBytes += page.bytes;
    return {
      ordinal,
      width: page.width,
      height: page.height,
      bytes: page.bytes,
      sha256: page.sha256,
    };
  });
  if (totalBytes > PDF_LLM_LIMITS.totalBytes) invalid();
  return {
    kind: "pdf-pages",
    preparationVersion: 4,
    source,
    policy: PDF_PAGE_POLICY,
    renderer: PDF_PAGE_RENDERER,
    total: value.total,
    pages,
    sha256: value.sha256,
  };
}
export function pdfChoice(value: unknown): PdfChoice {
  if (!record(value)) invalid();
  if (
    value.kind === "strict-text" &&
    value.preparationVersion === 2 &&
    value.promptVersion === 1 &&
    value.modelKind === "chat-text" &&
    value.policy === "strict-text-v1" &&
    hash(value.preparedDocumentHash) &&
    integer(value.pages, 1, 200)
  )
    return {
      kind: "strict-text",
      preparationVersion: 2,
      promptVersion: 1,
      modelKind: "chat-text",
      preparedDocumentHash: value.preparedDocumentHash,
      pages: value.pages,
      policy: "strict-text-v1",
    };
  if (
    value.kind === "pages" &&
    value.preparationVersion === 4 &&
    value.promptVersion === 3 &&
    value.modelKind === "chat-image" &&
    (value.reason === "VISUAL_CONTENT" || value.reason === "ORDER_UNPROVEN")
  )
    return {
      kind: "pages",
      preparationVersion: 4,
      promptVersion: 3,
      modelKind: "chat-image",
      manifest: pdfPageManifest(value.manifest),
      reason: value.reason,
    };
  return invalid();
}
export function pdfChoiceMatchesSource(
  choice: PdfChoice,
  source: LlmSourceIdentity,
): boolean {
  if (source.format !== "pdf") return false;
  if (choice.kind === "strict-text") return true;
  const expected = choice.manifest.source;
  return (
    source.originalId === expected.originalId &&
    source.sha256 === expected.sha256 &&
    source.bytes === expected.bytes
  );
}

export interface PdfPreviewRepository {
  insert(value: PdfPreview & { state: "queued" }): Promise<void>;
  find(id: string): Promise<PdfPreview | null>;
  command(accountId: string, commandId: string): Promise<PdfPreview | null>;
  liveForNote(noteId: string): Promise<PdfPreview | null>;
  liveForAccount(accountId: string): Promise<PdfPreview | null>;
  sourceGeneration(noteId: string): Promise<number | null>;
  replace(value: PdfPreview, expectedVersion: number): Promise<boolean>;
  claim(
    now: Date,
    runtimeId: string,
    ownerToken: string,
  ): Promise<PdfPreview | null>;
  owned(runtimeId: string): Promise<readonly PdfPreview[]>;
  consume(
    id: string,
    expectedVersion: number,
    jobId: string,
    now: Date,
  ): Promise<boolean>;
  cancelNote(noteId: string, now: Date): Promise<number>;
  cancelAccount(
    accountId: string,
    credentialEpoch: number,
    now: Date,
  ): Promise<number>;
  cancelScopeActor(
    workspaceId: string,
    accountId: string,
    now: Date,
  ): Promise<number>;
  receipts(accountId: string): Promise<number>;
  sweepable(now: Date, limit: number): Promise<readonly PdfPreview[]>;
  prune(before: Date, limit: number): Promise<number>;
}
