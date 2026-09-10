import { BusinessRuleError } from "@repo/core/domain/error";

export const MEDIA_LIMITS = {
  imageBytes: 20 * 1024 * 1024,
  videoBytes: 200 * 1024 * 1024,
  draftMs: 24 * 3600_000,
  unreferencedMs: 7 * 86400_000,
} as const;
export type MediaMime =
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/webp"
  | "image/svg+xml"
  | "video/mp4"
  | "video/webm";
export type MediaDraft = Readonly<{
  workspaceId?: string | null;
  id: string;
  accountId: string;
  noteId: string | null;
  expiresAt: Date;
}>;
export type Asset = Readonly<{
  id: string;
  accountId: string;
  storageKey: string;
  bytes: number;
  sha256: string;
  mime: MediaMime;
  kind: "image" | "video";
  createdAt: Date;
  unreferencedAt: Date | null;
  committedToNote: boolean;
  state: "ready" | "deleting";
}> &
  (
    | Readonly<{ draftId: string; sourceNoteId?: null; sourceJobId?: null }>
    | Readonly<{ draftId: null; sourceNoteId: string; sourceJobId: string }>
  );
export type MediaUpload = Readonly<{
  id: string;
  draftId: string;
  accountId: string;
  name: string;
  bytes: number;
  state: "awaiting" | "uploading" | "accepted" | "failed";
  expiresAt: Date;
  storageCleaned: boolean;
}>;
export type AssetReference = Readonly<{
  scope: "notes" | "drafts";
  scopeId: string;
  assetId: string;
}>;
export const assetUrl = (reference: AssetReference) =>
  `/api/${reference.scope}/${reference.scopeId}/assets/${reference.assetId}`;
export type HistoryAssetReference = Readonly<{
  scope: "history";
  scopeId: string;
  revisionNo: number;
  assetId: string;
}>;
export const historyAssetUrl = (reference: HistoryAssetReference) =>
  `/api/notes/${reference.scopeId}/revisions/${reference.revisionNo}/assets/${reference.assetId}`;
export function parseHistoryAssetUrl(
  value: string,
): HistoryAssetReference | null {
  const m =
    /^\/api\/notes\/([a-f0-9-]{36})\/revisions\/([1-9]\d{0,15})\/assets\/([a-f0-9-]{36})$/.exec(
      value,
    );
  const revisionNo = Number(m?.[2]);
  return m?.[1] && m[3] && Number.isSafeInteger(revisionNo)
    ? { scope: "history", scopeId: m[1], revisionNo, assetId: m[3] }
    : null;
}
export function parseAssetUrl(value: string): AssetReference | null {
  const m =
    /^\/api\/(notes|drafts)\/([a-f0-9-]{36})\/assets\/([a-f0-9-]{36})$/.exec(
      value,
    );
  return m?.[2] && m[3]
    ? { scope: m[1] as "notes" | "drafts", scopeId: m[2], assetId: m[3] }
    : null;
}
export function validateMediaUpload(name: string, bytes: number) {
  if (
    !name.trim() ||
    name.length > 255 ||
    !Number.isSafeInteger(bytes) ||
    bytes < 1 ||
    bytes > MEDIA_LIMITS.videoBytes
  )
    throw new BusinessRuleError(
      "MEDIA_SIZE",
      "画像は20 MB、動画は200 MB以内のファイルを選択してください。",
    );
}
