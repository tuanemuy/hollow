import { SystemError, SystemErrorCode } from "@repo/core/application/errors";
import { BusinessRuleError } from "@repo/core/domain/error";
import type {
  ZipArtifact,
  ZipAssembly,
  ZipAttempt,
  ZipCleanup,
  ZipDelivery,
  ZipRequest,
  ZipRun,
  ZipRunKey,
  ZipRunResult,
  ZipSpool,
  ZipSpoolRef,
} from "@repo/core/domain/zip/entity";
import {
  pdfComputeIdentity,
  type ZipPdfBinding,
} from "@repo/core/domain/zip/pdf";
import { and, asc, desc, eq, type SQL, sql } from "drizzle-orm";
import type { HollowTransaction } from "../hollowUnitOfWork";
import {
  type zipArtifacts,
  type zipAssemblies,
  zipAttempts,
  type zipDeliveries,
  type zipRequests,
  zipRuns,
  zipSpoolRefs,
  zipSpools,
} from "../zipSchema";

export const zipUnavailable = () =>
  new BusinessRuleError(
    "ZIP_UNAVAILABLE",
    "現在のノートからZIPをやり直してください。",
  );
export const zipCorrupt = () =>
  new SystemError(
    SystemErrorCode.DataIntegrityError,
    "ZIPの所有記録が一致しません。",
  );
export const runWhere = (key: ZipRunKey) =>
  and(
    eq(zipRuns.requestId, key.requestId),
    eq(zipRuns.generation, key.generation),
  );
export const runValues = (run: ZipRun): typeof zipRuns.$inferInsert => {
  const { lease, ...values } = run;
  return {
    ...values,
    leaseToken: lease?.token ?? null,
    runtimeId: lease?.runtimeId ?? null,
    leaseUntil: lease?.until ?? null,
  };
};
export const requestValues = (
  request: ZipRequest,
): typeof zipRequests.$inferInsert => {
  const { options, ...values } = request;
  return { ...values, ...options };
};
export const cleanupValues = (cleanup: ZipCleanup) => ({
  nextCleanupAt: cleanup.nextAt,
  cleanupToken: cleanup.claim?.token ?? null,
  cleanupUntil: cleanup.claim?.until ?? null,
});
const cleanupRow = (row: {
  nextCleanupAt: Date;
  cleanupToken: string | null;
  cleanupUntil: Date | null;
}): ZipCleanup => {
  if (row.cleanupToken !== null && row.cleanupUntil !== null)
    return {
      nextAt: row.nextCleanupAt,
      claim: { token: row.cleanupToken, until: row.cleanupUntil },
    };
  if (row.cleanupToken === null && row.cleanupUntil === null)
    return { nextAt: row.nextCleanupAt, claim: null };
  throw zipCorrupt();
};
export function requestRow(row: typeof zipRequests.$inferSelect): ZipRequest {
  const { format, style, ...values } = row;
  return { ...values, options: { format, style } };
}
export function runRow(row: typeof zipRuns.$inferSelect): ZipRun {
  const terminal = ["succeeded", "partial", "failed", "cancelled"].includes(
    row.state,
  );
  if (terminal !== (row.finishedAt !== null)) throw zipCorrupt();
  const { leaseToken, runtimeId, leaseUntil, state, failure, ...base } = row;
  const lease =
    leaseToken !== null && runtimeId !== null && leaseUntil !== null
      ? { token: leaseToken, runtimeId, until: leaseUntil }
      : null;
  if (
    (leaseToken === null || runtimeId === null || leaseUntil === null) &&
    (leaseToken !== null || runtimeId !== null || leaseUntil !== null)
  )
    throw zipCorrupt();
  if (state === "queued" && !lease && !failure && base.finishedAt === null)
    return { ...base, state, finishedAt: null, lease: null, failure: null };
  if (
    (state === "running" || state === "assembling") &&
    lease &&
    !failure &&
    base.finishedAt === null
  )
    return { ...base, state, finishedAt: null, lease, failure: null };
  if (state === "stopping" && base.finishedAt === null)
    return { ...base, state, finishedAt: null, lease, failure };
  if (
    (state === "succeeded" || state === "partial" || state === "cancelled") &&
    !lease &&
    !failure &&
    base.finishedAt
  )
    return {
      ...base,
      state,
      finishedAt: base.finishedAt,
      lease: null,
      failure: null,
    };
  if (state === "failed" && !lease && failure && base.finishedAt)
    return {
      ...base,
      state,
      finishedAt: base.finishedAt,
      lease: null,
      failure,
    };
  throw zipCorrupt();
}
export function attemptRow(row: typeof zipAttempts.$inferSelect): ZipAttempt {
  const {
    pdfComputeId,
    pdfSourceIdentity,
    pdfProfile,
    pdfExternalIdentity,
    pdfDeadlineAt,
    pdfPhase,
    ...base
  } = row;
  let pdf: ZipPdfBinding | undefined;
  const fields = [
    pdfComputeId,
    pdfSourceIdentity,
    pdfProfile,
    pdfExternalIdentity,
    pdfDeadlineAt,
    pdfPhase,
  ];
  if (fields.some((value) => value !== null)) {
    if (
      row.state !== "running" ||
      !pdfComputeId ||
      !pdfSourceIdentity ||
      !pdfProfile ||
      !pdfExternalIdentity ||
      !pdfDeadlineAt ||
      !pdfPhase
    )
      throw zipCorrupt();
    pdf = {
      computeId: pdfComputeId,
      identity: pdfComputeIdentity(pdfSourceIdentity),
      profile: pdfProfile,
      externalIdentity: pdfExternalIdentity,
      deadlineAt: pdfDeadlineAt,
      phase: pdfPhase,
    };
  }
  if (row.state === "running" && row.result === null && row.failure === null)
    return {
      ...base,
      state: "running",
      result: null,
      failure: null,
      ...(pdf ? { pdf } : {}),
    };
  if (
    (row.state === "queued" || row.state === "cancelled") &&
    row.result === null &&
    row.failure === null
  )
    return { ...base, state: row.state, result: null, failure: null };
  if (row.state === "succeeded" && row.result && !row.failure)
    return { ...base, state: row.state, result: row.result, failure: null };
  if (
    (row.state === "failed" || row.state === "excluded") &&
    !row.result &&
    row.failure
  )
    return { ...base, state: row.state, result: null, failure: row.failure };
  throw zipCorrupt();
}
export function spoolRow(row: typeof zipSpools.$inferSelect): ZipSpool {
  const base = { ...row, cleanup: cleanupRow(row) };
  if (row.state === "writing" && row.key && row.result === null)
    return { ...base, state: row.state, key: row.key, result: null };
  if (row.state === "ready" && row.key && row.result)
    return { ...base, state: row.state, key: row.key, result: row.result };
  if (row.state === "cleanup" && row.key)
    return { ...base, state: row.state, key: row.key };
  if (
    row.state === "removed" &&
    row.key === null &&
    row.result === null &&
    row.reservedBytes === 0
  )
    return { ...base, state: row.state, key: null, result: null };
  throw zipCorrupt();
}
export function refRow(row: typeof zipSpoolRefs.$inferSelect): ZipSpoolRef {
  if (row.purpose === "active" && row.retryUntil === null)
    return { ...row, purpose: row.purpose, retryUntil: null };
  if (row.purpose === "retry" && row.retryUntil)
    return { ...row, purpose: row.purpose, retryUntil: row.retryUntil };
  throw zipCorrupt();
}
export function assemblyRow(
  row: typeof zipAssemblies.$inferSelect,
): ZipAssembly {
  const base = { ...row, cleanup: cleanupRow(row) };
  if (row.state === "closed" && row.outcome)
    return { ...base, state: row.state, outcome: row.outcome };
  if (
    (row.state === "writing" || row.state === "closing") &&
    row.key &&
    row.outcome !== "success"
  )
    return { ...base, state: row.state, key: row.key, outcome: row.outcome };
  throw zipCorrupt();
}
export function artifactRow(
  row: typeof zipArtifacts.$inferSelect,
): ZipArtifact {
  const base = { ...row, cleanup: cleanupRow(row) };
  if ((row.state === "ready" || row.state === "cleanup") && row.key && row.file)
    return { ...base, state: row.state, key: row.key, file: row.file };
  if (
    row.state === "removed" &&
    row.key === null &&
    row.file === null &&
    row.reservedBytes === 0
  )
    return { ...base, state: row.state, key: null, file: null };
  throw zipCorrupt();
}
export function deliveryRow(
  row: typeof zipDeliveries.$inferSelect,
): ZipDelivery {
  const { claimToken, runtimeId, ...base } = row;
  if (
    (row.state === "ready" || row.state === "closed") &&
    claimToken === null &&
    runtimeId === null
  )
    return { ...base, state: row.state, claim: null };
  if (
    (row.state === "sending" || row.state === "closing") &&
    claimToken !== null &&
    runtimeId !== null
  )
    return {
      ...base,
      state: row.state,
      claim: { token: claimToken, runtimeId },
    };
  throw zipCorrupt();
}

export const zipReservedSql = sql`coalesce((select sum(reserved_bytes) from zip_spools),0)+coalesce((select sum(reserved_bytes) from zip_assemblies),0)+coalesce((select sum(reserved_bytes) from zip_artifacts),0)`;
export const currentZipRead = (noteId: SQL, accountId: SQL) =>
  sql`exists(select 1 from notes n join accounts actor on actor.id=${accountId} where n.id=${noteId} and actor.verified_at is not null and n.lifecycle='active' and ((n.owner_workspace_id is null and exists(select 1 from accounts owner where owner.id=n.owner_account_id and owner.state='active')) or exists(select 1 from workspaces w where w.id=n.owner_workspace_id and w.state='active')) and (n.owner_account_id=actor.id or exists(select 1 from workspace_members m where m.workspace_id=n.owner_workspace_id and m.account_id=actor.id)))`;
export async function reserveZipBytes(
  db: HollowTransaction,
  bytes: number,
  limit: number,
) {
  if (
    !Number.isSafeInteger(bytes) ||
    bytes < 0 ||
    !Number.isSafeInteger(limit) ||
    limit < 1
  )
    throw zipCorrupt();
  if (bytes > limit)
    throw new BusinessRuleError(
      "ZIP_CAPACITY",
      "ZIP作業領域の設定が不足しています。",
    );
  const [row] = await db.all<{ bytes: number }>(
    sql`select ${zipReservedSql} bytes`,
  );
  if (Number(row?.bytes ?? 0) + bytes > limit)
    throw new BusinessRuleError(
      "ZIP_DISK_BUSY",
      "ZIP作業領域を使用中です。回収後にやり直してください。",
    );
}
export async function liveRun(
  db: HollowTransaction,
  key: ZipRunKey,
  token: string,
  now: Date,
) {
  const [row] = await db
    .select()
    .from(zipRuns)
    .where(
      and(
        runWhere(key),
        eq(zipRuns.leaseToken, token),
        sql`${zipRuns.state} in('running','assembling') and ${zipRuns.leaseUntil}>${now.getTime()} and ${zipRuns.deadlineAt}>${now.getTime()}`,
        sql`exists(select 1 from zip_requests q where q.id=${zipRuns.requestId} and q.generation=${zipRuns.generation} and q.state in('active','assembling') and q.cancel_generation<${zipRuns.generation})`,
      ),
    );
  return row ? runRow(row) : null;
}
export const ownerAbsent = (kind: string, id: string) =>
  sql`not exists(select 1 from object_writes w where w.kind=${kind} and w.owner_id=${id} and w.active=1)`;
export const deleteReceipt = (key: string, token: string) =>
  sql`exists(select 1 from object_deletes d where d.storage_key=${key} and d.token=${token} and d.done=1)`;

export async function runResults(
  db: HollowTransaction,
  run: ZipRun,
): Promise<readonly ZipRunResult[]> {
  const [prior] = await db
    .select({ results: zipRuns.results })
    .from(zipRuns)
    .where(
      and(
        eq(zipRuns.requestId, run.requestId),
        sql`${zipRuns.generation}<${run.generation} and ${zipRuns.results} is not null`,
      ),
    )
    .orderBy(desc(zipRuns.generation))
    .limit(1);
  const results = new Map(
    (prior?.results ?? []).map((result) => [
      result.ordinal,
      { ...result, origin: "reused" as const },
    ]),
  );
  const attempts = await db
    .select()
    .from(zipAttempts)
    .where(
      and(
        eq(zipAttempts.requestId, run.requestId),
        sql`${zipAttempts.generation}<=${run.generation} and ${zipAttempts.attemptNumber}=(select max(p.attempt_number) from zip_attempts p where p.request_id=${zipAttempts.requestId} and p.ordinal=${zipAttempts.ordinal} and p.generation<=${run.generation})`,
      ),
    )
    .orderBy(asc(zipAttempts.ordinal))
    .limit(500);
  const finalized = new Map<number, ZipRunResult>(results);
  for (const row of attempts) {
    const attempt = attemptRow(row);
    if (attempt.state === "queued" || attempt.state === "running")
      throw zipCorrupt();
    const value = attempt.result;
    finalized.set(attempt.ordinal, {
      ordinal: attempt.ordinal,
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      origin: attempt.generation === run.generation ? "attempt" : "reused",
      state: attempt.state,
      failure: attempt.failure,
      source: value
        ? {
            sourceIdentity: value.sourceIdentity,
            externalIdentity: value.externalIdentity,
            profile: value.profile,
            bytes: value.bytes,
            sha256: value.sha256,
          }
        : null,
    });
  }
  const reused = await db
    .select({ ordinal: zipSpoolRefs.ordinal, attempt: zipAttempts })
    .from(zipSpoolRefs)
    .innerJoin(zipSpools, eq(zipSpools.id, zipSpoolRefs.spoolId))
    .innerJoin(zipAttempts, eq(zipAttempts.id, zipSpools.attemptId))
    .where(
      and(
        eq(zipSpoolRefs.requestId, run.requestId),
        eq(zipSpoolRefs.generation, run.generation),
      ),
    )
    .limit(500);
  for (const row of reused) {
    if (finalized.has(row.ordinal)) continue;
    const attempt = attemptRow(row.attempt);
    if (attempt.state !== "succeeded") throw zipCorrupt();
    const value = attempt.result;
    finalized.set(row.ordinal, {
      ordinal: row.ordinal,
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      origin: "reused",
      state: "succeeded",
      failure: null,
      source: {
        sourceIdentity: value.sourceIdentity,
        externalIdentity: value.externalIdentity,
        profile: value.profile,
        bytes: value.bytes,
        sha256: value.sha256,
      },
    });
  }
  for (const excluded of run.exclusions) {
    const previous = finalized.get(excluded.ordinal);
    if (previous)
      finalized.set(excluded.ordinal, {
        ...previous,
        state: excluded.reason === "ZIP_CANCELLED" ? "cancelled" : "excluded",
        failure: excluded.reason === "ZIP_CANCELLED" ? null : excluded.reason,
        source: null,
      });
  }
  return [...finalized.values()].sort((a, b) => a.ordinal - b.ordinal);
}
