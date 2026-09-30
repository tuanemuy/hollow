import {
  DRIVE_LIMITS,
  type DriveAttempt,
  type DriveControl,
} from "@repo/core/domain/integration/drive";
import type { AuthenticationRequest } from "../../account/ports";
import type { HollowContainer } from "../../di/hollowTypes";
import {
  driveConfirmationCurrent,
  driveFolderConfirmation,
} from "./connection";
import { sameDriveActor } from "./control";
import { driveChanged, driveRecordCurrent, readDriveActor } from "./current";

export function driveReceipt(
  row: DriveAttempt | DriveControl,
  current: boolean,
) {
  const data = row.data;
  return {
    id: row.id,
    commandId: row.commandId,
    version: row.version,
    kind: "kind" in data ? data.kind : ("authorization" as const),
    phase: data.phase,
    current,
    owner: row.owner.state,
    expiresAt: row.expiresAt.toISOString(),
    failure: data.phase === "failed" ? data.failure : null,
    target:
      data.phase === "ready" && data.kind === "folder-select"
        ? {
            sourceId: data.sourceId,
            targetId: data.targetId,
            targetName: data.targetName ?? null,
          }
        : null,
    creation:
      "kind" in data && data.kind === "folder-create" && "fileId" in data
        ? {
            sends: data.sends,
            confirmation:
              data.phase === "ready" && data.observedParent !== null
                ? {
                    fileId: data.fileId,
                    parentId: data.observedParent,
                    targetName: data.targetName ?? null,
                  }
                : null,
            canResend:
              data.phase === "reconciling" &&
              row.owner.state === "closed" &&
              data.sends === 1,
          }
        : null,
  };
}
export async function getDriveSettings(
  c: HollowContainer,
  request: AuthenticationRequest,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await readDriveActor(c, u, request);
    if (!actor) throw driveChanged();
    const row = await u.driveConnections.find(actor.accountId);
    const live = [
      ...(await u.driveAttempts.liveForAccount(actor.accountId)).map((v) => ({
        kind: "authorization" as const,
        row: v,
      })),
      ...(await u.driveControls.liveForAccount(actor.accountId)).map((v) => ({
        kind: "control" as const,
        row: v,
      })),
    ]
      .filter((v) => sameDriveActor(v.row.context, actor))
      .sort(
        (a, b) =>
          a.kind.localeCompare(b.kind) || a.row.id.localeCompare(b.row.id),
      )
      .slice(0, 206)
      .map(({ kind, row }) => ({ kind, id: row.id, commandId: row.commandId }));
    return {
      actor: {
        accountId: actor.accountId,
        authVersion: actor.authVersion,
        browserEpoch: actor.browserEpoch,
      },
      live,
      configured: c.drive?.protector.available() ?? false,
      backupConfigured: Boolean(
        c.drive?.backup &&
          c.drive.protector.available() &&
          c.importing?.storage.withOwner,
      ),
      state: row?.state ?? "unlinked",
      epoch: row?.epoch ?? 0,
      settingsVersion: row?.settingsVersion ?? 1,
      autoBackup: row?.autoBackup ?? false,
      account:
        row?.state === "linked" || row?.state === "needs-relink"
          ? {
              email: row.credential.email,
              connectedAt: row.credential.connectedAt.toISOString(),
            }
          : null,
      lastUsedAt: row?.lastUsedAt?.toISOString() ?? null,
      folder: row?.folder
        ? {
            id: row.folder.id,
            name: row.folder.name,
            driveId: row.folder.driveId,
            checkedAt: row.folder.checkedAt.toISOString(),
          }
        : null,
      confirmation: row
        ? await driveFolderConfirmation(u, actor.accountId, (value) =>
            c.tokens.hash(value),
          )
        : {
            version: 1 as const,
            expectedEpoch: 0,
            sequence: 0,
            ids: [],
            backupIds: [],
          },
    };
  });
}
export type DriveReceiptLookup =
  | Readonly<{
      by: "command";
      kind: "authorization" | "control";
      commandId: string;
    }>
  | Readonly<{ by: "id"; kind: "authorization" | "control"; id: string }>;
export async function getDriveReceipt(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: DriveReceiptLookup,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await readDriveActor(c, u, request);
    if (!actor) throw driveChanged();
    const repository =
      input.kind === "authorization" ? u.driveAttempts : u.driveControls;
    const row =
      input.by === "id"
        ? await repository.find(input.id)
        : await repository.findByCommand(actor.accountId, input.commandId);
    if (
      !row ||
      row.accountId !== actor.accountId ||
      !sameDriveActor(row.context, actor)
    )
      return null;
    const current = Boolean(await driveRecordCurrent(c, u, row));
    return driveReceipt(
      row,
      current &&
        (input.kind !== "authorization" ||
          ("confirmedFolderIdsEnvelope" in row &&
            (await driveConfirmationCurrent(c, u, row)))),
    );
  });
}
export async function getDriveHistory(
  c: HollowContainer,
  request: AuthenticationRequest,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await readDriveActor(c, u, request);
    if (!actor) throw driveChanged();
    const since = new Date(c.clock.now().getTime() - DRIVE_LIMITS.historyMs);
    const rows = [
      ...(await u.driveAttempts.history(actor.accountId, since, 100)),
      ...(await u.driveControls.history(actor.accountId, since, 100)),
    ]
      .sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime() ||
          b.id.localeCompare(a.id) ||
          ("kind" in b.data ? b.data.kind : "authorization").localeCompare(
            "kind" in a.data ? a.data.kind : "authorization",
          ),
      )
      .slice(0, 100);
    return rows.map((row) => ({
      id: row.id,
      kind: "kind" in row.data ? row.data.kind : ("authorization" as const),
      phase: row.data.phase,
      createdAt: row.createdAt.toISOString(),
      terminalAt: row.terminalAt?.toISOString() ?? null,
      failure: row.data.phase === "failed" ? row.data.failure : null,
    }));
  });
}
