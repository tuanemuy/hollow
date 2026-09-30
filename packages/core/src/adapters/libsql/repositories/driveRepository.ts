import {
  DRIVE_LIMITS,
  type DriveAttempt,
  type DriveConnection,
  type DriveControl,
  type DriveOwner,
  driveAttemptSchema,
  driveCanClaim,
  driveConnectionSchema,
  driveControlSchema,
  driveOwnerHeld,
  driveOwnerTransition,
  driveStateInvalid,
  parseDrive,
} from "@repo/core/domain/integration/drive";
import type {
  DriveAttemptRepository,
  DriveConnectionChange,
  DriveConnectionRepository,
  DriveControlRepository,
  DriveScan,
} from "@repo/core/domain/integration/driveRepository";
import {
  and,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import {
  driveAuthorizationAttempts as attempts,
  driveConnections as connections,
  driveControlOperations as controls,
} from "../driveSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const terminal = (phase: string) => phase === "completed" || phase === "failed";
const limit = (n: number) =>
  Number.isSafeInteger(n)
    ? Math.max(0, Math.min(n, DRIVE_LIMITS.pruneBatch))
    : 0;
const historyLimit = (n: number) =>
  Number.isSafeInteger(n) && n >= 1 && n <= 100 ? n : driveStateInvalid();

async function held(db: HollowTransaction, accountId: string) {
  const values = await Promise.all([
    db
      .select({ n: count() })
      .from(attempts)
      .where(inArray(attempts.ownerState, ["active", "unknown"])),
    db
      .select({ n: count() })
      .from(controls)
      .where(inArray(controls.ownerState, ["active", "unknown"])),
    db
      .select({ n: count() })
      .from(attempts)
      .where(
        and(
          eq(attempts.accountId, accountId),
          inArray(attempts.ownerState, ["active", "unknown"]),
        ),
      ),
    db
      .select({ n: count() })
      .from(controls)
      .where(
        and(
          eq(controls.accountId, accountId),
          inArray(controls.ownerState, ["active", "unknown"]),
        ),
      ),
  ]);
  return {
    global: (values[0][0]?.n ?? 0) + (values[1][0]?.n ?? 0),
    account: (values[2][0]?.n ?? 0) + (values[3][0]?.n ?? 0),
  };
}
async function queued(db: HollowTransaction, accountId: string) {
  const values = await Promise.all([
    db.select({ n: count() }).from(attempts).where(isNull(attempts.terminalAt)),
    db
      .select({ n: count() })
      .from(controls)
      .where(
        and(
          isNull(controls.terminalAt),
          inArray(controls.kind, [
            "refresh",
            "picker",
            "folder-select",
            "folder-create",
          ]),
        ),
      ),
    db
      .select({ n: count() })
      .from(attempts)
      .where(
        and(eq(attempts.accountId, accountId), isNull(attempts.terminalAt)),
      ),
    db
      .select({ n: count() })
      .from(controls)
      .where(
        and(
          eq(controls.accountId, accountId),
          isNull(controls.terminalAt),
          inArray(controls.kind, [
            "refresh",
            "picker",
            "folder-select",
            "folder-create",
          ]),
        ),
      ),
  ]);
  return {
    global: (values[0][0]?.n ?? 0) + (values[1][0]?.n ?? 0),
    account: (values[2][0]?.n ?? 0) + (values[3][0]?.n ?? 0),
  };
}

export class LibsqlDriveConnectionRepository
  implements DriveConnectionRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async find(accountId: string) {
    const [row] = await this.db
      .select()
      .from(connections)
      .where(eq(connections.accountId, accountId));
    return row ? parseDrive(driveConnectionSchema, row) : null;
  }
  async ensure(accountId: string, now: Date) {
    const initial: DriveConnection = parseDrive(driveConnectionSchema, {
      accountId,
      epoch: 0,
      version: 1,
      credentialVersion: 0,
      settingsVersion: 1,
      admissionSequence: 0,
      state: "unlinked",
      autoBackup: false,
      credential: null,
      folder: null,
      lastUsedAt: null,
      updatedAt: now,
    });
    await this.db.insert(connections).values(initial).onConflictDoNothing();
    const value = await this.find(accountId);
    if (!value) return driveStateInvalid();
    return value;
  }
  async replace(
    input: DriveConnection,
    expectedVersion: number,
    change: DriveConnectionChange,
  ) {
    const value = parseDrive(driveConnectionSchema, input);
    if (value.version !== expectedVersion + 1) return driveStateInvalid();
    const old = await this.find(value.accountId);
    if (!old || old.version !== expectedVersion) return false;
    if (value.updatedAt < old.updatedAt) return driveStateInvalid();
    const permitted: Record<
      DriveConnectionChange,
      readonly (keyof DriveConnection)[]
    > = {
      adopt: [
        "autoBackup",
        "state",
        "epoch",
        "credentialVersion",
        "settingsVersion",
        "credential",
        "folder",
        "lastUsedAt",
      ],
      disconnect: [
        "autoBackup",
        "state",
        "epoch",
        "credentialVersion",
        "settingsVersion",
        "credential",
        "folder",
        "lastUsedAt",
      ],
      refresh: ["credentialVersion", "credential"],
      folder: ["settingsVersion", "folder", "lastUsedAt"],
      invalidate: ["state"],
      touch: ["lastUsedAt"],
      admission: [],
      "folder-admission": ["admissionSequence"],
      "auto-setting": ["settingsVersion", "autoBackup"],
    };
    for (const key of Object.keys(old) as (keyof DriveConnection)[]) {
      if (
        key !== "version" &&
        key !== "updatedAt" &&
        !permitted[change].includes(key) &&
        !same(old[key], value[key])
      )
        return driveStateInvalid();
    }
    if (change === "adopt" || change === "disconnect") {
      if (
        value.autoBackup !== false ||
        value.epoch !== old.epoch + 1 ||
        value.credentialVersion !== old.credentialVersion + 1 ||
        value.settingsVersion !== old.settingsVersion + 1 ||
        value.folder !== null ||
        value.lastUsedAt !== null ||
        (change === "adopt"
          ? value.state !== "linked"
          : value.state !== "unlinked")
      )
        return driveStateInvalid();
      if (
        change === "adopt" &&
        (await held(this.db, value.accountId)).account !== 0
      )
        return false;
    } else if (change === "refresh") {
      if (
        old.state !== "linked" ||
        value.state !== "linked" ||
        value.credentialVersion !== old.credentialVersion + 1 ||
        value.credential.subject !== old.credential.subject ||
        !same(value.credential.connectedAt, old.credential.connectedAt)
      )
        return driveStateInvalid();
    } else if (change === "folder") {
      if (
        old.state !== "linked" ||
        value.state !== "linked" ||
        value.settingsVersion !== old.settingsVersion + 1 ||
        value.folder === null
      )
        return driveStateInvalid();
    } else if (change === "auto-setting") {
      if (
        value.settingsVersion !== old.settingsVersion + 1 ||
        (value.autoBackup &&
          (value.state !== "linked" || value.folder === null))
      )
        return driveStateInvalid();
    } else if (change === "invalidate") {
      if (old.state !== "linked" || value.state !== "needs-relink")
        return driveStateInvalid();
    } else if (
      change === "folder-admission" &&
      value.admissionSequence !== old.admissionSequence + 1
    )
      return driveStateInvalid();
    const rows = await this.db
      .update(connections)
      .set(value)
      .where(
        and(
          eq(connections.accountId, value.accountId),
          eq(connections.version, expectedVersion),
        ),
      )
      .returning({ id: connections.accountId });
    return rows.length === 1;
  }
}

type RecordRow = typeof attempts.$inferSelect | typeof controls.$inferSelect;
function decodedRecord(row: RecordRow) {
  return {
    id: row.id,
    accountId: row.accountId,
    commandId: row.commandId,
    intentDigest: row.intentDigest,
    context:
      row.sessionHash === null
        ? null
        : {
            accountId: row.accountId,
            sessionHash: row.sessionHash,
            authVersion: row.authVersion,
            browserHash: row.browserHash,
            browserEpoch: row.browserEpoch,
          },
    expectedEpoch: row.expectedEpoch,
    expectedCredentialVersion: row.expectedCredentialVersion,
    expectedSettingsVersion: row.expectedSettingsVersion,
    version: row.version,
    cancelGeneration: row.cancelGeneration,
    owner:
      row.ownerState === "none"
        ? { state: "none" }
        : {
            state: row.ownerState,
            runtimeGeneration: row.runtimeGeneration,
            token: row.ownerToken,
          },
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    updatedAt: row.updatedAt,
    terminalAt: row.terminalAt,
    data: row.data,
  };
}
function decodeAttempt(row: typeof attempts.$inferSelect): DriveAttempt {
  const value = parseDrive(driveAttemptSchema, {
    ...decodedRecord(row),
    stateHash: row.stateHash,
    nonceHash: row.nonceHash,
    confirmedAdmissionSequence: row.confirmedAdmissionSequence,
    confirmedFolderIdsEnvelope: row.confirmedFolderIdsEnvelope,
    returnTo: row.returnTo,
  });
  if (value.data.phase !== row.phase) return driveStateInvalid();
  return value;
}
function decodeControl(row: typeof controls.$inferSelect): DriveControl {
  const value = parseDrive(driveControlSchema, {
    ...decodedRecord(row),
    subject: row.subject,
    credentialUse: row.credentialUse,
  });
  if (value.data.kind !== row.kind || value.data.phase !== row.phase)
    return driveStateInvalid();
  return value;
}
function encodedRecord(value: DriveAttempt | DriveControl) {
  return {
    id: value.id,
    accountId: value.accountId,
    commandId: value.commandId,
    intentDigest: value.intentDigest,
    sessionHash: value.context?.sessionHash ?? null,
    authVersion: value.context?.authVersion ?? null,
    browserHash: value.context?.browserHash ?? null,
    browserEpoch: value.context?.browserEpoch ?? null,
    expectedEpoch: value.expectedEpoch,
    expectedCredentialVersion: value.expectedCredentialVersion,
    expectedSettingsVersion: value.expectedSettingsVersion,
    version: value.version,
    cancelGeneration: value.cancelGeneration,
    ownerState: value.owner.state,
    runtimeGeneration:
      value.owner.state === "none" ? null : value.owner.runtimeGeneration,
    ownerToken: value.owner.state === "none" ? null : value.owner.token,
    createdAt: value.createdAt,
    expiresAt: value.expiresAt,
    updatedAt: value.updatedAt,
    terminalAt: value.terminalAt,
    phase: value.data.phase,
    data: value.data,
  };
}
function immutableRecord(
  old: DriveAttempt | DriveControl,
  value: DriveAttempt | DriveControl,
  claim: boolean,
) {
  for (const key of [
    "id",
    "accountId",
    "commandId",
    "intentDigest",
    "expectedEpoch",
    "expectedCredentialVersion",
    "expectedSettingsVersion",
    "createdAt",
    "expiresAt",
  ] as const)
    if (!same(old[key], value[key])) return driveStateInvalid();
  if (value.context !== null && !same(old.context, value.context))
    return driveStateInvalid();
  if (
    value.context === null &&
    old.context !== null &&
    (!old.terminalAt ||
      driveOwnerHeld(old.owner) ||
      value.updatedAt.getTime() <
        old.terminalAt.getTime() + DRIVE_LIMITS.receiptMs)
  )
    return driveStateInvalid();
  if (
    value.updatedAt < old.updatedAt ||
    value.cancelGeneration < old.cancelGeneration ||
    value.cancelGeneration > old.cancelGeneration + 1 ||
    !driveOwnerTransition(old.owner, value.owner)
  )
    return driveStateInvalid();
  if (!driveOwnerHeld(old.owner) && value.owner.state === "active" && !claim)
    return driveStateInvalid();
  if (old.owner.state === "unknown" && value.owner.state === "active")
    return driveStateInvalid();
  if (
    terminal(old.data.phase) &&
    (!same(old.data, value.data) || !same(old.terminalAt, value.terminalAt))
  )
    return driveStateInvalid();
  if (
    value.cancelGeneration > 0 &&
    old.data.phase !== value.data.phase &&
    value.data.phase !== "failed"
  )
    return driveStateInvalid();
}
async function connectionCurrent(
  db: HollowTransaction,
  value: DriveAttempt | DriveControl,
) {
  const c = await new LibsqlDriveConnectionRepository(db).find(value.accountId);
  return (
    c !== null &&
    c.epoch === value.expectedEpoch &&
    c.settingsVersion === value.expectedSettingsVersion &&
    (!("subject" in value) ||
      (c.state !== "unlinked" && c.credential.subject === value.subject))
  );
}
async function admit(
  db: HollowTransaction,
  value: DriveAttempt | DriveControl,
) {
  const c = await new LibsqlDriveConnectionRepository(db).find(value.accountId);
  if (!c || !(await connectionCurrent(db, value))) return driveStateInvalid();
  if (c.credentialVersion !== value.expectedCredentialVersion)
    return driveStateInvalid();
  const opposite = "subject" in value ? attempts : controls;
  if (
    (
      await db
        .select({ id: opposite.id })
        .from(opposite)
        .where(
          and(
            eq(opposite.accountId, value.accountId),
            eq(opposite.commandId, value.commandId),
          ),
        )
        .limit(1)
    ).length
  )
    return driveStateInvalid();
  const folder =
    "kind" in value.data &&
    (value.data.kind === "folder-select" ||
      value.data.kind === "folder-create");
  if (!("kind" in value.data) || value.data.kind !== "disconnect") {
    const n = await queued(db, value.accountId);
    if (
      n.account >= DRIVE_LIMITS.accountQueued ||
      n.global >= DRIVE_LIMITS.globalQueued
    )
      return driveStateInvalid();
  }
  const repository = new LibsqlDriveConnectionRepository(db);
  if (
    !(await repository.replace(
      {
        ...c,
        version: c.version + 1,
        admissionSequence: c.admissionSequence + (folder ? 1 : 0),
        updatedAt: value.createdAt,
      },
      c.version,
      folder ? "folder-admission" : "admission",
    ))
  )
    return driveStateInvalid();
}

export class LibsqlDriveAttemptRepository implements DriveAttemptRepository {
  constructor(private readonly db: HollowTransaction) {}
  async scan(input: DriveScan) {
    const t = attempts;
    return (
      await this.db
        .select()
        .from(t)
        .where(
          and(
            input.kind === "held"
              ? inArray(t.ownerState, ["active", "unknown"])
              : and(
                  isNull(t.terminalAt),
                  gt(t.expiresAt, input.now),
                  eq(t.cancelGeneration, 0),
                  eq(
                    t.phase,
                    input.kind === "candidate" ? "candidate" : "pending",
                  ),
                  eq(
                    t.ownerState,
                    input.kind === "candidate" ? "closed" : "none",
                  ),
                ),
            input.after
              ? or(
                  gt(t.createdAt, input.after.createdAt),
                  and(
                    eq(t.createdAt, input.after.createdAt),
                    gt(t.id, input.after.id),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(t.createdAt, t.id)
        .limit(
          input.kind === "held"
            ? Math.min(3, limit(input.limit))
            : limit(input.limit),
        )
    ).map(decodeAttempt);
  }
  async history(accountId: string, since: Date, requested: number) {
    const maximum = historyLimit(requested);
    return (
      await this.db
        .select()
        .from(attempts)
        .where(
          and(
            eq(attempts.accountId, accountId),
            gte(attempts.createdAt, since),
          ),
        )
        .orderBy(desc(attempts.createdAt), desc(attempts.id))
        .limit(maximum)
    ).map(decodeAttempt);
  }
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(attempts)
      .where(eq(attempts.id, id));
    return row ? decodeAttempt(row) : null;
  }
  async findByState(hash: string) {
    const [row] = await this.db
      .select()
      .from(attempts)
      .where(eq(attempts.stateHash, hash));
    return row ? decodeAttempt(row) : null;
  }
  async findByCommand(accountId: string, commandId: string) {
    const [row] = await this.db
      .select()
      .from(attempts)
      .where(
        and(
          eq(attempts.accountId, accountId),
          eq(attempts.commandId, commandId),
        ),
      );
    return row ? decodeAttempt(row) : null;
  }
  async insert(input: DriveAttempt & { data: { phase: "pending" } }) {
    const value = parseDrive(driveAttemptSchema, input);
    if (
      value.version !== 1 ||
      value.cancelGeneration !== 0 ||
      value.data.phase !== "pending" ||
      !value.context
    )
      return driveStateInvalid();
    if (
      (await this.countRecent(
        value.context.browserHash,
        new Date(value.createdAt.getTime() - DRIVE_LIMITS.authorizationMs),
      )) >= DRIVE_LIMITS.browserRecent ||
      (await this.countLive(value.context.browserHash, value.createdAt)) >=
        DRIVE_LIMITS.browserAttempts
    )
      return driveStateInvalid();
    await admit(this.db, value);
    await this.db.insert(attempts).values({
      ...encodedRecord(value),
      stateHash: value.stateHash,
      nonceHash: value.nonceHash,
      confirmedAdmissionSequence: value.confirmedAdmissionSequence,
      confirmedFolderIdsEnvelope: value.confirmedFolderIdsEnvelope,
      returnTo: value.returnTo,
    });
  }
  async replace(value: DriveAttempt, expectedVersion: number) {
    return this.apply(value, expectedVersion, false);
  }
  private async apply(
    input: DriveAttempt,
    expectedVersion: number,
    claim: boolean,
  ) {
    const value = parseDrive(driveAttemptSchema, input);
    if (value.version !== expectedVersion + 1) return driveStateInvalid();
    const old = await this.find(value.id);
    if (!old || old.version !== expectedVersion) return false;
    immutableRecord(old, value, claim);
    if (
      value.confirmedFolderIdsEnvelope !== old.confirmedFolderIdsEnvelope &&
      !(terminal(value.data.phase) && value.confirmedFolderIdsEnvelope === null)
    )
      return driveStateInvalid();
    for (const key of [
      "stateHash",
      "nonceHash",
      "confirmedAdmissionSequence",
      "returnTo",
    ] as const)
      if (!same(old[key], value[key])) return driveStateInvalid();
    const transitions: Record<
      DriveAttempt["data"]["phase"],
      readonly string[]
    > = {
      pending: ["pending", "exchanging", "failed"],
      exchanging: ["exchanging", "candidate", "failed"],
      candidate: ["candidate", "completed", "failed"],
      completed: ["completed"],
      failed: ["failed"],
    };
    if (!transitions[old.data.phase].includes(value.data.phase))
      return driveStateInvalid();
    if (old.data.phase === value.data.phase && !same(old.data, value.data))
      return driveStateInvalid();
    const rows = await this.db
      .update(attempts)
      .set({
        ...encodedRecord(value),
        confirmedFolderIdsEnvelope: value.confirmedFolderIdsEnvelope,
      })
      .where(
        and(eq(attempts.id, value.id), eq(attempts.version, expectedVersion)),
      )
      .returning({ id: attempts.id });
    return rows.length === 1;
  }
  async claim(
    id: string,
    expectedVersion: number,
    owner: DriveOwner & { state: "active" },
    now: Date,
  ) {
    const old = await this.find(id);
    if (
      !old ||
      old.version !== expectedVersion ||
      old.data.phase !== "pending" ||
      old.expiresAt <= now ||
      old.cancelGeneration !== 0
    )
      return false;
    if (!(await connectionCurrent(this.db, old))) return false;
    const n = await held(this.db, old.accountId);
    if (!driveCanClaim({ globalHeld: n.global, accountHeld: n.account }))
      return false;
    return this.apply(
      {
        ...old,
        version: old.version + 1,
        data: { phase: "exchanging" },
        owner,
        updatedAt: now,
      },
      expectedVersion,
      true,
    );
  }
  async countRecent(browserHash: string, since: Date) {
    const [r] = await this.db
      .select({ n: count() })
      .from(attempts)
      .where(
        and(
          eq(attempts.browserHash, browserHash),
          gte(attempts.createdAt, since),
        ),
      );
    return r?.n ?? 0;
  }
  async countLive(browserHash: string, now: Date) {
    const [r] = await this.db
      .select({ n: count() })
      .from(attempts)
      .where(
        and(
          eq(attempts.browserHash, browserHash),
          or(
            isNull(attempts.terminalAt),
            inArray(attempts.ownerState, ["active", "unknown"]),
          ),
        ),
      );
    void now;
    return r?.n ?? 0;
  }
  async liveForAccount(accountId: string) {
    return (
      await this.db
        .select()
        .from(attempts)
        .where(
          and(
            eq(attempts.accountId, accountId),
            or(
              isNull(attempts.terminalAt),
              inArray(attempts.ownerState, ["active", "unknown"]),
            ),
          ),
        )
        .orderBy(attempts.createdAt, attempts.id)
        .limit(103)
    ).map(decodeAttempt);
  }
  async prune(now: Date, requested: number) {
    const rows = await this.db
      .select()
      .from(attempts)
      .where(
        and(
          inArray(attempts.ownerState, ["none", "closed"]),
          or(
            and(isNull(attempts.terminalAt), lte(attempts.expiresAt, now)),
            and(
              isNotNull(attempts.browserHash),
              lte(
                attempts.terminalAt,
                new Date(now.getTime() - DRIVE_LIMITS.receiptMs),
              ),
            ),
            lte(
              attempts.terminalAt,
              new Date(now.getTime() - DRIVE_LIMITS.historyMs),
            ),
          ),
        ),
      )
      .orderBy(attempts.createdAt, attempts.id)
      .limit(limit(requested));
    for (const row of rows) {
      const old = decodeAttempt(row);
      if (
        old.terminalAt &&
        old.terminalAt.getTime() <= now.getTime() - DRIVE_LIMITS.historyMs
      )
        await this.db
          .delete(attempts)
          .where(
            and(eq(attempts.id, old.id), eq(attempts.version, old.version)),
          );
      else if (old.terminalAt)
        await this.replace(
          { ...old, context: null, version: old.version + 1, updatedAt: now },
          old.version,
        );
      else
        await this.replace(
          {
            ...old,
            data: { phase: "failed", failure: "DRIVE_EXPIRED" },
            confirmedFolderIdsEnvelope: null,
            terminalAt: now,
            updatedAt: now,
            version: old.version + 1,
          },
          old.version,
        );
    }
    return rows.length;
  }
}

export class LibsqlDriveControlRepository implements DriveControlRepository {
  constructor(private readonly db: HollowTransaction) {}
  async scan(input: DriveScan) {
    if (input.kind === "candidate") return [];
    const t = controls;
    return (
      await this.db
        .select()
        .from(t)
        .where(
          and(
            input.kind === "held"
              ? inArray(t.ownerState, ["active", "unknown"])
              : and(
                  isNull(t.terminalAt),
                  gt(t.expiresAt, input.now),
                  eq(t.cancelGeneration, 0),
                  or(
                    and(eq(t.phase, "queued"), eq(t.ownerState, "none")),
                    and(
                      eq(t.kind, "folder-create"),
                      eq(t.phase, "prepared"),
                      eq(t.ownerState, "closed"),
                    ),
                  ),
                ),
            input.after
              ? or(
                  gt(t.createdAt, input.after.createdAt),
                  and(
                    eq(t.createdAt, input.after.createdAt),
                    gt(t.id, input.after.id),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(t.createdAt, t.id)
        .limit(
          input.kind === "held"
            ? Math.min(3, limit(input.limit))
            : limit(input.limit),
        )
    ).map(decodeControl);
  }
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(controls)
      .where(eq(controls.id, id));
    return row ? decodeControl(row) : null;
  }
  async findByCommand(accountId: string, commandId: string) {
    const [row] = await this.db
      .select()
      .from(controls)
      .where(
        and(
          eq(controls.accountId, accountId),
          eq(controls.commandId, commandId),
        ),
      );
    return row ? decodeControl(row) : null;
  }
  async insert(input: DriveControl & { data: { phase: "queued" } }) {
    const value = parseDrive(driveControlSchema, input);
    if (
      value.version !== 1 ||
      value.cancelGeneration !== 0 ||
      value.data.phase !== "queued"
    )
      return driveStateInvalid();
    const live = await this.liveForAccount(value.accountId);
    if (
      (value.data.kind === "picker" ||
        value.data.kind === "refresh" ||
        value.data.kind === "disconnect") &&
      live.some((v) => v.data.kind === value.data.kind)
    )
      return driveStateInvalid();
    await admit(this.db, value);
    await this.db.insert(controls).values({
      ...encodedRecord(value),
      subject: value.subject,
      kind: value.data.kind,
      credentialUse: value.credentialUse,
    });
  }
  async replace(value: DriveControl, expectedVersion: number) {
    return this.apply(value, expectedVersion, false);
  }
  private async apply(
    input: DriveControl,
    expectedVersion: number,
    claim: boolean,
    refreshing = false,
  ) {
    const value = parseDrive(driveControlSchema, input);
    if (value.version !== expectedVersion + 1) return driveStateInvalid();
    const old = await this.find(value.id);
    if (!old || old.version !== expectedVersion) return false;
    immutableRecord(old, value, claim);
    if (!same(old.credentialUse, value.credentialUse)) {
      if (claim) {
        const c = await new LibsqlDriveConnectionRepository(this.db).find(
          old.accountId,
        );
        if (
          !c ||
          value.credentialUse.kind !== "bound" ||
          value.credentialUse.version !== c.credentialVersion
        )
          return driveStateInvalid();
      } else if (
        !(
          refreshing &&
          old.credentialUse.kind === "bound" &&
          value.credentialUse.kind === "self-refreshed" &&
          value.credentialUse.fromVersion === old.credentialUse.version &&
          value.credentialUse.version === old.credentialUse.version + 1 &&
          old.owner.state === "active" &&
          same(old.owner, value.owner) &&
          same(old.data, value.data)
        )
      )
        return driveStateInvalid();
    }
    if (old.subject !== value.subject || old.data.kind !== value.data.kind)
      return driveStateInvalid();
    const allowed: Record<string, readonly string[]> = {
      queued: ["queued", "running", "allocating", "completed", "failed"],
      allocating: ["allocating", "prepared", "failed"],
      prepared: ["prepared", "running", "failed"],
      running: [
        "running",
        "awaiting-selection",
        "ready",
        "reconciling",
        "completed",
        "failed",
      ],
      "awaiting-selection": ["awaiting-selection", "completed", "failed"],
      ready: [
        "ready",
        "verifying-target",
        "reconciling",
        "completed",
        "failed",
      ],
      "verifying-target": ["verifying-target", "completed", "failed"],
      reconciling: ["reconciling", "running", "ready", "completed", "failed"],
      completed: ["completed"],
      failed: ["failed"],
    };
    if (
      !allowed[old.data.phase]?.includes(value.data.phase) ||
      (old.data.phase === "queued" &&
        value.data.phase === "completed" &&
        old.data.kind !== "disconnect")
    )
      return driveStateInvalid();
    if (old.data.phase === value.data.phase && !same(old.data, value.data))
      return driveStateInvalid();
    if (
      old.data.phase === "ready" &&
      (value.data.phase === "verifying-target" ||
        value.data.phase === "reconciling") &&
      !claim
    )
      return driveStateInvalid();
    if (
      old.data.kind === "folder-create" &&
      value.data.kind === "folder-create"
    ) {
      const before =
        "fileId" in old.data
          ? old.data
          : old.data.phase === "failed"
            ? old.data.identity
            : null;
      const after =
        "fileId" in value.data
          ? value.data
          : value.data.phase === "failed"
            ? value.data.identity
            : null;
      if (
        before &&
        (!after ||
          before.fileId !== after.fileId ||
          before.marker !== after.marker ||
          after.sends < before.sends ||
          after.sends > before.sends + 1 ||
          (value.data.phase === "running" &&
            (old.data.phase !== "running" || claim) &&
            (!claim || after.sends !== before.sends + 1)) ||
          (after.sends !== before.sends &&
            (!claim || value.data.phase !== "running")))
      )
        return driveStateInvalid();
      if (
        before &&
        after &&
        before.observedParent !== null &&
        before.observedParent !== after.observedParent
      )
        return driveStateInvalid();
    }
    if (
      old.data.kind === "folder-select" &&
      value.data.kind === "folder-select"
    ) {
      if (
        "fileId" in old.data &&
        "fileId" in value.data &&
        (old.data.fileId !== value.data.fileId ||
          old.data.pickerId !== value.data.pickerId ||
          old.data.resourceKeyEnvelope !== value.data.resourceKeyEnvelope)
      )
        return driveStateInvalid();
      if (
        "fileId" in old.data &&
        value.data.phase === "ready" &&
        old.data.fileId !== value.data.sourceId
      )
        return driveStateInvalid();
      if (value.data.phase === "completed") {
        const target =
          old.data.phase === "ready" || old.data.phase === "verifying-target"
            ? old.data.targetId
            : "fileId" in old.data
              ? old.data.fileId
              : old.data.phase === "completed"
                ? old.data.folderId
                : null;
        if (target !== value.data.folderId) return driveStateInvalid();
      }
      if (
        value.data.phase === "verifying-target" &&
        old.data.phase !== "verifying-target" &&
        (old.data.phase !== "ready" ||
          value.data.confirmedReadyVersion !== old.version ||
          value.data.sourceId !== old.data.sourceId ||
          value.data.targetId !== old.data.targetId ||
          value.data.targetName !== old.data.targetName ||
          value.data.targetKeyEnvelope !== old.data.targetKeyEnvelope)
      )
        return driveStateInvalid();
    }
    const rows = await this.db
      .update(controls)
      .set({ ...encodedRecord(value), credentialUse: value.credentialUse })
      .where(
        and(eq(controls.id, value.id), eq(controls.version, expectedVersion)),
      )
      .returning({ id: controls.id });
    return rows.length === 1;
  }
  async refreshCredential(
    input: Readonly<{
      control: DriveControl;
      expectedVersion: number;
      connection: DriveConnection;
      expectedConnectionVersion: number;
    }>,
  ) {
    const old = await this.find(input.control.id);
    const c = await new LibsqlDriveConnectionRepository(this.db).find(
      input.control.accountId,
    );
    if (
      !old ||
      !c ||
      old.version !== input.expectedVersion ||
      c.version !== input.expectedConnectionVersion ||
      old.cancelGeneration !== 0 ||
      old.expiresAt <= input.control.updatedAt ||
      terminal(old.data.phase) ||
      old.owner.state !== "active" ||
      old.credentialUse.kind !== "bound" ||
      old.credentialUse.version !== c.credentialVersion ||
      !same(old.owner, input.control.owner) ||
      !(await connectionCurrent(this.db, old)) ||
      input.connection.accountId !== old.accountId
    )
      return driveStateInvalid();
    if (
      !(await new LibsqlDriveConnectionRepository(this.db).replace(
        input.connection,
        c.version,
        "refresh",
      )) ||
      !(await this.apply(input.control, old.version, false, true))
    )
      return driveStateInvalid();
    return input.control;
  }
  async claim(value: DriveControl, expectedVersion: number) {
    const old = await this.find(value.id);
    if (
      !old ||
      terminal(old.data.phase) ||
      old.version !== expectedVersion ||
      old.cancelGeneration !== 0 ||
      old.expiresAt <= value.updatedAt ||
      driveOwnerHeld(old.owner) ||
      value.owner.state !== "active"
    )
      return false;
    if (!(await connectionCurrent(this.db, old))) return false;
    const connection = await new LibsqlDriveConnectionRepository(this.db).find(
      old.accountId,
    );
    if (
      !connection ||
      value.credentialUse.kind !== "bound" ||
      value.credentialUse.version !== connection.credentialVersion
    )
      return false;
    const n = await held(this.db, old.accountId);
    if (!driveCanClaim({ globalHeld: n.global, accountHeld: n.account }))
      return false;
    return this.apply(value, expectedVersion, true);
  }
  held(accountId: string) {
    return held(this.db, accountId);
  }
  queued(accountId: string) {
    return queued(this.db, accountId);
  }
  async liveForAccount(accountId: string) {
    return (
      await this.db
        .select()
        .from(controls)
        .where(
          and(
            eq(controls.accountId, accountId),
            or(
              isNull(controls.terminalAt),
              inArray(controls.ownerState, ["active", "unknown"]),
            ),
          ),
        )
        .orderBy(controls.createdAt, controls.id)
        .limit(103)
    ).map(decodeControl);
  }
  async history(accountId: string, since: Date, requested: number) {
    const maximum = historyLimit(requested);
    return (
      await this.db
        .select()
        .from(controls)
        .where(
          and(
            eq(controls.accountId, accountId),
            gte(controls.createdAt, since),
            inArray(controls.kind, [
              "folder-select",
              "folder-create",
              "disconnect",
            ]),
          ),
        )
        .orderBy(desc(controls.createdAt), desc(controls.id))
        .limit(maximum)
    ).map(decodeControl);
  }
  async prune(now: Date, requested: number) {
    const rows = await this.db
      .select()
      .from(controls)
      .where(
        and(
          inArray(controls.ownerState, ["none", "closed"]),
          or(
            and(isNull(controls.terminalAt), lte(controls.expiresAt, now)),
            and(
              isNotNull(controls.browserHash),
              lte(
                controls.terminalAt,
                new Date(now.getTime() - DRIVE_LIMITS.receiptMs),
              ),
            ),
            lte(
              controls.terminalAt,
              new Date(now.getTime() - DRIVE_LIMITS.historyMs),
            ),
          ),
        ),
      )
      .orderBy(controls.createdAt, controls.id)
      .limit(limit(requested));
    for (const row of rows) {
      const old = decodeControl(row);
      const retention =
        old.data.kind === "refresh" || old.data.kind === "picker"
          ? DRIVE_LIMITS.receiptMs
          : DRIVE_LIMITS.historyMs;
      if (
        old.terminalAt &&
        old.terminalAt.getTime() <= now.getTime() - retention
      )
        await this.db
          .delete(controls)
          .where(
            and(eq(controls.id, old.id), eq(controls.version, old.version)),
          );
      else if (old.terminalAt)
        await this.replace(
          { ...old, context: null, updatedAt: now, version: old.version + 1 },
          old.version,
        );
      else {
        const data =
          old.data.kind === "folder-create"
            ? {
                kind: "folder-create" as const,
                phase: "failed" as const,
                failure: "DRIVE_EXPIRED" as const,
                identity:
                  "fileId" in old.data
                    ? {
                        fileId: old.data.fileId,
                        marker: old.data.marker,
                        sends: old.data.sends,
                        observedParent: old.data.observedParent,
                      }
                    : null,
              }
            : {
                kind: old.data.kind,
                phase: "failed" as const,
                failure: "DRIVE_EXPIRED" as const,
              };
        await this.replace(
          {
            ...old,
            data,
            terminalAt: now,
            updatedAt: now,
            version: old.version + 1,
          },
          old.version,
        );
      }
    }
    return rows.length;
  }
}
