import { BusinessRuleError } from "../error";

export type ImportFormat =
  | "html"
  | "markdown"
  | "text"
  | "docx"
  | "xlsx"
  | "pptx"
  | "pdf"
  | "image"
  | "audio";

export const IMPORT_LIMITS = {
  count: 100,
  batchBytes: 500 * 1024 * 1024,
  fileBytes: 50 * 1024 * 1024,
  audioBytes: 200 * 1024 * 1024,
  quotaBytes: 5 * 1024 * 1024 * 1024,
} as const;
export type UploadFile = Readonly<{
  name: string;
  bytes: number;
  role?: "note" | "companion";
  path?: string;
}>;
export type ImportBatch = Readonly<{
  id: string;
  accountId: string;
  createdAt: Date;
  useAi: boolean;
  cancelledAt: Date | null;
}>;
export type UploadReservation = Readonly<{
  id: string;
  batchId: string;
  accountId: string;
  name: string;
  role?: "note" | "companion";
  sourcePath?: string;
  bytes: number;
  storageKey: string;
  state: "awaiting" | "uploading" | "accepted" | "failed" | "cancelled";
  failure: string | null;
  expiresAt: Date;
}>;
export type Original = Readonly<{
  id: string;
  noteId: string;
  accountId: string;
  name: string;
  bytes: number;
  storageKey: string;
  sha256: string;
  format: ImportFormat;
  state: "processing" | "ready" | "needs_ai" | "failed" | "cancelled";
  coverage: "complete" | "partial" | "no_text";
  activeJobId: string;
  createdAt: Date;
}>;
export type ImportNotice = Readonly<{
  code: string;
  location: string;
  message: string;
}>;

export function validateUploadBatch(files: readonly UploadFile[]): void {
  if (files.length && files.every((f) => f.role === "companion"))
    throw new BusinessRuleError(
      "COMPANION_ONLY",
      "参照用ファイルだけでは取り込めません。本文のHTMLまたはMarkdownも選択してください。",
    );
  for (const file of files) {
    if (
      file.role === "companion" &&
      (!/\.(css|png|jpe?g|gif|webp|svg|mp4|webm)$/i.test(file.name) ||
        file.bytes > IMPORT_LIMITS.fileBytes)
    )
      throw new BusinessRuleError(
        "COMPANION_FORMAT",
        "参照用はCSS・画像・MP4/WebMで、1件50 MBまでです。",
      );
    if (/\.css$/i.test(file.name) && file.role !== "companion")
      throw new BusinessRuleError(
        "COMPANION_ROLE",
        "CSSは参照用ファイルとして選択してください。",
      );
    if (file.path) normalizeSourcePath(file.path);
  }
  if (!files.length || files.length > IMPORT_LIMITS.count)
    throw new BusinessRuleError(
      "IMPORT_COUNT",
      "一度に1〜100件を選択してください。",
    );
  if (
    files.some(
      (f) =>
        !f.name.trim() ||
        f.name.length > 255 ||
        !Number.isSafeInteger(f.bytes) ||
        f.bytes <= 0 ||
        f.bytes > IMPORT_LIMITS.audioBytes,
    )
  )
    throw new BusinessRuleError(
      "IMPORT_SIZE",
      "ファイル名とサイズを確認してください。空ファイルや200 MB超は取り込めません。",
    );
  if (files.reduce((sum, f) => sum + f.bytes, 0) > IMPORT_LIMITS.batchBytes)
    throw new BusinessRuleError(
      "IMPORT_BATCH_SIZE",
      "一度に取り込める合計は500 MBまでです。",
    );
}
export function normalizeSourcePath(value: string) {
  if (value.length > 1024 || /^[/\\]|[\0\\]|^[a-z][a-z\d+.-]*:/i.test(value))
    throw new BusinessRuleError(
      "COMPANION_PATH",
      "同梱パスを確認してください。",
    );
  const parts: string[] = [];
  for (const p of value.split("/")) {
    if (!p || p === ".") continue;
    if (p === "..") {
      if (!parts.length)
        throw new BusinessRuleError(
          "COMPANION_PATH",
          "同梱フォルダの外側は参照できません。",
        );
      parts.pop();
    } else parts.push(p);
  }
  if (!parts.length)
    throw new BusinessRuleError(
      "COMPANION_PATH",
      "同梱パスを確認してください。",
    );
  return parts.join("/");
}
