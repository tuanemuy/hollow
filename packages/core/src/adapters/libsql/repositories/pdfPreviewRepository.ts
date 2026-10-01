import { ConflictError } from "@repo/core/application/errors";
import { LLM_LIMITS } from "@repo/core/domain/llm/entity";
import {
  PDF_LLM_LIMITS,
  type PdfChoice,
  type PdfClassificationFailure,
  type PdfPreview,
  type PdfPreviewRepository,
  pdfChoice,
  pdfChoiceMatchesSource,
  pdfSourceIdentity,
} from "@repo/core/domain/llm/pdfPreview";
import {
  sourceAccess,
  sourceMemoryBytes,
} from "@repo/core/domain/regeneration/source";
import {
  and,
  count,
  eq,
  inArray,
  lt,
  notInArray,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { notes } from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";
import { llmPdfPreviews as previews } from "../llmSchema";

const invalid = () =>
  new ConflictError(
    "LLM_STATE_INVALID",
    "PDFの準備状態を確認できませんでした。",
  );
const live = sql`(${previews.state} in ('queued','running','ready','unknown') or ${previews.ownerState} in ('active','unknown'))`;
function failure(value: string | null): PdfClassificationFailure {
  switch (value) {
    case "LLM_DOCUMENT_CORRUPT":
    case "LLM_DOCUMENT_ENCRYPTED":
    case "LLM_DOCUMENT_UNSUPPORTED":
    case "LLM_DOCUMENT_NO_TEXT":
    case "LLM_RESOURCE_LIMIT":
    case "LLM_TIMEOUT":
    case "LLM_SOURCE_CHANGED":
    case "LLM_UNAVAILABLE":
      return value;
    default:
      throw invalid();
  }
}
function decode(row: typeof previews.$inferSelect): PdfPreview {
  const source = pdfSourceIdentity({
    kind: "original",
    format: "pdf",
    originalId: row.originalId,
    sha256: row.sourceSha256,
    bytes: row.sourceBytes,
  });
  if (
    !Number.isSafeInteger(row.ownershipGeneration) ||
    row.ownershipGeneration < 1 ||
    row.policyVersion !== 1 ||
    row.expiresAt.getTime() !==
      row.createdAt.getTime() + PDF_LLM_LIMITS.previewMs
  )
    throw invalid();
  const base = {
    access: sourceAccess({
      origin: row.sourceOrigin,
      bindingId: row.sourceBindingId,
    }),
    sourceMemoryBytes: sourceMemoryBytes(row.sourceMemoryBytes),
    id: row.id,
    accountId: row.accountId,
    commandId: row.commandId,
    requestDigest: row.requestDigest,
    noteId: row.noteId,
    noteVersion: row.noteVersion,
    ownershipGeneration: row.ownershipGeneration,
    source,
    credentialEpoch: row.credentialEpoch,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    updatedAt: row.updatedAt,
    cancelGeneration: row.cancelGeneration,
    version: row.version,
  };
  const idle = { state: "idle" as const, runtimeId: null, token: null };
  if (row.state === "queued") {
    if (
      row.ownerState !== "idle" ||
      row.runtimeId !== null ||
      row.ownerToken !== null
    )
      throw invalid();
    return { ...base, state: "queued", owner: idle };
  }
  if (
    row.state === "failed" ||
    row.state === "cancelled" ||
    row.state === "expired"
  ) {
    const owner =
      row.ownerState === "idle" &&
      row.runtimeId === null &&
      row.ownerToken === null
        ? idle
        : row.ownerState === "closed" && row.runtimeId && row.ownerToken
          ? {
              state: "closed" as const,
              runtimeId: row.runtimeId,
              token: row.ownerToken,
            }
          : null;
    if (!owner) throw invalid();
    return row.state === "failed"
      ? { ...base, state: "failed", owner, code: failure(row.failureCode) }
      : { ...base, state: row.state, owner };
  }
  if (!row.ownerToken || !row.runtimeId) throw invalid();
  const identity = { runtimeId: row.runtimeId, token: row.ownerToken };
  if (row.state === "running" && row.ownerState === "active")
    return {
      ...base,
      state: "running",
      owner: { ...identity, state: "active" },
    };
  if (row.state === "unknown" && row.ownerState === "unknown")
    return {
      ...base,
      state: "unknown",
      owner: { ...identity, state: "unknown" },
    };
  if (row.ownerState !== "closed") throw invalid();
  const owner = { ...identity, state: "closed" as const };
  if (row.state === "consumed" && row.consumedJobId)
    return { ...base, state: "consumed", owner, jobId: row.consumedJobId };
  if (
    row.state !== "ready" ||
    !row.resultJson ||
    Buffer.byteLength(row.resultJson) > PDF_LLM_LIMITS.manifestBytes ||
    row.cancelGeneration !== 0
  )
    throw invalid();
  let result: PdfChoice;
  try {
    result = pdfChoice(JSON.parse(row.resultJson));
  } catch {
    throw invalid();
  }
  if (!pdfChoiceMatchesSource(result, source)) throw invalid();
  return { ...base, state: "ready", owner, result };
}
function encode(value: PdfPreview): typeof previews.$inferInsert {
  if (
    value.state === "ready" &&
    !pdfChoiceMatchesSource(value.result, value.source)
  )
    throw invalid();
  return {
    sourceOrigin: value.access.origin,
    sourceBindingId: value.access.bindingId,
    sourceMemoryBytes: value.sourceMemoryBytes,
    id: value.id,
    accountId: value.accountId,
    commandId: value.commandId,
    requestDigest: value.requestDigest,
    noteId: value.noteId,
    noteVersion: value.noteVersion,
    ownershipGeneration: value.ownershipGeneration,
    originalId: value.source.originalId,
    sourceSha256: value.source.sha256,
    sourceBytes: value.source.bytes,
    credentialEpoch: value.credentialEpoch,
    policyVersion: 1,
    createdAt: value.createdAt,
    expiresAt: value.expiresAt,
    updatedAt: value.updatedAt,
    state: value.state,
    ownerState: value.owner.state,
    ownerToken: value.owner.token,
    runtimeId: value.owner.runtimeId,
    cancelGeneration: value.cancelGeneration,
    version: value.version,
    resultJson:
      value.state === "ready" ? JSON.stringify(pdfChoice(value.result)) : null,
    failureCode: value.state === "failed" ? value.code : null,
    consumedJobId: value.state === "consumed" ? value.jobId : null,
  };
}

export class LibsqlPdfPreviewRepository implements PdfPreviewRepository {
  constructor(private readonly db: HollowTransaction) {}
  async insert(value: PdfPreview & { state: "queued" }) {
    await this.db.insert(previews).values(encode(value));
  }
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(previews)
      .where(eq(previews.id, id));
    return row ? decode(row) : null;
  }
  async command(accountId: string, commandId: string) {
    const [row] = await this.db
      .select()
      .from(previews)
      .where(
        and(
          eq(previews.accountId, accountId),
          eq(previews.commandId, commandId),
        ),
      );
    return row ? decode(row) : null;
  }
  async liveForNote(noteId: string) {
    const [row] = await this.db
      .select()
      .from(previews)
      .where(and(eq(previews.noteId, noteId), live));
    return row ? decode(row) : null;
  }
  async liveForAccount(accountId: string) {
    const [row] = await this.db
      .select()
      .from(previews)
      .where(and(eq(previews.accountId, accountId), live));
    return row ? decode(row) : null;
  }
  async sourceGeneration(noteId: string) {
    const [row] = await this.db
      .select({ generation: notes.ownershipGeneration })
      .from(notes)
      .where(eq(notes.id, noteId));
    return row?.generation ?? null;
  }
  async replace(value: PdfPreview, expectedVersion: number) {
    if (value.version !== expectedVersion + 1 || value.state === "consumed")
      throw invalid();
    const current = await this.find(value.id);
    if (
      !current ||
      current.version !== expectedVersion ||
      current.state === "consumed"
    )
      return false;
    if (
      (current.access.origin !== value.access.origin ||
        current.access.bindingId !== value.access.bindingId) &&
      !(
        current.access.origin === "drive-record" &&
        value.access.origin === "redacted" &&
        value.access.bindingId === null
      )
    )
      throw invalid();
    const encoded = encode(value);
    const old = encode(current);
    const mutable = new Set([
      "sourceOrigin",
      "sourceBindingId",
      "sourceMemoryBytes",
      "updatedAt",
      "state",
      "ownerState",
      "ownerToken",
      "runtimeId",
      "cancelGeneration",
      "version",
      "resultJson",
      "failureCode",
    ]);
    for (const key of Object.keys(encoded) as (keyof typeof encoded)[])
      if (
        !mutable.has(key) &&
        JSON.stringify(encoded[key]) !== JSON.stringify(old[key])
      )
        throw invalid();
    const rows = await this.db
      .update(previews)
      .set({
        sourceOrigin: encoded.sourceOrigin,
        sourceBindingId: encoded.sourceBindingId,
        sourceMemoryBytes: encoded.sourceMemoryBytes,
        updatedAt: encoded.updatedAt,
        state: encoded.state,
        ownerState: encoded.ownerState,
        ownerToken: encoded.ownerToken,
        runtimeId: encoded.runtimeId,
        cancelGeneration: encoded.cancelGeneration,
        version: encoded.version,
        resultJson: encoded.resultJson,
        failureCode: encoded.failureCode,
      })
      .where(
        and(eq(previews.id, value.id), eq(previews.version, expectedVersion)),
      )
      .returning({ id: previews.id });
    return rows.length === 1;
  }
  async claim(now: Date, runtimeId: string, ownerToken: string) {
    const [owners] = await this.db
      .select({
        n: sql<number>`(select count(*) from llm_conversions where owner_state in ('active','unknown'))+(select count(*) from llm_pdf_previews where owner_state in ('active','unknown'))`,
      })
      .from(previews)
      .limit(1);
    if (!owners || owners.n >= LLM_LIMITS.concurrency) return null;
    const [row] = await this.db
      .select()
      .from(previews)
      .where(
        and(
          eq(previews.state, "queued"),
          eq(previews.sourceOrigin, "local-original"),
          eq(previews.sourceMemoryBytes, 0),
          eq(previews.cancelGeneration, 0),
          sql`${previews.expiresAt}>${now.getTime()}`,
          sql`not exists(select 1 from llm_conversions c where c.account_id=${previews.accountId} and c.owner_state in ('active','unknown'))`,
          sql`not exists(select 1 from llm_pdf_previews p where p.account_id=${previews.accountId} and p.owner_state in ('active','unknown'))`,
          sql`not exists(select 1 from llm_conversions c where c.phase in ('queued','response-ready') and c.outcome='pending' and c.cancel_generation=0 and not exists(select 1 from llm_conversions b where b.account_id=c.account_id and b.owner_state in ('active','unknown')) and not exists(select 1 from llm_pdf_previews b where b.account_id=c.account_id and b.owner_state in ('active','unknown')))`,
        ),
      )
      .orderBy(previews.createdAt, previews.id)
      .limit(1);
    if (!row) return null;
    const [claimed] = await this.db
      .update(previews)
      .set({
        state: "running",
        ownerState: "active",
        runtimeId,
        ownerToken,
        version: row.version + 1,
        updatedAt: now,
      })
      .where(
        and(
          eq(previews.id, row.id),
          eq(previews.version, row.version),
          eq(previews.state, "queued"),
        ),
      )
      .returning();
    return claimed ? decode(claimed) : null;
  }
  async owned(runtimeId: string) {
    return (
      await this.db
        .select()
        .from(previews)
        .where(
          and(
            eq(previews.runtimeId, runtimeId),
            inArray(previews.ownerState, ["active", "unknown"]),
          ),
        )
    ).map(decode);
  }
  async consume(id: string, expectedVersion: number, jobId: string, now: Date) {
    return (
      (
        await this.db
          .update(previews)
          .set({
            state: "consumed",
            consumedJobId: jobId,
            resultJson: null,
            updatedAt: now,
            version: expectedVersion + 1,
          })
          .where(
            and(
              eq(previews.id, id),
              eq(previews.version, expectedVersion),
              eq(previews.state, "ready"),
              eq(previews.cancelGeneration, 0),
              sql`${previews.expiresAt}>${now.getTime()}`,
              sql`exists(select 1 from llm_conversions c where c.job_id=${jobId} and c.selection_state='fixed' and c.operation='regenerate' and c.account_id=${previews.accountId} and c.note_id=${previews.noteId} and c.note_version=${previews.noteVersion} and c.original_id=${previews.originalId} and c.source_sha256=${previews.sourceSha256} and c.source_bytes=${previews.sourceBytes} and c.source_ownership_generation=${previews.ownershipGeneration} and c.credential_epoch=${previews.credentialEpoch} and c.pdf_selection_manifest=${previews.resultJson})`,
            ),
          )
          .returning({ id: previews.id })
      ).length === 1
    );
  }
  private async cancel(where: SQL, now: Date) {
    return (
      await this.db
        .update(previews)
        .set({
          cancelGeneration: sql`${previews.cancelGeneration}+1`,
          updatedAt: now,
          version: sql`${previews.version}+1`,
          state: sql`case when ${previews.state}='ready' then 'cancelled' else ${previews.state} end`,
          resultJson: null,
        })
        .where(and(where, live, eq(previews.cancelGeneration, 0)))
        .returning({ id: previews.id })
    ).length;
  }
  cancelNote(noteId: string, now: Date) {
    return this.cancel(eq(previews.noteId, noteId), now);
  }
  cancelAccount(accountId: string, credentialEpoch: number, now: Date) {
    return this.cancel(
      and(
        eq(previews.accountId, accountId),
        eq(previews.credentialEpoch, credentialEpoch),
      ) ?? sql`0`,
      now,
    );
  }
  cancelScopeActor(workspaceId: string, accountId: string, now: Date) {
    return this.cancel(
      and(
        eq(previews.accountId, accountId),
        sql`exists(select 1 from notes n where n.id=${previews.noteId} and n.owner_workspace_id=${workspaceId})`,
      ) ?? sql`0`,
      now,
    );
  }
  async receipts(accountId: string) {
    const [row] = await this.db
      .select({ n: count() })
      .from(previews)
      .where(
        and(
          eq(previews.accountId, accountId),
          notInArray(previews.state, ["queued", "running", "ready", "unknown"]),
        ),
      );
    return row?.n ?? 0;
  }
  async sweepable(now: Date, limit: number) {
    return (
      await this.db
        .select()
        .from(previews)
        .where(
          and(
            inArray(previews.state, ["queued", "running", "ready", "unknown"]),
            or(
              sql`${previews.expiresAt}<=${now.getTime()}`,
              sql`${previews.cancelGeneration}>0`,
            ),
          ),
        )
        .orderBy(previews.createdAt, previews.id)
        .limit(Math.min(Math.max(limit, 0), 100))
    ).map(decode);
  }
  async prune(before: Date, limit: number) {
    const rows = await this.db
      .select({ id: previews.id })
      .from(previews)
      .where(
        and(
          notInArray(previews.state, ["queued", "running", "ready", "unknown"]),
          notInArray(previews.ownerState, ["active", "unknown"]),
          eq(previews.sourceMemoryBytes, 0),
          sql`${previews.sourceBindingId} is null`,
          lt(previews.updatedAt, before),
        ),
      )
      .orderBy(previews.updatedAt, previews.id)
      .limit(Math.min(Math.max(limit, 0), 100));
    if (!rows.length) return 0;
    return (
      await this.db
        .delete(previews)
        .where(
          inArray(
            previews.id,
            rows.map((row) => row.id),
          ),
        )
        .returning({ id: previews.id })
    ).length;
  }
}
