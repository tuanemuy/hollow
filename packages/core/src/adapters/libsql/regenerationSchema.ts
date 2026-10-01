import type {
  MachineRegeneration,
  SourceAttempt,
} from "@repo/core/domain/regeneration/entity";
import type { SourceInputReceipt } from "@repo/core/domain/regeneration/source";
import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  check,
  foreignKey,
  index,
  integer,
  type SQLiteTableExtraConfigValue,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { driveBackupRecords } from "./driveBackupSchema";
import { accounts, notes, originals } from "./hollowSchema";
import { llmConversions, llmPdfPreviews } from "./llmSchema";

export const regenerationSourceBindings = sqliteTable(
  "regeneration_source_bindings",
  {
    id: text("id").primaryKey(),
    recordId: text("record_id")
      .notNull()
      .references(() => driveBackupRecords.id, { onDelete: "restrict" }),
    executorId: text("executor_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    credentialOwnerId: text("credential_owner_id").notNull(),
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "restrict" }),
    originalId: text("original_id")
      .notNull()
      .references(() => originals.id, { onDelete: "restrict" }),
    subject: text("subject").notNull(),
    driveEpoch: integer("drive_epoch").notNull(),
    ownershipGeneration: integer("ownership_generation").notNull(),
    fingerprint: text("fingerprint").notNull(),
    llmJobId: text("llm_job_id"),
    previewId: text("preview_id"),
    machineRequestId: text("machine_request_id"),
    cancelGeneration: integer("cancel_generation").notNull(),
    version: integer("version").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t): SQLiteTableExtraConfigValue[] => [
    check("regeneration_source_bindings_shape_1", sql.raw("drive_epoch>0")),
    check(
      "regeneration_source_bindings_shape_2",
      sql.raw("ownership_generation>0"),
    ),
    check(
      "regeneration_source_bindings_shape_3",
      sql.raw("length(fingerprint)=64"),
    ),
    check(
      "regeneration_source_bindings_shape_4",
      sql.raw("cancel_generation>=0"),
    ),
    check("regeneration_source_bindings_shape_5", sql.raw("version>0")),
    check(
      "regeneration_source_bindings_shape_6",
      sql.raw(
        "(llm_job_id IS NOT NULL)+(preview_id IS NOT NULL)+(machine_request_id IS NOT NULL)=1",
      ),
    ),
    uniqueIndex("regeneration_binding_llm").on(t.llmJobId),
    uniqueIndex("regeneration_binding_preview").on(t.previewId),
    uniqueIndex("regeneration_binding_machine").on(t.machineRequestId),
    index("regeneration_binding_note").on(t.noteId),
    // SQLite's deferred pair constraints are emitted by the hand-authored migration.
    foreignKey({
      columns: [t.llmJobId, t.id],
      foreignColumns: [llmConversions.jobId, llmConversions.sourceBindingId],
    }),
    foreignKey({
      columns: [t.previewId, t.id],
      foreignColumns: [llmPdfPreviews.id, llmPdfPreviews.sourceBindingId],
    }),
    foreignKey({
      columns: [t.machineRequestId, t.id],
      foreignColumns: [
        machineRegenerations.id,
        machineRegenerations.sourceBindingId,
      ],
    }),
  ],
);

export const regenerationSourceAttempts = sqliteTable(
  "regeneration_source_attempts",
  {
    id: text("id").primaryKey(),
    bindingId: text("binding_id")
      .notNull()
      .references(() => regenerationSourceBindings.id, {
        onDelete: "restrict",
      }),
    ordinal: integer("ordinal").notNull(),
    purpose: text("purpose", { enum: ["acquire", "final-check"] }).notNull(),
    phase: text("phase", {
      enum: ["queued", "active", "unknown", "terminal"],
    }).notNull(),
    ownerState: text("owner_state", {
      enum: ["none", "active", "unknown", "closed"],
    }).notNull(),
    runtimeId: text("runtime_id"),
    ownerToken: text("owner_token"),
    completion: text("completion", { mode: "json" }).$type<
      SourceAttempt["completion"]
    >(),
    credentialVersion: integer("credential_version").notNull(),
    cancelGeneration: integer("cancel_generation").notNull(),
    version: integer("version").notNull(),
    deadlineAt: integer("deadline_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    check("regeneration_source_attempts_shape_1", sql.raw("ordinal>0")),
    check(
      "regeneration_source_attempts_shape_2",
      sql.raw("purpose IN('acquire','final-check')"),
    ),
    check(
      "regeneration_source_attempts_shape_3",
      sql.raw("phase IN('queued','active','unknown','terminal')"),
    ),
    check(
      "regeneration_source_attempts_shape_4",
      sql.raw("owner_state IN('none','active','unknown','closed')"),
    ),
    check(
      "regeneration_source_attempts_shape_5",
      sql.raw("credential_version>0"),
    ),
    check(
      "regeneration_source_attempts_shape_6",
      sql.raw("cancel_generation>=0"),
    ),
    check("regeneration_source_attempts_shape_7", sql.raw("version>0")),
    check(
      "regeneration_source_attempts_shape_8",
      sql.raw(
        "(owner_state='none' AND runtime_id IS NULL AND owner_token IS NULL) OR (owner_state!='none' AND runtime_id IS NOT NULL AND owner_token IS NOT NULL)",
      ),
    ),
    check(
      "regeneration_source_attempts_shape_9",
      sql.raw(
        "coalesce((phase='queued' AND owner_state='none' AND completion IS NULL)\n OR (phase IN('active','unknown') AND phase=owner_state AND completion IS NULL)\n OR (phase='terminal' AND json_valid(completion) AND\n ((owner_state='none' AND json_extract(completion,'$.kind')='never-owned' AND json_extract(completion,'$.outcome')='cancelled' AND cancel_generation>0)\n OR (owner_state='closed' AND json_extract(completion,'$.kind')='closed' AND json_extract(completion,'$.proofId') IS NOT NULL\n AND json_type(completion,'$.callerEnded') IN('true','false') AND json_type(completion,'$.acknowledged') IN('true','false')\n AND (json_extract(completion,'$.acknowledged')=0 OR json_extract(completion,'$.callerEnded')=1)))),0)",
      ),
    ),
    uniqueIndex("regeneration_attempt_ordinal").on(t.bindingId, t.ordinal),
    uniqueIndex("regeneration_attempt_held")
      .on(t.bindingId)
      .where(
        sql`not (${t.phase}='terminal' and (json_extract(${t.completion},'$.kind')='never-owned' or (${t.ownerState}='closed' and json_extract(${t.completion},'$.callerEnded')=1 and json_extract(${t.completion},'$.acknowledged')=1)))`,
      ),
  ],
);

export const machineRegenerations = sqliteTable(
  "machine_regenerations",
  {
    id: text("id").primaryKey(),
    executorId: text("executor_id")
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
    sourceOrigin: text("source_origin", {
      enum: ["local-original", "drive-record", "redacted"],
    }).notNull(),
    sourceBindingId: text("source_binding_id").references(
      (): AnySQLiteColumn => regenerationSourceBindings.id,
      { onDelete: "restrict" },
    ),
    sourceMemoryBytes: integer("source_memory_bytes").notNull(),
    inputReceipt: text("source_input_receipt", {
      mode: "json",
    }).$type<SourceInputReceipt>(),
    source: text("source", { mode: "json" })
      .$type<MachineRegeneration["source"]>()
      .notNull(),
    previous: text("previous", { mode: "json" })
      .$type<MachineRegeneration["previous"]>()
      .notNull(),
    noteVersion: integer("note_version").notNull(),
    ownershipGeneration: integer("ownership_generation").notNull(),
    originalRevisionNo: integer("original_revision_no").notNull(),
    phase: text("phase", {
      enum: ["queued", "acquiring", "preparing", "final-check", "terminal"],
    }).notNull(),
    outcome: text("outcome", {
      enum: ["pending", "succeeded", "failed", "cancelled", "unknown"],
    }).notNull(),
    failure: text("failure"),
    resultVersion: integer("result_version"),
    ownerState: text("owner_state", {
      enum: ["none", "active", "unknown", "closed"],
    }).notNull(),
    runtimeId: text("runtime_id"),
    ownerToken: text("owner_token"),
    cancelGeneration: integer("cancel_generation").notNull(),
    version: integer("version").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    deadlineAt: integer("deadline_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    terminalAt: integer("terminal_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    check(
      "machine_regenerations_shape_1",
      sql.raw(
        "typeof(source_memory_bytes)='integer' AND source_memory_bytes IN(0,52428800)",
      ),
    ),
    check("machine_regenerations_shape_2", sql.raw("json_valid(source)")),
    check("machine_regenerations_shape_3", sql.raw("json_valid(previous)")),
    check("machine_regenerations_shape_4", sql.raw("note_version>=0")),
    check("machine_regenerations_shape_5", sql.raw("ownership_generation>0")),
    check("machine_regenerations_shape_6", sql.raw("original_revision_no>0")),
    check(
      "machine_regenerations_shape_7",
      sql.raw(
        "phase IN('queued','acquiring','preparing','final-check','terminal')",
      ),
    ),
    check(
      "machine_regenerations_shape_8",
      sql.raw(
        "outcome IN('pending','succeeded','failed','cancelled','unknown')",
      ),
    ),
    check(
      "machine_regenerations_shape_9",
      sql.raw("owner_state IN('none','active','unknown','closed')"),
    ),
    check("machine_regenerations_shape_10", sql.raw("cancel_generation>=0")),
    check("machine_regenerations_shape_11", sql.raw("version>0")),
    check(
      "machine_regenerations_shape_12",
      sql.raw("(phase='terminal')=(outcome!='pending')"),
    ),
    check(
      "machine_regenerations_shape_13",
      sql.raw("(outcome='succeeded')=(result_version IS NOT NULL)"),
    ),
    check(
      "machine_regenerations_shape_14",
      sql.raw("(phase='terminal')=(terminal_at IS NOT NULL)"),
    ),
    check(
      "machine_regenerations_shape_15",
      sql.raw(
        "(owner_state='none' AND runtime_id IS NULL AND owner_token IS NULL) OR (owner_state!='none' AND runtime_id IS NOT NULL AND owner_token IS NOT NULL)",
      ),
    ),
    check(
      "machine_regenerations_shape_16",
      sql.raw(
        "coalesce(json_extract(source,'$.format') IN('html','markdown') AND json_extract(source,'$.bytes') BETWEEN 1 AND 52428800 AND length(json_extract(source,'$.sha256'))=64,0)",
      ),
    ),
    uniqueIndex("machine_regeneration_command").on(t.executorId, t.commandId),
    uniqueIndex("machine_regeneration_binding").on(t.id, t.sourceBindingId),
    uniqueIndex("machine_regeneration_live")
      .on(t.noteId)
      .where(
        sql`${t.phase}!='terminal' or ${t.ownerState} in ('active','unknown') or ${t.sourceMemoryBytes}!=0`,
      ),
  ],
);
