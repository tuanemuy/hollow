import type { LlmFailure } from "@repo/core/domain/llm/entity";
import type { SourceInputReceipt } from "@repo/core/domain/regeneration/source";
import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { accounts, conversionJobs, notes, originals } from "./hollowSchema";
import { regenerationSourceBindings } from "./regenerationSchema";

export const llmConversions = sqliteTable(
  "llm_conversions",
  {
    sourceOrigin: text("source_origin"),
    sourceBindingId: text("source_binding_id").references(
      (): AnySQLiteColumn => regenerationSourceBindings.id,
      { onDelete: "restrict" },
    ),
    sourceMemoryBytes: integer("source_memory_bytes").notNull().default(0),
    inputReceipt: text("source_input_receipt", {
      mode: "json",
    }).$type<SourceInputReceipt>(),
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
    modelId: text("model_id"),
    instruction: text("instruction").notNull(),
    promptVersion: integer("prompt_version"),
    admissionSequence: integer("admission_sequence").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    deadlineAt: integer("deadline_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    phase: text("phase", {
      enum: [
        "queued",
        "classifying",
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
    selectionState: text("selection_state", { enum: ["fixed", "pdf-pending"] })
      .notNull()
      .default("fixed"),
    candidateTextModelId: text("candidate_text_model_id"),
    candidateImageModelId: text("candidate_image_model_id"),
    candidateSettingsVersion: integer("candidate_settings_version"),
    pdfSelectionManifest: text("pdf_selection_manifest"),
    sourceOwnershipGeneration: integer("source_ownership_generation"),
  },
  (t) => [
    uniqueIndex("llm_conversion_command").on(t.accountId, t.commandId),
    uniqueIndex("llm_conversions_source_binding").on(
      t.jobId,
      t.sourceBindingId,
    ),
    check(
      "llm_conversions_source_memory",
      sql`typeof(${t.sourceMemoryBytes})='integer' and ${t.sourceMemoryBytes} in (0,52428800)`,
    ),
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
      sql`${t.operation} in ('import','regenerate') and ${t.sourceFormat} in ('text','html','markdown','docx','xlsx','pptx','pdf','image') and ${t.sourceState} in ('processing','ready','needs_ai','failed','cancelled') and ${t.sourceCoverage} in ('complete','partial','no_text') and ${t.phase} in ('queued','classifying','preparing','dispatching','response-ready','finalizing','terminal')`,
    ),
    check(
      "llm_conversion_preparation",
      sql`(${t.selectionState}='pdf-pending' and ${t.sourceFormat}='pdf' and ${t.operation}='import' and ${t.modelId} is null and ${t.preparationVersion} is null and ${t.promptVersion} is null and ${t.pdfSelectionManifest} is null and ${t.candidateTextModelId} is not null and length(${t.candidateTextModelId}) between 1 and 255 and ${t.candidateImageModelId} is not null and length(${t.candidateImageModelId}) between 1 and 255 and typeof(${t.candidateSettingsVersion})='integer' and ${t.candidateSettingsVersion}>=1 and typeof(${t.sourceOwnershipGeneration})='integer' and ${t.sourceOwnershipGeneration} between 1 and 9007199254740991 and ${t.phase} in ('queued','classifying','terminal') and ${t.outcome}!='succeeded') or (${t.selectionState}='fixed' and ${t.modelId} is not null and ${t.promptVersion} is not null and ${t.candidateTextModelId} is null and ${t.candidateImageModelId} is null and ${t.candidateSettingsVersion} is null and ${t.phase}!='classifying' and ((${t.sourceFormat} in ('text','html','markdown') and (${t.preparationVersion} is null or ${t.preparationVersion}=1) and ${t.promptVersion}=1) or (${t.sourceFormat} in ('docx','xlsx','pptx','pdf') and ${t.preparationVersion} is not null and ${t.preparationVersion}=2 and ${t.promptVersion}=1) or (${t.sourceFormat}='image' and ${t.preparationVersion} is not null and ${t.preparationVersion}=3 and ${t.promptVersion}=2) or (${t.sourceFormat}='pdf' and ${t.preparationVersion} is not null and ${t.preparationVersion}=4 and ${t.promptVersion}=3 and ${t.pdfSelectionManifest} is not null)) and ((${t.pdfSelectionManifest} is null and ${t.sourceOwnershipGeneration} is null) or (${t.pdfSelectionManifest} is not null and ${t.sourceFormat}='pdf' and ${t.preparationVersion} in (2,4) and typeof(${t.sourceOwnershipGeneration})='integer' and ${t.sourceOwnershipGeneration} between 1 and 9007199254740991 and length(cast(${t.pdfSelectionManifest} as blob)) between 1 and 65536 and json_valid(${t.pdfSelectionManifest}))))`,
    ),
    check(
      "llm_conversion_pdf_proof",
      sql`${t.pdfSelectionManifest} is null or case when json_valid(${t.pdfSelectionManifest}) then coalesce((json_extract(${t.pdfSelectionManifest},'$.preparationVersion')=${t.preparationVersion} and json_extract(${t.pdfSelectionManifest},'$.promptVersion')=${t.promptVersion} and ((json_extract(${t.pdfSelectionManifest},'$.kind')='strict-text' and ${t.preparationVersion}=2 and json_extract(${t.pdfSelectionManifest},'$.modelKind')='chat-text' and json_extract(${t.pdfSelectionManifest},'$.policy')='strict-text-v1' and length(json_extract(${t.pdfSelectionManifest},'$.preparedDocumentHash'))=64 and json_extract(${t.pdfSelectionManifest},'$.pages') between 1 and 200) or (json_extract(${t.pdfSelectionManifest},'$.kind')='pages' and ${t.preparationVersion}=4 and json_extract(${t.pdfSelectionManifest},'$.modelKind')='chat-image' and json_extract(${t.pdfSelectionManifest},'$.reason') in ('VISUAL_CONTENT','ORDER_UNPROVEN') and json_extract(${t.pdfSelectionManifest},'$.manifest.kind')='pdf-pages' and json_extract(${t.pdfSelectionManifest},'$.manifest.preparationVersion')=4 and json_extract(${t.pdfSelectionManifest},'$.manifest.source.originalId')=${t.originalId} and json_extract(${t.pdfSelectionManifest},'$.manifest.source.sha256')=${t.sourceSha256} and json_extract(${t.pdfSelectionManifest},'$.manifest.source.bytes')=${t.sourceBytes} and json_extract(${t.pdfSelectionManifest},'$.manifest.source.format')='pdf' and json_extract(${t.pdfSelectionManifest},'$.manifest.policy')='display-crop-white-144dpi-v1' and json_extract(${t.pdfSelectionManifest},'$.manifest.renderer')='pdfjs-6.3.289-canvas-1.0.8-v1' and json_extract(${t.pdfSelectionManifest},'$.manifest.total') between 1 and 32 and json_array_length(${t.pdfSelectionManifest},'$.manifest.pages')=json_extract(${t.pdfSelectionManifest},'$.manifest.total') and length(json_extract(${t.pdfSelectionManifest},'$.manifest.sha256'))=64))),0) else 0 end`,
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
      sql`${t.ordinal} between 0 and 31 and length(${t.inputSha256})=64 and length(${t.ownerToken})>0 and length(${t.runtimeId})>0 and (${t.inputTokens} is null or ${t.inputTokens}>=0) and (${t.outputTokens} is null or ${t.outputTokens}>=0)`,
    ),
    check(
      "llm_dispatch_shape",
      sql`(${t.state}='prepared' and ${t.intentAt} is null and ${t.content} is null and ${t.inputTokens} is null and ${t.outputTokens} is null) or (${t.state} in ('intent','unknown','not-sent','scrubbed') and ${t.intentAt} is not null and ${t.content} is null and ${t.inputTokens} is null and ${t.outputTokens} is null) or (${t.state}='response' and ${t.intentAt} is not null and ${t.content} is not null and length(cast(${t.content} as blob)) between 1 and 65536)`,
    ),
  ],
);

export const llmPdfPreviews = sqliteTable(
  "llm_pdf_previews",
  {
    sourceOrigin: text("source_origin"),
    sourceBindingId: text("source_binding_id").references(
      (): AnySQLiteColumn => regenerationSourceBindings.id,
      { onDelete: "restrict" },
    ),
    sourceMemoryBytes: integer("source_memory_bytes").notNull().default(0),
    inputReceipt: text("source_input_receipt", {
      mode: "json",
    }).$type<SourceInputReceipt>(),
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    commandId: text("command_id").notNull(),
    requestDigest: text("request_digest").notNull(),
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "restrict" }),
    noteVersion: integer("note_version").notNull(),
    ownershipGeneration: integer("ownership_generation").notNull(),
    originalId: text("original_id")
      .notNull()
      .references(() => originals.id, { onDelete: "restrict" }),
    sourceSha256: text("source_sha256").notNull(),
    sourceBytes: integer("source_bytes").notNull(),
    credentialEpoch: integer("credential_epoch").notNull(),
    policyVersion: integer("policy_version").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    state: text("state", {
      enum: [
        "queued",
        "running",
        "ready",
        "consumed",
        "failed",
        "cancelled",
        "expired",
        "unknown",
      ],
    }).notNull(),
    ownerState: text("owner_state", {
      enum: ["idle", "active", "closed", "unknown"],
    }).notNull(),
    ownerToken: text("owner_token"),
    runtimeId: text("runtime_id"),
    cancelGeneration: integer("cancel_generation").notNull(),
    version: integer("version").notNull(),
    resultJson: text("result_json"),
    failureCode: text("failure_code"),
    consumedJobId: text("consumed_job_id").references(
      () => llmConversions.jobId,
      { onDelete: "restrict" },
    ),
  },
  (t) => [
    uniqueIndex("llm_pdf_preview_command").on(t.accountId, t.commandId),
    uniqueIndex("llm_pdf_previews_source_binding").on(t.id, t.sourceBindingId),
    check(
      "llm_pdf_previews_source_memory",
      sql`typeof(${t.sourceMemoryBytes})='integer' and ${t.sourceMemoryBytes} in (0,52428800)`,
    ),
    uniqueIndex("llm_pdf_preview_live_note")
      .on(t.noteId)
      .where(
        sql`${t.state} in ('queued','running','ready','unknown') or ${t.ownerState} in ('active','unknown')`,
      ),
    uniqueIndex("llm_pdf_preview_live_actor")
      .on(t.accountId)
      .where(
        sql`${t.state} in ('queued','running','ready','unknown') or ${t.ownerState} in ('active','unknown')`,
      ),
    index("llm_pdf_preview_claim").on(t.state, t.createdAt),
    index("llm_pdf_preview_expiry").on(t.expiresAt),
    check(
      "llm_pdf_preview_limits",
      sql`length(${t.id})>0 and length(${t.commandId})>0 and length(${t.requestDigest})=64 and length(${t.sourceSha256})=64 and ${t.sourceBytes} between 1 and 52428800 and ${t.noteVersion}>=0 and typeof(${t.ownershipGeneration})='integer' and ${t.ownershipGeneration} between 1 and 9007199254740991 and ${t.credentialEpoch}>=1 and ${t.policyVersion}=1 and ${t.cancelGeneration}>=0 and ${t.version}>=1 and ${t.expiresAt}=${t.createdAt}+300000 and ${t.updatedAt}>=${t.createdAt}`,
    ),
    check(
      "llm_pdf_preview_owner",
      sql`(${t.ownerState}='idle' and ${t.ownerToken} is null and ${t.runtimeId} is null) or (${t.ownerState} in ('active','closed','unknown') and ${t.ownerToken} is not null and length(${t.ownerToken})>0 and ${t.runtimeId} is not null and length(${t.runtimeId})>0)`,
    ),
    check(
      "llm_pdf_preview_shape",
      sql`(${t.state}='queued' and ${t.ownerState}='idle' and ${t.resultJson} is null and ${t.failureCode} is null and ${t.consumedJobId} is null) or (${t.state}='running' and ${t.ownerState}='active' and ${t.resultJson} is null and ${t.failureCode} is null and ${t.consumedJobId} is null) or (${t.state}='ready' and ${t.ownerState}='closed' and ${t.resultJson} is not null and json_valid(${t.resultJson}) and length(cast(${t.resultJson} as blob)) between 1 and 65536 and ${t.failureCode} is null and ${t.consumedJobId} is null and ${t.cancelGeneration}=0) or (${t.state}='consumed' and ${t.ownerState}='closed' and ${t.resultJson} is null and ${t.failureCode} is null and ${t.consumedJobId} is not null) or (${t.state}='failed' and ${t.ownerState} in ('idle','closed') and ${t.resultJson} is null and ${t.failureCode} is not null and ${t.failureCode} in ('LLM_DOCUMENT_CORRUPT','LLM_DOCUMENT_ENCRYPTED','LLM_DOCUMENT_UNSUPPORTED','LLM_DOCUMENT_NO_TEXT','LLM_RESOURCE_LIMIT','LLM_TIMEOUT','LLM_SOURCE_CHANGED','LLM_UNAVAILABLE') and ${t.consumedJobId} is null) or (${t.state} in ('cancelled','expired') and ${t.ownerState} in ('idle','closed') and ${t.resultJson} is null and ${t.failureCode} is null and ${t.consumedJobId} is null) or (${t.state}='unknown' and ${t.ownerState}='unknown' and ${t.resultJson} is null and ${t.failureCode} is null and ${t.consumedJobId} is null)`,
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
