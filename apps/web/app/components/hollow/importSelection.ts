import { uiTerms } from "@/presentation/uiTerms";
export const IMPORT_ACCEPT =
  ".html,.htm,.md,.markdown,.txt,.docx,.xlsx,.pptx,.pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp4,.webm,.css,.wav,.mp3,.m4a,.ogg,.flac";
const supported = new Set(IMPORT_ACCEPT.split(","));
const audio = new Set([".wav", ".mp3", ".m4a", ".ogg", ".flac"]);
const images = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const extension = (name: string) =>
  name.includes(".") ? `.${name.split(".").at(-1)?.toLowerCase()}` : "";
export const isSupportedImport = (name: string) =>
  supported.has(extension(name));
export const isAudioImport = (name: string) => audio.has(extension(name));
export const isStylesheetImport = (name: string) => extension(name) === ".css";
export const requiresCompanion = (name: string) =>
  /\.(css|svg|mp4|webm)$/i.test(name);
export const defaultImportRole = (name: string): "note" | "companion" =>
  isStylesheetImport(name) ? "companion" : "note";
const sourcePaths = new WeakMap<File, string>();
export const importSourcePath = (file: File) =>
  sourcePaths.get(file) || file.webkitRelativePath || file.name;
export const canBeCompanion = (name: string) =>
  /\.(css|png|jpe?g|gif|webp|svg|mp4|webm)$/i.test(name);

export function importEstimate(name: string, useAi: boolean) {
  const ext = extension(name);
  const needsAi = audio.has(ext) || images.has(ext);
  const pdf = ext === ".pdf";
  return {
    format: audio.has(ext)
      ? "音声"
      : images.has(ext)
        ? "画像"
        : [".md", ".markdown"].includes(ext)
          ? "Markdown"
          : ext === ".txt"
            ? "テキスト"
            : [".html", ".htm"].includes(ext)
              ? "HTML"
              : ext.slice(1).toUpperCase(),
    method: needsAi
      ? useAi
        ? images.has(ext)
          ? "有効な連携・構成があれば静止画像検査後にAI、未連携は原本を保存"
          : "有効な連携・構成があれば文字起こし後に本文を構造化、未連携は原本を保存"
        : `${uiTerms.llm}不使用では失敗`
      : useAi && [".txt", ".docx", ".xlsx", ".pptx", ".pdf"].includes(ext)
        ? ext === ".txt"
          ? "有効な連携・構成があればAI、それ以外は機械"
          : pdf
            ? "有効な連携・構成があれば全頁検査で文字用・画像用を確定してAI、それ以外は機械"
            : "有効な連携・構成があれば全文検査後にAI、それ以外は機械"
        : pdf
          ? "機械文字抽出（文字なしは失敗・原本保持）"
          : "機械変換",
    needsAi,
    pdf,
  };
}

export function validateSelectedFiles(files: readonly File[]) {
  if (files.length > 100)
    throw new Error("一度に選べるファイルは100件までです。");
  if (files.reduce((sum, file) => sum + file.size, 0) > 500 * 1024 * 1024)
    throw new Error("合計500 MB以内で選択してください。");
  if (
    files.some(
      (file) =>
        !file.size ||
        file.size > (isAudioImport(file.name) ? 200 : 50) * 1024 * 1024,
    )
  )
    throw new Error(
      "音声は200 MB、その他は50 MBまでです。空ファイルは取り込めません。",
    );
}

export type ImportEntry =
  | { kind: "file"; read: () => Promise<File> }
  | { kind: "directory"; readBatch: () => Promise<readonly ImportEntry[]> };

export async function collectEntryFiles(
  entries: readonly ImportEntry[],
  limits = { depth: 32, entries: 10000 },
) {
  const files: File[] = [];
  let excluded = 0;
  let visited = 0;
  async function visit(entry: ImportEntry, depth: number): Promise<void> {
    if (++visited > limits.entries || depth > limits.depth)
      throw new Error(
        "フォルダの階層または項目数が上限を超えています。小さなフォルダに分けて選択してください。",
      );
    if (entry.kind === "file") {
      const file = await entry.read();
      if (!isSupportedImport(file.name)) {
        excluded++;
        return;
      }
      files.push(file);
      validateSelectedFiles(files);
      return;
    }
    for (;;) {
      const batch = await entry.readBatch();
      if (!batch.length) break;
      for (const child of batch) await visit(child, depth + 1);
    }
  }
  for (const entry of entries) await visit(entry, 0);
  return { files, excluded };
}

function browserEntry(entry: FileSystemEntry): ImportEntry {
  if (entry.isFile)
    return {
      kind: "file",
      read: () =>
        new Promise((resolve, reject) =>
          (entry as FileSystemFileEntry).file((file) => {
            sourcePaths.set(file, entry.fullPath.replace(/^\//, ""));
            resolve(file);
          }, reject),
        ),
    };
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  return {
    kind: "directory",
    readBatch: () =>
      new Promise((resolve, reject) =>
        reader.readEntries((batch) => resolve(batch.map(browserEntry)), reject),
      ),
  };
}

export function collectDroppedFiles(
  items: readonly DataTransferItem[],
  fallback: readonly File[],
) {
  const entries = items
    .filter((item) => item.kind === "file")
    .map((item): ImportEntry | null => {
      const entry = item.webkitGetAsEntry?.();
      if (entry) return browserEntry(entry);
      const file = item.getAsFile();
      return file ? { kind: "file", read: async () => file } : null;
    })
    .filter((entry): entry is ImportEntry => entry !== null);
  return collectEntryFiles(
    entries.length
      ? entries
      : fallback.map((file) => ({ kind: "file", read: async () => file })),
  );
}

export function jobDuration(createdAt: string, endedAt: string) {
  const seconds = Math.max(
    0,
    Math.round((Date.parse(endedAt) - Date.parse(createdAt)) / 1000),
  );
  if (!Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${seconds} 秒`;
  if (seconds < 3600)
    return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
  return `${Math.floor(seconds / 3600)} 時間 ${Math.floor((seconds % 3600) / 60)} 分`;
}
