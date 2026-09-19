import type {
  WorkspaceDeletionIntent,
  WorkspaceDeletionReceipt,
  WorkspaceDeletionResult,
} from "../deletion";

export type WorkspaceDeletionResource = Readonly<{
  kind: "media-upload" | "import-upload" | "asset" | "companion";
  id: string;
  keys: readonly string[];
}>;

/** Recovery authority is bound to the durable deleted workspace, never to a caller-supplied scope. */
export interface WorkspaceDeletionRepository {
  receipt(
    accountId: string,
    requestId: string,
    since: Date,
  ): Promise<WorkspaceDeletionReceipt | null>;
  result(receipt: WorkspaceDeletionReceipt): Promise<WorkspaceDeletionResult>;
  page(
    accountId: string,
    since: Date,
    before: Readonly<{ at: Date; requestId: string }> | undefined,
    limit: number,
  ): Promise<readonly WorkspaceDeletionReceipt[]>;
  accept(
    input: Readonly<{
      id: string;
      workspaceId: string;
      accountId: string;
      requestId: string;
      name: string;
      now: Date;
    }>,
  ): Promise<void>;
  find(id: string): Promise<WorkspaceDeletionIntent | null>;
  claim(
    now: Date,
    token: string,
    until: Date,
  ): Promise<WorkspaceDeletionIntent | null>;
  ownsNote(intentId: string, noteId: string): Promise<boolean>;
  noteCandidates(
    id: string,
    token: string,
    now: Date,
    limit: number,
  ): Promise<readonly string[]>;
  linkNote(
    intentId: string,
    noteId: string,
    purgeId: string,
    completedAt: Date | null,
  ): Promise<void>;
  advance(
    id: string,
    token: string,
    cursor: string | null,
    exhausted: boolean,
    now: Date,
  ): Promise<boolean>;
  resources(
    id: string,
    token: string,
    now: Date,
    limit: number,
  ): Promise<readonly WorkspaceDeletionResource[]>;
  resourceReady(
    id: string,
    token: string,
    resource: WorkspaceDeletionResource,
    now: Date,
  ): Promise<boolean>;
  completeResource(
    id: string,
    token: string,
    resource: WorkspaceDeletionResource,
    deleted: readonly Readonly<{ key: string; token: string }>[],
    now: Date,
  ): Promise<boolean>;
  finishStep(
    id: string,
    token: string,
    now: Date,
    limit: number,
  ): Promise<boolean>;
  defer(
    id: string,
    token: string,
    now: Date,
    failure: string | null,
    immediate: boolean,
  ): Promise<void>;
  pruneReceipts(before: Date, limit: number): Promise<void>;
}
