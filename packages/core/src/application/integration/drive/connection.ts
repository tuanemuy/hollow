import { BusinessRuleError } from "@repo/core/domain/error";
import {
  DRIVE_LIMITS,
  type DriveAttempt,
  type DriveConfirmedFolders,
  driveConfirmedFoldersMatch,
  driveConfirmedFoldersSchema,
  driveCredentialSchema,
  driveStateInvalid,
  parseDrive,
} from "@repo/core/domain/integration/drive";
import { z } from "zod";
import type { AuthenticationRequest } from "../../account/ports";
import type { HollowContainer } from "../../di/hollowTypes";
import type { HollowUnitOfWorkContext } from "../../execution/hollowUnitOfWork";
import { sameDriveActor } from "./control";
import {
  attemptBinding,
  decodeDriveSecret,
  protectDriveTokens,
  validateTokens,
} from "./credentials";
import {
  driveActor,
  driveChanged,
  driveRecordCurrent,
  driveServices,
} from "./current";
import {
  driveOwner,
  driveTarget,
  executeDriveAttempt,
  failedControl,
  prepareDriveClaim,
} from "./runner";

const verifierSchema = z
  .object({
    version: z.literal(1),
    state: z.string().min(1).max(256),
    nonce: z.string().min(1).max(256),
    verifier: z.string().min(1).max(256),
  })
  .strict();
const candidateSchema = z
  .object({
    version: z.literal(1),
    accessToken: z.string().min(1).max(65536),
    refreshToken: z.string().min(1).max(65536),
    subject: z.string(),
    email: z.string().nullable(),
    scopes: z.array(z.string()),
    accessExpiresAt: z.string().datetime({ offset: true }),
  })
  .strict();
export async function driveFolderConfirmation(
  u: HollowUnitOfWorkContext,
  accountId: string,
): Promise<DriveConfirmedFolders> {
  const connection = await u.driveConnections.find(accountId);
  if (!connection) throw driveChanged();
  const ids = (await u.driveControls.liveForAccount(accountId))
    .filter(
      (v) => v.data.kind === "folder-select" || v.data.kind === "folder-create",
    )
    .map((v) => v.id)
    .sort();
  return parseDrive(driveConfirmedFoldersSchema, {
    version: 1,
    expectedEpoch: connection.epoch,
    sequence: connection.admissionSequence,
    ids,
  });
}
function confirmed(c: HollowContainer, row: DriveAttempt) {
  if (!row.context || !row.confirmedFolderIdsEnvelope) throw driveChanged();
  const value = parseDrive(
    driveConfirmedFoldersSchema,
    decodeDriveSecret(
      driveServices(c).protector.reveal(
        row.confirmedFolderIdsEnvelope,
        attemptBinding("folder-confirmation", row.id, row.context),
      ),
    ),
  );
  if (
    value.expectedEpoch !== row.expectedEpoch ||
    value.sequence !== row.confirmedAdmissionSequence
  )
    throw driveChanged();
  return value;
}
export async function driveConfirmationCurrent(
  c: HollowContainer,
  u: HollowUnitOfWorkContext,
  row: DriveAttempt,
) {
  return Boolean(
    row.context &&
      row.confirmedFolderIdsEnvelope &&
      driveConfirmedFoldersMatch(
        confirmed(c, row),
        await driveFolderConfirmation(u, row.accountId),
      ),
  );
}
export async function beginDriveAuthorization(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: Readonly<{
    commandId: string;
    expectedEpoch: number;
    expectedSettingsVersion: number;
    confirmation: DriveConfirmedFolders;
    consent: boolean;
    chooseAccount: boolean;
  }>,
) {
  const service = driveServices(c);
  const selected = await c.unitOfWorkProvider.run(async (u) => {
    const actor = await driveActor(c, u, request);
    const now = c.clock.now();
    const connection = await u.driveConnections.ensure(actor.accountId, now);
    const digest = c.tokens.hash(
      JSON.stringify([
        "drive-intent",
        1,
        actor.accountId,
        "authorization",
        input.expectedEpoch,
        input.expectedSettingsVersion,
        input.confirmation,
        input.consent,
        input.chooseAccount,
        "settings",
      ]),
    );
    if (await u.driveControls.findByCommand(actor.accountId, input.commandId))
      throw driveChanged();
    const existing = await u.driveAttempts.findByCommand(
      actor.accountId,
      input.commandId,
    );
    if (existing) {
      if (
        existing.intentDigest !== digest ||
        !sameDriveActor(existing.context, actor) ||
        !(await driveRecordCurrent(c, u, existing))
      )
        throw driveChanged();
      return existing;
    }
    if (
      connection.epoch !== input.expectedEpoch ||
      connection.settingsVersion !== input.expectedSettingsVersion ||
      !driveConfirmedFoldersMatch(
        parseDrive(driveConfirmedFoldersSchema, input.confirmation),
        await driveFolderConfirmation(u, actor.accountId),
      )
    )
      throw driveChanged();
    const id = c.idGenerator.next();
    const secrets = {
      version: 1 as const,
      state: c.tokens.generate(),
      nonce: c.tokens.generate(),
      verifier: c.tokens.generate(),
    };
    const row: DriveAttempt & { data: { phase: "pending" } } = {
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
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + DRIVE_LIMITS.authorizationMs),
      terminalAt: null,
      stateHash: c.tokens.hash(secrets.state),
      nonceHash: c.tokens.hash(secrets.nonce),
      confirmedAdmissionSequence: input.confirmation.sequence,
      confirmedFolderIdsEnvelope: service.protector.protect(
        JSON.stringify(input.confirmation),
        attemptBinding("folder-confirmation", id, actor),
      ),
      returnTo: "settings",
      data: {
        phase: "pending",
        verifierEnvelope: service.protector.protect(
          JSON.stringify(secrets),
          attemptBinding("verifier", id, actor),
        ),
      },
    };
    await u.driveAttempts.insert(row);
    await u.authBrowsers.ensure(
      actor.browserHash,
      new Date(now.getTime() + DRIVE_LIMITS.receiptMs),
      now,
    );
    return row;
  });
  if (selected.data.phase !== "pending" || !selected.context)
    return { id: selected.id, phase: selected.data.phase, url: null };
  const secrets = parseDrive(
    verifierSchema,
    decodeDriveSecret(
      service.protector.reveal(
        selected.data.verifierEnvelope,
        attemptBinding("verifier", selected.id, selected.context),
      ),
    ),
  );
  const url = await service.authorization.authorization({
    ...secrets,
    loginHint: null,
    consent: input.consent,
    chooseAccount: input.chooseAccount,
  });
  const valid = await c.unitOfWorkProvider.run((u) =>
    driveRecordCurrent(c, u, selected),
  );
  if (!valid) throw driveChanged();
  return { id: selected.id, phase: selected.data.phase, url };
}
export async function exchangeDriveAuthorization(
  c: HollowContainer,
  request: AuthenticationRequest,
  input: Readonly<{ state: string; code: string }>,
  runtimeGeneration: string,
) {
  const service = driveServices(c);
  const initial = await c.unitOfWorkProvider.run((u) =>
    u.driveAttempts.findByState(c.tokens.hash(input.state)),
  );
  if (!initial) throw driveChanged();
  const owner = driveOwner(c, runtimeGeneration);
  let rejection: Error | null = null;
  const wrapped = await service.execution.withCaller(
    driveTarget("authorization", initial.id, owner),
    async () => {
      const prepared = await prepareDriveClaim(c, async (u) => {
        const actor = await driveActor(c, u, request);
        const row = await u.driveAttempts.findByState(
          c.tokens.hash(input.state),
        );
        if (
          !row ||
          row.accountId !== actor.accountId ||
          !row.context ||
          row.context.sessionHash !== actor.sessionHash ||
          row.context.browserHash !== actor.browserHash ||
          !(await driveRecordCurrent(c, u, row))
        )
          throw driveChanged();
        if (row.data.phase !== "pending") return null;
        if (
          !driveConfirmedFoldersMatch(
            confirmed(c, row),
            await driveFolderConfirmation(u, row.accountId),
          )
        )
          throw driveChanged();
        const secrets = parseDrive(
          verifierSchema,
          decodeDriveSecret(
            service.protector.reveal(
              row.data.verifierEnvelope,
              attemptBinding("verifier", row.id, row.context),
            ),
          ),
        );
        if (
          secrets.state !== input.state ||
          c.tokens.hash(secrets.nonce) !== row.nonceHash
        )
          throw driveChanged();
        return async () => {
          if (
            !(await u.driveAttempts.claim(
              row.id,
              row.version,
              owner,
              c.clock.now(),
            ))
          )
            return null;
          const claimed = await u.driveAttempts.find(row.id);
          if (!claimed) throw driveChanged();
          return { row: claimed, secrets };
        };
      });
      if (prepared.kind === "rejected") {
        rejection = prepared.error;
        return null;
      }
      return prepared.value;
    },
    async (claim) => {
      const secrets = claim.secrets;
      await executeDriveAttempt(
        c,
        claim.row,
        async (signal) => {
          const tokens = await service.authorization.exchange({
            code: input.code,
            verifier: secrets.verifier,
            signal,
          });
          validateTokens(tokens);
          if (!tokens.refreshToken)
            throw new BusinessRuleError(
              "DRIVE_REFRESH_REQUIRED",
              "Driveへの再同意が必要です。",
            );
          const identity = await service.authorization.verifyCandidate({
            tokens,
            nonceHash: claim.row.nonceHash,
            signal,
          });
          if (
            !["openid", "https://www.googleapis.com/auth/drive.file"].every(
              (scope) => identity.scopes.includes(scope),
            )
          )
            throw new BusinessRuleError(
              "DRIVE_SCOPE_REQUIRED",
              "Driveへの同意が必要です。",
            );
          if (signal.aborted || tokens.accessExpiresAt <= c.clock.now())
            throw driveChanged();
          parseDrive(driveCredentialSchema, {
            ...identity,
            envelope: "validation",
            accessExpiresAt: tokens.accessExpiresAt,
            connectedAt: c.clock.now(),
          });
          return {
            version: 1 as const,
            ...identity,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            accessExpiresAt: tokens.accessExpiresAt.toISOString(),
          };
        },
        async (u, row, value) => {
          if (
            !row.context ||
            !driveConfirmedFoldersMatch(
              confirmed(c, row),
              await driveFolderConfirmation(u, row.accountId),
            )
          ) {
            if (
              !(await u.driveAttempts.replace(
                {
                  ...row,
                  version: row.version + 1,
                  updatedAt: c.clock.now(),
                  terminalAt: c.clock.now(),
                  confirmedFolderIdsEnvelope: null,
                  data: { phase: "failed", failure: "DRIVE_CONTEXT_CHANGED" },
                },
                row.version,
              ))
            )
              throw driveChanged();
            return;
          }
          const serialized = JSON.stringify(parseDrive(candidateSchema, value));
          if (new TextEncoder().encode(serialized).length > 65536)
            return driveStateInvalid();
          const next: DriveAttempt = {
            ...row,
            version: row.version + 1,
            updatedAt: c.clock.now(),
            data: {
              phase: "candidate",
              candidateEnvelope: service.protector.protect(
                serialized,
                attemptBinding("candidate", row.id, row.context),
              ),
            },
          };
          if (!(await u.driveAttempts.replace(next, row.version)))
            throw driveChanged();
        },
      );
      await adoptDriveCandidate(c, claim.row.id);
      return c.unitOfWorkProvider.run(async (u) => {
        const row = await u.driveAttempts.find(claim.row.id);
        return { id: claim.row.id, phase: row?.data.phase ?? "failed" };
      });
    },
  );
  if (rejection) throw rejection;
  if (wrapped.kind === "settled") return wrapped.value;
  return c.unitOfWorkProvider.run(async (u) => {
    const row = await u.driveAttempts.find(initial.id);
    return { id: initial.id, phase: row?.data.phase ?? "failed" };
  });
}
export async function adoptDriveCandidate(c: HollowContainer, id: string) {
  return c.unitOfWorkProvider.run(async (u) => {
    const row = await u.driveAttempts.find(id);
    if (
      !row ||
      row.data.phase !== "candidate" ||
      row.owner.state !== "closed" ||
      !row.context
    )
      return false;
    const connection = await driveRecordCurrent(c, u, row);
    if (
      !connection ||
      !driveConfirmedFoldersMatch(
        confirmed(c, row),
        await driveFolderConfirmation(u, row.accountId),
      )
    )
      return false;
    if ((await u.driveControls.held(row.accountId)).account !== 0) return false;
    const candidate = parseDrive(
      candidateSchema,
      decodeDriveSecret(
        driveServices(c).protector.reveal(
          row.data.candidateEnvelope,
          attemptBinding("candidate", row.id, row.context),
        ),
      ),
    );
    const now = c.clock.now();
    if (new Date(candidate.accessExpiresAt) <= now) return false;
    const epoch = connection.epoch + 1;
    const credentialVersion = connection.credentialVersion + 1;
    const envelope = protectDriveTokens(c, candidate, {
      purpose: "credential",
      accountId: row.accountId,
      subject: candidate.subject,
      epoch,
      credentialVersion,
    });
    for (const old of await u.driveControls.liveForAccount(row.accountId))
      if (old.data.phase !== "failed" && old.data.phase !== "completed") {
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
    for (const old of await u.driveAttempts.liveForAccount(row.accountId))
      if (old.id !== row.id && old.terminalAt === null) {
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
    const credential = parseDrive(driveCredentialSchema, {
      subject: candidate.subject,
      email: candidate.email,
      scopes: candidate.scopes,
      envelope,
      accessExpiresAt: new Date(candidate.accessExpiresAt),
      connectedAt: now,
    });
    if (
      !(await u.driveConnections.replace(
        {
          ...connection,
          version: connection.version + 1,
          state: "linked",
          epoch,
          credentialVersion,
          settingsVersion: connection.settingsVersion + 1,
          credential,
          folder: null,
          lastUsedAt: null,
          updatedAt: now,
        },
        connection.version,
        "adopt",
      ))
    )
      throw driveChanged();
    if (
      !(await u.driveAttempts.replace(
        {
          ...row,
          version: row.version + 1,
          updatedAt: now,
          terminalAt: now,
          confirmedFolderIdsEnvelope: null,
          data: { phase: "completed", resultEpoch: epoch },
        },
        row.version,
      ))
    )
      throw driveChanged();
    return true;
  });
}
