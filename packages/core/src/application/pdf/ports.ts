import type {
  PdfArtifact,
  PdfComputation,
  PdfDelivery,
  PdfFile,
  PdfRequest,
} from "@repo/core/domain/pdf/entity";
import type { PdfDocumentPlan } from "./document";

export type PdfHistoryCursor = Readonly<{ createdAt: Date; id: string }>;

export interface PdfRequestRepository {
  find(id: string): Promise<PdfRequest | null>;
  findCommand(accountId: string, commandId: string): Promise<PdfRequest | null>;
  insert(request: PdfRequest): Promise<void>;
  list(
    accountId: string,
    before: PdfHistoryCursor | null,
    now: Date,
  ): Promise<readonly PdfRequest[]>;
  summary(
    accountId: string,
    now: Date,
  ): Promise<
    Readonly<{
      activeCount: number;
      representative: Readonly<{ id: string; title: string }> | null;
    }>
  >;
  activePage(
    accountId: string,
    after: string | null,
    now: Date,
  ): Promise<readonly Readonly<{ id: string; version: number }>[]>;
  watched(
    accountId: string,
    ids: readonly string[],
    now: Date,
  ): Promise<readonly PdfRequest[]>;
  demand(computeId: string, now: Date): Promise<readonly PdfRequest[]>;
  running(computeId: string, now: Date): Promise<void>;
  succeed(computeId: string, artifactId: string, now: Date): Promise<number>;
  fail(computeId: string, failure: string, now: Date): Promise<void>;
  cancel(id: string, accountId: string, now: Date): Promise<boolean>;
  cancelNote(noteId: string, now: Date): Promise<void>;
  cancelWorkspaceMember(
    workspaceId: string,
    accountId: string,
    now: Date,
  ): Promise<void>;
  prune(now: Date): Promise<void>;
}

export interface PdfComputationRepository {
  unfinished(): Promise<readonly PdfComputation[]>;
  find(id: string): Promise<PdfComputation | null>;
  active(noteId: string): Promise<PdfComputation | null>;
  begin(compute: PdfComputation, diskLimit: number): Promise<void>;
  claim(now: Date, token: string, until: Date): Promise<PdfComputation | null>;
  reserve(
    id: string,
    token: string,
    bytes: number,
    diskLimit: number,
  ): Promise<boolean>;
  renew(id: string, token: string, now: Date, until: Date): Promise<boolean>;
  stop(id: string, now: Date): Promise<void>;
  closed(id: string, token: string, now: Date): Promise<boolean>;
  recover(now: Date): Promise<void>;
  claimCleanup(
    now: Date,
    token: string,
    until: Date,
  ): Promise<PdfComputation | null>;
  cleaned(id: string, token: string): Promise<boolean>;
  deferCleanup(
    id: string,
    token: string,
    actualBytes: number,
    now: Date,
  ): Promise<void>;
}

export interface PdfArtifactRepository {
  find(id: string): Promise<PdfArtifact | null>;
  cached(
    noteId: string,
    identity: string,
    profile: string,
    now: Date,
  ): Promise<PdfArtifact | null>;
  begin(artifact: PdfArtifact, diskLimit: number): Promise<void>;
  publish(
    id: string,
    generation: number,
    computeToken: string,
    file: PdfFile,
    now: Date,
  ): Promise<boolean>;
  retire(id: string, now: Date): Promise<void>;
  claimCleanup(
    now: Date,
    token: string,
    until: Date,
  ): Promise<PdfArtifact | null>;
  cleaned(id: string, token: string, deleteToken: string): Promise<boolean>;
  deferCleanup(id: string, token: string, now: Date): Promise<void>;
}

export interface PdfDeliveryRepository {
  find(id: string): Promise<PdfDelivery | null>;
  begin(delivery: PdfDelivery, now: Date): Promise<void>;
  claim(
    id: string,
    accountId: string,
    token: string,
    runtimeId: string,
    now: Date,
  ): Promise<PdfDelivery | null>;
  close(id: string, token: string | null): Promise<boolean>;
  expireReady(now: Date): Promise<void>;
  recover(now: Date): Promise<void>;
}

export type PdfSource = Readonly<{
  id: string;
  mime: string;
  bytes: number;
}> &
  (
    | Readonly<{ kind: "stored"; key: string; sha256: string }>
    | Readonly<{ kind: "inline"; data: Uint8Array }>
  );

export interface PdfBinarySourceReader {
  read(source: PdfSource, signal: AbortSignal): AsyncIterable<Uint8Array>;
}

export type PdfRenderInput = Readonly<{
  computeId: string;
  generation: number;
  workspaceId: string;
  deadlineAt: Date;
  plan: PdfDocumentPlan;
  sources: readonly PdfSource[];
}>;

export type PdfRenderedFile = PdfFile & Readonly<{ workspaceId: string }>;

export interface PdfWorkspace {
  reservation(input: PdfRenderInput): number;
  writePack(
    input: PdfRenderInput,
    reader: PdfBinarySourceReader,
    signal: AbortSignal,
  ): Promise<void>;
  readOutput(
    file: PdfRenderedFile,
    signal: AbortSignal,
  ): AsyncIterable<Uint8Array>;
  remove(id: string): Promise<boolean>;
  bytes(id: string): Promise<number>;
}

export interface PdfSupervisor {
  readonly profile: string;
  recover(): Promise<void>;
  render(input: PdfRenderInput, signal: AbortSignal): Promise<PdfRenderedFile>;
  stop(): Promise<void>;
}

export type PdfCapacity = Readonly<{
  diskBytes: number;
  outputBytes: number;
  nativeTempBytes: number;
  finalCopyBytes: number;
  totalMs: number;
  renderMs: number;
  termGraceMs: number;
  leaseMs: number;
  cleanupDelayMs: number;
}>;

export interface PdfExecution {
  start(
    id: string,
    deadlineAt: Date,
    work: (signal: AbortSignal) => Promise<void>,
  ): boolean;
  active(id: string): boolean;
  cancel(id: string): void;
  stop(): Promise<void>;
}

export type PdfTransferRef = Readonly<{
  kind: "account" | "anonymous";
  id: string;
}>;
export interface PdfTransfers {
  readonly runtimeId: string;
  hold(ref: PdfTransferRef, expiresAt: Date): AbortSignal;
  ids(): readonly PdfTransferRef[];
  release(ref: PdfTransferRef): void;
  cancel(ref: PdfTransferRef): void;
  stop(): Promise<void>;
}
