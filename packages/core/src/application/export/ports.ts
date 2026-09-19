import type { ExportFormat } from "./document";

export type ExportAuthority =
  | Readonly<{ kind: "account"; accountId: string; sessionHash: string }>
  | Readonly<{
      kind: "link";
      tokenHash: string;
      browserHash: string;
      linkGeneration: number;
      grantEpoch: number;
    }>;

export type ExportFile = Readonly<{
  filename: string;
  mime: string;
  bytes: number;
  sha256: string;
  externalIdentity: string;
}>;

export interface ExportLifetime {
  start(id: string, remainingMs: number): void;
  ids(): readonly string[];
  generation<T>(
    id: string,
    work: (signal: AbortSignal) => Promise<T>,
  ): Promise<T>;
  delivery<T>(
    id: string,
    work: (signal: AbortSignal) => Promise<T>,
  ): Promise<T>;
  cancel(id: string): void;
  release(id: string): void;
  stop(): Promise<void>;
}

export type ExportOperation = Readonly<{
  id: string;
  noteId: string;
  authority: ExportAuthority;
  format: ExportFormat;
  sourceIdentity: string;
  key: string;
  reservedBytes: number;
  createdAt: Date;
  expiresAt: Date;
  generation: number;
  nextCleanupAt: Date;
  cleanupToken: string | null;
  cleanupUntil: Date | null;
}> &
  (
    | Readonly<{ state: "preparing"; file: null }>
    | Readonly<{ state: "ready" | "sending"; file: ExportFile }>
    | Readonly<{ state: "cleanup"; file: ExportFile | null }>
  );

export interface ExportOperationRepository {
  find(id: string): Promise<ExportOperation | null>;
  begin(operation: ExportOperation, diskLimit: number): Promise<void>;
  reserve(id: string, bytes: number, diskLimit: number): Promise<void>;
  ready(id: string, file: ExportFile, now: Date): Promise<boolean>;
  claimSend(id: string, now: Date): Promise<boolean>;
  retire(id: string, now: Date): Promise<void>;
  recover(now: Date): Promise<void>;
  claimCleanup(
    now: Date,
    token: string,
    until: Date,
  ): Promise<ExportOperation | null>;
  finishCleanup(
    id: string,
    token: string,
    deleteToken: string,
  ): Promise<boolean>;
  deferCleanup(id: string, token: string, now: Date): Promise<void>;
  reserveDownload(
    noteId: string,
    browserHash: string,
    now: Date,
  ): Promise<Date | null>;
  pruneRates(now: Date): Promise<void>;
}
