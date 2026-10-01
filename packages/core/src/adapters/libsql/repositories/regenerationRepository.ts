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
import { and, asc, eq, gt, or, sql } from "drizzle-orm";
import { driveBackupRecords as records } from "../driveBackupSchema";
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
