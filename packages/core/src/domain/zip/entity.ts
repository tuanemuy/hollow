export const ZIP_MAX_TARGETS = 500;
export const ZIP_MAX_PAYLOAD_BYTES = 1_000_000_000;
export const ZIP_HISTORY_MS = 90 * 24 * 60 * 60 * 1000;
export const ZIP_ARTIFACT_MS = 7 * 24 * 60 * 60 * 1000;
export const ZIP_MANIFEST_NAME = "hollow-export-report.txt";

export type ZipFormat = "html" | "markdown" | "pdf";
export type ZipOptions = Readonly<{ format: ZipFormat; style: "saved" }>;
export type ZipRunKey = Readonly<{ requestId: string; generation: number }>;
export type ZipExclusionReason =
  | "ZIP_NOTE_UNAVAILABLE"
  | "ZIP_CONTENT_CHANGED"
  | "ZIP_SOURCE_CHANGED"
  | "ZIP_CANCELLED";
export type ZipExclusion = Readonly<{
  ordinal: number;
  reason: ZipExclusionReason;
}>;
export type ZipRunResult = Readonly<{
  ordinal: number;
  attemptId: string;
  attemptNumber: number;
  origin: "attempt" | "reused";
  state: "succeeded" | "failed" | "excluded" | "cancelled";
  failure: string | null;
  source:
    | (ZipSourceIdentity & Readonly<{ bytes: number; sha256: string }>)
    | null;
}>;
export type ZipFile = Readonly<{
  bytes: number;
  sha256: string;
  filename: string;
}>;
export type ZipSourceIdentity = Readonly<{
  sourceIdentity: string;
  externalIdentity: string;
  profile: string;
}>;
export type ZipLease = Readonly<{
  token: string;
  runtimeId: string;
  until: Date;
}>;
export type ZipCleanup = Readonly<{
  nextAt: Date;
  claim: Readonly<{ token: string; until: Date }> | null;
}>;

export type ZipRequest = Readonly<{
  id: string;
  accountId: string;
  commandId: string;
  inputDigest: string;
  options: ZipOptions;
  createdAt: Date;
  historyExpiresAt: Date;
  updatedAt: Date;
  generation: number;
  cancelGeneration: number;
  retryOf: string | null;
  version: number;
  state: "active" | "assembling" | "stopping" | "terminal";
}>;

export type ZipRun = ZipRunKey &
  Readonly<{
    accountId: string;
    commandId: string;
    inputDigest: string;
    acceptedAt: Date;
    historyExpiresAt: Date;
    deadlineAt: Date;
    publishedAt: Date | null;
    artifactId: string | null;
    exclusions: readonly ZipExclusion[];
    results: readonly ZipRunResult[] | null;
    version: number;
  }> &
  (
    | Readonly<{
        state: "queued";
        lease: null;
        failure: null;
        finishedAt: null;
      }>
    | Readonly<{
        state: "running" | "assembling";
        finishedAt: null;
        lease: ZipLease;
        failure: null;
      }>
    | Readonly<{
        state: "stopping";
        finishedAt: null;
        lease: ZipLease | null;
        failure: string | null;
      }>
    | Readonly<{
        state: "succeeded" | "partial" | "cancelled";
        finishedAt: Date;
        lease: null;
        failure: null;
      }>
    | Readonly<{
        state: "failed";
        lease: null;
        failure: string;
        finishedAt: Date;
      }>
  );

export type ZipTarget = Readonly<{
  requestId: string;
  ordinal: number;
  targetNoteId: string;
  liveNoteId: string | null;
  latestAttemptNumber: number;
}>;
export type ZipAttemptResult = ZipSourceIdentity & ZipFile;
export type ZipAttempt = ZipRunKey &
  Readonly<{
    id: string;
    ordinal: number;
    attemptNumber: number;
    title: string;
    expectedIdentity: string;
    createdAt: Date;
    historyExpiresAt: Date;
    version: number;
  }> &
  (
    | Readonly<{
        state: "queued" | "running";
        result: null;
        failure: null;
      }>
    | Readonly<{
        state: "succeeded";
        result: ZipAttemptResult;
        failure: null;
      }>
    | Readonly<{
        state: "failed" | "excluded";
        result: null;
        failure: string;
      }>
    | Readonly<{ state: "cancelled"; result: null; failure: null }>
  );

export type ZipSpool = Readonly<{
  id: string;
  attemptId: string;
  format: ZipFormat;
  generation: number;
  reservedBytes: number;
  createdAt: Date;
  cleanup: ZipCleanup;
}> &
  (
    | Readonly<{ state: "writing"; key: string; result: null }>
    | Readonly<{
        state: "ready";
        key: string;
        result: ZipAttemptResult;
      }>
    | Readonly<{
        state: "cleanup";
        key: string;
        result: ZipAttemptResult | null;
      }>
    | Readonly<{ state: "removed"; key: null; result: null }>
  );
export type ZipSpoolRef = ZipRunKey &
  Readonly<{ ordinal: number; spoolId: string }> &
  (
    | Readonly<{ purpose: "active"; retryUntil: null }>
    | Readonly<{ purpose: "retry"; retryUntil: Date }>
  );

export type ZipAssembly = ZipRunKey &
  Readonly<{
    id: string;
    assemblyGeneration: number;
    ordinals: readonly number[];
    sealDigest: string;
    reservedBytes: number;
    createdAt: Date;
    cleanup: ZipCleanup;
  }> &
  (
    | Readonly<{
        state: "writing" | "closing";
        key: string;
        file: ZipFile | null;
        outcome: null | "failure" | "excluded" | "cancelled";
      }>
    | Readonly<{
        state: "closed";
        key: string | null;
        file: ZipFile | null;
        outcome: "success" | "failure" | "excluded" | "cancelled";
      }>
  );

export type ZipArtifact = Readonly<{
  id: string;
  assemblyId: string;
  generation: number;
  publishedAt: Date;
  expiresAt: Date;
  reservedBytes: number;
  cleanup: ZipCleanup;
}> &
  (
    | Readonly<{ state: "ready" | "cleanup"; key: string; file: ZipFile }>
    | Readonly<{ state: "removed"; key: null; file: null }>
  );
export type ZipArtifactEntry = ZipSourceIdentity &
  ZipFile &
  Readonly<{
    artifactId: string;
    ordinal: number;
    targetNoteId: string;
    liveNoteId: string | null;
  }>;
export type ZipDelivery = Readonly<{
  id: string;
  artifactId: string;
  artifactGeneration: number;
  accountId: string;
  createdAt: Date;
  expiresAt: Date;
}> &
  (
    | Readonly<{ state: "ready" | "closed"; claim: null }>
    | Readonly<{
        state: "sending" | "closing";
        claim: Readonly<{ token: string; runtimeId: string }>;
      }>
  );
