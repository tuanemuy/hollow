import {
  ConflictError,
  SystemError,
  SystemErrorCode,
} from "@repo/core/application/errors";
import {
  ACCOUNT_DELETION_PAGE_SIZE,
  type AccountDeletionIntent,
  accountDeletionTables,
  type CredentialUse,
  type CredentialUseTarget,
  credentialUseKey,
  type DriveAcknowledgment,
  type DriveAcknowledgmentTarget,
} from "@repo/core/domain/account/deletion";
import type {
  AccountDeletionRepository,
  AccountDeletionResource,
} from "@repo/core/domain/account/ports/accountDeletionRepository";
import { BusinessRuleError } from "@repo/core/domain/error";
import { and, asc, eq, gt, inArray, lte, or, type SQL, sql } from "drizzle-orm";
import { z } from "zod";
import {
  credentialOrigins,
  credentialUses,
  driveAcknowledgments,
  accountDeletions as intents,
  accountDeletionPurges as purges,
} from "../accountDeletionSchema";
import { accounts, notes } from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";

function corrupt(): never {
  throw new SystemError(
    SystemErrorCode.DataIntegrityError,
    "退会の回収状態を確認できません。",
  );
}
const positiveVersion = z.number().int().positive().safe();
const accountAuthority = z
  .object({
    kind: z.literal("account"),
    accountId: z.string().min(1).max(256),
    authVersion: positiveVersion,
    browserHash: z.string().min(1).max(128),
    browserEpoch: positiveVersion,
  })
  .strict();
const googleAuthority = z.union([
  accountAuthority,
  z
    .object({
      kind: z.literal("unresolved-google"),
      accountId: z.null(),
      authVersion: z.null(),
      browserHash: z.string().min(1).max(128),
      browserEpoch: positiveVersion,
    })
    .strict(),
]);
const credentialBinding = z.union([
  z
    .object({
      provider: z.literal("google"),
      operation: z.literal("callback"),
      source: z
        .object({
          kind: z.literal("google-attempt"),
          id: z.string().min(1).max(256),
          version: positiveVersion,
        })
        .strict(),
      authority: googleAuthority,
    })
    .strict(),
  z
    .object({
      provider: z.literal("openrouter"),
      operation: z.enum(["callback", "retry"]),
      source: z
        .object({
          kind: z.literal("openrouter-attempt"),
          id: z.string().min(1).max(256),
          version: positiveVersion,
        })
        .strict(),
      authority: accountAuthority,
    })
    .strict(),
  z
    .object({
      provider: z.literal("openrouter"),
      operation: z.literal("check"),
      source: z
        .object({
          kind: z.literal("openrouter-connection"),
          id: z.string().min(1).max(256),
          version: positiveVersion,
          epoch: positiveVersion,
        })
        .strict(),
      authority: accountAuthority,
    })
    .strict(),
]);
function credentialRow(row: typeof credentialUses.$inferSelect): CredentialUse {
  const parsed = credentialBinding.safeParse(row.binding);
  if (
    !parsed.success ||
    parsed.data.provider !== row.provider ||
    parsed.data.source.id !== row.sourceId ||
    parsed.data.authority.accountId !== row.accountId
  )
    return corrupt();
  const target: CredentialUseTarget = {
    id: row.id,
    binding: parsed.data,
    owner: {
      runtimeId: row.runtimeId,
      token: row.ownerToken,
      generation: row.generation,
    },
  };
  const base = { target, version: row.version };
  if (
    (row.state === "active" || row.state === "unknown") &&
    !row.callerEnded &&
    !row.acknowledged &&
    row.evidenceId === null
  )
    return {
      ...base,
      state: row.state,
      callerEnded: false,
      acknowledged: false,
      evidenceId: null,
    };
  if (row.state === "closed" && row.callerEnded && row.evidenceId !== null)
    return {
      ...base,
      state: "closed",
      callerEnded: true,
      acknowledged: row.acknowledged,
      evidenceId: row.evidenceId,
    };
  return corrupt();
}
const sameTarget = (a: CredentialUseTarget, b: CredentialUseTarget) =>
  credentialUseKey(a) === credentialUseKey(b);
function hydrate(row: typeof intents.$inferSelect): AccountDeletionIntent {
  if (!accountDeletionTables.includes(row.table)) return corrupt();
  const base = {
    id: row.id,
    accountId: row.accountId,
    fenceAuthVersion: row.fenceAuthVersion,
    acceptedAt: row.acceptedAt,
    version: row.version,
    cursor: { table: row.table, afterId: row.afterId },
    nextAttemptAt: row.nextAttemptAt,
  };
  if (
    row.state === "running" &&
    row.leaseToken !== null &&
    row.leaseUntil !== null
  )
    return {
      ...base,
      state: "running",
      leaseToken: row.leaseToken,
      leaseUntil: row.leaseUntil,
    };
  if (
    row.state !== "running" &&
    row.leaseToken === null &&
    row.leaseUntil === null
  )
    return { ...base, state: row.state, leaseToken: null, leaseUntil: null };
  return corrupt();
}

export class LibsqlAccountDeletionRepository
  implements AccountDeletionRepository
{
  constructor(private readonly db: HollowTransaction) {}
  async driveAcknowledgment(value: DriveAcknowledgment) {
    return (
      (
        await this.db
          .select({ id: driveAcknowledgments.id })
          .from(driveAcknowledgments)
          .where(
            and(
              eq(driveAcknowledgments.kind, value.kind),
              eq(driveAcknowledgments.id, value.id),
              eq(
                driveAcknowledgments.runtimeGeneration,
                value.runtimeGeneration,
              ),
              eq(driveAcknowledgments.ownerToken, value.ownerToken),
              eq(driveAcknowledgments.evidenceId, value.evidenceId),
            ),
          )
      ).length === 1
    );
  }
  async saveDriveAcknowledgment(value: DriveAcknowledgment) {
    if (await this.driveAcknowledgment(value)) return true;
    const physical =
      value.kind === "authorization"
        ? "drive_authorization_attempts"
        : value.kind === "control"
          ? "drive_control_operations"
          : "drive_backup_transfers";
    const rows = await this.db.all<{ account_id: string }>(
      sql`select account_id from ${sql.raw(physical)} where id=${value.id} and owner_state='closed' and runtime_generation=${value.runtimeGeneration} and owner_token=${value.ownerToken}`,
    );
    if (rows.length !== 1) return false;
    const accountId = rows[0]?.account_id;
    if (accountId === undefined) return corrupt();
    await this.db
      .insert(driveAcknowledgments)
      .values({ ...value, accountId })
      .onConflictDoNothing();
    return this.driveAcknowledgment(value);
  }
  async pendingDriveAcknowledgments(
    predecessorGenerations: readonly string[],
  ): Promise<readonly DriveAcknowledgmentTarget[]> {
    if (predecessorGenerations.length === 0) return [];
    if (
      predecessorGenerations.length > 64 ||
      new Set(predecessorGenerations).size !== predecessorGenerations.length
    )
      return corrupt();
    const generations = sql.join(
      predecessorGenerations.map((g) => sql`${g}`),
      sql`, `,
    );
    const rows = await this.db.all<{
      kind: string;
      id: string;
      runtime_generation: string;
      owner_token: string;
    }>(sql`select d.* from (
      select 'authorization' kind,id,runtime_generation,owner_token from drive_authorization_attempts where owner_state='closed'
      union all select 'control' kind,id,runtime_generation,owner_token from drive_control_operations where owner_state='closed'
      union all select 'backup' kind,id,runtime_generation,owner_token from drive_backup_transfers where owner_state='closed'
    ) d where d.runtime_generation in(${generations}) and not exists(select 1 from account_deletion_drive_acknowledgments a where a.kind=d.kind and a.id=d.id and a.runtime_generation=d.runtime_generation and a.owner_token=d.owner_token) order by d.kind,d.id limit ${ACCOUNT_DELETION_PAGE_SIZE}`);
    return rows.map((row) => {
      if (
        row.kind !== "authorization" &&
        row.kind !== "control" &&
        row.kind !== "backup"
      )
        return corrupt();
      if (
        typeof row.id !== "string" ||
        typeof row.runtime_generation !== "string" ||
        typeof row.owner_token !== "string"
      )
        return corrupt();
      return {
        kind: row.kind,
        id: row.id,
        runtimeGeneration: row.runtime_generation,
        ownerToken: row.owner_token,
      };
    });
  }
  async beginCredentialUse(target: CredentialUseTarget) {
    const binding = credentialBinding.parse(target.binding);
    const authority = binding.authority;
    if (
      authority.kind === "account" &&
      (
        await this.db.all(
          sql`select 1 from accounts where id=${authority.accountId} and state='active' and auth_version=${authority.authVersion}`,
        )
      ).length !== 1
    )
      throw new ConflictError(
        "AUTH_CONTEXT_CHANGED",
        "認証状況が変わりました。",
      );
    const source = binding.source;
    let current: SQL;
    switch (source.kind) {
      case "google-attempt":
        current = sql`select 1 from google_auth_attempts where id=${source.id} and version=${source.version} and state='exchanging' and browser_hash=${authority.browserHash} and browser_epoch=${authority.browserEpoch} and ((actor_account_id is null and ${authority.kind}='unresolved-google') or (actor_account_id=${authority.accountId} and actor_auth_version=${authority.authVersion}))`;
        break;
      case "openrouter-attempt":
        current = sql`select 1 from openrouter_attempts where id=${source.id} and version=${source.version} and account_id=${authority.accountId} and auth_version=${authority.authVersion} and browser_hash=${authority.browserHash} and browser_epoch=${authority.browserEpoch} and ((${binding.operation}='callback' and state='pending') or (${binding.operation}='retry' and state='checking'))`;
        break;
      case "openrouter-connection":
        current = sql`select 1 from openrouter_connections where account_id=${source.id} and version=${source.version} and epoch=${source.epoch} and state='linked' and account_id=${authority.accountId}`;
        break;
    }
    if (
      (await this.db.all(current)).length !== 1 ||
      target.owner.generation !== 1
    )
      throw new ConflictError(
        "CREDENTIAL_USE_CHANGED",
        "連携処理の状態が変わりました。",
      );
    await this.db.insert(credentialUses).values({
      id: target.id,
      provider: binding.provider,
      binding,
      accountId: authority.accountId,
      sourceId: source.id,
      runtimeId: target.owner.runtimeId,
      ownerToken: target.owner.token,
      generation: target.owner.generation,
      version: 1,
      state: "active",
      callerEnded: false,
      acknowledged: false,
    });
  }
  async credentialUse(id: string) {
    const [row] = await this.db
      .select()
      .from(credentialUses)
      .where(eq(credentialUses.id, id));
    return row ? credentialRow(row) : null;
  }
  async saveCredentialOrigin(target: CredentialUseTarget) {
    const saved = await this.credentialUse(target.id);
    if (!saved || !sameTarget(saved.target, target)) return false;
    const { binding } = target;
    const source = binding.source;
    let adopted: SQL;
    if (source.kind === "google-attempt") return false;
    if (source.kind === "openrouter-attempt")
      adopted = sql`select a.account_id,c.epoch credential_epoch from openrouter_attempts a join openrouter_connections c on c.account_id=a.account_id and c.epoch=a.result_epoch join accounts actor on actor.id=a.account_id where a.id=${source.id} and a.version>${source.version} and a.account_id=${binding.authority.accountId} and a.state='completed' and a.browser_hash=${binding.authority.browserHash} and a.browser_epoch=${binding.authority.browserEpoch} and c.state='linked' and c.credential_envelope is not null`;
    else return false;
    const [row] = await this.db.all<{
      account_id: string;
      credential_epoch: number | null;
    }>(adopted);
    if (!row) return false;
    await this.db
      .update(credentialUses)
      .set({ resultAccountId: row.account_id })
      .where(
        and(
          eq(credentialUses.id, target.id),
          sql`${credentialUses.resultAccountId} is null or ${credentialUses.resultAccountId}=${row.account_id}`,
        ),
      );
    const [origin] = await this.db
      .select()
      .from(credentialOrigins)
      .where(
        and(
          eq(credentialOrigins.provider, binding.provider),
          eq(credentialOrigins.accountId, row.account_id),
        ),
      );
    if (origin?.mode === "legacy-unproven") return false;
    await this.db
      .insert(credentialOrigins)
      .values({
        provider: binding.provider,
        accountId: row.account_id,
        mode: "native-v1",
        useId: target.id,
        credentialEpoch: row.credential_epoch,
      })
      .onConflictDoUpdate({
        target: [credentialOrigins.provider, credentialOrigins.accountId],
        set: { useId: target.id, credentialEpoch: row.credential_epoch },
        setWhere: eq(credentialOrigins.mode, "native-v1"),
      });
    return true;
  }
  async adoptGoogleCredentials(
    input: Readonly<{
      attemptId: string;
      expectedVersion: number;
      accountId: string;
    }>,
  ) {
    const rows = await this.db
      .select()
      .from(credentialUses)
      .where(
        and(
          eq(credentialUses.provider, "google"),
          eq(credentialUses.sourceId, input.attemptId),
          sql`exists(select 1 from google_auth_attempts a join google_identities g on g.account_id=${input.accountId} and g.subject=json_extract(a.claims,'$.subject') join accounts current_account on current_account.id=g.account_id and current_account.state='active' where a.id=${input.attemptId} and a.version=${input.expectedVersion} and a.version>json_extract(${credentialUses.binding},'$.source.version') and ((a.state='verified' and ${credentialUses.state}='active') or (a.state='proof-required' and ${credentialUses.state}='closed' and ${credentialUses.callerEnded}=1 and ${credentialUses.acknowledged}=1)) and a.browser_hash=json_extract(${credentialUses.binding},'$.authority.browserHash') and a.browser_epoch=json_extract(${credentialUses.binding},'$.authority.browserEpoch') and a.actor_account_id is ${credentialUses.accountId} and a.actor_auth_version is json_extract(${credentialUses.binding},'$.authority.authVersion'))`,
        ),
      )
      .orderBy(asc(credentialUses.id))
      .limit(ACCOUNT_DELETION_PAGE_SIZE);
    for (const row of rows) {
      credentialRow(row);
      await this.db
        .update(credentialUses)
        .set({ resultAccountId: input.accountId })
        .where(
          and(
            eq(credentialUses.id, row.id),
            sql`${credentialUses.resultAccountId} is null or ${credentialUses.resultAccountId}=${input.accountId}`,
          ),
        );
      const [origin] = await this.db
        .select()
        .from(credentialOrigins)
        .where(
          and(
            eq(credentialOrigins.provider, "google"),
            eq(credentialOrigins.accountId, input.accountId),
          ),
        );
      if (origin?.mode === "legacy-unproven") continue;
      await this.db
        .insert(credentialOrigins)
        .values({
          provider: "google",
          accountId: input.accountId,
          mode: "native-v1",
          useId: row.id,
          credentialEpoch: null,
        })
        .onConflictDoUpdate({
          target: [credentialOrigins.provider, credentialOrigins.accountId],
          set: { useId: row.id },
          setWhere: eq(credentialOrigins.mode, "native-v1"),
        });
    }
  }
  async saveCredentialClosure(
    target: CredentialUseTarget,
    evidenceId: string,
    expectedVersion: number,
  ) {
    const saved = await this.credentialUse(target.id);
    if (!saved || !sameTarget(saved.target, target)) return false;
    if (saved.state === "closed") return saved.evidenceId === evidenceId;
    if (saved.version !== expectedVersion) return false;
    const rows = await this.db
      .update(credentialUses)
      .set({
        state: "closed",
        callerEnded: true,
        evidenceId,
        version: expectedVersion + 1,
      })
      .where(
        and(
          eq(credentialUses.id, target.id),
          eq(credentialUses.version, expectedVersion),
          eq(credentialUses.runtimeId, target.owner.runtimeId),
          eq(credentialUses.ownerToken, target.owner.token),
        ),
      )
      .returning({ id: credentialUses.id });
    return rows.length === 1;
  }
  async acknowledgeCredentialUse(
    target: CredentialUseTarget,
    evidenceId: string,
    expectedVersion: number,
  ) {
    const saved = await this.credentialUse(target.id);
    if (
      !saved ||
      !sameTarget(saved.target, target) ||
      saved.state !== "closed" ||
      saved.evidenceId !== evidenceId
    )
      return false;
    if (saved.acknowledged) return true;
    if (saved.version !== expectedVersion) return false;
    const rows = await this.db
      .update(credentialUses)
      .set({ acknowledged: true, version: expectedVersion + 1 })
      .where(
        and(
          eq(credentialUses.id, target.id),
          eq(credentialUses.version, expectedVersion),
          eq(credentialUses.evidenceId, evidenceId),
          eq(credentialUses.callerEnded, true),
        ),
      )
      .returning({ id: credentialUses.id });
    return rows.length === 1;
  }
  async markCredentialUnknown(
    target: CredentialUseTarget,
    expectedVersion: number,
  ) {
    const saved = await this.credentialUse(target.id);
    if (!saved || !sameTarget(saved.target, target)) return false;
    if (saved.state === "unknown" || saved.state === "closed") return true;
    if (saved.version !== expectedVersion) return false;
    return (
      (
        await this.db
          .update(credentialUses)
          .set({ state: "unknown", version: expectedVersion + 1 })
          .where(
            and(
              eq(credentialUses.id, target.id),
              eq(credentialUses.version, expectedVersion),
              eq(credentialUses.state, "active"),
            ),
          )
          .returning({ id: credentialUses.id })
      ).length === 1
    );
  }
  async pendingCredentialUses(
    provider: CredentialUseTarget["binding"]["provider"],
    afterId: string | null,
    runtimeIds: readonly string[],
  ) {
    if (runtimeIds.length === 0) return [];
    if (
      runtimeIds.length > 65 ||
      new Set(runtimeIds).size !== runtimeIds.length
    )
      return corrupt();
    return (
      await this.db
        .select()
        .from(credentialUses)
        .where(
          and(
            eq(credentialUses.provider, provider),
            eq(credentialUses.acknowledged, false),
            inArray(credentialUses.runtimeId, [...runtimeIds]),
            afterId ? gt(credentialUses.id, afterId) : undefined,
          ),
        )
        .orderBy(asc(credentialUses.id))
        .limit(ACCOUNT_DELETION_PAGE_SIZE)
    ).map(credentialRow);
  }
  async credentialRuntimeIds(
    provider: CredentialUseTarget["binding"]["provider"],
    runtimeIds: readonly string[],
  ) {
    if (runtimeIds.length === 0) return [];
    if (
      runtimeIds.length > 65 ||
      new Set(runtimeIds).size !== runtimeIds.length
    )
      return corrupt();
    const rows = await this.db
      .selectDistinct({ id: credentialUses.runtimeId })
      .from(credentialUses)
      .where(
        and(
          eq(credentialUses.provider, provider),
          eq(credentialUses.acknowledged, false),
          inArray(credentialUses.runtimeId, [...runtimeIds]),
        ),
      )
      .limit(65);
    return rows.map((row) => row.id);
  }
  async accept(
    input: Readonly<{
      id: string;
      accountId: string;
      expectedAuthVersion: number;
      now: Date;
    }>,
  ) {
    const last = await this.db.all(
      sql`select 1 from workspace_members m join workspaces w on w.id=m.workspace_id where m.account_id=${input.accountId} and m.role='owner' and w.state='active' and not exists(select 1 from workspace_members other join accounts a on a.id=other.account_id where other.workspace_id=w.id and other.role='owner' and other.account_id!=m.account_id and a.state='active') limit 1`,
    );
    if (last.length)
      throw new BusinessRuleError(
        "WORKSPACE_LAST_OWNER",
        "最後のオーナーです。別のメンバーをオーナーにするか、ワークスペースを削除してから退会してください。",
      );
    await this.db.insert(intents).values({
      id: input.id,
      accountId: input.accountId,
      fenceAuthVersion: input.expectedAuthVersion + 1,
      state: "queued",
      table: "personal-notes",
      version: 1,
      acceptedAt: input.now,
      nextAttemptAt: input.now,
    });
    const changed = await this.db
      .update(accounts)
      .set({
        state: "deleted",
        deletionId: input.id,
        authVersion: input.expectedAuthVersion + 1,
        email: null,
        passwordHash: null,
        createdAt: null,
        verifiedAt: null,
      })
      .where(
        and(
          eq(accounts.id, input.accountId),
          eq(accounts.state, "active"),
          eq(accounts.authVersion, input.expectedAuthVersion),
        ),
      )
      .returning({ id: accounts.id });
    if (changed.length !== 1)
      throw new ConflictError(
        "ACCOUNT_DELETION_CHANGED",
        "認証状況が変わりました。画面を再読み込みしてください。",
      );
    await this.db.run(
      sql`delete from sessions where account_id=${input.accountId}`,
    );
    await this.db.run(
      sql`delete from account_public_profiles where account_id=${input.accountId}`,
    );
    await this.db.run(
      sql`delete from account_display_names where account_id=${input.accountId}`,
    );
    await this.db.run(
      sql`delete from workspace_members where account_id=${input.accountId}`,
    );
  }
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(intents)
      .where(eq(intents.id, id));
    return row ? hydrate(row) : null;
  }
  async claim(now: Date, token: string, until: Date) {
    const [row] = await this.db
      .select()
      .from(intents)
      .where(
        or(
          and(
            or(eq(intents.state, "queued"), eq(intents.state, "waiting-owner")),
            lte(intents.nextAttemptAt, now),
          ),
          and(eq(intents.state, "running"), lte(intents.leaseUntil, now)),
        ),
      )
      .orderBy(asc(intents.nextAttemptAt), asc(intents.id))
      .limit(1);
    if (!row) return null;
    const [changed] = await this.db
      .update(intents)
      .set({
        state: "running",
        leaseToken: token,
        leaseUntil: until,
        version: row.version + 1,
      })
      .where(and(eq(intents.id, row.id), eq(intents.version, row.version)))
      .returning();
    return changed ? hydrate(changed) : null;
  }
  async ownsPersonalNote(intentId: string, noteId: string) {
    const rows = await this.db.all(
      sql`select 1 from account_deletions d join accounts a on a.id=d.account_id and a.state='deleted' and a.deletion_id=d.id join notes n on n.owner_account_id=a.id and n.owner_workspace_id is null where d.id=${intentId} and n.id=${noteId} limit 1`,
    );
    return rows.length === 1;
  }
  async personalNotes(intent: AccountDeletionIntent, now: Date) {
    if (intent.state !== "running" || !(await this.owned(intent, now)))
      return [];
    return (
      await this.db
        .select({ id: notes.id })
        .from(notes)
        .where(
          and(
            eq(notes.ownerAccountId, intent.accountId),
            sql`${notes.ownerWorkspaceId} is null`,
            intent.cursor.afterId
              ? gt(notes.id, intent.cursor.afterId)
              : undefined,
          ),
        )
        .orderBy(asc(notes.id))
        .limit(ACCOUNT_DELETION_PAGE_SIZE)
    ).map((row) => row.id);
  }
  async linkPurge(intentId: string, noteId: string, purgeId: string) {
    if (!(await this.ownsPersonalNote(intentId, noteId))) return corrupt();
    await this.db
      .insert(purges)
      .values({ intentId, noteId, purgeId })
      .onConflictDoNothing();
    const [saved] = await this.db
      .select()
      .from(purges)
      .where(and(eq(purges.intentId, intentId), eq(purges.noteId, noteId)));
    if (saved?.purgeId !== purgeId) return corrupt();
  }
  private async owned(intent: AccountDeletionIntent, now: Date) {
    if (intent.state !== "running") return false;
    return (
      (
        await this.db.all(
          sql`select 1 from account_deletions d join accounts a on a.id=d.account_id where d.id=${intent.id} and d.version=${intent.version} and d.lease_token=${intent.leaseToken} and d.lease_until>${now.getTime()} and d.state='running' and a.state='deleted' and a.deletion_id=d.id and a.auth_version=d.fence_auth_version`,
        )
      ).length === 1
    );
  }
  async resources(
    intent: AccountDeletionIntent,
    now: Date,
  ): Promise<readonly AccountDeletionResource[]> {
    if (!(await this.owned(intent, now))) return [];
    const a = intent.accountId;
    const limit = ACCOUNT_DELETION_PAGE_SIZE;
    switch (intent.cursor.table) {
      case "uploads": {
        const rows = await this.db.all<{ id: string; storage_key: string }>(
          sql`select u.id,u.storage_key from upload_reservations u join import_batches b on b.id=u.batch_id where u.account_id=${a} and b.account_id=${a} and b.workspace_id is null and u.state in('failed','cancelled') and u.storage_cleaned=0 and not exists(select 1 from object_writes w where w.kind='import-upload' and w.owner_id=u.id and w.active=1) and not exists(select 1 from originals o where o.storage_key=u.storage_key) and not exists(select 1 from companion_sources c where c.storage_key=u.storage_key) order by u.id limit ${limit}`,
        );
        return rows.map((row) => ({
          kind: "import-upload",
          id: row.id,
          keys: [row.storage_key],
        }));
      }
      case "media-drafts": {
        const rows = await this.db.all<{ id: string }>(
          sql`select u.id from media_uploads u join media_drafts d on d.id=u.draft_id where d.account_id=${a} and d.workspace_id is null and d.note_id is null and u.state='failed' and u.storage_cleaned=0 and not exists(select 1 from object_writes w where w.kind='media-upload' and w.owner_id=u.id and w.active=1) order by u.id limit ${limit}`,
        );
        const result: AccountDeletionResource[] = rows.map((row) => ({
          kind: "media-upload",
          id: row.id,
          keys: [row.id + "_source", row.id + "_safe"],
        }));
        if (result.length < limit) {
          const assets = await this.db.all<{ id: string; storage_key: string }>(
            sql`select a.id,a.storage_key from assets a join media_drafts d on d.id=a.draft_id where d.account_id=${a} and d.workspace_id is null and d.note_id is null and a.source_note_id is null and not exists(select 1 from note_asset_references r where r.asset_id=a.id) and not exists(select 1 from media_uploads u join object_writes w on w.owner_id=u.id and w.kind='media-upload' and w.active=1 where u.draft_id=d.id) order by a.id limit ${limit - result.length}`,
          );
          for (const row of assets)
            result.push({ kind: "asset", id: row.id, keys: [row.storage_key] });
        }
        return result;
      }
      case "profile-icons": {
        const rows = await this.db.all<{ id: string; storage_key: string }>(
          sql`select i.id,i.storage_key from account_profile_icons i where i.account_id=${a} and i.state='cleanup' and not exists(select 1 from object_writes w where w.kind='profile-icon-upload' and w.owner_id=i.id and w.active=1) and not exists(select 1 from account_public_profiles p where p.icon_id=i.id) order by i.id limit ${limit}`,
        );
        return rows.map((row) => ({
          kind: "profile-icon",
          id: row.id,
          keys: [row.storage_key],
        }));
      }
      default:
        return [];
    }
  }
  async resourceReady(
    intent: AccountDeletionIntent,
    resource: AccountDeletionResource,
    now: Date,
  ) {
    const rows = await this.resources(intent, now);
    return rows.some(
      (row) =>
        row.kind === resource.kind &&
        row.id === resource.id &&
        row.keys.length === resource.keys.length &&
        row.keys.every((key, index) => key === resource.keys[index]),
    );
  }
  async completeResource(
    intent: AccountDeletionIntent,
    resource: AccountDeletionResource,
    deleted: readonly Readonly<{ key: string; token: string }>[],
    now: Date,
  ) {
    if (!(await this.resourceReady(intent, resource, now))) return false;
    if (deleted.length !== resource.keys.length) return false;
    for (const key of resource.keys) {
      const claim = deleted.find((row) => row.key === key);
      if (
        !claim ||
        (
          await this.db.all(
            sql`select 1 from object_deletes where storage_key=${key} and token=${claim.token} and done=1`,
          )
        ).length !== 1
      )
        return false;
    }
    switch (resource.kind) {
      case "import-upload":
        await this.db.run(
          sql`update upload_reservations set storage_cleaned=1 where id=${resource.id}`,
        );
        break;
      case "media-upload":
        await this.db.run(
          sql`update media_uploads set storage_cleaned=1 where id=${resource.id}`,
        );
        break;
      case "asset":
        await this.db.run(sql`delete from assets where id=${resource.id}`);
        break;
      case "profile-icon":
        await this.db.run(
          sql`delete from account_profile_icons where id=${resource.id}`,
        );
        break;
    }
    return true;
  }
  async step(
    intent: AccountDeletionIntent,
    now: Date,
  ): Promise<
    Readonly<{ progressed: number; blocked: number; finished: boolean }>
  > {
    if (!(await this.owned(intent, now)))
      throw new ConflictError(
        "ACCOUNT_DELETION_LEASE",
        "回収の担当が変わりました。",
      );
    const table = intent.cursor.table;
    if (table === "personal-notes") {
      const page = await this.personalNotes(intent, now);
      await this.advance(
        intent,
        page.at(-1) ?? intent.cursor.afterId,
        page.length < ACCOUNT_DELETION_PAGE_SIZE,
        now,
      );
      return { progressed: page.length, blocked: 0, finished: false };
    }
    return this.stepCopies(intent, now);
  }
  private async advance(
    intent: AccountDeletionIntent,
    afterId: string | null,
    exhausted: boolean,
    now: Date,
  ) {
    const next = exhausted
      ? accountDeletionTables[
          accountDeletionTables.indexOf(intent.cursor.table) + 1
        ]
      : intent.cursor.table;
    if (!next || intent.state !== "running") return corrupt();
    const changed = await this.db
      .update(intents)
      .set({
        table: next,
        afterId: exhausted ? null : afterId,
        version: intent.version + 1,
        state: "queued",
        leaseToken: null,
        leaseUntil: null,
        nextAttemptAt: now,
      })
      .where(
        and(
          eq(intents.id, intent.id),
          eq(intents.version, intent.version),
          eq(intents.leaseToken, intent.leaseToken),
        ),
      )
      .returning({ id: intents.id });
    if (changed.length !== 1) return corrupt();
  }
  private async stepCopies(
    intent: AccountDeletionIntent,
    now: Date,
  ): Promise<
    Readonly<{ progressed: number; blocked: number; finished: boolean }>
  > {
    const result = await this.cleanupPage(intent, now);
    if (!result.finished)
      await this.advance(intent, result.afterId, result.exhausted, now);
    return {
      progressed: result.progressed,
      blocked: result.blocked,
      finished: result.finished,
    };
  }
  private async bindingHeld(id: string): Promise<boolean> {
    const rows =
      await this.db.all(sql`select 1 where exists(select 1 from regeneration_source_attempts a where a.binding_id=${id} and not coalesce(a.phase='terminal' and (json_extract(a.completion,'$.kind')='never-owned' or (a.owner_state='closed' and json_extract(a.completion,'$.callerEnded')=1 and json_extract(a.completion,'$.acknowledged')=1)),0))
      or exists(select 1 from llm_conversions c where c.source_binding_id=${id} and (c.phase!='terminal' or c.owner_state in('active','unknown') or c.source_memory_bytes!=0 or (c.source_input_receipt is not null and json_extract(c.source_input_receipt,'$.state')!='closed')))
      or exists(select 1 from llm_pdf_previews c where c.source_binding_id=${id} and (c.state='running' or c.owner_state in('active','unknown') or c.source_memory_bytes!=0 or (c.source_input_receipt is not null and json_extract(c.source_input_receipt,'$.state')!='closed')))
      or exists(select 1 from machine_regenerations c where c.source_binding_id=${id} and (c.phase!='terminal' or c.owner_state in('active','unknown') or c.source_memory_bytes!=0 or (c.source_input_receipt is not null and json_extract(c.source_input_receipt,'$.state')!='closed')))`);
    return rows.length !== 0;
  }
  private async accountHeld(accountId: string): Promise<boolean> {
    return (
      (
        await this.db.all(sql`select 1 where
      exists(select 1 from drive_authorization_attempts where account_id=${accountId} and owner_state in('active','unknown'))
      or exists(select 1 from drive_control_operations where account_id=${accountId} and owner_state in('active','unknown'))
      or exists(select 1 from drive_backup_transfers where account_id=${accountId} and (owner_state in('active','unknown') or read_pinned!=0 or refresh_pending!=0))
      or exists(select 1 from regeneration_source_bindings b join regeneration_source_attempts a on a.binding_id=b.id where (b.executor_id=${accountId} or b.credential_owner_id=${accountId}) and (a.owner_state in('active','unknown') or (a.owner_state='closed' and (coalesce(json_extract(a.completion,'$.callerEnded'),0)!=1 or coalesce(json_extract(a.completion,'$.acknowledged'),0)!=1))))
      or exists(select 1 from llm_conversions where account_id=${accountId} and (owner_state in('active','unknown') or source_memory_bytes!=0 or (source_input_receipt is not null and json_extract(source_input_receipt,'$.state')!='closed')))
      or exists(select 1 from llm_pdf_previews where account_id=${accountId} and (owner_state in('active','unknown') or source_memory_bytes!=0 or (source_input_receipt is not null and json_extract(source_input_receipt,'$.state')!='closed')))
      or exists(select 1 from machine_regenerations where executor_id=${accountId} and (owner_state in('active','unknown') or source_memory_bytes!=0 or (source_input_receipt is not null and json_extract(source_input_receipt,'$.state')!='closed')))
      or exists(select 1 from account_deletion_credential_uses where (account_id=${accountId} or result_account_id=${accountId}) and (state!='closed' or caller_ended!=1 or acknowledged!=1))
      or exists(select 1 from drive_authorization_attempts d where d.account_id=${accountId} and d.owner_state='closed' and not exists(select 1 from account_deletion_drive_acknowledgments a where a.kind='authorization' and a.id=d.id and a.runtime_generation=d.runtime_generation and a.owner_token=d.owner_token))
      or exists(select 1 from drive_control_operations d where d.account_id=${accountId} and d.owner_state='closed' and not exists(select 1 from account_deletion_drive_acknowledgments a where a.kind='control' and a.id=d.id and a.runtime_generation=d.runtime_generation and a.owner_token=d.owner_token))
      or exists(select 1 from drive_backup_transfers d where d.account_id=${accountId} and d.owner_state='closed' and not exists(select 1 from account_deletion_drive_acknowledgments a where a.kind='backup' and a.id=d.id and a.runtime_generation=d.runtime_generation and a.owner_token=d.owner_token))
      or exists(select 1 from object_writes w where w.active=1 and (w.note_id in(select id from notes where owner_account_id=${accountId} and owner_workspace_id is null) or w.owner_id in(select id from drive_backup_transfers where account_id=${accountId})))`)
      ).length !== 0
    );
  }
  private async credentialSourceHeld(
    provider: "google" | "openrouter",
    id: string,
  ) {
    const rows = await this.db.all(
      sql`select 1 from account_deletion_credential_uses where provider=${provider} and source_id=${id}`,
    );
    if (rows.length === 0) return true;
    return (
      (
        await this.db.all(
          sql`select 1 from account_deletion_credential_uses where provider=${provider} and source_id=${id} and (state!='closed' or caller_ended!=1 or acknowledged!=1) limit 1`,
        )
      ).length !== 0
    );
  }
  private async cleanupPage(
    intent: AccountDeletionIntent,
    now: Date,
  ): Promise<
    Readonly<{
      progressed: number;
      blocked: number;
      afterId: string | null;
      exhausted: boolean;
      finished: boolean;
    }>
  > {
    if (intent.cursor.table === "verify") return this.verify(intent, now);
    const a = intent.accountId;
    let physical: string;
    let key: string;
    let predicate: SQL;
    switch (intent.cursor.table) {
      case "uploads":
        physical = "upload_reservations";
        key = "id";
        predicate = sql`account_id=${a} and batch_id in(select id from import_batches where account_id=${a} and workspace_id is null)`;
        break;
      case "media-drafts":
        physical = "media_drafts";
        key = "id";
        predicate = sql`account_id=${a} and workspace_id is null and note_id is null`;
        break;
      case "profile-icons":
        physical = "account_profile_icons";
        key = "id";
        predicate = sql`account_id=${a}`;
        break;
      case "exports":
        physical = "export_operations";
        key = "id";
        predicate = sql`json_extract(authority,'$.accountId')=${a} or note_id in(select id from notes where owner_account_id=${a} and owner_workspace_id is null)`;
        break;
      case "source-attempts":
        physical = "regeneration_source_attempts";
        key = "id";
        predicate = sql`binding_id in(select id from regeneration_source_bindings where executor_id=${a} or credential_owner_id=${a})`;
        break;
      case "source-bindings":
        physical = "regeneration_source_bindings";
        key = "id";
        predicate = sql`retention='usable' and (executor_id=${a} or credential_owner_id=${a})`;
        break;
      case "drive-attempts":
        physical = "drive_authorization_attempts";
        key = "id";
        predicate = sql`account_id=${a}`;
        break;
      case "drive-controls":
        physical = "drive_control_operations";
        key = "id";
        predicate = sql`account_id=${a}`;
        break;
      case "drive-transfers":
        physical = "drive_backup_transfers";
        key = "id";
        predicate = sql`account_id=${a}`;
        break;
      case "drive-heads":
        physical = "drive_backup_target_heads";
        key = "target_id";
        predicate = sql`account_id=${a}`;
        break;
      case "drive-jobs":
        physical = "drive_backup_jobs";
        key = "id";
        predicate = sql`account_id=${a} and admission_identity is not null`;
        break;
      case "drive-targets":
        physical = "drive_backup_targets";
        key = "id";
        predicate = sql`account_id=${a} and retention='usable'`;
        break;
      case "drive-records":
        physical = "drive_backup_records";
        key = "id";
        predicate = sql`account_id=${a} and retention='usable'`;
        break;
      case "google-attempts":
        physical = "google_auth_attempts";
        key = "id";
        predicate = sql`actor_account_id=${a} or target_account_id=${a} or result_account_id=${a}`;
        break;
      case "auth-challenges":
        physical = "account_auth_challenges";
        key = "token_hash";
        predicate = sql`account_id=${a}`;
        break;
      case "email-verifications":
        physical = "email_verifications";
        key = "token_hash";
        predicate = sql`account_id=${a}`;
        break;
      case "google-identities":
        physical = "google_identities";
        key = "account_id";
        predicate = sql`account_id=${a}`;
        break;
      case "openrouter-attempts":
        physical = "openrouter_attempts";
        key = "id";
        predicate = sql`account_id=${a}`;
        break;
      case "openrouter-connection":
        physical = "openrouter_connections";
        key = "account_id";
        predicate = sql`account_id=${a} and (credential_envelope is not null or provider_user_id is not null or ever_linked_at is not null)`;
        break;
      case "drive-connection":
        physical = "drive_connections";
        key = "account_id";
        predicate = sql`account_id=${a} and (credential is not null or folder is not null)`;
        break;
      case "profile":
        physical = "openrouter_model_settings";
        key = "account_id";
        predicate = sql`account_id=${a}`;
        break;
      case "credential-origins":
        physical = "account_deletion_credential_origins";
        key = "provider";
        predicate = sql`account_id=${a}`;
        break;
      case "credential-uses":
        physical = "account_deletion_credential_uses";
        key = "id";
        predicate = sql`account_id=${a} or result_account_id=${a}`;
        break;
      case "drive-acknowledgments":
        physical = "account_deletion_drive_acknowledgments";
        key = "id";
        predicate = sql`account_id=${a}`;
        break;
      case "personal-notes":
        return corrupt();
    }
    const table = sql.raw(physical);
    const id = sql.raw(key);
    const page = await this.db.all<{ id: string }>(
      sql`select ${id} id from ${table} where (${predicate}) and (${intent.cursor.afterId} is null or ${id}>${intent.cursor.afterId}) order by ${id} limit ${ACCOUNT_DELETION_PAGE_SIZE}`,
    );
    let progressed = 0;
    let blocked = 0;
    for (const row of page) {
      if (await this.cleanupCopy(intent, row.id, table, id, now)) progressed++;
      else blocked++;
    }
    return {
      progressed,
      blocked,
      afterId: page.at(-1)?.id ?? intent.cursor.afterId,
      exhausted: page.length < ACCOUNT_DELETION_PAGE_SIZE,
      finished: false,
    };
  }
  private async cleanupCopy(
    intent: AccountDeletionIntent,
    id: string,
    table: SQL,
    key: SQL,
    now: Date,
  ): Promise<boolean> {
    switch (intent.cursor.table) {
      case "uploads":
        await this.db.run(
          sql`update upload_reservations set state='cancelled',failure=null where id=${id} and state in('awaiting','uploading')`,
        );
        if (
          (
            await this.db.all(
              sql`select 1 from upload_reservations where id=${id} and (state='accepted' or storage_cleaned=1) and not exists(select 1 from object_writes where kind='import-upload' and owner_id=${id} and active=1)`,
            )
          ).length === 0
        )
          return false;
        break;
      case "media-drafts":
        await this.db.run(
          sql`update media_uploads set state='failed' where draft_id=${id} and state in('awaiting','uploading')`,
        );
        await this.db.run(
          sql`delete from media_uploads where draft_id=${id} and (storage_cleaned=1 or state='accepted') and not exists(select 1 from assets where draft_id=${id}) and not exists(select 1 from object_writes where kind='media-upload' and owner_id=media_uploads.id and active=1)`,
        );
        if (
          (
            await this.db.all(
              sql`select 1 where exists(select 1 from assets where draft_id=${id}) or exists(select 1 from media_uploads where draft_id=${id})`,
            )
          ).length
        )
          return false;
        break;
      case "profile-icons":
        await this.db.run(
          sql`update account_profile_icons set state='cleanup',next_attempt_at=${now.getTime()} where id=${id} and state!='cleanup'`,
        );
        return false;
      case "exports":
        await this.db.run(
          sql`update export_operations set state='cleanup',next_cleanup_at=${now.getTime()} where id=${id} and state!='cleanup'`,
        );
        return false;
      case "source-attempts": {
        await this.db.run(
          sql`update regeneration_source_attempts set phase='terminal',completion=json('{"kind":"never-owned","outcome":"cancelled"}'),cancel_generation=cancel_generation+1,version=version+1,updated_at=${now.getTime()} where id=${id} and phase='queued' and owner_state='none'`,
        );
        const held =
          (
            await this.db.all(
              sql`select 1 from regeneration_source_attempts where id=${id} and not coalesce(phase='terminal' and (json_extract(completion,'$.kind')='never-owned' or (owner_state='closed' and json_extract(completion,'$.callerEnded')=1 and json_extract(completion,'$.acknowledged')=1)),0)`,
            )
          ).length !== 0;
        if (held) return this.block(intent, "source-attempt", id, table);
        break;
      }
      case "source-bindings":
        if (await this.bindingHeld(id))
          return this.block(intent, "input", id, table);
        await this.db.run(
          sql`update regeneration_source_bindings set retention='recorder-deleted',deletion_id=${intent.id},redaction_version=1,subject=null,version=version+1 where id=${id} and retention='usable'`,
        );
        return this.unblock(intent, id);
      case "drive-attempts":
      case "drive-controls": {
        const kind =
          intent.cursor.table === "drive-attempts"
            ? "authorization"
            : "control";
        if (
          (
            await this.db.all(
              sql`select 1 from ${table} d where id=${id} and (owner_state in('active','unknown') or (owner_state='closed' and not exists(select 1 from account_deletion_drive_acknowledgments a where a.kind=${kind} and a.id=d.id and a.runtime_generation=d.runtime_generation and a.owner_token=d.owner_token)))`,
            )
          ).length
        )
          return this.block(
            intent,
            intent.cursor.table === "drive-attempts"
              ? "drive-attempt"
              : "drive-control",
            id,
            table,
          );
        if (intent.cursor.table === "drive-attempts")
          await this.db.run(
            sql`update drive_authorization_attempts set phase='failed',data=json('{"phase":"failed","failure":"DRIVE_CANCELLED"}'),terminal_at=${now.getTime()},updated_at=${now.getTime()},version=version+1,cancel_generation=cancel_generation+1,confirmed_folder_ids_envelope=null where id=${id} and terminal_at is null`,
          );
        else
          await this.db.run(
            sql`update drive_control_operations set phase='failed',data=json_object('kind',kind,'phase','failed','failure','DRIVE_CANCELLED'),terminal_at=${now.getTime()},updated_at=${now.getTime()},version=version+1,cancel_generation=cancel_generation+1 where id=${id} and terminal_at is null`,
          );
        break;
      }
      case "drive-transfers":
        if (
          (
            await this.db.all(
              sql`select 1 from drive_backup_transfers d where id=${id} and (owner_state in('active','unknown') or (owner_state='closed' and not exists(select 1 from account_deletion_drive_acknowledgments a where a.kind='backup' and a.id=d.id and a.runtime_generation=d.runtime_generation and a.owner_token=d.owner_token)) or read_pinned!=0 or refresh_pending!=0 or exists(select 1 from object_writes where kind='drive-backup' and owner_id=${id} and active=1))`,
            )
          ).length
        )
          return this.block(intent, "drive-transfer", id, table);
        await this.db.run(
          sql`update drive_backup_transfers set phase='cancelled',version=version+1,cancel_generation=cancel_generation+1,updated_at=${now.getTime()} where id=${id} and owner_state='none' and phase='queued'`,
        );
        if (
          (
            await this.db.all(
              sql`select 1 from drive_backup_transfers where id=${id} and phase not in('failed','cancelled','succeeded')`,
            )
          ).length
        )
          return this.block(intent, "drive-transfer", id, table);
        break;
      case "drive-heads":
        if (await this.targetHeld(id, true))
          return this.block(intent, "drive-transfer", id, table);
        break;
      case "drive-jobs":
        if (
          (
            await this.db.all(
              sql`select 1 from drive_backup_jobs j where j.id=${id} and (j.terminal_at is null or exists(select 1 from drive_backup_transfers t where t.job_id=j.id))`,
            )
          ).length
        )
          return this.block(intent, "drive-transfer", id, table);
        await this.db.run(
          sql`update drive_backup_jobs set admission_identity=null,retention='recorder-deleted',deletion_id=${intent.id},redaction_version=1 where id=${id} and admission_identity is not null`,
        );
        return this.unblock(intent, id);
      case "drive-targets":
        if (await this.targetHeld(id))
          return this.block(intent, "drive-transfer", id, table);
        await this.db.run(
          sql`update drive_backup_targets set retention='recorder-deleted',deletion_id=${intent.id},redaction_version=1,subject=null,marker=null,folder=null,file_id=null where id=${id} and retention='usable'`,
        );
        return this.unblock(intent, id);
      case "drive-records":
        if (
          (
            await this.db.all(
              sql`select 1 from drive_backup_records r join drive_backup_targets t on t.id=r.target_id where r.id=${id} and (t.retention!='recorder-deleted' or t.deletion_id!=${intent.id})`,
            )
          ).length
        )
          return this.block(intent, "input", id, table);
        await this.db.run(
          sql`update drive_backup_records set retention='recorder-deleted',deletion_id=${intent.id},redaction_version=1,subject=null,file_id=null,folder=null,web_view_link=null,resource_key_envelope=null where id=${id} and retention='usable'`,
        );
        return this.unblock(intent, id);
      case "google-attempts":
        if (
          (
            await this.db.all(
              sql`select 1 from google_auth_attempts where id=${id} and state!='pending'`,
            )
          ).length &&
          (await this.credentialSourceHeld("google", id))
        )
          return false;
        break;
      case "openrouter-attempts":
        if (
          (
            await this.db.all(
              sql`select 1 from openrouter_attempts where id=${id} and state!='pending'`,
            )
          ).length &&
          (await this.credentialSourceHeld("openrouter", id))
        )
          return false;
        break;
      case "google-identities":
        if (await this.credentialOriginHeld("google", intent.accountId))
          return false;
        if (
          (
            await this.db.all(
              sql`select 1 from account_deletion_credential_uses where provider='google' and (account_id=${intent.accountId} or account_id is null) and (state!='closed' or caller_ended!=1 or acknowledged!=1) union all select 1 from google_auth_attempts g where g.state!='pending' and not exists(select 1 from account_deletion_credential_uses u where u.provider='google' and u.source_id=g.id) limit 1`,
            )
          ).length
        )
          return false;
        break;
      case "drive-connection":
        if (await this.accountHeld(intent.accountId))
          return this.block(intent, "drive-control", id, table);
        await this.db.run(
          sql`update drive_connections set state='unlinked',credential=null,folder=null,last_used_at=null,auto_backup=0,epoch=epoch+1,version=version+1,credential_version=credential_version+1,settings_version=settings_version+1,updated_at=${now.getTime()} where account_id=${id}`,
        );
        return this.unblock(intent, id);
      case "openrouter-connection":
        if (
          (await this.credentialOriginHeld("openrouter", intent.accountId)) ||
          (await this.accountHeld(intent.accountId)) ||
          (
            await this.db.all(
              sql`select 1 from openrouter_attempts where account_id=${intent.accountId} and state in('exchanging','checking') limit 1`,
            )
          ).length
        )
          return false;
        await this.db.run(
          sql`update openrouter_connections set state='unlinked',credential_envelope=null,key_expires_at=null,provider_user_id=null,linked_at=null,ever_linked_at=null,last_used_at=null,epoch=epoch+1,version=version+1,updated_at=${now.getTime()} where account_id=${id}`,
        );
        return true;
      case "credential-origins": {
        if (id !== "google" && id !== "openrouter") return corrupt();
        if (await this.credentialOriginHeld(id, intent.accountId)) return false;
        if (
          (
            await this.db.all(
              sql`select 1 from google_identities where account_id=${intent.accountId} and ${id}='google' union all select 1 from openrouter_connections where account_id=${intent.accountId} and ${id}='openrouter' and (credential_envelope is not null or provider_user_id is not null or ever_linked_at is not null) limit 1`,
            )
          ).length
        )
          return false;
        const [origin] = await this.db
          .select()
          .from(credentialOrigins)
          .where(
            and(
              eq(credentialOrigins.provider, id),
              eq(credentialOrigins.accountId, intent.accountId),
            ),
          );
        await this.db
          .delete(credentialOrigins)
          .where(
            and(
              eq(credentialOrigins.provider, id),
              eq(credentialOrigins.accountId, intent.accountId),
            ),
          );
        if (origin?.useId)
          await this.db
            .delete(credentialUses)
            .where(
              and(
                eq(credentialUses.id, origin.useId),
                eq(credentialUses.state, "closed"),
                eq(credentialUses.acknowledged, true),
                sql`not exists(select 1 from account_deletion_credential_origins o where o.use_id=${credentialUses.id})`,
              ),
            );
        return true;
      }
      case "credential-uses":
        if (
          (
            await this.db.all(
              sql`select 1 from account_deletion_credential_uses u where u.id=${id} and (u.state!='closed' or u.caller_ended!=1 or u.acknowledged!=1 or exists(select 1 from account_deletion_credential_origins o where o.use_id=u.id) or (u.provider='google' and exists(select 1 from google_auth_attempts g where g.id=u.source_id)) or (u.provider='openrouter' and json_extract(u.binding,'$.source.kind')='openrouter-attempt' and exists(select 1 from openrouter_attempts o where o.id=u.source_id)))`,
            )
          ).length
        )
          return false;
        break;
      case "drive-acknowledgments":
        if (
          (
            await this.db.all(
              sql`select 1 from account_deletion_drive_acknowledgments a where a.id=${id} and a.account_id=${intent.accountId} and ((a.kind='authorization' and exists(select 1 from drive_authorization_attempts d where d.id=a.id)) or (a.kind='control' and exists(select 1 from drive_control_operations d where d.id=a.id)) or (a.kind='backup' and exists(select 1 from drive_backup_transfers d where d.id=a.id)))`,
            )
          ).length
        )
          return false;
        await this.db
          .delete(driveAcknowledgments)
          .where(
            and(
              eq(driveAcknowledgments.accountId, intent.accountId),
              eq(driveAcknowledgments.id, id),
            ),
          );
        return true;
      case "auth-challenges":
      case "email-verifications":
      case "profile":
        break;
      case "personal-notes":
      case "verify":
        return corrupt();
    }
    await this.db.run(sql`delete from ${table} where ${key}=${id}`);
    return this.unblock(intent, id);
  }
  private async credentialOriginHeld(
    provider: "google" | "openrouter",
    accountId: string,
  ) {
    const [origin] = await this.db
      .select()
      .from(credentialOrigins)
      .where(
        and(
          eq(credentialOrigins.provider, provider),
          eq(credentialOrigins.accountId, accountId),
        ),
      );
    if (!origin || origin.mode !== "native-v1" || origin.useId === null)
      return true;
    const use = await this.credentialUse(origin.useId);
    if (
      !use ||
      use.target.binding.provider !== provider ||
      use.state !== "closed" ||
      !use.callerEnded ||
      !use.acknowledged
    )
      return true;
    if (
      (
        await this.db
          .select({ id: credentialUses.id })
          .from(credentialUses)
          .where(
            and(
              eq(credentialUses.id, origin.useId),
              eq(credentialUses.provider, provider),
              eq(credentialUses.resultAccountId, accountId),
            ),
          )
      ).length !== 1
    )
      return true;
    if (
      provider === "openrouter" &&
      (
        await this.db.all(
          sql`select 1 from openrouter_connections c where c.account_id=${accountId} and c.credential_envelope is not null and c.epoch!=${origin.credentialEpoch}`,
        )
      ).length
    )
      return true;
    return false;
  }
  private async targetHeld(id: string, removingHead = false): Promise<boolean> {
    return (
      (
        await this.db.all(
          sql`select 1 where exists(select 1 from drive_backup_jobs where target_id=${id} and (terminal_at is null or admission_identity is not null)) or exists(select 1 from drive_backup_transfers where target_id=${id}) or (${removingHead ? 0 : 1}=1 and exists(select 1 from drive_backup_target_heads where target_id=${id})) or exists(select 1 from drive_backup_records r join regeneration_source_bindings b on b.record_id=r.id where r.target_id=${id} and b.retention='usable')`,
        )
      ).length !== 0
    );
  }
  private async block(
    intent: AccountDeletionIntent,
    kind:
      | "source-attempt"
      | "input"
      | "drive-attempt"
      | "drive-control"
      | "drive-transfer",
    id: string,
    table: SQL,
  ): Promise<false> {
    let value: SQL;
    switch (intent.cursor.table) {
      case "source-attempts":
        value = sql`json_object('table',${intent.cursor.table},'id',id,'version',version,'runtimeId',runtime_id,'token',owner_token,'cancelGeneration',cancel_generation)`;
        break;
      case "drive-attempts":
      case "drive-controls":
      case "drive-transfers":
        value = sql`json_object('table',${intent.cursor.table},'id',id,'version',version,'runtimeId',runtime_generation,'token',owner_token,'cancelGeneration',cancel_generation)`;
        break;
      case "source-bindings":
        value = sql`json_object('table',${intent.cursor.table},'id',id,'version',version,'llmJobId',llm_job_id,'previewId',preview_id,'machineRequestId',machine_request_id,'ownershipGeneration',ownership_generation,'cancelGeneration',cancel_generation)`;
        break;
      case "drive-heads":
        value = sql`json_object('table',${intent.cursor.table},'id',target_id,'version',version,'accountId',account_id)`;
        break;
      case "drive-jobs":
      case "drive-targets":
      case "drive-records":
        value = sql`json_object('table',${intent.cursor.table},'id',id,'version',version,'accountId',account_id)`;
        break;
      case "drive-connection":
        value = sql`json_object('table',${intent.cursor.table},'id',account_id,'version',version,'epoch',epoch,'credentialVersion',credential_version)`;
        break;
      default:
        return corrupt();
    }
    const key =
      intent.cursor.table === "drive-heads"
        ? sql`target_id`
        : intent.cursor.table === "drive-connection"
          ? sql`account_id`
          : sql`id`;
    const [row] = await this.db.all<{ locator: string }>(
      sql`select ${value} locator from ${table} where ${key}=${id}`,
    );
    if (!row || typeof row.locator !== "string" || row.locator.length > 4096)
      return corrupt();
    const locator = row.locator;
    await this.db.run(
      sql`insert into account_deletion_debts(intent_id,kind,owner_id,locator) values(${intent.id},${kind},${id},${locator}) on conflict do nothing`,
    );
    return false;
  }
  private async unblock(
    intent: AccountDeletionIntent,
    id: string,
  ): Promise<true> {
    await this.db.run(
      sql`delete from account_deletion_debts where intent_id=${intent.id} and owner_id=${id} and json_extract(locator,'$.table')=${intent.cursor.table}`,
    );
    return true;
  }
  private async verify(
    intent: AccountDeletionIntent,
    now: Date,
  ): Promise<
    Readonly<{
      progressed: number;
      blocked: number;
      afterId: string | null;
      exhausted: boolean;
      finished: boolean;
    }>
  > {
    const a = intent.accountId;
    const residual = await this.db.all(sql`select 1 where
      exists(select 1 from notes where owner_account_id=${a} and owner_workspace_id is null)
      or exists(select 1 from account_deletion_purges l join note_purges p on p.id=l.purge_id where l.intent_id=${intent.id} and p.state!='succeeded')
      or exists(select 1 from account_deletion_debts where intent_id=${intent.id})
      or exists(select 1 from drive_backup_targets where account_id=${a} and retention='usable')
      or exists(select 1 from drive_backup_records where account_id=${a} and retention='usable')
      or exists(select 1 from drive_backup_jobs where account_id=${a} and admission_identity is not null)
      or exists(select 1 from drive_backup_target_heads where account_id=${a})
      or exists(select 1 from drive_backup_transfers where account_id=${a})
      or exists(select 1 from drive_authorization_attempts where account_id=${a})
      or exists(select 1 from drive_control_operations where account_id=${a})
      or exists(select 1 from regeneration_source_bindings where (executor_id=${a} or credential_owner_id=${a}) and retention='usable')
      or exists(select 1 from regeneration_source_attempts where binding_id in(select id from regeneration_source_bindings where executor_id=${a} or credential_owner_id=${a}))
      or exists(select 1 from google_identities where account_id=${a})
      or exists(select 1 from google_auth_attempts where actor_account_id=${a} or target_account_id=${a} or result_account_id=${a})
      or exists(select 1 from account_auth_challenges where account_id=${a})
      or exists(select 1 from email_verifications where account_id=${a})
      or exists(select 1 from openrouter_attempts where account_id=${a})
      or exists(select 1 from openrouter_connections where account_id=${a} and (credential_envelope is not null or provider_user_id is not null or ever_linked_at is not null))
      or exists(select 1 from drive_connections where account_id=${a} and (credential is not null or folder is not null))
      or exists(select 1 from account_profile_icons where account_id=${a})
      or exists(select 1 from media_drafts where account_id=${a} and workspace_id is null and note_id is null)
      or exists(select 1 from upload_reservations u join import_batches b on b.id=u.batch_id where u.account_id=${a} and b.workspace_id is null)
      or exists(select 1 from export_operations where json_extract(authority,'$.accountId')=${a})
      or exists(select 1 from account_deletion_credential_origins where account_id=${a})
      or exists(select 1 from account_deletion_credential_uses where account_id=${a} or result_account_id=${a})
      or exists(select 1 from account_deletion_drive_acknowledgments where account_id=${a})`);
    const held = residual.length !== 0 || (await this.accountHeld(a));
    const changed = await this.db
      .update(intents)
      .set({
        state: held ? "waiting-owner" : "succeeded",
        table: held ? "personal-notes" : "verify",
        afterId: null,
        leaseToken: null,
        leaseUntil: null,
        version: intent.version + 1,
        nextAttemptAt: new Date(now.getTime() + (held ? 2000 : 0)),
      })
      .where(
        and(
          eq(intents.id, intent.id),
          eq(intents.version, intent.version),
          eq(intents.leaseToken, intent.leaseToken ?? ""),
        ),
      )
      .returning({ id: intents.id });
    if (changed.length !== 1) return corrupt();
    return {
      progressed: 0,
      blocked: held ? 1 : 0,
      afterId: null,
      exhausted: true,
      finished: true,
    };
  }
  async release(
    id: string,
    token: string,
    now: Date,
    failureCode: "step-failed" | null,
  ) {
    await this.db
      .update(intents)
      .set({
        state: "waiting-owner",
        leaseToken: null,
        leaseUntil: null,
        nextAttemptAt: new Date(now.getTime() + 2000),
        lastFailureCode: failureCode,
        version: sql`${intents.version}+1`,
      })
      .where(
        and(
          eq(intents.id, id),
          eq(intents.leaseToken, token),
          eq(intents.state, "running"),
        ),
      );
  }
}
