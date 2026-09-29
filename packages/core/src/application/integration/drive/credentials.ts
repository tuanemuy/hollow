import {
  type DriveConnection,
  type DriveContext,
  type DriveControl,
  driveStateInvalid,
} from "@repo/core/domain/integration/drive";
import { z } from "zod";
import type { HollowContainer } from "../../di/hollowTypes";
import { driveChanged, driveRecordCurrent, driveServices } from "./current";
import type { DriveSecretBinding, DriveTokenSet } from "./ports";

const token = z.string().min(1).max(65536);
const storedTokens = z
  .object({ version: z.literal(1), accessToken: token, refreshToken: token })
  .strict();
export function attemptBinding(
  purpose: "verifier" | "candidate" | "folder-confirmation",
  id: string,
  context: DriveContext,
): DriveSecretBinding {
  return {
    purpose,
    attemptId: id,
    accountId: context.accountId,
    browserHash: context.browserHash,
    browserEpoch: context.browserEpoch,
  };
}
export function credentialBinding(
  c: DriveConnection & { state: "linked" | "needs-relink" },
): DriveSecretBinding {
  return {
    purpose: "credential",
    accountId: c.accountId,
    subject: c.credential.subject,
    epoch: c.epoch,
    credentialVersion: c.credentialVersion,
  };
}
export function revealDriveCredential(
  c: HollowContainer,
  connection: DriveConnection,
) {
  if (connection.state !== "linked") throw driveChanged();
  const parsed = storedTokens.safeParse(
    decodeDriveSecret(
      driveServices(c).protector.reveal(
        connection.credential.envelope,
        credentialBinding(connection),
      ),
    ),
  );
  if (!parsed.success) return driveStateInvalid();
  return parsed.data;
}
export function decodeDriveSecret(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return driveStateInvalid();
  }
}
export function protectDriveTokens(
  c: HollowContainer,
  value: Readonly<{ accessToken: string; refreshToken: string }>,
  binding: DriveSecretBinding,
) {
  return driveServices(c).protector.protect(encodeDriveTokens(value), binding);
}
export function encodeDriveTokens(
  value: Readonly<{ accessToken: string; refreshToken: string }>,
) {
  const parsed = storedTokens.safeParse({
    version: 1,
    accessToken: value.accessToken,
    refreshToken: value.refreshToken,
  });
  if (
    !parsed.success ||
    new TextEncoder().encode(JSON.stringify(parsed.data)).length > 65536
  )
    return driveStateInvalid();
  return JSON.stringify(parsed.data);
}
export async function refreshOwnedCredential(
  c: HollowContainer,
  row: DriveControl,
  signal: AbortSignal,
) {
  const captured = await c.unitOfWorkProvider.run(async (u) => {
    const saved = await u.driveControls.find(row.id);
    if (
      !saved ||
      saved.version !== row.version ||
      saved.owner.state !== "active" ||
      saved.credentialUse.kind !== "bound"
    )
      throw driveChanged();
    const connection = await driveRecordCurrent(c, u, saved, true);
    if (!connection || connection.state !== "linked") throw driveChanged();
    return { saved, connection };
  });
  const old = revealDriveCredential(c, captured.connection);
  const tokens = await driveServices(c).authorization.refresh({
    refreshToken: old.refreshToken,
    signal,
  });
  if (signal.aborted) throw driveChanged();
  validateTokens(tokens);
  if (
    tokens.accessExpiresAt <= c.clock.now() ||
    (tokens.scope !== null &&
      !["openid", "https://www.googleapis.com/auth/drive.file"].every((scope) =>
        tokens.scope?.split(" ").includes(scope),
      ))
  )
    throw driveChanged();
  return c.unitOfWorkProvider.run(async (u) => {
    const saved = await u.driveControls.find(row.id);
    if (
      !saved ||
      saved.version !== captured.saved.version ||
      saved.credentialUse.kind !== "bound" ||
      saved.owner.state !== "active"
    )
      throw driveChanged();
    const connection = await driveRecordCurrent(c, u, saved, true);
    if (
      !connection ||
      connection.state !== "linked" ||
      connection.version !== captured.connection.version ||
      signal.aborted
    )
      throw driveChanged();
    const version = connection.credentialVersion + 1;
    const nextConnection = {
      ...connection,
      version: connection.version + 1,
      credentialVersion: version,
      updatedAt: c.clock.now(),
      credential: {
        ...connection.credential,
        accessExpiresAt: tokens.accessExpiresAt,
        envelope: protectDriveTokens(
          c,
          {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken ?? old.refreshToken,
          },
          {
            ...credentialBinding(connection),
            purpose: "credential",
            accountId: connection.accountId,
            subject: connection.credential.subject,
            epoch: connection.epoch,
            credentialVersion: version,
          },
        ),
      },
    };
    const next: DriveControl = {
      ...saved,
      version: saved.version + 1,
      updatedAt: c.clock.now(),
      credentialUse: {
        kind: "self-refreshed",
        ownerToken: saved.owner.token,
        runtimeGeneration: saved.owner.runtimeGeneration,
        fromVersion: saved.credentialUse.version,
        version,
      },
    };
    await u.driveControls.refreshCredential({
      control: next,
      expectedVersion: saved.version,
      connection: nextConnection,
      expectedConnectionVersion: connection.version,
    });
    return { row: next, accessToken: tokens.accessToken };
  });
}
export function validateTokens(tokens: DriveTokenSet) {
  if (
    !token.safeParse(tokens.accessToken).success ||
    (tokens.refreshToken !== null &&
      !token.safeParse(tokens.refreshToken).success) ||
    !Number.isSafeInteger(tokens.accessExpiresAt.getTime())
  )
    return driveStateInvalid();
}
export async function ownedAccess(
  c: HollowContainer,
  row: DriveControl,
  signal: AbortSignal,
) {
  const connection = await c.unitOfWorkProvider.run(async (u) => {
    const saved = await u.driveControls.find(row.id);
    if (
      !saved ||
      saved.version !== row.version ||
      saved.owner.state !== "active" ||
      row.owner.state !== "active" ||
      saved.owner.token !== row.owner.token ||
      saved.owner.runtimeGeneration !== row.owner.runtimeGeneration ||
      signal.aborted
    )
      return null;
    return driveRecordCurrent(c, u, saved, true);
  });
  if (!connection || connection.state !== "linked") throw driveChanged();
  if (connection.credential.accessExpiresAt <= c.clock.now())
    return refreshOwnedCredential(c, row, signal);
  return { row, accessToken: revealDriveCredential(c, connection).accessToken };
}
