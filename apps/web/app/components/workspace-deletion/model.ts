import type { WorkspaceDeletionResult } from "@repo/core/domain/workspace/deletion";
import { extractSerializedError } from "@/presentation/errorResponse";

export type WorkspaceDeletionInput = Readonly<{
  workspaceId: string;
  requestId: string;
  confirmation: string;
}>;
export type PendingWorkspaceDeletion = Readonly<{
  actorId: string;
  input: WorkspaceDeletionInput;
}>;

export type PendingDeletionIdentity = Readonly<{
  actorId: string;
  workspaceId: string;
  requestId: string;
}>;
export function deletionIdentity(
  value: PendingWorkspaceDeletion,
): PendingDeletionIdentity {
  return {
    actorId: value.actorId,
    workspaceId: value.input.workspaceId,
    requestId: value.input.requestId,
  };
}
export function restoreDeletionIdentities(
  actorId: string,
  rows: readonly PendingDeletionIdentity[],
): readonly PendingWorkspaceDeletion[] {
  return rows
    .filter((row) => row.actorId === actorId)
    .map((row) => ({
      actorId,
      input: {
        workspaceId: row.workspaceId,
        requestId: row.requestId,
        confirmation: "",
      },
    }));
}

export function ownsDeletionRequest(
  request: PendingWorkspaceDeletion | null | undefined,
  actorId: string,
  workspaceId: string,
): request is PendingWorkspaceDeletion {
  return (
    request?.actorId === actorId && request.input.workspaceId === workspaceId
  );
}

export function exactDeletionConfirmation(name: string, confirmation: string) {
  return name.length > 0 && name === confirmation;
}

export function acceptedDeletionResult(
  result: WorkspaceDeletionResult | null,
  requestId: string,
): result is WorkspaceDeletionResult {
  return result !== null && result.requestId === requestId;
}

export function uncertainDeletionResult(error: unknown) {
  const { kind } = extractSerializedError(error);
  return kind === "unknown" || kind === "system";
}

export function ownsDeletionOperation(
  mounted: boolean,
  actorId: string,
  currentActor: string | null,
  active: symbol | null,
  token: symbol,
) {
  return mounted && actorId === currentActor && active === token;
}
