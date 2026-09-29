import type {
  DriveAttempt,
  DriveConnection,
  DriveContext,
  DriveControl,
} from "@repo/core/domain/integration/drive";
import { captureAuthentication } from "../../account/context";
import type { AuthenticationRequest } from "../../account/ports";
import type { HollowContainer } from "../../di/hollowTypes";
import { ConflictError, UnauthorizedError } from "../../errors";
import type { HollowUnitOfWorkContext } from "../../execution/hollowUnitOfWork";

export const driveChanged = () =>
  new ConflictError(
    "DRIVE_CONTEXT_CHANGED",
    "Drive連携状況が変わりました。現在の状態を確認してください。",
  );
export function driveServices(c: HollowContainer) {
  if (!c.drive?.protector.available())
    throw new ConflictError(
      "DRIVE_UNAVAILABLE",
      "Drive連携は現在設定されていません。",
    );
  return c.drive;
}
export async function driveActor(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  request: AuthenticationRequest,
): Promise<DriveContext> {
  const value = await captureAuthentication(c, u, request);
  if (!value.actor)
    throw new UnauthorizedError("SIGN_IN_REQUIRED", "ログインしてください。");
  return {
    ...value.actor,
    browserHash: value.browser.hash,
    browserEpoch: value.browser.epoch,
  };
}
export async function readDriveActor(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  request: AuthenticationRequest,
): Promise<DriveContext | null> {
  if (!request.sessionToken) return null;
  const sessionHash = c.tokens.hash(request.sessionToken);
  const browserHash = c.tokens.hash(request.browserToken);
  const session = await u.accounts.findSession(sessionHash);
  const browser = await u.authBrowsers.find(browserHash);
  if (
    !session ||
    !browser ||
    session.expiresAt <= c.clock.now() ||
    session.browser?.hash !== browserHash ||
    session.browser.epoch !== browser.epoch
  )
    return null;
  const account = await u.accounts.findById(session.accountId);
  return account?.status === "verified"
    ? {
        accountId: account.id,
        sessionHash,
        authVersion: account.authVersion,
        browserHash,
        browserEpoch: browser.epoch,
      }
    : null;
}
export async function storedDriveContext(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  context: DriveContext | null,
): Promise<DriveContext | null> {
  if (!context) return null;
  const session = await u.accounts.findSession(context.sessionHash);
  const browser = await u.authBrowsers.find(context.browserHash);
  const account = await u.accounts.findById(context.accountId);
  if (
    !session ||
    !browser ||
    !account ||
    session.accountId !== context.accountId ||
    session.expiresAt <= c.clock.now() ||
    session.browser?.hash !== browser.hash ||
    session.browser.epoch !== browser.epoch ||
    account.status !== "verified"
  )
    return null;
  return {
    ...context,
    authVersion: account.authVersion,
    browserEpoch: browser.epoch,
  };
}
export async function driveRecordCurrent(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  row: DriveAttempt | DriveControl,
  httpResult = false,
) {
  const current = await storedDriveContext(c, u, row.context);
  const connection = await u.driveConnections.find(row.accountId);
  if (
    !row.context ||
    row.cancelGeneration !== 0 ||
    row.expiresAt <= c.clock.now() ||
    !driveCurrentMatches({
      expected: row.context,
      current,
      expectedEpoch: row.expectedEpoch,
      expectedSettingsVersion: row.expectedSettingsVersion,
      connection,
    })
  )
    return null;
  if (
    "subject" in row &&
    (!connection ||
      connection.state !== "linked" ||
      row.subject !== connection.credential.subject ||
      (httpResult &&
        (row.credentialUse.kind === "none" ||
          row.credentialUse.version !== connection.credentialVersion)))
  )
    return null;
  return connection;
}

export function driveCurrentMatches(
  input: Readonly<{
    expected: DriveContext;
    current: DriveContext | null;
    expectedEpoch: number;
    expectedSettingsVersion: number;
    connection: DriveConnection | null;
  }>,
): boolean {
  const { expected, current, connection } = input;
  return (
    current !== null &&
    connection !== null &&
    expected.accountId === current.accountId &&
    current.accountId === connection.accountId &&
    expected.sessionHash === current.sessionHash &&
    expected.authVersion === current.authVersion &&
    expected.browserHash === current.browserHash &&
    expected.browserEpoch === current.browserEpoch &&
    input.expectedEpoch === connection.epoch &&
    input.expectedSettingsVersion === connection.settingsVersion
  );
}
