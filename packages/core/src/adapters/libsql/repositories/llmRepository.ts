import { ConflictError } from "@repo/core/application/errors";
import {
  isLlmDocumentFormat,
  isLlmLegacyFormat,
  LLM_LIMITS,
  type LlmConversion,
  type LlmDispatch,
  type LlmFixedConversion,
  type LlmInputIdentity,
  type LlmOutcome,
  type LlmOwnership,
  type LlmQuotaReservation,
  type LlmResponse,
  type LlmSourceContract,
  llmMonth,
} from "@repo/core/domain/llm/entity";
import {
  PDF_LLM_LIMITS,
  type PdfChoice,
  pdfChoice,
  pdfChoiceMatchesSource,
} from "@repo/core/domain/llm/pdfPreview";
import type {
  LlmConversionRepository,
  LlmDispatchRepository,
  LlmQuotaRepository,
} from "@repo/core/domain/llm/repositories";
import {
  sourceAccess,
  sourceInputReceipt,
  sourceInputReceiptMatches,
  sourceMemoryBytes,
} from "@repo/core/domain/regeneration/source";
import {
  and,
  count,
  eq,
  inArray,
  lt,
  ne,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { conversionJobs } from "../hollowSchema";
import type { HollowTransaction } from "../hollowUnitOfWork";
import {
  llmQuotaBuckets as buckets,
  llmConversions as conversions,
  llmDispatches as dispatches,
  llmAccountFences as fences,
  llmPdfPreviews as previews,
  llmQuotaReservations as reservations,
} from "../llmSchema";

const invalid = () =>
  new ConflictError("LLM_STATE_INVALID", "変換状態を確認できませんでした。");
const live = sql`(${conversions.phase} != 'terminal' or ${conversions.ownerState} in ('active','unknown'))`;
function conversion(row: typeof conversions.$inferSelect): LlmConversion {
  let owner: LlmOwnership;
  if (row.ownerState === "idle")
    owner = { state: "idle", runtimeId: null, token: null };
  else {
    if (!row.runtimeId || !row.ownerToken) throw invalid();
    owner = {
      state: row.ownerState,
      runtimeId: row.runtimeId,
      token: row.ownerToken,
    };
  }
  let outcome: LlmOutcome;
  switch (row.outcome) {
    case "pending":
    case "cancelled":
      outcome = { kind: row.outcome };
      break;
    case "succeeded":
      if (row.resultVersion === null) throw invalid();
      outcome = { kind: "succeeded", noteVersion: row.resultVersion };
      break;
    case "failed":
      if (row.failure === null) throw invalid();
      outcome = { kind: "failed", code: row.failure };
      break;
    case "unknown":
      if (
        row.failure !== "LLM_DELIVERY_UNKNOWN" &&
        row.failure !== "LLM_OWNERSHIP_UNKNOWN"
      )
        throw invalid();
      outcome = { kind: "unknown", code: row.failure };
      break;
  }
  const source = {
    kind: "original" as const,
    originalId: row.originalId,
    sha256: row.sourceSha256,
    bytes: row.sourceBytes,
  };
  const base = {
    access: sourceAccess({
      origin: row.sourceOrigin,
      bindingId: row.sourceBindingId,
    }),
    sourceMemoryBytes: sourceMemoryBytes(row.sourceMemoryBytes),
    inputReceipt: sourceInputReceipt(row.inputReceipt),
    jobId: row.jobId,
    accountId: row.accountId,
    noteId: row.noteId,
    commandId: row.commandId,
    requestDigest: row.requestDigest,
    retryOf: row.retryOf,
    sourceState: row.sourceState,
    sourceCoverage: row.sourceCoverage,
    noteVersion: row.noteVersion,
    originalRevisionNo: row.originalRevisionNo,
    credentialEpoch: row.credentialEpoch,
    instruction: row.instruction,
    admissionSequence: row.admissionSequence,
    createdAt: row.createdAt,
    deadlineAt: row.deadlineAt,
    updatedAt: row.updatedAt,
    owner,
    cancelGeneration: row.cancelGeneration,
    responseBudget: row.responseBudget,
    version: row.version,
  };
  if (
    !sourceInputReceiptMatches(base.inputReceipt, {
      consumer: { kind: "llm-conversion", id: row.jobId },
      owner,
      sourceMemoryBytes: base.sourceMemoryBytes,
    })
  )
    throw invalid();
  if (row.selectionState === "pdf-pending") {
    if (
      row.sourceFormat !== "pdf" ||
      row.operation !== "import" ||
      row.modelId !== null ||
      row.preparationVersion !== null ||
      row.promptVersion !== null ||
      row.pdfSelectionManifest !== null ||
      !row.candidateTextModelId ||
      !row.candidateImageModelId ||
      !Number.isSafeInteger(row.candidateSettingsVersion) ||
      (row.candidateSettingsVersion ?? 0) < 1 ||
      !Number.isSafeInteger(row.sourceOwnershipGeneration) ||
      (row.sourceOwnershipGeneration ?? 0) < 1 ||
      row.candidateSettingsVersion === null ||
      row.sourceOwnershipGeneration === null
    )
      throw invalid();
    const pending = {
      ...base,
      selection: "pdf-pending" as const,
      operation: "import" as const,
      source: { ...source, format: "pdf" as const },
      sourceOwnershipGeneration: row.sourceOwnershipGeneration,
      candidates: {
        textModelId: row.candidateTextModelId,
        imageModelId: row.candidateImageModelId,
        settingsVersion: row.candidateSettingsVersion,
      },
    };
    if (
      (row.phase === "queued" || row.phase === "classifying") &&
      (outcome.kind === "pending" || outcome.kind === "unknown")
    )
      return { ...pending, phase: row.phase, outcome };
    if (
      row.phase === "terminal" &&
      outcome.kind !== "pending" &&
      outcome.kind !== "succeeded"
    )
      return { ...pending, phase: "terminal", outcome };
    throw invalid();
  }
  if (
    row.selectionState !== "fixed" ||
    !row.modelId ||
    row.phase === "classifying" ||
    row.candidateTextModelId !== null ||
    row.candidateImageModelId !== null ||
    row.candidateSettingsVersion !== null
  )
    throw invalid();
  let proof: PdfChoice | null = null;
  if (row.pdfSelectionManifest !== null) {
    if (
      Buffer.byteLength(row.pdfSelectionManifest) > PDF_LLM_LIMITS.manifestBytes
    )
      throw invalid();
    try {
      proof = pdfChoice(JSON.parse(row.pdfSelectionManifest));
    } catch {
      throw invalid();
    }
    if (
      !Number.isSafeInteger(row.sourceOwnershipGeneration) ||
      (row.sourceOwnershipGeneration ?? 0) < 1 ||
      proof.preparationVersion !== row.preparationVersion ||
      proof.promptVersion !== row.promptVersion ||
      !pdfChoiceMatchesSource(proof, { ...source, format: row.sourceFormat })
    )
      throw invalid();
  } else if (row.sourceOwnershipGeneration !== null) throw invalid();
  const fixed = {
    ...base,
    selection: "fixed" as const,
    operation: row.operation,
    modelId: row.modelId,
    phase: row.phase,
    outcome,
  };
  if (proof !== null) {
    if (row.sourceOwnershipGeneration === null) throw invalid();
    const classified = {
      ...fixed,
      source: { ...source, format: "pdf" as const },
      sourceOwnershipGeneration: row.sourceOwnershipGeneration,
    };
    return proof.kind === "strict-text"
      ? {
          ...classified,
          preparationVersion: 2,
          promptVersion: 1,
          pdfProof: proof,
        }
      : {
          ...classified,
          preparationVersion: 4,
          promptVersion: 3,
          pdfProof: proof,
          manifest: proof.manifest,
        };
  }
  let contract: Exclude<LlmSourceContract, { preparationVersion: 4 }>;
  if (
    isLlmLegacyFormat(row.sourceFormat) &&
    row.promptVersion === 1 &&
    (row.preparationVersion === null || row.preparationVersion === 1)
  ) {
    contract = {
      source: { ...source, format: row.sourceFormat },
      preparationVersion: 1,
      promptVersion: 1,
    };
  } else if (
    isLlmDocumentFormat(row.sourceFormat) &&
    row.promptVersion === 1 &&
    row.preparationVersion === 2
  ) {
    contract = {
      source: { ...source, format: row.sourceFormat },
      preparationVersion: 2,
      promptVersion: 1,
    };
  } else if (
    row.sourceFormat === "image" &&
    row.preparationVersion === 3 &&
    row.promptVersion === 2
  ) {
    contract = {
      source: { ...source, format: "image" },
      preparationVersion: 3,
      promptVersion: 2,
    };
  } else throw invalid();
  return {
    ...fixed,
    ...contract,
    pdfProof: null,
    sourceOwnershipGeneration: null,
  };
}
function encode(value: LlmConversion): typeof conversions.$inferInsert {
  if (
    !sourceInputReceiptMatches(value.inputReceipt, {
      consumer: { kind: "llm-conversion", id: value.jobId },
      owner: value.owner,
      sourceMemoryBytes: value.sourceMemoryBytes,
    })
  )
    throw invalid();
  return {
    sourceOrigin: value.access.origin,
    sourceBindingId: value.access.bindingId,
    sourceMemoryBytes: value.sourceMemoryBytes,
    inputReceipt: value.inputReceipt,
    jobId: value.jobId,
    accountId: value.accountId,
    noteId: value.noteId,
    originalId: value.source.originalId,
    commandId: value.commandId,
    requestDigest: value.requestDigest,
    operation: value.operation,
    retryOf: value.retryOf,
    sourceSha256: value.source.sha256,
    sourceBytes: value.source.bytes,
    sourceFormat: value.source.format,
    sourceState: value.sourceState,
    sourceCoverage: value.sourceCoverage,
    noteVersion: value.noteVersion,
    originalRevisionNo: value.originalRevisionNo,
    credentialEpoch: value.credentialEpoch,
    modelId: value.selection === "fixed" ? value.modelId : null,
    instruction: value.instruction,
    promptVersion: value.selection === "fixed" ? value.promptVersion : null,
    preparationVersion:
      value.selection === "fixed" ? value.preparationVersion : null,
    selectionState: value.selection,
    candidateTextModelId:
      value.selection === "pdf-pending" ? value.candidates.textModelId : null,
    candidateImageModelId:
      value.selection === "pdf-pending" ? value.candidates.imageModelId : null,
    candidateSettingsVersion:
      value.selection === "pdf-pending"
        ? value.candidates.settingsVersion
        : null,
    pdfSelectionManifest:
      value.selection === "fixed" && value.pdfProof !== null
        ? JSON.stringify(pdfChoice(value.pdfProof))
        : null,
    sourceOwnershipGeneration: value.sourceOwnershipGeneration,
    admissionSequence: value.admissionSequence,
    createdAt: value.createdAt,
    deadlineAt: value.deadlineAt,
    updatedAt: value.updatedAt,
    phase: value.phase,
    outcome: value.outcome.kind,
    failure:
      value.outcome.kind === "failed" || value.outcome.kind === "unknown"
        ? value.outcome.code
        : null,
    resultVersion:
      value.outcome.kind === "succeeded" ? value.outcome.noteVersion : null,
    ownerState: value.owner.state,
    runtimeId: value.owner.runtimeId,
    ownerToken: value.owner.token,
    cancelGeneration: value.cancelGeneration,
    responseBudget: value.responseBudget,
    version: value.version,
  };
}
export class LibsqlLlmConversionRepository implements LlmConversionRepository {
  constructor(private readonly db: HollowTransaction) {}
  async insert(value: LlmConversion) {
    await this.db.insert(conversions).values(encode(value));
  }
  async find(jobId: string) {
    const [row] = await this.db
      .select()
      .from(conversions)
      .where(eq(conversions.jobId, jobId));
    return row ? conversion(row) : null;
  }
  async command(accountId: string, commandId: string) {
    const [row] = await this.db
      .select()
      .from(conversions)
      .where(
        and(
          eq(conversions.accountId, accountId),
          eq(conversions.commandId, commandId),
        ),
      );
    return row ? conversion(row) : null;
  }
  async activeForNote(noteId: string) {
    const [row] = await this.db
      .select()
      .from(conversions)
      .where(and(eq(conversions.noteId, noteId), live));
    return row ? conversion(row) : null;
  }
  async replace(value: LlmConversion, expectedVersion: number) {
    if (value.version !== expectedVersion + 1) throw invalid();
    const current = await this.find(value.jobId);
    if (!current || current.version !== expectedVersion) return false;
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
    if (
      current.selection === "fixed" &&
      value.selection === "fixed" &&
      encoded.preparationVersion !== old.preparationVersion
    )
      return false;
    const mutableKeys = new Set([
      "sourceOrigin",
      "sourceBindingId",
      "sourceMemoryBytes",
      "inputReceipt",
      "phase",
      "outcome",
      "failure",
      "resultVersion",
      "ownerState",
      "runtimeId",
      "ownerToken",
      "cancelGeneration",
      "responseBudget",
      "version",
      "updatedAt",
    ]);
    for (const key of Object.keys(encoded) as (keyof typeof encoded)[]) {
      if (
        !mutableKeys.has(key) &&
        JSON.stringify(encoded[key]) !== JSON.stringify(old[key])
      )
        throw invalid();
    }
    const rows = await this.db
      .update(conversions)
      .set({
        sourceOrigin: encoded.sourceOrigin,
        sourceBindingId: encoded.sourceBindingId,
        sourceMemoryBytes: encoded.sourceMemoryBytes,
        inputReceipt: encoded.inputReceipt,
        phase: encoded.phase,
        outcome: encoded.outcome,
        failure: encoded.failure,
        resultVersion: encoded.resultVersion,
        ownerState: encoded.ownerState,
        runtimeId: encoded.runtimeId,
        ownerToken: encoded.ownerToken,
        cancelGeneration: encoded.cancelGeneration,
        responseBudget: encoded.responseBudget,
        version: encoded.version,
        updatedAt: encoded.updatedAt,
      })
      .where(
        and(
          eq(conversions.jobId, value.jobId),
          eq(conversions.version, expectedVersion),
        ),
      )
      .returning({ id: conversions.jobId });
    if (
      rows.length === 1 &&
      value.outcome.kind !== "pending" &&
      value.owner.state !== "active" &&
      value.owner.state !== "unknown"
    ) {
      const state =
        value.outcome.kind === "succeeded" || value.outcome.kind === "cancelled"
          ? value.outcome.kind
          : "failed";
      const failure =
        value.outcome.kind === "failed" || value.outcome.kind === "unknown"
          ? value.outcome.code
          : null;
      await this.db
        .update(conversionJobs)
        .set({
          state,
          failure,
          leaseToken: null,
          leaseUntil: null,
          updatedAt: value.updatedAt,
        })
        .where(eq(conversionJobs.id, value.jobId));
    }
    return rows.length === 1;
  }
  async sealPdf(
    input: Readonly<{
      jobId: string;
      expectedVersion: number;
      ownerToken: string;
      runtimeId: string;
      choice: PdfChoice;
      now: Date;
    }>,
  ): Promise<LlmFixedConversion | null> {
    const current = await this.find(input.jobId);
    if (
      !current ||
      current.selection !== "pdf-pending" ||
      current.phase !== "classifying" ||
      current.owner.state !== "active" ||
      current.owner.token !== input.ownerToken ||
      current.owner.runtimeId !== input.runtimeId ||
      current.version !== input.expectedVersion ||
      current.outcome.kind !== "pending" ||
      current.cancelGeneration !== 0 ||
      current.deadlineAt <= input.now
    )
      return null;
    const choice = pdfChoice(input.choice);
    if (!pdfChoiceMatchesSource(choice, current.source)) throw invalid();
    const result = JSON.stringify(choice);
    if (Buffer.byteLength(result) > PDF_LLM_LIMITS.manifestBytes)
      throw invalid();
    const [row] = await this.db
      .update(conversions)
      .set({
        selectionState: "fixed",
        modelId:
          choice.kind === "strict-text"
            ? current.candidates.textModelId
            : current.candidates.imageModelId,
        preparationVersion: choice.preparationVersion,
        promptVersion: choice.promptVersion,
        pdfSelectionManifest: result,
        candidateTextModelId: null,
        candidateImageModelId: null,
        candidateSettingsVersion: null,
        phase: "preparing",
        updatedAt: input.now,
        version: current.version + 1,
      })
      .where(
        and(
          eq(conversions.jobId, current.jobId),
          eq(conversions.version, current.version),
          eq(conversions.selectionState, "pdf-pending"),
          eq(conversions.cancelGeneration, 0),
          sql`not exists(select 1 from llm_dispatches where job_id=${current.jobId})`,
          sql`exists(select 1 from notes n join originals o on o.note_id=n.id join openrouter_connections k on k.account_id=${current.accountId} where n.id=${current.noteId} and n.version=${current.noteVersion} and n.ownership_generation=${current.sourceOwnershipGeneration} and o.id=${current.source.originalId} and o.sha256=${current.source.sha256} and o.bytes=${current.source.bytes} and k.epoch=${current.credentialEpoch} and k.state='linked')`,
        ),
      )
      .returning();
    if (!row) return null;
    const sealed = conversion(row);
    if (sealed.selection !== "fixed") throw invalid();
    return sealed;
  }
  async claim(now: Date, runtimeId: string, ownerToken: string) {
    const [totals] = await this.db
      .select({
        owners: sql<number>`sum(case when ${conversions.ownerState} in ('active','unknown') then 1 else 0 end)`,
        budget: sql<number>`coalesce(sum(${conversions.responseBudget}),0)`,
      })
      .from(conversions);
    const [previewOwners] = await this.db
      .select({ n: count() })
      .from(previews)
      .where(inArray(previews.ownerState, ["active", "unknown"]));
    if (
      (totals?.owners ?? 0) + (previewOwners?.n ?? 0) >=
        LLM_LIMITS.concurrency ||
      (totals?.budget ?? 0) + LLM_LIMITS.responseBudget >
        LLM_LIMITS.globalResponseBudget
    )
      return null;
    const busy = this.db
      .select({ accountId: conversions.accountId })
      .from(conversions)
      .where(inArray(conversions.ownerState, ["active", "unknown"]));
    const [row] = await this.db
      .select()
      .from(conversions)
      .where(
        and(
          or(
            and(
              eq(conversions.phase, "queued"),
              eq(conversions.ownerState, "idle"),
            ),
            and(
              eq(conversions.phase, "response-ready"),
              eq(conversions.ownerState, "closed"),
            ),
          ),
          eq(conversions.outcome, "pending"),
          eq(conversions.sourceOrigin, "local-original"),
          eq(conversions.sourceMemoryBytes, 0),
          notInArray(conversions.accountId, busy),
          sql`not exists(select 1 from llm_pdf_previews p where p.account_id=${conversions.accountId} and p.owner_state in ('active','unknown'))`,
        ),
      )
      .orderBy(conversions.createdAt, conversions.jobId)
      .limit(1);
    if (!row) return null;
    const [claimed] = await this.db
      .update(conversions)
      .set({
        ownerState: "active",
        runtimeId,
        ownerToken,
        phase:
          row.phase === "queued"
            ? row.selectionState === "pdf-pending"
              ? "classifying"
              : "preparing"
            : "finalizing",
        responseBudget: LLM_LIMITS.responseBudget,
        updatedAt: now,
        version: row.version + 1,
      })
      .where(
        and(
          eq(conversions.jobId, row.jobId),
          eq(conversions.version, row.version),
        ),
      )
      .returning();
    if (!claimed) return null;
    await this.db
      .update(conversionJobs)
      .set({
        state: "running",
        leaseToken: ownerToken,
        leaseUntil: row.deadlineAt,
        updatedAt: now,
        attempt: sql`${conversionJobs.attempt}+1`,
      })
      .where(
        and(
          eq(conversionJobs.id, row.jobId),
          inArray(conversionJobs.state, ["queued", "running"]),
        ),
      );
    return conversion(claimed);
  }
  async owned(runtimeId: string) {
    return (
      await this.db
        .select()
        .from(conversions)
        .where(
          and(
            eq(conversions.runtimeId, runtimeId),
            inArray(conversions.ownerState, ["active", "unknown"]),
          ),
        )
    ).map(conversion);
  }
  async admission(accountId: string, credentialEpoch: number) {
    const [fence] = await this.db
      .select()
      .from(fences)
      .where(eq(fences.accountId, accountId));
    const [row] = await this.db
      .select({ n: count() })
      .from(conversions)
      .where(
        and(
          eq(conversions.accountId, accountId),
          eq(conversions.credentialEpoch, credentialEpoch),
          live,
        ),
      );
    return { sequence: fence?.sequence ?? 0, active: row?.n ?? 0 };
  }
  async admit(accountId: string) {
    await this.db
      .insert(fences)
      .values({ accountId, sequence: 0 })
      .onConflictDoNothing();
    const [row] = await this.db
      .update(fences)
      .set({ sequence: sql`${fences.sequence}+1` })
      .where(eq(fences.accountId, accountId))
      .returning();
    if (!row) throw invalid();
    return row.sequence;
  }
  async queued(accountId: string) {
    const [row] = await this.db
      .select({ n: count() })
      .from(conversions)
      .where(
        and(
          eq(conversions.accountId, accountId),
          eq(conversions.phase, "queued"),
        ),
      );
    const [preview] = await this.db
      .select({ n: count() })
      .from(previews)
      .where(
        and(eq(previews.accountId, accountId), eq(previews.state, "queued")),
      );
    return (row?.n ?? 0) + (preview?.n ?? 0);
  }
  async cancelAccount(accountId: string, credentialEpoch: number, now: Date) {
    return (
      await this.db
        .update(conversions)
        .set({
          cancelGeneration: sql`${conversions.cancelGeneration}+1`,
          updatedAt: now,
          version: sql`${conversions.version}+1`,
        })
        .where(
          and(
            eq(conversions.accountId, accountId),
            eq(conversions.credentialEpoch, credentialEpoch),
            live,
            eq(conversions.cancelGeneration, 0),
          ),
        )
        .returning({ id: conversions.jobId })
    ).length;
  }
  async cancelNote(noteId: string, now: Date) {
    return (
      await this.db
        .update(conversions)
        .set({
          cancelGeneration: sql`${conversions.cancelGeneration}+1`,
          updatedAt: now,
          version: sql`${conversions.version}+1`,
        })
        .where(
          and(
            eq(conversions.noteId, noteId),
            live,
            eq(conversions.cancelGeneration, 0),
          ),
        )
        .returning({ id: conversions.jobId })
    ).length;
  }
  async cancelScopeActor(workspaceId: string, accountId: string, now: Date) {
    return (
      await this.db
        .update(conversions)
        .set({
          cancelGeneration: sql`${conversions.cancelGeneration}+1`,
          updatedAt: now,
          version: sql`${conversions.version}+1`,
        })
        .where(
          and(
            eq(conversions.accountId, accountId),
            live,
            eq(conversions.cancelGeneration, 0),
            sql`exists(select 1 from notes n where n.id=${conversions.noteId} and n.owner_workspace_id=${workspaceId})`,
          ),
        )
        .returning({ id: conversions.jobId })
    ).length;
  }
  async prune(before: Date, limit: number) {
    const rows = await this.db
      .select({ id: conversions.jobId })
      .from(conversions)
      .where(
        and(
          eq(conversions.phase, "terminal"),
          notInArray(conversions.ownerState, ["active", "unknown"]),
          eq(conversions.responseBudget, 0),
          eq(conversions.sourceMemoryBytes, 0),
          sql`${conversions.sourceBindingId} is null`,
          lt(conversions.updatedAt, before),
          sql`not exists(select 1 from llm_pdf_previews p where p.consumed_job_id=${conversions.jobId})`,
        ),
      )
      .orderBy(conversions.updatedAt, conversions.jobId)
      .limit(Math.max(0, Math.min(100, limit)));
    for (const row of rows) {
      await this.db.delete(dispatches).where(eq(dispatches.jobId, row.id));
      await this.db.delete(reservations).where(eq(reservations.jobId, row.id));
      await this.db.delete(conversions).where(eq(conversions.jobId, row.id));
    }
    return rows.length;
  }
}

function dispatch(
  row: typeof dispatches.$inferSelect,
  contract: LlmConversion,
): LlmDispatch {
  if (contract.selection !== "fixed") throw invalid();
  let input: LlmInputIdentity;
  if (contract.preparationVersion === 3) {
    if (row.ordinal !== 0) throw invalid();
    input = { kind: "prepared-raster", sha256: row.inputSha256, ordinal: 0 };
  } else if (contract.preparationVersion === 4) {
    if (
      !contract.manifest.pages[row.ordinal] ||
      row.ordinal < 0 ||
      row.ordinal >= contract.manifest.total
    )
      throw invalid();
    input = {
      kind: "prepared-pdf-page",
      sha256: row.inputSha256,
      ordinal: row.ordinal,
    };
  } else {
    if (row.ordinal < 0 || row.ordinal >= LLM_LIMITS.segments) throw invalid();
    input = {
      kind: "prepared-segment",
      sha256: row.inputSha256,
      ordinal: row.ordinal,
    };
  }
  const base = {
    jobId: row.jobId,
    ordinal: row.ordinal,
    id: row.id,
    input,
    ownerToken: row.ownerToken,
    runtimeId: row.runtimeId,
  };
  if (row.state === "prepared")
    return { ...base, state: "prepared", intentAt: null, response: null };
  if (!row.intentAt) throw invalid();
  if (row.state !== "response")
    return {
      ...base,
      state: row.state,
      intentAt: row.intentAt,
      response: null,
    };
  if (!row.content) throw invalid();
  return {
    ...base,
    state: "response",
    intentAt: row.intentAt,
    response: {
      content: row.content,
      finish: "stop",
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
    },
  };
}
export class LibsqlLlmDispatchRepository implements LlmDispatchRepository {
  constructor(private readonly db: HollowTransaction) {}
  async list(jobId: string) {
    return (
      await this.db
        .select()
        .from(dispatches)
        .innerJoin(conversions, eq(conversions.jobId, dispatches.jobId))
        .where(eq(dispatches.jobId, jobId))
        .orderBy(dispatches.ordinal)
    ).map((row) =>
      dispatch(row.llm_dispatches, conversion(row.llm_conversions)),
    );
  }
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(dispatches)
      .innerJoin(conversions, eq(conversions.jobId, dispatches.jobId))
      .where(eq(dispatches.id, id));
    return row
      ? dispatch(row.llm_dispatches, conversion(row.llm_conversions))
      : null;
  }
  async prepare(value: LlmDispatch & { state: "prepared" }) {
    if (value.input.ordinal !== value.ordinal) throw invalid();
    const current = await new LibsqlLlmConversionRepository(this.db).find(
      value.jobId,
    );
    if (
      !current ||
      current.selection !== "fixed" ||
      (current.preparationVersion === 3
        ? value.input.kind !== "prepared-raster" || value.ordinal !== 0
        : current.preparationVersion === 4
          ? value.input.kind !== "prepared-pdf-page" ||
            !current.manifest.pages[value.ordinal] ||
            value.ordinal >= current.manifest.total
          : value.input.kind !== "prepared-segment" ||
            value.ordinal >= LLM_LIMITS.segments)
    )
      throw invalid();
    await this.db.insert(dispatches).values({
      jobId: value.jobId,
      ordinal: value.ordinal,
      id: value.id,
      inputSha256: value.input.sha256,
      ownerToken: value.ownerToken,
      runtimeId: value.runtimeId,
      state: "prepared",
    });
  }
  async intent(id: string, ownerToken: string, now: Date) {
    const [row] = await this.db
      .update(dispatches)
      .set({ state: "intent", intentAt: now })
      .where(
        and(
          eq(dispatches.id, id),
          eq(dispatches.ownerToken, ownerToken),
          eq(dispatches.state, "prepared"),
        ),
      )
      .returning();
    if (!row) return false;
    if (!(await new LibsqlLlmQuotaRepository(this.db).consume(row.jobId, now)))
      throw invalid();
    return true;
  }
  async response(id: string, ownerToken: string, value: LlmResponse) {
    return (
      (
        await this.db
          .update(dispatches)
          .set({
            state: "response",
            content: value.content,
            inputTokens: value.inputTokens,
            outputTokens: value.outputTokens,
          })
          .where(
            and(
              eq(dispatches.id, id),
              eq(dispatches.ownerToken, ownerToken),
              eq(dispatches.state, "intent"),
            ),
          )
          .returning({ id: dispatches.id })
      ).length === 1
    );
  }
  async fail(
    id: string,
    ownerToken: string,
    delivery: "not-sent" | "possible",
  ) {
    return (
      (
        await this.db
          .update(dispatches)
          .set({ state: delivery === "not-sent" ? "not-sent" : "unknown" })
          .where(
            and(
              eq(dispatches.id, id),
              eq(dispatches.ownerToken, ownerToken),
              eq(dispatches.state, "intent"),
            ),
          )
          .returning({ id: dispatches.id })
      ).length === 1
    );
  }
  async scrub(jobId: string) {
    await this.db
      .update(dispatches)
      .set({
        state: "scrubbed",
        content: null,
        inputTokens: null,
        outputTokens: null,
      })
      .where(
        and(eq(dispatches.jobId, jobId), eq(dispatches.state, "response")),
      );
  }
}
function reservation(
  row: typeof reservations.$inferSelect,
): LlmQuotaReservation {
  if (row.state === "reserved")
    return { ...row, state: "reserved", firstIntentAt: null };
  if (row.state === "released") return { ...row, state: "released" };
  if (!row.firstIntentAt) throw invalid();
  return { ...row, state: "consumed", firstIntentAt: row.firstIntentAt };
}
export class LibsqlLlmQuotaRepository implements LlmQuotaRepository {
  constructor(private readonly db: HollowTransaction) {}
  async reservation(jobId: string) {
    const [row] = await this.db
      .select()
      .from(reservations)
      .where(eq(reservations.jobId, jobId));
    return row ? reservation(row) : null;
  }
  async reserve(jobId: string, accountId: string, now: Date, limit: number) {
    const old = await this.reservation(jobId);
    if (old) {
      if (old.accountId !== accountId) throw invalid();
      return old.state !== "released";
    }
    const [job] = await this.db
      .select()
      .from(conversions)
      .where(eq(conversions.jobId, jobId));
    if (!job || job.accountId !== accountId) throw invalid();
    const month = llmMonth(job.createdAt);
    await this.db
      .insert(buckets)
      .values({ accountId, month, reserved: 0, consumed: 0, updatedAt: now })
      .onConflictDoNothing();
    const [row] = await this.db
      .update(buckets)
      .set({ reserved: sql`${buckets.reserved}+1`, updatedAt: now })
      .where(
        and(
          eq(buckets.accountId, accountId),
          eq(buckets.month, month),
          sql`${buckets.reserved}+${buckets.consumed}<${limit}`,
        ),
      )
      .returning();
    if (!row) return false;
    await this.db.insert(reservations).values({
      jobId,
      accountId,
      month,
      state: "reserved",
      createdAt: job.createdAt,
      updatedAt: now,
    });
    return true;
  }
  async consume(jobId: string, now: Date) {
    const value = await this.reservation(jobId);
    if (!value || value.state === "released") return false;
    if (value.state === "consumed") return true;
    const [row] = await this.db
      .update(reservations)
      .set({ state: "consumed", firstIntentAt: now, updatedAt: now })
      .where(
        and(eq(reservations.jobId, jobId), eq(reservations.state, "reserved")),
      )
      .returning();
    if (!row) return false;
    const changed = await this.db
      .update(buckets)
      .set({
        reserved: sql`${buckets.reserved}-1`,
        consumed: sql`${buckets.consumed}+1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(buckets.accountId, value.accountId),
          eq(buckets.month, value.month),
          sql`${buckets.reserved}>0`,
        ),
      )
      .returning();
    if (changed.length !== 1) throw invalid();
    return true;
  }
  async releaseUnsent(jobId: string, now: Date) {
    const value = await this.reservation(jobId);
    if (!value || value.state === "released") return false;
    const [conversion] = await this.db
      .select()
      .from(conversions)
      .where(eq(conversions.jobId, jobId));
    if (
      !conversion ||
      conversion.phase !== "terminal" ||
      conversion.ownerState === "active" ||
      conversion.ownerState === "unknown"
    )
      return false;
    const [sent] = await this.db
      .select({ n: count() })
      .from(dispatches)
      .where(
        and(
          eq(dispatches.jobId, jobId),
          notInArray(dispatches.state, ["prepared", "not-sent"]),
        ),
      );
    if (sent?.n) return false;
    const [row] = await this.db
      .update(reservations)
      .set({ state: "released", updatedAt: now })
      .where(
        and(eq(reservations.jobId, jobId), ne(reservations.state, "released")),
      )
      .returning();
    if (!row) return false;
    const field =
      value.state === "reserved" ? buckets.reserved : buckets.consumed;
    const changed = await this.db
      .update(buckets)
      .set({
        [value.state === "reserved" ? "reserved" : "consumed"]: sql`${field}-1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(buckets.accountId, value.accountId),
          eq(buckets.month, value.month),
          sql`${field}>0`,
        ),
      )
      .returning();
    if (changed.length !== 1) throw invalid();
    return true;
  }
  async usage(accountId: string, month: string) {
    const [row] = await this.db
      .select()
      .from(buckets)
      .where(and(eq(buckets.accountId, accountId), eq(buckets.month, month)));
    return row
      ? {
          month: row.month,
          reserved: row.reserved,
          consumed: row.consumed,
          updatedAt: row.updatedAt,
        }
      : null;
  }
}
