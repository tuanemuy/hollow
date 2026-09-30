import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { authBrowserContexts } from "./authSchema";
import { accounts } from "./hollowSchema";

export const driveConnections = sqliteTable(
  "drive_connections",
  {
    accountId: text("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "restrict" }),
    epoch: integer("epoch").notNull(),
    version: integer("version").notNull(),
    credentialVersion: integer("credential_version").notNull(),
    settingsVersion: integer("settings_version").notNull(),
    admissionSequence: integer("admission_sequence").notNull(),
    state: text("state", {
      enum: ["unlinked", "linked", "needs-relink"],
    }).notNull(),
    autoBackup: integer("auto_backup", { mode: "boolean" }).notNull(),
    credential: text("credential", { mode: "json" }).$type<unknown>(),
    folder: text("folder", { mode: "json" }).$type<unknown>(),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    check(
      "drive_connection_numbers",
      sql`${t.epoch} between 0 and 9007199254740991 and ${t.version} between 1 and 9007199254740991 and ${t.credentialVersion} between 0 and 9007199254740991 and ${t.settingsVersion} between 1 and 9007199254740991 and ${t.admissionSequence} between 0 and 9007199254740991 and ${t.autoBackup} in (0,1) and (${t.autoBackup}=0 or (${t.state} in ('linked','needs-relink') and ${t.folder} is not null))`,
    ),
    check(
      "drive_connection_shape",
      sql`coalesce((${t.state} = 'unlinked' and ${t.credential} is null and ${t.folder} is null and ${t.lastUsedAt} is null) or (${t.state} in ('linked','needs-relink') and ${t.epoch} >= 1 and ${t.credentialVersion} >= 1 and ${t.credential} is not null and json_valid(${t.credential}) and json_type(${t.credential},'$.subject') = 'text' and length(json_extract(${t.credential},'$.subject')) between 1 and 255 and json_type(${t.credential},'$.envelope') = 'text' and length(cast(json_extract(${t.credential},'$.envelope') as blob)) between 1 and 65536 and json_type(${t.credential},'$.scopes') = 'array' and json_type(${t.credential},'$.accessExpiresAt') = 'text' and json_type(${t.credential},'$.connectedAt') = 'text'),0)`,
    ),
    check(
      "drive_folder_shape",
      sql`coalesce(${t.folder} is null or (json_valid(${t.folder}) and json_type(${t.folder},'$.id') = 'text' and length(cast(json_extract(${t.folder},'$.id') as blob)) between 1 and 1024 and json_type(${t.folder},'$.name') = 'text' and length(cast(json_extract(${t.folder},'$.name') as blob)) between 1 and 4096 and json_type(${t.folder},'$.checkedAt') = 'text' and (json_type(${t.folder},'$.resourceKeyEnvelope') = 'null' or (json_type(${t.folder},'$.resourceKeyEnvelope') = 'text' and length(cast(json_extract(${t.folder},'$.resourceKeyEnvelope') as blob)) between 1 and 65536))),0)`,
    ),
  ],
);

function recordColumns() {
  return {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    commandId: text("command_id").notNull(),
    intentDigest: text("intent_digest").notNull(),
    sessionHash: text("session_hash"),
    authVersion: integer("auth_version"),
    browserHash: text("browser_hash").references(
      () => authBrowserContexts.hash,
      { onDelete: "restrict" },
    ),
    browserEpoch: integer("browser_epoch"),
    expectedEpoch: integer("expected_epoch").notNull(),
    expectedCredentialVersion: integer("expected_credential_version").notNull(),
    expectedSettingsVersion: integer("expected_settings_version").notNull(),
    version: integer("version").notNull(),
    cancelGeneration: integer("cancel_generation").notNull(),
    ownerState: text("owner_state", {
      enum: ["none", "active", "unknown", "closed"],
    }).notNull(),
    runtimeGeneration: text("runtime_generation"),
    ownerToken: text("owner_token"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    terminalAt: integer("terminal_at", { mode: "timestamp_ms" }),
    phase: text("phase").notNull(),
    data: text("data", { mode: "json" }).$type<unknown>().notNull(),
  };
}
function recordChecks(
  name: string,
  t: Record<
    | "sessionHash"
    | "intentDigest"
    | "authVersion"
    | "browserHash"
    | "browserEpoch"
    | "expectedEpoch"
    | "expectedCredentialVersion"
    | "expectedSettingsVersion"
    | "version"
    | "cancelGeneration"
    | "ownerState"
    | "runtimeGeneration"
    | "ownerToken"
    | "createdAt"
    | "expiresAt"
    | "updatedAt"
    | "terminalAt"
    | "phase"
    | "data",
    AnySQLiteColumn
  >,
) {
  return [
    check(
      `${name}_intent`,
      sql`length(${t.intentDigest}) = 64 and ${t.intentDigest} not glob '*[^0-9a-f]*'`,
    ),
    check(
      `${name}_versions`,
      sql`${t.expectedEpoch} between 0 and 9007199254740991 and ${t.expectedCredentialVersion} between 0 and 9007199254740991 and ${t.expectedSettingsVersion} between 1 and 9007199254740991 and ${t.version} between 1 and 9007199254740991 and ${t.cancelGeneration} between 0 and 9007199254740991`,
    ),
    check(
      `${name}_context`,
      sql`coalesce((${t.sessionHash} is null and ${t.authVersion} is null and ${t.browserHash} is null and ${t.browserEpoch} is null and ${t.terminalAt} is not null and ${t.ownerState} in ('none','closed')) or (${t.sessionHash} is not null and length(cast(${t.sessionHash} as blob)) between 1 and 128 and ${t.authVersion} between 1 and 9007199254740991 and ${t.browserHash} is not null and length(cast(${t.browserHash} as blob)) between 1 and 128 and ${t.browserEpoch} between 1 and 9007199254740991),0)`,
    ),
    check(
      `${name}_owner`,
      sql`(${t.ownerState} = 'none' and ${t.runtimeGeneration} is null and ${t.ownerToken} is null) or (${t.ownerState} in ('active','unknown','closed') and ${t.runtimeGeneration} is not null and length(${t.runtimeGeneration}) between 1 and 128 and ${t.ownerToken} is not null and length(${t.ownerToken}) between 1 and 128)`,
    ),
    check(
      `${name}_time`,
      sql`${t.updatedAt} >= ${t.createdAt} and ${t.expiresAt} > ${t.createdAt} and (${t.terminalAt} is null or (${t.terminalAt} >= ${t.createdAt} and ${t.terminalAt} <= ${t.updatedAt}))`,
    ),
    check(
      `${name}_terminal`,
      sql`(${t.phase} in ('completed','failed') and ${t.terminalAt} is not null) or (${t.phase} not in ('completed','failed') and ${t.terminalAt} is null)`,
    ),
    check(
      `${name}_data`,
      sql`coalesce(json_valid(${t.data}) and length(cast(${t.data} as blob)) <= 65536 and json_type(${t.data},'$.phase') = 'text' and json_extract(${t.data},'$.phase') = ${t.phase},0)`,
    ),
    check(
      `${name}_failure`,
      sql`coalesce(${t.phase} != 'failed' or json_extract(${t.data},'$.failure') in ('DRIVE_CANCELLED','DRIVE_EXPIRED','DRIVE_CONTEXT_CHANGED','DRIVE_CONNECTION_CHANGED','DRIVE_EXCHANGE_UNKNOWN','DRIVE_REFRESH_UNKNOWN','DRIVE_SCOPE_REQUIRED','DRIVE_REFRESH_REQUIRED','DRIVE_UNVERIFIED','DRIVE_PROVIDER_REJECTED','DRIVE_UNAVAILABLE','DRIVE_RATE_LIMIT','DRIVE_FOLDER_TRASHED','DRIVE_FOLDER_DENIED','DRIVE_FOLDER_UNAVAILABLE','DRIVE_FOLDER_INVALID','DRIVE_CREATE_UNKNOWN','DRIVE_CREATE_CONFLICT'),0)`,
    ),
  ];
}

export const driveAuthorizationAttempts = sqliteTable(
  "drive_authorization_attempts",
  {
    ...recordColumns(),
    stateHash: text("state_hash").notNull().unique(),
    nonceHash: text("nonce_hash").notNull(),
    confirmedAdmissionSequence: integer(
      "confirmed_admission_sequence",
    ).notNull(),
    returnTo: text("return_to", { enum: ["settings"] }).notNull(),
    confirmedFolderIdsEnvelope: text("confirmed_folder_ids_envelope"),
  },
  (t) => [
    uniqueIndex("drive_attempt_command").on(t.accountId, t.commandId),
    index("drive_attempt_browser").on(t.browserHash, t.createdAt),
    index("drive_attempt_owner").on(t.ownerState, t.accountId),
    index("drive_attempt_expiry").on(t.expiresAt, t.id),
    ...recordChecks("drive_attempt", t),
    check(
      "drive_attempt_confirmation",
      sql`(${t.terminalAt} is null and ${t.confirmedFolderIdsEnvelope} is not null and length(cast(${t.confirmedFolderIdsEnvelope} as blob)) between 1 and 65536) or (${t.terminalAt} is not null and ${t.confirmedFolderIdsEnvelope} is null)`,
    ),
    check(
      "drive_attempt_bound",
      sql`${t.expiresAt} = ${t.createdAt} + 600000 and ${t.returnTo} = 'settings' and ${t.confirmedAdmissionSequence} between 0 and 9007199254740991`,
    ),
    check(
      "drive_attempt_phase",
      sql`coalesce(
    (${t.phase} = 'pending' and ${t.ownerState} = 'none' and json_type(${t.data},'$.verifierEnvelope') = 'text' and length(cast(json_extract(${t.data},'$.verifierEnvelope') as blob)) between 1 and 65536) or
    (${t.phase} = 'exchanging' and ${t.ownerState} in ('active','unknown') and json_type(${t.data},'$.verifierEnvelope') is null and json_type(${t.data},'$.candidateEnvelope') is null) or
    (${t.phase} = 'candidate' and ${t.ownerState} = 'closed' and json_type(${t.data},'$.candidateEnvelope') = 'text' and length(cast(json_extract(${t.data},'$.candidateEnvelope') as blob)) between 1 and 65536) or
    (${t.phase} = 'completed' and ${t.ownerState} = 'closed' and json_type(${t.data},'$.resultEpoch') = 'integer' and json_extract(${t.data},'$.resultEpoch') >= 1 and json_type(${t.data},'$.candidateEnvelope') is null) or
    (${t.phase} = 'failed' and json_type(${t.data},'$.failure') = 'text' and json_type(${t.data},'$.verifierEnvelope') is null and json_type(${t.data},'$.candidateEnvelope') is null),0)`,
    ),
  ],
);

export const driveControlOperations = sqliteTable(
  "drive_control_operations",
  {
    ...recordColumns(),
    subject: text("subject").notNull(),
    credentialUse: text("credential_use", { mode: "json" })
      .$type<unknown>()
      .notNull(),
    kind: text("kind", {
      enum: [
        "refresh",
        "picker",
        "folder-select",
        "folder-create",
        "disconnect",
      ],
    }).notNull(),
  },
  (t) => [
    uniqueIndex("drive_control_command").on(t.accountId, t.commandId),
    index("drive_control_owner").on(t.ownerState, t.accountId),
    index("drive_control_expiry").on(t.expiresAt, t.id),
    index("drive_control_history").on(t.accountId, t.createdAt),
    ...recordChecks("drive_control", t),
    check(
      "drive_control_credential_use",
      sql`coalesce(json_valid(${t.credentialUse}) and length(cast(${t.credentialUse} as blob)) <= 1024 and (
      (( ${t.kind} = 'disconnect' or ${t.ownerState} = 'none') and json_extract(${t.credentialUse},'$.kind') = 'none' and json_type(${t.credentialUse},'$.version') is null and json_type(${t.credentialUse},'$.ownerToken') is null and json_type(${t.credentialUse},'$.runtimeGeneration') is null and json_type(${t.credentialUse},'$.fromVersion') is null) or
      (${t.kind} != 'disconnect' and ${t.ownerState} != 'none' and json_extract(${t.credentialUse},'$.kind') in ('bound','self-refreshed') and json_extract(${t.credentialUse},'$.ownerToken') = ${t.ownerToken} and json_extract(${t.credentialUse},'$.runtimeGeneration') = ${t.runtimeGeneration} and json_type(${t.credentialUse},'$.version') = 'integer' and json_extract(${t.credentialUse},'$.version') between 1 and 9007199254740991 and ((json_extract(${t.credentialUse},'$.kind') = 'bound' and json_type(${t.credentialUse},'$.fromVersion') is null) or (json_extract(${t.credentialUse},'$.kind') = 'self-refreshed' and json_type(${t.credentialUse},'$.fromVersion') = 'integer' and json_extract(${t.credentialUse},'$.fromVersion') >= 1 and json_extract(${t.credentialUse},'$.version') = json_extract(${t.credentialUse},'$.fromVersion') + 1)))
    ),0)`,
    ),
    check(
      "drive_control_bound",
      sql`${t.expectedEpoch} >= 1 and ${t.expectedCredentialVersion} >= 1 and length(${t.subject}) between 1 and 255 and ${t.expiresAt} = ${t.createdAt} + case when ${t.kind} = 'picker' then 300000 else 600000 end`,
    ),
    check(
      "drive_control_kind",
      sql`coalesce(json_extract(${t.data},'$.kind') = ${t.kind} and (
    (${t.kind} = 'refresh' and ${t.phase} in ('queued','running','completed','failed')) or
    (${t.kind} = 'picker' and ${t.phase} in ('queued','running','awaiting-selection','completed','failed')) or
    (${t.kind} = 'folder-select' and ${t.phase} in ('queued','running','ready','verifying-target','completed','failed')) or
    (${t.kind} = 'folder-create' and ${t.phase} in ('queued','allocating','prepared','running','reconciling','ready','completed','failed')) or
    (${t.kind} = 'disconnect' and ${t.phase} in ('queued','completed','failed'))),0)`,
    ),
    check(
      "drive_control_phase_owner",
      sql`(${t.phase} = 'queued' and ${t.ownerState} = 'none') or (${t.phase} in ('running','allocating','verifying-target') and ${t.ownerState} in ('active','unknown')) or (${t.phase} in ('ready','prepared','awaiting-selection') and ${t.ownerState} = 'closed') or (${t.phase} = 'completed' and ${t.ownerState} in ('none','closed')) or ${t.phase} in ('failed','reconciling')`,
    ),
    check(
      "drive_control_creation",
      sql`coalesce(${t.kind} != 'folder-create' or ${t.phase} in ('queued','allocating','failed') or (json_type(${t.data},'$.fileId') = 'text' and length(json_extract(${t.data},'$.fileId')) between 1 and 1024 and json_type(${t.data},'$.marker') = 'text' and length(json_extract(${t.data},'$.marker')) between 1 and 128 and json_type(${t.data},'$.sends') = 'integer' and ((${t.phase} = 'prepared' and json_extract(${t.data},'$.sends') = 0) or (${t.phase} != 'prepared' and json_extract(${t.data},'$.sends') between 1 and 2))),0)`,
    ),
    check(
      "drive_control_result",
      sql`coalesce(
    (${t.phase} = 'failed') or
    (${t.kind} = 'refresh' and (${t.phase} != 'completed' or (json_type(${t.data},'$.resultCredentialVersion') = 'integer' and json_extract(${t.credentialUse},'$.kind') = 'self-refreshed' and json_extract(${t.data},'$.resultCredentialVersion') = json_extract(${t.credentialUse},'$.version')))) or
    (${t.kind} = 'disconnect' and (${t.phase} != 'completed' or (json_type(${t.data},'$.resultEpoch') = 'integer' and json_extract(${t.data},'$.resultEpoch') > ${t.expectedEpoch}))) or
    (${t.kind} = 'picker' and (${t.phase} != 'awaiting-selection' or (json_type(${t.data},'$.ticketHash') = 'text' and length(cast(json_extract(${t.data},'$.ticketHash') as blob)) between 1 and 128))) or
    (${t.kind} = 'folder-create') or
    (${t.kind} = 'folder-select' and (
      (${t.phase} in ('queued','running') and json_type(${t.data},'$.fileId') = 'text' and length(json_extract(${t.data},'$.fileId')) between 1 and 1024 and json_type(${t.data},'$.pickerId') = 'text' and json_type(${t.data},'$.resourceKeyEnvelope') in ('text','null')) or
      (${t.phase} = 'ready' and json_type(${t.data},'$.targetId') = 'text' and length(json_extract(${t.data},'$.targetId')) between 1 and 1024 and json_type(${t.data},'$.sourceId') = 'text' and json_type(${t.data},'$.targetKeyEnvelope') in ('text','null')) or
      (${t.phase} = 'verifying-target' and json_type(${t.data},'$.targetId') = 'text' and length(json_extract(${t.data},'$.targetId')) between 1 and 1024 and json_type(${t.data},'$.sourceId') = 'text' and json_type(${t.data},'$.targetKeyEnvelope') in ('text','null') and json_type(${t.data},'$.confirmedReadyVersion') = 'integer' and json_extract(${t.data},'$.confirmedReadyVersion') between 1 and 9007199254740991) or
      (${t.phase} = 'completed' and json_type(${t.data},'$.folderId') = 'text' and length(json_extract(${t.data},'$.folderId')) between 1 and 1024))),0)`,
    ),
  ],
);
