import type { LlmFailure } from "@repo/core/domain/llm/entity";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { accounts, conversionJobs, notes, originals } from "./hollowSchema";

export const llmConversions = sqliteTable(
  "llm_conversions",
  {
    jobId: text("job_id")
      .primaryKey()
      .references(() => conversionJobs.id, { onDelete: "restrict" }),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "restrict" }),
    originalId: text("original_id")
      .notNull()
      .references(() => originals.id, { onDelete: "restrict" }),
    commandId: text("command_id").notNull(),
    requestDigest: text("request_digest").notNull(),
    operation: text("operation", { enum: ["import", "regenerate"] }).notNull(),
    retryOf: text("retry_of"),
    sourceSha256: text("source_sha256").notNull(),
    sourceBytes: integer("source_bytes").notNull(),
    sourceFormat: text("source_format", {
      enum: [
        "text",
        "html",
        "markdown",
        "docx",
        "xlsx",
        "pptx",
        "pdf",
        "image",
      ],
    }).notNull(),
    sourceState: text("source_state", {
      enum: ["processing", "ready", "needs_ai", "failed", "cancelled"],
    }).notNull(),
    sourceCoverage: text("source_coverage", {
      enum: ["complete", "partial", "no_text"],
    }).notNull(),
    noteVersion: integer("note_version").notNull(),
    originalRevisionNo: integer("original_revision_no"),
    credentialEpoch: integer("credential_epoch").notNull(),
    modelId: text("model_id").notNull(),
    instruction: text("instruction").notNull(),
    promptVersion: integer("prompt_version").notNull(),
    admissionSequence: integer("admission_sequence").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    deadlineAt: integer("deadline_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    phase: text("phase", {
      enum: [
        "queued",
        "preparing",
        "dispatching",
        "response-ready",
        "finalizing",
        "terminal",
      ],
    }).notNull(),
    outcome: text("outcome", {
      enum: ["pending", "succeeded", "failed", "cancelled", "unknown"],
    }).notNull(),
    failure: text("failure").$type<LlmFailure>(),
    resultVersion: integer("result_version"),
    ownerState: text("owner_state", {
      enum: ["idle", "active", "unknown", "closed"],
    }).notNull(),
    runtimeId: text("runtime_id"),
    ownerToken: text("owner_token"),
    cancelGeneration: integer("cancel_generation").notNull(),
    responseBudget: integer("response_budget").notNull(),
    version: integer("version").notNull(),
    preparationVersion: integer("preparation_version"),
  },
  (t) => [
    uniqueIndex("llm_conversion_command").on(t.accountId, t.commandId),
    uniqueIndex("llm_conversion_active_note")
      .on(t.noteId)
      .where(
        sql`${t.phase} != 'terminal' or ${t.ownerState} in ('active','unknown')`,
      ),
    index("llm_conversion_admission").on(
      t.accountId,
      t.credentialEpoch,
      t.admissionSequence,
    ),
    index("llm_conversion_phase").on(t.phase, t.createdAt),
    check(
      "llm_conversion_values",
      sql`${t.operation} in ('import','regenerate') and ${t.sourceFormat} in ('text','html','markdown','docx','xlsx','pptx','pdf','image') and ${t.sourceState} in ('processing','ready','needs_ai','failed','cancelled') and ${t.sourceCoverage} in ('complete','partial','no_text') and ${t.phase} in ('queued','preparing','dispatching','response-ready','finalizing','terminal')`,
    ),
    check(
      "llm_conversion_preparation",
      sql`(${t.sourceFormat} in ('text','html','markdown') and (${t.preparationVersion} is null or ${t.preparationVersion}=1) and ${t.promptVersion}=1) or (${t.sourceFormat} in ('docx','xlsx','pptx','pdf') and ${t.preparationVersion} is not null and ${t.preparationVersion}=2 and ${t.promptVersion}=1) or (${t.sourceFormat}='image' and ${t.preparationVersion} is not null and ${t.preparationVersion}=3 and ${t.promptVersion}=2)`,
    ),
    check(
      "llm_conversion_limits",
      sql`${t.sourceBytes} between 1 and 52428800 and length(${t.sourceSha256})=64 and length(${t.requestDigest})=64 and length(${t.modelId}) between 1 and 255 and length(cast(${t.instruction} as blob))<=8192 and ${t.credentialEpoch}>=1 and ${t.noteVersion}>=0 and ${t.admissionSequence}>=1 and ${t.version}>=1 and ${t.cancelGeneration}>=0 and ${t.responseBudget} in (0,2097152)`,
    ),
    check(
      "llm_conversion_deadline",
      sql`${t.deadlineAt}=${t.createdAt}+1800000 and ${t.updatedAt}>=${t.createdAt}`,
    ),
    check(
      "llm_conversion_owner",
      sql`(${t.ownerState}='idle' and ${t.runtimeId} is null and ${t.ownerToken} is null) or (${t.ownerState} in ('active','unknown','closed') and ${t.runtimeId} is not null and length(${t.runtimeId})>0 and ${t.ownerToken} is not null and length(${t.ownerToken})>0)`,
    ),
    check(
      "llm_conversion_outcome",
      sql`(${t.outcome}='pending' and ${t.phase}!='terminal' and ${t.failure} is null and ${t.resultVersion} is null) or (${t.outcome}='succeeded' and ${t.phase}='terminal' and ${t.failure} is null and ${t.resultVersion} is not null and ${t.resultVersion}>=${t.noteVersion} and ${t.ownerState}='closed') or (${t.outcome}='failed' and ${t.phase}='terminal' and ${t.failure} is not null and ${t.resultVersion} is null) or (${t.outcome}='cancelled' and ${t.phase}='terminal' and ${t.failure} is null and ${t.resultVersion} is null) or (${t.outcome}='unknown' and ${t.failure} in ('LLM_DELIVERY_UNKNOWN','LLM_OWNERSHIP_UNKNOWN') and ${t.failure} is not null and ${t.resultVersion} is null)`,
    ),
  ],
);

export const llmDispatches = sqliteTable(
  "llm_dispatches",
  {
    jobId: text("job_id")
      .notNull()
      .references(() => llmConversions.jobId, { onDelete: "restrict" }),
    ordinal: integer("ordinal").notNull(),
    id: text("id").notNull().unique(),
    inputSha256: text("input_sha256").notNull(),
    ownerToken: text("owner_token").notNull(),
    runtimeId: text("runtime_id").notNull(),
    state: text("state", {
      enum: [
        "prepared",
        "intent",
        "response",
        "unknown",
        "not-sent",
        "scrubbed",
      ],
    }).notNull(),
    intentAt: integer("intent_at", { mode: "timestamp_ms" }),
    content: text("content"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
  },
  (t) => [
    primaryKey({ columns: [t.jobId, t.ordinal] }),
    check(
      "llm_dispatch_limits",
      sql`${t.ordinal} between 0 and 15 and length(${t.inputSha256})=64 and length(${t.ownerToken})>0 and length(${t.runtimeId})>0 and (${t.inputTokens} is null or ${t.inputTokens}>=0) and (${t.outputTokens} is null or ${t.outputTokens}>=0)`,
    ),
    check(
      "llm_dispatch_shape",
      sql`(${t.state}='prepared' and ${t.intentAt} is null and ${t.content} is null and ${t.inputTokens} is null and ${t.outputTokens} is null) or (${t.state} in ('intent','unknown','not-sent','scrubbed') and ${t.intentAt} is not null and ${t.content} is null and ${t.inputTokens} is null and ${t.outputTokens} is null) or (${t.state}='response' and ${t.intentAt} is not null and ${t.content} is not null and length(cast(${t.content} as blob)) between 1 and 65536)`,
    ),
  ],
);

export const llmQuotaBuckets = sqliteTable(
  "llm_quota_buckets",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    month: text("month").notNull(),
    reserved: integer("reserved").notNull(),
    consumed: integer("consumed").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.accountId, t.month] }),
    check(
      "llm_quota_nonnegative",
      sql`${t.reserved} between 0 and 9007199254740991 and ${t.consumed} between 0 and 9007199254740991 and ${t.month} glob '[0-9][0-9][0-9][0-9]-[0-1][0-9]' and substr(${t.month},6,2) between '01' and '12'`,
    ),
  ],
);
export const llmQuotaReservations = sqliteTable(
  "llm_quota_reservations",
  {
    jobId: text("job_id")
      .primaryKey()
      .references(() => llmConversions.jobId, { onDelete: "restrict" }),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    month: text("month").notNull(),
    state: text("state", {
      enum: ["reserved", "consumed", "released"],
    }).notNull(),
    firstIntentAt: integer("first_intent_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("llm_quota_reservation_bucket").on(t.accountId, t.month, t.state),
    check(
      "llm_reservation_shape",
      sql`(${t.state}='reserved' and ${t.firstIntentAt} is null) or (${t.state}='consumed' and ${t.firstIntentAt} is not null) or ${t.state}='released'`,
    ),
    check(
      "llm_reservation_month",
      sql`${t.month}=strftime('%Y-%m',${t.createdAt}/1000,'unixepoch') and ${t.updatedAt}>=${t.createdAt}`,
    ),
  ],
);
export const llmAccountFences = sqliteTable(
  "llm_account_fences",
  {
    accountId: text("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "restrict" }),
    sequence: integer("sequence").notNull(),
  },
  (t) => [
    check(
      "llm_fence_sequence",
      sql`${t.sequence} between 0 and 9007199254740991`,
    ),
  ],
);
