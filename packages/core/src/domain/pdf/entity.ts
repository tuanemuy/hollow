export const PDF_ARTIFACT_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const PDF_HISTORY_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000;

export type PdfRequest = Readonly<{
  id: string;
  accountId: string;
  commandId: string;
  inputDigest: string;
  targetNoteId: string;
  liveNoteId: string | null;
  title: string;
  sourceIdentity: string;
  style: "default" | "original";
  computeId: string | null;
  retryOf: string | null;
  createdAt: Date;
  historyExpiresAt: Date;
  updatedAt: Date;
  version: number;
}> &
  (
    | Readonly<{
        state: "queued" | "running";
        artifactId: null;
        failure: null;
      }>
    | Readonly<{
        state: "succeeded";
        artifactId: string;
        failure: null;
      }>
    | Readonly<{
        state: "failed";
        artifactId: null;
        failure: string;
      }>
    | Readonly<{
        state: "cancelled";
        artifactId: null;
        failure: null;
      }>
  );

export type PdfComputation = Readonly<{
  id: string;
  targetNoteId: string;
  sourceIdentity: string;
  profile: string;
  generation: number;
  deadlineAt: Date;
  workspaceId: string;
  reservedBytes: number;
  nextCleanupAt: Date;
  cleanupToken: string | null;
  cleanupUntil: Date | null;
  createdAt: Date;
}> &
  (
    | Readonly<{
        state: "queued";
        liveNoteId: string;
        leaseToken: null;
        leaseUntil: null;
        workspaceRemoved: false;
      }>
    | Readonly<{
        state: "running" | "stopping";
        liveNoteId: string;
        leaseToken: string;
        leaseUntil: Date;
        workspaceRemoved: false;
      }>
    | Readonly<{
        state: "closed";
        liveNoteId: string | null;
        leaseToken: null;
        leaseUntil: null;
        workspaceRemoved: boolean;
      }>
  );

export type PdfFile = Readonly<{
  filename: string;
  bytes: number;
  sha256: string;
}>;

export type PdfArtifact = Readonly<{
  id: string;
  targetNoteId: string;
  computeId: string;
  sourceIdentity: string;
  profile: string;
  generation: number;
  reservedBytes: number;
  createdAt: Date;
  nextCleanupAt: Date;
  cleanupToken: string | null;
  cleanupUntil: Date | null;
}> &
  (
    | Readonly<{
        state: "writing";
        liveNoteId: string;
        key: string;
        file: null;
        publishedAt: null;
        expiresAt: null;
      }>
    | Readonly<{
        state: "ready";
        liveNoteId: string;
        key: string;
        file: PdfFile;
        publishedAt: Date;
        expiresAt: Date;
      }>
    | Readonly<{
        state: "cleanup";
        liveNoteId: string;
        key: string;
        file: PdfFile | null;
        publishedAt: Date | null;
        expiresAt: Date | null;
      }>
    | Readonly<{
        state: "removed";
        liveNoteId: string | null;
        key: null;
        file: null;
        publishedAt: Date | null;
        expiresAt: Date | null;
      }>
  );

export type PdfDelivery = Readonly<{
  id: string;
  requestId: string;
  artifactId: string;
  accountId: string;
  generation: number;
  createdAt: Date;
  expiresAt: Date;
  nextCleanupAt: Date;
}> &
  (
    | Readonly<{ state: "ready"; claimToken: null; runtimeId: null }>
    | Readonly<{
        state: "sending" | "closing";
        claimToken: string;
        runtimeId: string;
      }>
    | Readonly<{ state: "closed"; claimToken: null; runtimeId: null }>
  );
