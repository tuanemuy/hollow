import { BusinessRuleError } from "@repo/core/domain/error";

export function referenceBytesAfterAcceptance(
  used: number,
  bytes: number,
  resourceCap: number,
): number {
  if (bytes > resourceCap || used + bytes > REFERENCE_LIMITS.bytes)
    throw new BusinessRuleError(
      "REFERENCE_SIZE",
      "安全化後の参照が現在の取得容量上限を超えました。",
    );
  return used + bytes;
}

export const REFERENCE_LIMITS = {
  count: 200,
  bytes: 100 * 1024 * 1024,
  cssBytes: 1024 * 1024,
  executionMs: 5 * 60_000,
  leaseMs: 60_000,
  claims: 3,
} as const;
export type ReferenceKind =
  | "image"
  | "video"
  | "stylesheet"
  | "background"
  | "font";
export type ReferenceSettings = Readonly<{
  noteId: string;
  enabled: boolean;
  activeJobId: string | null;
  bundleId: string | null;
  sourcePath: string | null;
}>;
export type ReferenceEntry = Readonly<{
  id: string;
  noteId: string;
  kind: ReferenceKind;
  url: string;
  location: string;
  current: boolean;
  state:
    | "acquired"
    | "unattempted"
    | "failed"
    | "limited"
    | "external"
    | "cancelled";
  reason: string | null;
  assetId: string | null;
  finalUrl: string | null;
  bytes: number;
  createdAt: Date;
  updatedAt: Date;
}>;
type JobBase = Readonly<{
  id: string;
  noteId: string;
  accountId: string;
  noteVersion: number;
  createdAt: Date;
  updatedAt: Date;
  attempt: number;
  retryOf: string | null;
  total: number;
  completed: number;
  cancelRequested: boolean;
}>;
export type ReferenceJob = JobBase &
  (
    | Readonly<{
        state: "queued" | "succeeded" | "cancelled";
        leaseToken: null;
        leaseUntil: null;
        failure: null;
      }>
    | Readonly<{
        state: "running";
        leaseToken: string;
        leaseUntil: Date;
        failure: null;
      }>
    | Readonly<{
        state: "failed";
        leaseToken: null;
        leaseUntil: null;
        failure: string;
      }>
  );
export type ReferenceObject = Readonly<{
  workspaceId?: string | null;
  id: string;
  jobId: string;
  accountId: string;
  bytes: number;
  state: "reserved" | "written" | "committed" | "cleaned";
  createdAt: Date;
}>;
export type Companion = Readonly<{
  id: string;
  bundleId: string;
  accountId: string;
  path: string;
  storageKey: string;
  bytes: number;
  sha256: string;
}>;
export type SourceBundle = Readonly<{
  workspaceId?: string | null;
  id: string;
  accountId: string;
  enabled: boolean;
  sealed: boolean;
  createdAt: Date;
}>;
