import { BusinessRuleError } from "@repo/core/domain/error";
import {
  DRIVE_LIMITS,
  type DriveControl,
  type DriveFailure,
  type DriveFolder,
  driveFolderSchema,
  parseDrive,
} from "@repo/core/domain/integration/drive";
import type { AuthenticationRequest } from "../../account/ports";
import type { HollowContainer } from "../../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../../execution/hollowUnitOfWork";
import {
  admitDriveControl,
  type DriveInitialInput,
  sameDriveActor,
} from "./control";
import { ownedAccess, refreshOwnedCredential } from "./credentials";
import {
  driveActor,
  driveChanged,
  driveRecordCurrent,
  driveServices,
} from "./current";
import type { DriveFolderObservation } from "./ports";
import { driveReceipt } from "./read";
import {
  driveOwner,
  driveTarget,
  executeDriveControl,
  prepareDriveClaim,
} from "./runner";

function resourceBinding(row: DriveControl, fileId: string) {
  return {
    purpose: "resource-key" as const,
    accountId: row.accountId,
    subject: row.subject,
    epoch: row.expectedEpoch,
    fileId,
  };
}
function failure(code: DriveFailure): never {
  throw new BusinessRuleError(code, "Drive保存先を確認できませんでした。");
}
function requireUsable(observation: DriveFolderObservation) {
  if (observation.kind === "usable") return observation;
  if (observation.kind === "transient")
    return failure(
      observation.reason === "rate" ? "DRIVE_RATE_LIMIT" : "DRIVE_UNAVAILABLE",
    );
  return failure(
    observation.kind === "trashed"
      ? "DRIVE_FOLDER_TRASHED"
      : observation.kind === "access-denied"
        ? "DRIVE_FOLDER_DENIED"
        : observation.kind === "unavailable-ambiguous"
          ? "DRIVE_FOLDER_UNAVAILABLE"
          : "DRIVE_FOLDER_INVALID",
  );
}
function protectedFolder(
  c: HollowContainer,
  row: DriveControl,
  observation: DriveFolderObservation,
): DriveFolder {
  const value = requireUsable(observation);
  return parseDrive(driveFolderSchema, {
    ...value.folder,
    checkedAt: c.clock.now(),
    resourceKeyEnvelope:
      value.resourceKey === null
        ? null
        : driveServices(c).protector.protect(
            value.resourceKey,
            resourceBinding(row, value.folder.id),
          ),
  });
}
async function saveFolder(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  row: DriveControl,
  folder: DriveFolder,
) {
  const connection = await u.driveConnections.find(row.accountId);
  if (
    !connection ||
    connection.state !== "linked" ||
    connection.epoch !== row.expectedEpoch ||
    connection.settingsVersion !== row.expectedSettingsVersion
  )
    throw driveChanged();
  if (
    !(await u.driveConnections.replace(
      {
        ...connection,
        version: connection.version + 1,
        settingsVersion: connection.settingsVersion + 1,
        folder,
        lastUsedAt: null,
        updatedAt: c.clock.now(),
      },
      connection.version,
      "folder",
    ))
  )
    throw driveChanged();
}
async function admissionReceipt(
  c: HollowContainer,
  admission: ReturnType<typeof admitDriveControl>,
) {
  const result = await admission;
  return c.unitOfWorkProvider.run(async (u) => ({
    row: driveReceipt(
      result.row,
      Boolean(await driveRecordCurrent(c, u, result.row)),
    ),
    accepted: result.accepted,
  }));
}
export function beginDrivePicker(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: DriveInitialInput,
) {
  return admissionReceipt(
    c,
    admitDriveControl(c, request, input, "picker", [], async () => ({
      kind: "picker",
      phase: "queued",
    })),
  );
}
export function beginDriveRefresh(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: DriveInitialInput,
) {
  return admissionReceipt(
    c,
    admitDriveControl(c, request, input, "refresh", [], async () => ({
      kind: "refresh",
      phase: "queued",
    })),
  );
}
export function beginDriveFolderCreation(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: DriveInitialInput,
) {
  return admissionReceipt(
    c,
    admitDriveControl(
      c,
      request,
      input,
      "folder-create",
      ["root"],
      async () => ({ kind: "folder-create", phase: "queued" }),
    ),
  );
}
export function beginDriveFolderSelection(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: DriveInitialInput &
    Readonly<{
      pickerId: string;
      ticket: string;
      fileId: string;
      resourceKey: string | null;
    }>,
) {
  return admissionReceipt(
    c,
    admitDriveControl(
      c,
      request,
      input,
      "folder-select",
      [input.pickerId, input.fileId, input.resourceKey],
      async (u, connection, actor) => {
        const picker = await u.driveControls.find(input.pickerId);
        if (
          !picker ||
          !sameDriveActor(picker.context, actor) ||
          picker.data.kind !== "picker" ||
          picker.data.phase !== "awaiting-selection" ||
          picker.data.ticketHash !== c.tokens.hash(input.ticket) ||
          !(await driveRecordCurrent(c, u, picker))
        )
          throw driveChanged();
        if (
          !(await u.driveControls.replace(
            {
              ...picker,
              version: picker.version + 1,
              updatedAt: c.clock.now(),
              terminalAt: c.clock.now(),
              data: { kind: "picker", phase: "completed" },
            },
            picker.version,
          ))
        )
          throw driveChanged();
        const resourceKeyEnvelope =
          input.resourceKey === null
            ? null
            : driveServices(c).protector.protect(input.resourceKey, {
                purpose: "resource-key",
                accountId: actor.accountId,
                subject: connection.credential.subject,
                epoch: connection.epoch,
                fileId: input.fileId,
              });
        return {
          kind: "folder-select",
          phase: "queued",
          fileId: input.fileId,
          pickerId: input.pickerId,
          resourceKeyEnvelope,
        };
      },
    ),
  );
}
export type DriveContinuation = Readonly<{
  expectedVersion: number;
  phase: "ready" | "reconciling";
  action: "confirm" | "inspect" | "resend";
  targetId?: string;
  sends?: number;
}>;
export async function continueDriveFolder(
  c: HollowContainer,
  request: AuthenticationRequest,
  id: string,
  input: DriveContinuation,
  runtimeGeneration: string,
) {
  const allowed = await c.unitOfWorkProvider.run(async (u) => {
    const actor = await driveActor(c, u, request);
    const row = await u.driveControls.find(id);
    if (
      !row ||
      !sameDriveActor(row.context, actor) ||
      !(await driveRecordCurrent(c, u, row))
    )
      throw driveChanged();
    return (
      row.version === input.expectedVersion && row.data.phase === input.phase
    );
  });
  if (!allowed) return { kind: "stale" as const };
  const result = await runDriveControl(c, id, runtimeGeneration, input);
  return { kind: result.claimed ? ("accepted" as const) : ("stale" as const) };
}
export async function runDriveControl(
  c: HollowContainer,
  id: string,
  runtimeGeneration: string,
  continuation?: DriveContinuation,
): Promise<
  Readonly<{
    claimed: boolean;
    picker: Readonly<{
      accessToken: string;
      ticket: string;
      pickerExpiresAt: string;
      accessExpiresAt: string;
    }> | null;
  }>
> {
  const service = driveServices(c);
  const owner = driveOwner(c, runtimeGeneration);
  let rejection: Error | null = null;
  const wrapped = await service.execution.withCaller(
    driveTarget("control", id, owner),
    async () => {
      const prepared = await prepareDriveClaim(c, async (u) => {
        const old = await u.driveControls.find(id);
        if (!old || !(await driveRecordCurrent(c, u, old))) return null;
        const connection = await u.driveConnections.find(old.accountId);
        if (!connection || connection.state !== "linked") return null;
        let data: DriveControl["data"];
        if (continuation) {
          if (
            old.version !== continuation.expectedVersion ||
            old.data.phase !== continuation.phase ||
            old.owner.state !== "closed"
          )
            return null;
          if (
            old.data.kind === "folder-select" &&
            old.data.phase === "ready" &&
            continuation.action === "confirm" &&
            continuation.targetId === old.data.targetId
          )
            data = {
              ...old.data,
              phase: "verifying-target",
              confirmedReadyVersion: old.version,
            };
          else if (
            old.data.kind === "folder-create" &&
            (old.data.phase === "ready" || old.data.phase === "reconciling") &&
            continuation.sends === old.data.sends
          ) {
            if (
              continuation.action === "resend" &&
              old.data.phase === "reconciling" &&
              old.data.sends === 1
            )
              data = { ...old.data, phase: "running", sends: 2 };
            else if (
              continuation.action === "inspect" ||
              (continuation.action === "confirm" &&
                old.data.phase === "ready" &&
                old.data.observedParent !== null &&
                continuation.targetId === old.data.fileId)
            )
              data = { ...old.data, phase: "reconciling" };
            else return null;
          } else return null;
        } else if (
          old.data.phase === "queued" &&
          old.data.kind !== "disconnect"
        )
          data =
            old.data.kind === "folder-create"
              ? { ...old.data, phase: "allocating" }
              : { ...old.data, phase: "running" };
        else if (
          old.data.kind === "folder-create" &&
          old.data.phase === "prepared"
        )
          data = { ...old.data, phase: "running", sends: 1 };
        else return null;
        const row: DriveControl = {
          ...old,
          version: old.version + 1,
          updatedAt: c.clock.now(),
          owner,
          credentialUse: {
            kind: "bound",
            ownerToken: owner.token,
            runtimeGeneration: owner.runtimeGeneration,
            version: connection.credentialVersion,
          },
          data,
        };
        return async () =>
          (await u.driveControls.claim(row, old.version)) ? row : null;
      });
      if (prepared.kind === "rejected") {
        rejection = prepared.error;
        return null;
      }
      return prepared.value;
    },
    async (claimed) => {
      let picker: Readonly<{
        accessToken: string;
        ticket: string;
        pickerExpiresAt: string;
        accessExpiresAt: string;
      }> | null = null;
      await executeDriveControl(
        c,
        claimed,
        async (signal) => {
          if (claimed.data.kind === "refresh") {
            const updated = await refreshOwnedCredential(c, claimed, signal);
            return {
              kind: "refresh" as const,
              version:
                updated.row.credentialUse.kind === "none"
                  ? 0
                  : updated.row.credentialUse.version,
            };
          }
          const access = await ownedAccess(c, claimed, signal);
          const row = access.row;
          const data = row.data;
          if (data.kind === "picker") {
            const connection = await c.unitOfWorkProvider.run((u) =>
              driveRecordCurrent(c, u, row, true),
            );
            if (!connection || connection.state !== "linked")
              throw driveChanged();
            return {
              kind: "picker" as const,
              accessToken: access.accessToken,
              ticket: c.tokens.generate(),
              pickerExpiresAt: new Date(
                Math.min(
                  row.expiresAt.getTime(),
                  c.clock.now().getTime() + DRIVE_LIMITS.pickerMs,
                ),
              ).toISOString(),
              accessExpiresAt:
                connection.credential.accessExpiresAt.toISOString(),
            };
          }
          if (data.kind === "folder-create" && data.phase === "allocating")
            return {
              kind: "allocated" as const,
              fileId: await service.folders.generateFolderId({
                accessToken: access.accessToken,
                signal,
              }),
              marker: c.tokens.generate(),
            };
          if (
            data.kind === "folder-create" &&
            (data.phase === "running" || data.phase === "reconciling")
          ) {
            let conflict = false;
            if (data.phase === "running")
              conflict =
                (
                  await service.folders.createFolder({
                    accessToken: access.accessToken,
                    fileId: data.fileId,
                    marker: data.marker,
                    signal,
                  })
                ).kind === "conflict";
            const observation = await service.folders.inspectFolder({
              accessToken: access.accessToken,
              fileId: data.fileId,
              resourceKey: null,
              signal,
            });
            if (
              observation.kind === "transient" ||
              observation.kind === "unavailable-ambiguous"
            )
              return { kind: "reconcile" as const };
            const usable = requireUsable(observation);
            if (
              usable.folder.id !== data.fileId ||
              usable.marker !== data.marker ||
              usable.folder.driveId !== null ||
              usable.parents.length !== 1 ||
              (data.observedParent !== null &&
                usable.parents[0] !== data.observedParent)
            )
              return failure("DRIVE_CREATE_CONFLICT");
            return {
              kind: "created" as const,
              observation,
              parent: usable.parents[0]!,
              confirmationRequired:
                (data.phase === "reconciling" ||
                  data.sends === 2 ||
                  (conflict && data.observedParent === null)) &&
                continuation?.action !== "confirm",
            };
          }
          if (
            data.kind === "folder-select" &&
            (data.phase === "running" || data.phase === "verifying-target")
          ) {
            const fileId =
              data.phase === "running" ? data.fileId : data.targetId;
            const envelope =
              data.phase === "running"
                ? data.resourceKeyEnvelope
                : data.targetKeyEnvelope;
            const resourceKey =
              envelope === null
                ? null
                : service.protector.reveal(
                    envelope,
                    resourceBinding(row, fileId),
                  );
            const observation = await service.folders.inspectFolder({
              accessToken: access.accessToken,
              fileId,
              resourceKey,
              signal,
            });
            if (
              data.phase === "verifying-target" &&
              observation.kind !== "usable"
            )
              requireUsable(observation);
            if (observation.kind !== "shortcut") requireUsable(observation);
            if (
              observation.kind === "usable" &&
              observation.folder.id !== fileId
            )
              return failure("DRIVE_FOLDER_INVALID");
            return { kind: "selected" as const, observation };
          }
          throw driveChanged();
        },
        async (u, row, value) => {
          const now = c.clock.now();
          let next: DriveControl;
          if (value.kind === "refresh" && row.data.kind === "refresh")
            next = {
              ...row,
              version: row.version + 1,
              updatedAt: now,
              terminalAt: now,
              data: {
                kind: "refresh",
                phase: "completed",
                resultCredentialVersion: value.version,
              },
            };
          else if (value.kind === "picker" && row.data.kind === "picker") {
            next = {
              ...row,
              version: row.version + 1,
              updatedAt: now,
              data: {
                kind: "picker",
                phase: "awaiting-selection",
                ticketHash: c.tokens.hash(value.ticket),
              },
            };
            picker = {
              accessToken: value.accessToken,
              ticket: value.ticket,
              pickerExpiresAt: value.pickerExpiresAt,
              accessExpiresAt: value.accessExpiresAt,
            };
          } else if (
            value.kind === "allocated" &&
            row.data.kind === "folder-create"
          )
            next = {
              ...row,
              version: row.version + 1,
              updatedAt: now,
              data: {
                kind: "folder-create",
                phase: "prepared",
                fileId: value.fileId,
                marker: value.marker,
                sends: 0,
                observedParent: null,
              },
            };
          else if (
            value.kind === "reconcile" &&
            row.data.kind === "folder-create" &&
            (row.data.phase === "running" || row.data.phase === "reconciling")
          )
            next = {
              ...row,
              version: row.version + 1,
              updatedAt: now,
              data: { ...row.data, phase: "reconciling" },
            };
          else if (
            value.kind === "created" &&
            row.data.kind === "folder-create" &&
            "fileId" in row.data
          ) {
            if (!value.confirmationRequired) {
              const folder = protectedFolder(c, row, value.observation);
              await saveFolder(c, u, row, folder);
            }
            next = {
              ...row,
              version: row.version + 1,
              updatedAt: now,
              terminalAt: value.confirmationRequired ? null : now,
              data: {
                ...row.data,
                phase: value.confirmationRequired ? "ready" : "completed",
                sends: row.data.sends as 1 | 2,
                observedParent: value.parent,
              },
            };
          } else if (
            value.kind === "selected" &&
            row.data.kind === "folder-select"
          ) {
            if (row.data.phase === "verifying-target") {
              const folder = protectedFolder(c, row, value.observation);
              if (folder.id !== row.data.targetId) throw driveChanged();
              await saveFolder(c, u, row, folder);
              next = {
                ...row,
                version: row.version + 1,
                updatedAt: now,
                terminalAt: now,
                data: {
                  kind: "folder-select",
                  phase: "completed",
                  folderId: folder.id,
                },
              };
            } else if (row.data.phase === "running") {
              const target =
                value.observation.kind === "shortcut"
                  ? {
                      id: value.observation.targetId,
                      key: value.observation.targetResourceKey,
                    }
                  : {
                      id: requireUsable(value.observation).folder.id,
                      key: requireUsable(value.observation).resourceKey,
                    };
              next = {
                ...row,
                version: row.version + 1,
                updatedAt: now,
                data: {
                  kind: "folder-select",
                  phase: "ready",
                  sourceId: row.data.fileId,
                  targetId: target.id,
                  targetKeyEnvelope:
                    target.key === null
                      ? null
                      : service.protector.protect(
                          target.key,
                          resourceBinding(row, target.id),
                        ),
                },
              };
            } else throw driveChanged();
          } else throw driveChanged();
          if (!(await u.driveControls.replace(next, row.version)))
            throw driveChanged();
        },
      );
      return { claimed: true as const, picker };
    },
  );
  if (rejection) throw rejection;
  return wrapped.kind === "settled"
    ? wrapped.value
    : { claimed: false, picker: null };
}
