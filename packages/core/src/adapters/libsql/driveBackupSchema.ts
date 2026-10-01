import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { accounts, notes, originals } from "./hollowSchema";

const instant = (name: string) => integer(name, { mode: "timestamp_ms" });

export const driveBackupRequests = sqliteTable(
  "drive_backup_requests",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    commandId: text("command_id").notNull(),
    intentDigest: text("intent_digest").notNull(),
    kind: text("kind", { enum: ["manual", "automatic", "bulk"] }).notNull(),
    version: integer("version").notNull(),
    createdAt: instant("created_at").notNull(),
    cancelledAt: instant("cancelled_at"),
    count: integer("count").notNull(),
    bulkSummary: text("bulk_summary", { mode: "json" }).$type<unknown>(),
    rootRequestId: text("root_request_id").references(
      (): AnySQLiteColumn => driveBackupRequests.id,
      { onDelete: "restrict" },
    ),
    generation: integer("generation").notNull().default(1),
  },
  (t) => [
    uniqueIndex("drive_backup_request_command").on(t.accountId, t.commandId),
    uniqueIndex("drive_backup_request_generation")
      .on(t.rootRequestId, t.generation)
      .where(sql`${t.rootRequestId} is not null`),
    check(
      "drive_backup_request_family",
      sql`${t.generation} between 1 and 9007199254740991 and (${t.rootRequestId} is null or (${t.kind}='bulk' and ${t.rootRequestId}!=${t.id} and ${t.generation}>1)) and (${t.bulkSummary} is null or (${t.kind}='bulk' and ${t.rootRequestId} is null and json_valid(${t.bulkSummary})))`,
    ),
    check(
      "drive_backup_request_shape",
      sql`${t.version} between 1 and 9007199254740991 and ${t.count} between 1 and 500 and ${t.kind} in ('manual','automatic','bulk') and length(${t.intentDigest})=64 and ${t.intentDigest} not glob '*[^a-f0-9]*' and (${t.cancelledAt} is null or ${t.cancelledAt} >= ${t.createdAt})`,
    ),
  ],
);

export const driveBackupTargets = sqliteTable(
  "drive_backup_targets",
  {
    id: text("id").primaryKey(),
    originalId: text("original_id")
      .notNull()
      .references(() => originals.id, { onDelete: "restrict" }),
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "restrict" }),
    accountId: text("account_id").notNull(),
    subject: text("subject").notNull(),
    marker: text("marker").notNull(),
    folder: text("folder", { mode: "json" }).$type<unknown>().notNull(),
    folderEpoch: integer("folder_epoch").notNull(),
    fileId: text("file_id"),
    state: text("state", {
      enum: ["unallocated", "allocated", "unknown", "confirmed"],
    }).notNull(),
    version: integer("version").notNull(),
    createdAt: instant("created_at").notNull(),
    updatedAt: instant("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("drive_backup_target_head_identity").on(
      t.id,
      t.originalId,
      t.accountId,
      t.subject,
    ),
    uniqueIndex("drive_backup_target_file").on(t.fileId),
    check(
      "drive_backup_target_shape",
      sql`coalesce(${t.version} between 1 and 9007199254740991 and ${t.folderEpoch} between 1 and 9007199254740991 and ${t.updatedAt} >= ${t.createdAt} and length(${t.subject}) between 1 and 255 and json_valid(${t.folder}) and ((${t.state}='unallocated' and ${t.fileId} is null) or (${t.state} in ('allocated','unknown','confirmed') and length(${t.fileId}) between 1 and 1024)),0)`,
    ),
  ],
);

export const driveBackupTargetHeads = sqliteTable(
  "drive_backup_target_heads",
  {
    originalId: text("original_id").notNull(),
    accountId: text("account_id").notNull(),
    subject: text("subject").notNull(),
    targetId: text("target_id").notNull().unique(),
    version: integer("version").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.originalId, t.accountId, t.subject] }),
    foreignKey({
      columns: [t.targetId, t.originalId, t.accountId, t.subject],
      foreignColumns: [
        driveBackupTargets.id,
        driveBackupTargets.originalId,
        driveBackupTargets.accountId,
        driveBackupTargets.subject,
      ],
    }).onDelete("restrict"),
    check(
      "drive_backup_head_version",
      sql`${t.version} between 1 and 9007199254740991`,
    ),
  ],
);

export const driveBackupJobs = sqliteTable(
  "drive_backup_jobs",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .references(() => driveBackupRequests.id, { onDelete: "restrict" }),
    accountId: text("account_id").notNull(),
    ordinal: integer("ordinal").notNull(),
    attempt: integer("attempt").notNull(),
    retryOf: text("retry_of"),
    noteId: text("note_id").references(() => notes.id, {
      onDelete: "restrict",
    }),
    targetId: text("target_id").references(() => driveBackupTargets.id, {
      onDelete: "restrict",
    }),
    title: text("title").notNull(),
    version: integer("version").notNull(),
    createdAt: instant("created_at").notNull(),
    updatedAt: instant("updated_at").notNull(),
    terminalAt: instant("terminal_at"),
    state: text("state", {
      enum: ["queued", "running", "succeeded", "failed", "cancelled"],
    }).notNull(),
    bytes: integer("bytes").notNull(),
    failure: text("failure"),
    recordId: text("record_id"),
    admissionIdentity: text("admission_identity", {
      mode: "json",
    }).$type<unknown>(),
    rootOrdinal: integer("root_ordinal"),
  },
  (t) => [
    uniqueIndex("drive_backup_job_attempt").on(
      t.requestId,
      t.ordinal,
      t.attempt,
    ),
    index("drive_backup_job_history").on(t.accountId, t.createdAt, t.id),
    index("drive_backup_job_note").on(t.noteId, t.state),
    uniqueIndex("drive_backup_job_live_target")
      .on(t.targetId)
      .where(sql`${t.terminalAt} is null`),
    uniqueIndex("drive_backup_job_root_ordinal")
      .on(t.requestId, t.rootOrdinal)
      .where(sql`${t.rootOrdinal} is not null`),
    check(
      "drive_backup_job_admission",
      sql`(${t.rootOrdinal} is null or ${t.rootOrdinal} between 0 and 499) and (${t.admissionIdentity} is null or (json_valid(${t.admissionIdentity}) and ${t.targetId} is not null and json_extract(${t.admissionIdentity},'$.noteId')=${t.noteId} and json_extract(${t.admissionIdentity},'$.accountId')=${t.accountId}))`,
    ),
    check(
      "drive_backup_job_shape",
      sql`${t.version} between 1 and 9007199254740991 and ${t.attempt} between 1 and 9007199254740991 and ${t.ordinal} between 0 and 499 and ${t.bytes} between 0 and 209715200 and ${t.updatedAt} >= ${t.createdAt} and ((${t.state} in ('queued','running') and ${t.terminalAt} is null and ${t.failure} is null and ${t.recordId} is null) or (${t.state}='succeeded' and ${t.terminalAt} is not null and ${t.failure} is null and ${t.recordId} is not null) or (${t.state}='failed' and ${t.terminalAt} is not null and ${t.failure} is not null and ${t.recordId} is null) or (${t.state}='cancelled' and ${t.terminalAt} is not null and ${t.failure} is null and ${t.recordId} is null))`,
    ),
  ],
);

export const driveBackupTransfers = sqliteTable(
  "drive_backup_transfers",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").references(() => driveBackupJobs.id, {
      onDelete: "restrict",
    }),
    targetId: text("target_id")
      .notNull()
      .references(() => driveBackupTargets.id, { onDelete: "restrict" }),
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "restrict" }),
    accountId: text("account_id").notNull(),
    workspaceId: text("workspace_id"),
    epoch: integer("epoch").notNull(),
    identity: text("identity", { mode: "json" }).$type<unknown>().notNull(),
    ownerState: text("owner_state", {
      enum: ["none", "active", "unknown", "closed"],
    }).notNull(),
    runtimeGeneration: text("runtime_generation"),
    ownerToken: text("owner_token"),
    credentialVersion: integer("credential_version").notNull(),
    version: integer("version").notNull(),
    cancelGeneration: integer("cancel_generation").notNull(),
    received: integer("received").notNull(),
    sessionEnvelope: text("session_envelope"),
    statusAttempts: integer("status_attempts").notNull(),
    createdAt: instant("created_at").notNull(),
    updatedAt: instant("updated_at").notNull(),
    deadlineAt: instant("deadline_at").notNull(),
    readPinned: integer("read_pinned", { mode: "boolean" }).notNull(),
    refreshPending: integer("refresh_pending", { mode: "boolean" })
      .notNull()
      .default(false),
    phase: text("phase").notNull(),
    offset: integer("offset"),
    length: integer("length"),
    recordId: text("record_id"),
    failure: text("failure"),
  },
  (t) => [
    index("drive_backup_transfer_owner").on(t.ownerState, t.accountId),
    index("drive_backup_transfer_note").on(t.noteId, t.phase),
    index("drive_backup_transfer_queue").on(t.phase, t.createdAt, t.id),
    uniqueIndex("drive_backup_transfer_live")
      .on(t.targetId)
      .where(
        sql`${t.phase} not in ('succeeded','failed','cancelled') or ${t.ownerState} in ('active','unknown')`,
      ),
    check(
      "drive_backup_transfer_identity",
      sql`coalesce(json_valid(${t.identity}) and json_extract(${t.identity},'$.noteId')=${t.noteId} and json_extract(${t.identity},'$.accountId')=${t.accountId} and json_extract(${t.identity},'$.epoch')=${t.epoch} and json_extract(${t.identity},'$.workspaceId') is ${t.workspaceId} and json_extract(${t.identity},'$.bytes') between 1 and 209715200 and ${t.received} between 0 and json_extract(${t.identity},'$.bytes'),0)`,
    ),
    check(
      "drive_backup_transfer_numbers",
      sql`${t.version} between 1 and 9007199254740991 and ${t.credentialVersion} between 1 and 9007199254740991 and ${t.cancelGeneration} between 0 and 9007199254740991 and ${t.statusAttempts} between 0 and 3 and ${t.deadlineAt}>${t.createdAt} and ${t.updatedAt}>=${t.createdAt} and ${t.readPinned} in (0,1) and ${t.refreshPending} in (0,1)`,
    ),
    check(
      "drive_backup_transfer_owner_shape",
      sql`(${t.ownerState}='none' and ${t.runtimeGeneration} is null and ${t.ownerToken} is null and ${t.readPinned}=0 and ${t.refreshPending}=0 and ${t.phase} in ('queued','failed','cancelled')) or (${t.ownerState} in ('active','unknown','closed') and ${t.runtimeGeneration} is not null and ${t.ownerToken} is not null and (${t.ownerState}!='closed' or (${t.readPinned}=0 and ${t.refreshPending}=0)))`,
    ),
    check(
      "drive_backup_transfer_phase",
      sql`coalesce(${t.phase} in ('queued','checking','allocating','refreshing','initiating','uploading','reconciling','verifying','succeeded','failed','cancelled') and (${t.cancelGeneration}=0 or ${t.phase}='cancelled') and (${t.phase} not in ('uploading','reconciling') or ${t.sessionEnvelope} is not null) and (${t.phase}!='uploading' or (${t.offset}=${t.received} and ${t.length} between 1 and 1048576 and ${t.offset}+${t.length}<=json_extract(${t.identity},'$.bytes'))) and ((${t.phase}='failed' and ${t.failure} is not null) or (${t.phase}!='failed' and ${t.failure} is null)) and ((${t.phase}='succeeded' and ${t.recordId} is not null and ${t.ownerState}='closed' and ${t.received}=json_extract(${t.identity},'$.bytes')) or (${t.phase}!='succeeded' and ${t.recordId} is null)),0)`,
    ),
  ],
);

export const driveBackupRecords = sqliteTable(
  "drive_backup_records",
  {
    id: text("id").primaryKey(),
    version: integer("version").notNull(),
    targetId: text("target_id")
      .notNull()
      .references(() => driveBackupTargets.id, { onDelete: "restrict" }),
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "restrict" }),
    originalId: text("original_id")
      .notNull()
      .references(() => originals.id, { onDelete: "restrict" }),
    accountId: text("account_id").notNull(),
    subject: text("subject").notNull(),
    fileId: text("file_id").notNull(),
    folder: text("folder", { mode: "json" }).$type<unknown>().notNull(),
    bytes: integer("bytes").notNull(),
    sha256: text("sha256").notNull(),
    createdAt: instant("created_at").notNull(),
    webViewLink: text("web_view_link"),
    resourceKeyEnvelope: text("resource_key_envelope"),
  },
  (t) => [
    uniqueIndex("drive_backup_record_target").on(t.targetId),
    index("drive_backup_record_note").on(t.noteId, t.accountId),
    check(
      "drive_backup_record_shape",
      sql`${t.version}=1 and ${t.bytes} between 1 and 209715200 and length(${t.sha256})=64 and ${t.sha256} not glob '*[^a-f0-9]*' and length(${t.subject}) between 1 and 255 and length(${t.fileId}) between 1 and 1024 and json_valid(${t.folder})`,
    ),
  ],
);
