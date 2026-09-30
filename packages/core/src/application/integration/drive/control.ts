import {
  DRIVE_LIMITS,
  type DriveConfirmedFolders,
  type DriveConnection,
  type DriveContext,
  type DriveControl,
  type DriveControlData,
  driveConfirmedFoldersMatch,
  driveOwnerHeld,
} from "@repo/core/domain/integration/drive";
import type { AuthenticationRequest } from "../../account/ports";
import type { HollowContainer } from "../../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../../execution/hollowUnitOfWork";
import { cancelDriveBackups } from "./backup/cancellation";
import { driveFolderConfirmation } from "./connection";
import { driveActor, driveChanged, driveServices } from "./current";
import { failedControl } from "./runner";

export type DriveInitialInput = Readonly<{
  commandId: string;
  expectedEpoch: number;
  expectedSettingsVersion: number;
}>;
export function sameDriveActor(a: DriveContext | null, b: DriveContext) {
  return (
    a !== null &&
    a.accountId === b.accountId &&
    a.sessionHash === b.sessionHash &&
    a.authVersion === b.authVersion &&
    a.browserHash === b.browserHash &&
    a.browserEpoch === b.browserEpoch
  );
}
export async function admitDriveControl(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: DriveInitialInput,
  kind: DriveControlData["kind"],
  intent: readonly unknown[],
  data: (
    u: HollowUnitOfWorkContext,
    connection: DriveConnection & { state: "linked" },
    actor: DriveContext,
    id: string,
  ) => Promise<DriveControlData & { phase: "queued" }>,
) {
  driveServices(c);
  const result = await c.unitOfWorkProvider.run(async (u) => {
    const actor = await driveActor(c, u, request);
    const now = c.clock.now();
    const digest = c.tokens.hash(
      JSON.stringify([
        "drive-intent",
        1,
        actor.accountId,
        kind,
        input.expectedEpoch,
        input.expectedSettingsVersion,
        ...intent,
      ]),
    );
    if (
      (await u.driveAttempts.findByCommand(actor.accountId, input.commandId)) ||
      (await u.driveBackupRequests.command(actor.accountId, input.commandId))
    )
      throw driveChanged();
    const old = await u.driveControls.findByCommand(
      actor.accountId,
      input.commandId,
    );
    if (old) {
      if (old.intentDigest !== digest || !sameDriveActor(old.context, actor))
        throw driveChanged();
      return { row: old, accepted: false };
    }
    const connection = await u.driveConnections.find(actor.accountId);
    if (
      !connection ||
      connection.state !== "linked" ||
      connection.epoch !== input.expectedEpoch ||
      connection.settingsVersion !== input.expectedSettingsVersion
    )
      throw driveChanged();
    const id = c.idGenerator.next();
    const row: DriveControl & { data: { phase: "queued" } } = {
      id,
      accountId: actor.accountId,
      commandId: input.commandId,
      intentDigest: digest,
      context: actor,
      expectedEpoch: connection.epoch,
      expectedCredentialVersion: connection.credentialVersion,
      expectedSettingsVersion: connection.settingsVersion,
      version: 1,
      cancelGeneration: 0,
      owner: { state: "none" },
      credentialUse: { kind: "none" },
      subject: connection.credential.subject,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(
        now.getTime() +
          (kind === "picker"
            ? DRIVE_LIMITS.pickerMs
            : DRIVE_LIMITS.operationMs),
      ),
      terminalAt: null,
      data: await data(u, connection, actor, id),
    };
    if (row.data.kind !== kind) throw driveChanged();
    await u.driveControls.insert(row);
    await u.authBrowsers.ensure(
      actor.browserHash,
      new Date(now.getTime() + DRIVE_LIMITS.receiptMs),
      now,
    );
    return { row, accepted: true };
  });
  if (result.accepted) driveServices(c).wake();
  return result;
}
export async function cancelDriveOperation(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: Readonly<{
    id: string;
    expectedVersion: number;
    kind: "authorization" | "control";
  }>,
) {
  const result = await c.unitOfWorkProvider.run(async (u) => {
    const actor = await driveActor(c, u, request);
    const row =
      input.kind === "authorization"
        ? await u.driveAttempts.find(input.id)
        : await u.driveControls.find(input.id);
    if (!row || !sameDriveActor(row.context, actor)) throw driveChanged();
    if (row.version !== input.expectedVersion)
      return { kind: "stale" as const, owner: null };
    if (row.terminalAt !== null)
      return { kind: "current" as const, owner: row.owner };
    const now = c.clock.now();
    const next = { ...row, cancelGeneration: row.cancelGeneration + 1 };
    const changed =
      "subject" in next
        ? await u.driveControls.replace(
            failedControl(next, "DRIVE_CANCELLED", now),
            row.version,
          )
        : await u.driveAttempts.replace(
            {
              ...next,
              version: next.version + 1,
              updatedAt: now,
              terminalAt: now,
              confirmedFolderIdsEnvelope: null,
              data: { phase: "failed", failure: "DRIVE_CANCELLED" },
            },
            row.version,
          );
    if (!changed) throw driveChanged();
    return { kind: "cancelled" as const, owner: row.owner };
  });
  if (
    result.owner &&
    (result.owner.state === "active" || result.owner.state === "unknown")
  )
    driveServices(c).execution.abort({
      ...result.owner,
      state: result.owner.state,
    });
  return { kind: result.kind };
}
export async function disconnectDrive(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: DriveInitialInput & Readonly<{ confirmation?: DriveConfirmedFolders }>,
) {
  const admitted = await c.unitOfWorkProvider.run(async (u) => {
    const actor = await driveActor(c, u, request);
    const now = c.clock.now();
    const digest = c.tokens.hash(
      JSON.stringify([
        "drive-intent",
        1,
        actor.accountId,
        "disconnect",
        input.expectedEpoch,
        input.expectedSettingsVersion,
        input.confirmation ?? null,
      ]),
    );
    if (
      (await u.driveAttempts.findByCommand(actor.accountId, input.commandId)) ||
      (await u.driveBackupRequests.command(actor.accountId, input.commandId))
    )
      throw driveChanged();
    const old = await u.driveControls.findByCommand(
      actor.accountId,
      input.commandId,
    );
    if (old) {
      if (old.intentDigest !== digest || !sameDriveActor(old.context, actor))
        throw driveChanged();
      return { row: old };
    }
    const connection = await u.driveConnections.find(actor.accountId);
    if (
      !connection ||
      connection.state === "unlinked" ||
      connection.epoch !== input.expectedEpoch ||
      connection.settingsVersion !== input.expectedSettingsVersion
    )
      throw driveChanged();
    const expected = input.confirmation ?? {
      version: 1 as const,
      expectedEpoch: connection.epoch,
      sequence: connection.admissionSequence,
      ids: [],
      backupIds: [],
    };
    if (
      !driveConfirmedFoldersMatch(
        expected,
        await driveFolderConfirmation(u, actor.accountId),
      )
    )
      throw driveChanged();
    const row: DriveControl & {
      data: { kind: "disconnect"; phase: "queued" };
    } = {
      id: c.idGenerator.next(),
      accountId: actor.accountId,
      commandId: input.commandId,
      intentDigest: digest,
      context: actor,
      expectedEpoch: connection.epoch,
      expectedCredentialVersion: connection.credentialVersion,
      expectedSettingsVersion: connection.settingsVersion,
      version: 1,
      cancelGeneration: 0,
      owner: { state: "none" },
      credentialUse: { kind: "none" },
      subject: connection.credential.subject,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + DRIVE_LIMITS.operationMs),
      terminalAt: null,
      data: { kind: "disconnect", phase: "queued" },
    };
    await u.driveControls.insert(row);
    await u.authBrowsers.ensure(
      actor.browserHash,
      new Date(now.getTime() + DRIVE_LIMITS.receiptMs),
      now,
    );
    return { row };
  });
  if (admitted.row.data.phase !== "queued")
    return { id: admitted.row.id, phase: admitted.row.data.phase };
  const owners = await c.unitOfWorkProvider.run(async (u) => {
    const actor = await driveActor(c, u, request);
    const connection = await u.driveConnections.find(actor.accountId);
    const row = await u.driveControls.find(admitted.row.id);
    const now = c.clock.now();
    if (
      !connection ||
      !row ||
      !sameDriveActor(row.context, actor) ||
      connection.state === "unlinked" ||
      connection.credential.subject !== row.subject ||
      row.cancelGeneration !== 0 ||
      row.expiresAt <= now ||
      connection.epoch !== row.expectedEpoch ||
      connection.settingsVersion !== row.expectedSettingsVersion ||
      row.data.phase !== "queued"
    )
      throw driveChanged();
    const attempts = await u.driveAttempts.liveForAccount(actor.accountId);
    const expected = input.confirmation ?? {
      version: 1 as const,
      expectedEpoch: connection.epoch,
      sequence: connection.admissionSequence,
      ids: [],
      backupIds: [],
    };
    if (
      !driveConfirmedFoldersMatch(
        expected,
        await driveFolderConfirmation(u, actor.accountId),
      )
    )
      throw driveChanged();
    await cancelDriveBackups(
      c,
      u,
      { kind: "account", accountId: actor.accountId, epoch: connection.epoch },
      now,
    );
    const controls = await u.driveControls.liveForAccount(actor.accountId);
    for (const old of attempts)
      if (old.terminalAt === null) {
        if (
          !(await u.driveAttempts.replace(
            {
              ...old,
              version: old.version + 1,
              cancelGeneration: old.cancelGeneration + 1,
              updatedAt: now,
              terminalAt: now,
              confirmedFolderIdsEnvelope: null,
              data: { phase: "failed", failure: "DRIVE_CONNECTION_CHANGED" },
            },
            old.version,
          ))
        )
          throw driveChanged();
      }
    for (const old of controls)
      if (old.id !== row.id && old.terminalAt === null) {
        if (
          !(await u.driveControls.replace(
            failedControl(
              { ...old, cancelGeneration: old.cancelGeneration + 1 },
              "DRIVE_CONNECTION_CHANGED",
              now,
            ),
            old.version,
          ))
        )
          throw driveChanged();
      }
    const epoch = connection.epoch + 1;
    if (
      !(await u.driveConnections.replace(
        {
          ...connection,
          state: "unlinked",
          autoBackup: false,
          version: connection.version + 1,
          epoch,
          credentialVersion: connection.credentialVersion + 1,
          settingsVersion: connection.settingsVersion + 1,
          credential: null,
          folder: null,
          lastUsedAt: null,
          updatedAt: now,
        },
        connection.version,
        "disconnect",
      ))
    )
      throw driveChanged();
    if (
      !(await u.driveControls.replace(
        {
          ...row,
          version: row.version + 1,
          updatedAt: now,
          terminalAt: now,
          data: { kind: "disconnect", phase: "completed", resultEpoch: epoch },
        },
        row.version,
      ))
    )
      throw driveChanged();
    return [...attempts, ...controls]
      .filter((v) => driveOwnerHeld(v.owner))
      .map((v) => v.owner);
  });
  for (const owner of owners)
    if (owner.state === "active" || owner.state === "unknown")
      c.drive?.execution.abort({ ...owner, state: owner.state });
  return { id: admitted.row.id, phase: "completed" as const };
}
