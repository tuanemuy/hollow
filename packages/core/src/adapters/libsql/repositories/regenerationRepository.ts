import { ConflictError } from "@repo/core/application/errors";
import type {
  MachineRegenerationRepository,
  RegenerationRecordCursor,
  RegenerationRecordRepository,
  SourceAttemptRepository,
  SourceBindingRepository,
} from "@repo/core/application/regeneration/ports";
import {
  driveBackupRecordSchema,
  parseDriveBackup,
} from "@repo/core/domain/integration/driveBackup";
import {
  attemptReleased,
  type MachineRegeneration,
  machineRegenerationSchema,
  parseRegeneration,
  type SourceAttempt,
  type SourceBinding,
  sourceAttemptSchema,
  sourceBindingSchema,
} from "@repo/core/domain/regeneration/entity";
import { sameMachineSource } from "@repo/core/domain/regeneration/machine";
import { and, asc, eq, gt, lt, or, sql } from "drizzle-orm";
import { driveBackupRecords as records } from "../driveBackupSchema";
import { conversionJobs as jobs } from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";
import {
  regenerationSourceAttempts as attempts,
  regenerationSourceBindings as bindings,
  machineRegenerations as machines,
} from "../regenerationSchema";

function invalidState() {
  return new ConflictError(
    "REGENERATION_STATE_INVALID",
    "再生成の保存状態を確認できません。",
  );
}
export const sourceHeldSql = sql`(${attempts.ownerState} in ('active','unknown') or (${attempts.ownerState}='closed' and (coalesce(json_extract(${attempts.completion},'$.callerEnded'),0)!=1 or coalesce(json_extract(${attempts.completion},'$.acknowledged'),0)!=1)))`;
export async function sourceHeldCounts(
  db: HollowTransaction,
  accountId: string,
) {
  const rows = await db
    .select({ accountId: bindings.credentialOwnerId })
    .from(attempts)
    .innerJoin(bindings, eq(bindings.id, attempts.bindingId))
    .where(sourceHeldSql)
    .limit(2);
  if (rows.length > 1) throw invalidState();
  return {
    global: rows.length,
    account: rows.filter((row) => row.accountId === accountId).length,
  };
}

function requireNextVersion(next: number, expected: number) {
  if (!Number.isSafeInteger(expected) || expected < 1 || next !== expected + 1)
    throw invalidState();
}

function bindingRow(row: typeof bindings.$inferSelect): SourceBinding {
  const { llmJobId, previewId, machineRequestId, ...base } = row;
  const consumers = [
    { kind: "llm-conversion", id: llmJobId },
    { kind: "pdf-preview", id: previewId },
    { kind: "machine-regeneration", id: machineRequestId },
  ].filter((consumer) => consumer.id !== null);
  if (consumers.length !== 1) throw invalidState();
  return parseRegeneration(sourceBindingSchema, {
    ...base,
    consumer: consumers[0],
  });
}

function bindingValues(value: SourceBinding): typeof bindings.$inferInsert {
  const { consumer, ...base } = parseRegeneration(sourceBindingSchema, value);
  return {
    ...base,
    llmJobId: consumer.kind === "llm-conversion" ? consumer.id : null,
    previewId: consumer.kind === "pdf-preview" ? consumer.id : null,
    machineRequestId:
      consumer.kind === "machine-regeneration" ? consumer.id : null,
  };
}

function attemptRow(row: typeof attempts.$inferSelect): SourceAttempt {
  const { ownerState, runtimeId, ownerToken, ...base } = row;
  return parseRegeneration(sourceAttemptSchema, {
    ...base,
    owner: { state: ownerState, runtimeId, token: ownerToken },
  });
}

function attemptValues(value: SourceAttempt): typeof attempts.$inferInsert {
  const { owner, ...base } = parseRegeneration(sourceAttemptSchema, value);
  return {
    ...base,
    ownerState: owner.state,
    runtimeId: owner.runtimeId,
    ownerToken: owner.token,
  };
}

function machineRow(row: typeof machines.$inferSelect): MachineRegeneration {
  const {
    sourceOrigin,
    sourceBindingId,
    ownerState,
    runtimeId,
    ownerToken,
    ...base
  } = row;
  return parseRegeneration(machineRegenerationSchema, {
    ...base,
    access: { origin: sourceOrigin, bindingId: sourceBindingId },
    owner: { state: ownerState, runtimeId, token: ownerToken },
  });
}

function machineValues(
  value: MachineRegeneration,
): typeof machines.$inferInsert {
  const { access, owner, ...base } = parseRegeneration(
    machineRegenerationSchema,
    value,
  );
  return {
    ...base,
    sourceOrigin: access.origin,
    sourceBindingId: access.bindingId,
    ownerState: owner.state,
    runtimeId: owner.runtimeId,
    ownerToken: owner.token,
  };
}

export class LibsqlSourceBindingRepository implements SourceBindingRepository {
  constructor(private readonly db: HollowTransaction) {}

  async insert(value: SourceBinding) {
    await this.db.insert(bindings).values(bindingValues(value));
  }

  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(bindings)
      .where(eq(bindings.id, id))
      .limit(1);
    return row ? bindingRow(row) : null;
  }

  async replace(value: SourceBinding, expectedVersion: number) {
    const next = bindingValues(value);
    requireNextVersion(next.version, expectedVersion);
    const changed = await this.db
      .update(bindings)
      .set(next)
      .where(
        and(eq(bindings.id, value.id), eq(bindings.version, expectedVersion)),
      )
      .returning({ id: bindings.id });
    return changed.length === 1;
  }

  async remove(id: string) {
    await this.db.delete(bindings).where(eq(bindings.id, id));
  }
}

export class LibsqlSourceAttemptRepository implements SourceAttemptRepository {
  constructor(private readonly db: HollowTransaction) {}

  async insert(value: SourceAttempt) {
    await this.db.insert(attempts).values(attemptValues(value));
  }

  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(attempts)
      .where(eq(attempts.id, id))
      .limit(1);
    return row ? attemptRow(row) : null;
  }

  async forBinding(bindingId: string) {
    const rows = await this.db
      .select()
      .from(attempts)
      .where(eq(attempts.bindingId, bindingId))
      .orderBy(asc(attempts.ordinal), asc(attempts.id))
      .limit(101);
    if (rows.length > 100)
      throw new ConflictError(
        "REGENERATION_ATTEMPT_LIMIT",
        "原本の取得履歴を確認できません。処理の終了確認をお待ちください。",
      );
    return rows.map(attemptRow);
  }
  async held() {
    const rows = await this.db
      .select()
      .from(attempts)
      .where(sourceHeldSql)
      .orderBy(asc(attempts.id))
      .limit(2);
    return rows.map(attemptRow);
  }
  async claim(value: SourceAttempt, expectedVersion: number) {
    const current = await this.find(value.id);
    if (
      !current ||
      current.version !== expectedVersion ||
      current.phase !== "queued" ||
      value.phase !== "active" ||
      value.owner.state !== "active" ||
      current.cancelGeneration !== 0
    )
      return false;
    const held = await this.held();
    if (held.length) return false;
    const backup = await this.db.run(
      sql`select 1 from drive_backup_transfers where owner_state in ('active','unknown') limit 1`,
    );
    if (backup.rows.length) return false;
    return this.replace(value, expectedVersion);
  }

  async replace(value: SourceAttempt, expectedVersion: number) {
    const next = attemptValues(value);
    requireNextVersion(next.version, expectedVersion);
    const changed = await this.db
      .update(attempts)
      .set(next)
      .where(
        and(eq(attempts.id, value.id), eq(attempts.version, expectedVersion)),
      )
      .returning({ id: attempts.id });
    return changed.length === 1;
  }

  async removeReleased(bindingId: string) {
    const values = await this.forBinding(bindingId);
    for (const value of values) {
      if (!attemptReleased(value)) continue;
      await this.db
        .delete(attempts)
        .where(
          and(
            eq(attempts.id, value.id),
            eq(attempts.bindingId, bindingId),
            eq(attempts.version, value.version),
            eq(attempts.phase, "terminal"),
            or(
              and(
                eq(attempts.ownerState, "none"),
                gt(attempts.cancelGeneration, 0),
                sql`json_extract(${attempts.completion}, '$.kind') = 'never-owned'`,
                sql`json_extract(${attempts.completion}, '$.outcome') = 'cancelled'`,
              ),
              and(
                eq(attempts.ownerState, "closed"),
                sql`json_extract(${attempts.completion}, '$.kind') = 'closed'`,
                sql`json_extract(${attempts.completion}, '$.callerEnded') = 1`,
                sql`json_extract(${attempts.completion}, '$.acknowledged') = 1`,
              ),
            ),
          ),
        );
    }
  }
}

export class LibsqlMachineRegenerationRepository
  implements MachineRegenerationRepository
{
  constructor(private readonly db: HollowTransaction) {}

  async insert(value: MachineRegeneration) {
    await this.db.insert(machines).values(machineValues(value));
  }

  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(machines)
      .where(eq(machines.id, id))
      .limit(1);
    return row ? machineRow(row) : null;
  }

  async command(executorId: string, commandId: string) {
    const [row] = await this.db
      .select()
      .from(machines)
      .where(
        and(
          eq(machines.executorId, executorId),
          eq(machines.commandId, commandId),
        ),
      )
      .limit(1);
    return row ? machineRow(row) : null;
  }

  async replace(value: MachineRegeneration, expectedVersion: number) {
    const next = machineValues(value);
    requireNextVersion(next.version, expectedVersion);
    const changed = await this.db
      .update(machines)
      .set(next)
      .where(
        and(eq(machines.id, value.id), eq(machines.version, expectedVersion)),
      )
      .returning({ id: machines.id });
    return changed.length === 1;
  }

  async candidate() {
    const [row] = await this.db
      .select()
      .from(machines)
      .where(and(eq(machines.phase, "queued"), eq(machines.ownerState, "none")))
      .orderBy(asc(machines.createdAt), asc(machines.id))
      .limit(1);
    return row ? machineRow(row) : null;
  }
  async claimExact(
    value: MachineRegeneration,
    expectedVersion: number,
    now: Date,
  ) {
    const current = await this.find(value.id);
    if (
      !current ||
      current.version !== expectedVersion ||
      current.phase !== "queued" ||
      current.owner.state !== "none" ||
      current.cancelGeneration !== 0 ||
      current.deadlineAt <= now ||
      value.phase !== "acquiring" ||
      value.owner.state !== "active" ||
      !value.inputReceipt ||
      value.inputReceipt.state !== "active"
    )
      return false;
    if (
      !sameMachineSource({ ...current, owner: value.owner }, value) ||
      current.sourceMemoryBytes !== 0 ||
      (current.inputReceipt !== null &&
        current.inputReceipt.state !== "closed") ||
      value.cancelGeneration !== current.cancelGeneration ||
      value.sourceMemoryBytes !== 52428800 ||
      value.inputReceipt.generation !==
        (current.inputReceipt?.generation ?? 0) + 1 ||
      value.inputReceipt.runtimeId !== value.owner.runtimeId ||
      value.inputReceipt.token !== value.owner.token ||
      value.inputReceipt.consumer.kind !== "machine-regeneration" ||
      value.inputReceipt.consumer.id !== value.id
    )
      return false;
    const [job] = await this.db
      .select()
      .from(jobs)
      .where(eq(jobs.id, value.id))
      .limit(1);
    if (
      !job ||
      job.state !== "queued" ||
      job.accountId !== current.executorId ||
      job.noteId !== current.noteId ||
      job.originalId !== current.originalId ||
      job.noteVersion !== current.noteVersion ||
      job.useAi
    )
      return false;
    if (!(await this.replace(value, expectedVersion))) return false;
    const changed = await this.db
      .update(jobs)
      .set({
        state: "running",
        leaseToken: value.owner.token,
        leaseUntil: value.deadlineAt,
        attempt: job.attempt + 1,
        updatedAt: now,
      })
      .where(and(eq(jobs.id, value.id), eq(jobs.state, "queued")))
      .returning({ id: jobs.id });
    if (changed.length !== 1) throw invalidState();
    return true;
  }
  async activeForNote(noteId: string) {
    const rows = await this.db
      .select()
      .from(machines)
      .where(
        and(
          eq(machines.noteId, noteId),
          sql`(${machines.phase}!='terminal' or ${machines.ownerState} in ('active','unknown') or ${machines.sourceMemoryBytes}!=0)`,
        ),
      )
      .orderBy(asc(machines.createdAt))
      .limit(2);
    if (rows.length > 1) throw invalidState();
    return rows[0] ? machineRow(rows[0]) : null;
  }
  async owned(runtimeId: string) {
    const rows = await this.db
      .select()
      .from(machines)
      .where(
        and(
          eq(machines.runtimeId, runtimeId),
          sql`(${machines.ownerState} in ('active','unknown') or ${machines.sourceMemoryBytes}!=0)`,
        ),
      )
      .orderBy(asc(machines.createdAt))
      .limit(3);
    if (rows.length > 2) throw invalidState();
    return rows.map(machineRow);
  }
  async page(executorId: string, after: RegenerationRecordCursor | null) {
    const rows = await this.db
      .select()
      .from(machines)
      .where(
        and(
          eq(machines.executorId, executorId),
          after
            ? or(
                gt(machines.createdAt, after.createdAt),
                and(
                  eq(machines.createdAt, after.createdAt),
                  gt(machines.id, after.id),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(asc(machines.createdAt), asc(machines.id))
      .limit(26);
    return rows.map(machineRow);
  }
  async finishJob(value: MachineRegeneration, now: Date) {
    if (
      value.phase !== "terminal" ||
      value.outcome === "unknown" ||
      value.owner.state === "active" ||
      value.owner.state === "unknown" ||
      value.sourceMemoryBytes !== 0
    )
      return false;
    const saved = await this.find(value.id);
    if (
      !saved ||
      JSON.stringify(machineValues(saved)) !==
        JSON.stringify(machineValues(value))
    )
      return false;
    const [job] = await this.db
      .select()
      .from(jobs)
      .where(eq(jobs.id, value.id))
      .limit(1);
    if (
      !job ||
      job.accountId !== value.executorId ||
      job.noteId !== value.noteId ||
      job.originalId !== value.originalId ||
      job.useAi
    )
      return false;
    const state =
      value.outcome === "succeeded"
        ? "succeeded"
        : value.outcome === "cancelled"
          ? "cancelled"
          : "failed";
    if (job.state === state) return true;
    if (
      job.state !== "queued" &&
      !(job.state === "running" && job.leaseToken === value.owner.token) &&
      !(job.state === "cancelled" && value.outcome !== "succeeded")
    )
      return false;
    return (
      (
        await this.db
          .update(jobs)
          .set({
            state,
            leaseToken: null,
            leaseUntil: null,
            failure:
              state === "failed"
                ? (value.failure ?? "再生成できませんでした。")
                : null,
            updatedAt: now,
          })
          .where(and(eq(jobs.id, value.id), eq(jobs.state, job.state)))
          .returning({ id: jobs.id })
      ).length === 1
    );
  }
  async prune(before: Date, limit: number) {
    const rows = await this.db
      .select({ id: machines.id })
      .from(machines)
      .where(
        and(
          eq(machines.phase, "terminal"),
          sql`${machines.ownerState} in ('none','closed')`,
          eq(machines.sourceMemoryBytes, 0),
          lt(machines.terminalAt, before),
        ),
      )
      .orderBy(asc(machines.terminalAt))
      .limit(limit);
    for (const row of rows) await this.remove(row.id);
  }
  async remove(id: string) {
    await this.db.delete(machines).where(eq(machines.id, id));
  }
}

export class LibsqlRegenerationRecordRepository
  implements RegenerationRecordRepository
{
  constructor(private readonly db: HollowTransaction) {}

  async page(noteId: string, after: RegenerationRecordCursor | null) {
    const rows = await this.db
      .select()
      .from(records)
      .where(
        and(
          eq(records.noteId, noteId),
          after
            ? or(
                gt(records.createdAt, after.createdAt),
                and(
                  eq(records.createdAt, after.createdAt),
                  gt(records.id, after.id),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(asc(records.createdAt), asc(records.id))
      .limit(26);
    return rows.map((row) => parseDriveBackup(driveBackupRecordSchema, row));
  }

  async find(noteId: string, recordId: string) {
    const [row] = await this.db
      .select()
      .from(records)
      .where(and(eq(records.noteId, noteId), eq(records.id, recordId)))
      .limit(1);
    return row ? parseDriveBackup(driveBackupRecordSchema, row) : null;
  }
}
