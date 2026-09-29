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
        ? { sourceId: data.sourceId, targetId: data.targetId }
        : null,
    creation:
      "kind" in data && data.kind === "folder-create" && "fileId" in data
        ? {
            sends: data.sends,
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
    return {
      configured: c.drive?.protector.available() ?? false,
      state: row?.state ?? "unlinked",
      epoch: row?.epoch ?? 0,
      settingsVersion: row?.settingsVersion ?? 1,
      autoBackup: false as const,
      subject:
        row?.state === "linked" || row?.state === "needs-relink"
          ? row.credential.subject
          : null,
      email:
        row?.state === "linked" || row?.state === "needs-relink"
          ? row.credential.email
          : null,
      folder: row?.folder
        ? {
            id: row.folder.id,
            name: row.folder.name,
            driveId: row.folder.driveId,
            checkedAt: row.folder.checkedAt.toISOString(),
          }
        : null,
      confirmation: row
        ? await driveFolderConfirmation(u, actor.accountId)
        : { version: 1 as const, expectedEpoch: 0, sequence: 0, ids: [] },
    };
  });
}
export async function getDriveReceipt(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: Readonly<{ kind: "authorization" | "control"; commandId: string }>,
) {
  return c.unitOfWorkProvider.run(async (u) => {
    const actor = await readDriveActor(c, u, request);
    if (!actor) throw driveChanged();
    const row =
      input.kind === "authorization"
        ? await u.driveAttempts.findByCommand(actor.accountId, input.commandId)
        : await u.driveControls.findByCommand(actor.accountId, input.commandId);
    if (!row || !sameDriveActor(row.context, actor)) return null;
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
    const rows = await u.driveControls.history(
      actor.accountId,
      new Date(c.clock.now().getTime() - DRIVE_LIMITS.historyMs),
      100,
    );
    return rows.map((row) => ({
      id: row.id,
      kind: row.data.kind,
      phase: row.data.phase,
      createdAt: row.createdAt.toISOString(),
      terminalAt: row.terminalAt?.toISOString() ?? null,
      failure: row.data.phase === "failed" ? row.data.failure : null,
    }));
  });
}
