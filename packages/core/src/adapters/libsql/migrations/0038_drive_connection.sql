CREATE TABLE `drive_authorization_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`command_id` text NOT NULL,
	`session_hash` text,
	`auth_version` integer,
	`browser_hash` text,
	`browser_epoch` integer,
	`expected_epoch` integer NOT NULL,
	`expected_credential_version` integer NOT NULL,
	`expected_settings_version` integer NOT NULL,
	`version` integer NOT NULL,
	`cancel_generation` integer NOT NULL,
	`owner_state` text NOT NULL,
	`runtime_generation` text,
	`owner_token` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`terminal_at` integer,
	`phase` text NOT NULL,
	`data` text NOT NULL,
	`state_hash` text NOT NULL,
	`nonce_hash` text NOT NULL,
	`confirmed_admission_sequence` integer NOT NULL,
	`return_to` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`browser_hash`) REFERENCES `auth_browser_contexts`(`browser_hash`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "drive_attempt_versions" CHECK("drive_authorization_attempts"."expected_epoch" between 0 and 9007199254740991 and "drive_authorization_attempts"."expected_credential_version" between 0 and 9007199254740991 and "drive_authorization_attempts"."expected_settings_version" between 1 and 9007199254740991 and "drive_authorization_attempts"."version" between 1 and 9007199254740991 and "drive_authorization_attempts"."cancel_generation" between 0 and 9007199254740991),
	CONSTRAINT "drive_attempt_context" CHECK(coalesce(("drive_authorization_attempts"."session_hash" is null and "drive_authorization_attempts"."auth_version" is null and "drive_authorization_attempts"."browser_hash" is null and "drive_authorization_attempts"."browser_epoch" is null and "drive_authorization_attempts"."terminal_at" is not null and "drive_authorization_attempts"."owner_state" in ('none','closed')) or ("drive_authorization_attempts"."session_hash" is not null and length(cast("drive_authorization_attempts"."session_hash" as blob)) between 1 and 128 and "drive_authorization_attempts"."auth_version" between 1 and 9007199254740991 and "drive_authorization_attempts"."browser_hash" is not null and length(cast("drive_authorization_attempts"."browser_hash" as blob)) between 1 and 128 and "drive_authorization_attempts"."browser_epoch" between 1 and 9007199254740991),0)),
	CONSTRAINT "drive_attempt_owner" CHECK(("drive_authorization_attempts"."owner_state" = 'none' and "drive_authorization_attempts"."runtime_generation" is null and "drive_authorization_attempts"."owner_token" is null) or ("drive_authorization_attempts"."owner_state" in ('active','unknown','closed') and "drive_authorization_attempts"."runtime_generation" is not null and length("drive_authorization_attempts"."runtime_generation") between 1 and 128 and "drive_authorization_attempts"."owner_token" is not null and length("drive_authorization_attempts"."owner_token") between 1 and 128)),
	CONSTRAINT "drive_attempt_time" CHECK("drive_authorization_attempts"."updated_at" >= "drive_authorization_attempts"."created_at" and "drive_authorization_attempts"."expires_at" > "drive_authorization_attempts"."created_at" and ("drive_authorization_attempts"."terminal_at" is null or ("drive_authorization_attempts"."terminal_at" >= "drive_authorization_attempts"."created_at" and "drive_authorization_attempts"."terminal_at" <= "drive_authorization_attempts"."updated_at"))),
	CONSTRAINT "drive_attempt_terminal" CHECK(("drive_authorization_attempts"."phase" in ('completed','failed') and "drive_authorization_attempts"."terminal_at" is not null) or ("drive_authorization_attempts"."phase" not in ('completed','failed') and "drive_authorization_attempts"."terminal_at" is null)),
	CONSTRAINT "drive_attempt_data" CHECK(coalesce(json_valid("drive_authorization_attempts"."data") and length(cast("drive_authorization_attempts"."data" as blob)) <= 65536 and json_type("drive_authorization_attempts"."data",'$.phase') = 'text' and json_extract("drive_authorization_attempts"."data",'$.phase') = "drive_authorization_attempts"."phase",0)),
	CONSTRAINT "drive_attempt_failure" CHECK(coalesce("drive_authorization_attempts"."phase" != 'failed' or json_extract("drive_authorization_attempts"."data",'$.failure') in ('DRIVE_CANCELLED','DRIVE_EXPIRED','DRIVE_CONTEXT_CHANGED','DRIVE_CONNECTION_CHANGED','DRIVE_EXCHANGE_UNKNOWN','DRIVE_REFRESH_UNKNOWN','DRIVE_SCOPE_REQUIRED','DRIVE_REFRESH_REQUIRED','DRIVE_UNVERIFIED','DRIVE_PROVIDER_REJECTED','DRIVE_UNAVAILABLE','DRIVE_RATE_LIMIT','DRIVE_FOLDER_TRASHED','DRIVE_FOLDER_DENIED','DRIVE_FOLDER_UNAVAILABLE','DRIVE_FOLDER_INVALID','DRIVE_CREATE_UNKNOWN','DRIVE_CREATE_CONFLICT'),0)),
	CONSTRAINT "drive_attempt_bound" CHECK("drive_authorization_attempts"."expires_at" = "drive_authorization_attempts"."created_at" + 600000 and "drive_authorization_attempts"."return_to" = 'settings' and "drive_authorization_attempts"."confirmed_admission_sequence" between 0 and 9007199254740991),
	CONSTRAINT "drive_attempt_phase" CHECK(coalesce(
    ("drive_authorization_attempts"."phase" = 'pending' and "drive_authorization_attempts"."owner_state" = 'none' and json_type("drive_authorization_attempts"."data",'$.verifierEnvelope') = 'text' and length(cast(json_extract("drive_authorization_attempts"."data",'$.verifierEnvelope') as blob)) between 1 and 65536) or
    ("drive_authorization_attempts"."phase" = 'exchanging' and "drive_authorization_attempts"."owner_state" in ('active','unknown') and json_type("drive_authorization_attempts"."data",'$.verifierEnvelope') is null and json_type("drive_authorization_attempts"."data",'$.candidateEnvelope') is null) or
    ("drive_authorization_attempts"."phase" = 'candidate' and "drive_authorization_attempts"."owner_state" = 'closed' and json_type("drive_authorization_attempts"."data",'$.candidateEnvelope') = 'text' and length(cast(json_extract("drive_authorization_attempts"."data",'$.candidateEnvelope') as blob)) between 1 and 65536) or
    ("drive_authorization_attempts"."phase" = 'completed' and "drive_authorization_attempts"."owner_state" = 'closed' and json_type("drive_authorization_attempts"."data",'$.resultEpoch') = 'integer' and json_extract("drive_authorization_attempts"."data",'$.resultEpoch') >= 1 and json_type("drive_authorization_attempts"."data",'$.candidateEnvelope') is null) or
    ("drive_authorization_attempts"."phase" = 'failed' and json_type("drive_authorization_attempts"."data",'$.failure') = 'text' and json_type("drive_authorization_attempts"."data",'$.verifierEnvelope') is null and json_type("drive_authorization_attempts"."data",'$.candidateEnvelope') is null),0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `drive_authorization_attempts_state_hash_unique` ON `drive_authorization_attempts` (`state_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `drive_attempt_command` ON `drive_authorization_attempts` (`account_id`,`command_id`);--> statement-breakpoint
CREATE INDEX `drive_attempt_browser` ON `drive_authorization_attempts` (`browser_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `drive_attempt_owner` ON `drive_authorization_attempts` (`owner_state`,`account_id`);--> statement-breakpoint
CREATE INDEX `drive_attempt_expiry` ON `drive_authorization_attempts` (`expires_at`,`id`);--> statement-breakpoint
CREATE TABLE `drive_connections` (
	`account_id` text PRIMARY KEY NOT NULL,
	`epoch` integer NOT NULL,
	`version` integer NOT NULL,
	`credential_version` integer NOT NULL,
	`settings_version` integer NOT NULL,
	`admission_sequence` integer NOT NULL,
	`state` text NOT NULL,
	`auto_backup` integer NOT NULL,
	`credential` text,
	`folder` text,
	`last_used_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "drive_connection_numbers" CHECK("drive_connections"."epoch" between 0 and 9007199254740991 and "drive_connections"."version" between 1 and 9007199254740991 and "drive_connections"."credential_version" between 0 and 9007199254740991 and "drive_connections"."settings_version" between 1 and 9007199254740991 and "drive_connections"."admission_sequence" between 0 and 9007199254740991 and "drive_connections"."auto_backup" = 0),
	CONSTRAINT "drive_connection_shape" CHECK(coalesce(("drive_connections"."state" = 'unlinked' and "drive_connections"."credential" is null and "drive_connections"."folder" is null and "drive_connections"."last_used_at" is null) or ("drive_connections"."state" in ('linked','needs-relink') and "drive_connections"."epoch" >= 1 and "drive_connections"."credential_version" >= 1 and "drive_connections"."credential" is not null and json_valid("drive_connections"."credential") and json_type("drive_connections"."credential",'$.subject') = 'text' and length(json_extract("drive_connections"."credential",'$.subject')) between 1 and 255 and json_type("drive_connections"."credential",'$.envelope') = 'text' and length(cast(json_extract("drive_connections"."credential",'$.envelope') as blob)) between 1 and 65536 and json_type("drive_connections"."credential",'$.scopes') = 'array' and json_type("drive_connections"."credential",'$.accessExpiresAt') = 'text' and json_type("drive_connections"."credential",'$.connectedAt') = 'text'),0)),
	CONSTRAINT "drive_folder_shape" CHECK(coalesce("drive_connections"."folder" is null or (json_valid("drive_connections"."folder") and json_type("drive_connections"."folder",'$.id') = 'text' and length(cast(json_extract("drive_connections"."folder",'$.id') as blob)) between 1 and 1024 and json_type("drive_connections"."folder",'$.name') = 'text' and length(cast(json_extract("drive_connections"."folder",'$.name') as blob)) between 1 and 4096 and json_type("drive_connections"."folder",'$.checkedAt') = 'text' and (json_type("drive_connections"."folder",'$.resourceKeyEnvelope') = 'null' or (json_type("drive_connections"."folder",'$.resourceKeyEnvelope') = 'text' and length(cast(json_extract("drive_connections"."folder",'$.resourceKeyEnvelope') as blob)) between 1 and 65536))),0))
);
--> statement-breakpoint
CREATE TABLE `drive_control_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`command_id` text NOT NULL,
	`session_hash` text,
	`auth_version` integer,
	`browser_hash` text,
	`browser_epoch` integer,
	`expected_epoch` integer NOT NULL,
	`expected_credential_version` integer NOT NULL,
	`expected_settings_version` integer NOT NULL,
	`version` integer NOT NULL,
	`cancel_generation` integer NOT NULL,
	`owner_state` text NOT NULL,
	`runtime_generation` text,
	`owner_token` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`terminal_at` integer,
	`phase` text NOT NULL,
	`data` text NOT NULL,
	`subject` text NOT NULL,
	`kind` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`browser_hash`) REFERENCES `auth_browser_contexts`(`browser_hash`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "drive_control_versions" CHECK("drive_control_operations"."expected_epoch" between 0 and 9007199254740991 and "drive_control_operations"."expected_credential_version" between 0 and 9007199254740991 and "drive_control_operations"."expected_settings_version" between 1 and 9007199254740991 and "drive_control_operations"."version" between 1 and 9007199254740991 and "drive_control_operations"."cancel_generation" between 0 and 9007199254740991),
	CONSTRAINT "drive_control_context" CHECK(coalesce(("drive_control_operations"."session_hash" is null and "drive_control_operations"."auth_version" is null and "drive_control_operations"."browser_hash" is null and "drive_control_operations"."browser_epoch" is null and "drive_control_operations"."terminal_at" is not null and "drive_control_operations"."owner_state" in ('none','closed')) or ("drive_control_operations"."session_hash" is not null and length(cast("drive_control_operations"."session_hash" as blob)) between 1 and 128 and "drive_control_operations"."auth_version" between 1 and 9007199254740991 and "drive_control_operations"."browser_hash" is not null and length(cast("drive_control_operations"."browser_hash" as blob)) between 1 and 128 and "drive_control_operations"."browser_epoch" between 1 and 9007199254740991),0)),
	CONSTRAINT "drive_control_owner" CHECK(("drive_control_operations"."owner_state" = 'none' and "drive_control_operations"."runtime_generation" is null and "drive_control_operations"."owner_token" is null) or ("drive_control_operations"."owner_state" in ('active','unknown','closed') and "drive_control_operations"."runtime_generation" is not null and length("drive_control_operations"."runtime_generation") between 1 and 128 and "drive_control_operations"."owner_token" is not null and length("drive_control_operations"."owner_token") between 1 and 128)),
	CONSTRAINT "drive_control_time" CHECK("drive_control_operations"."updated_at" >= "drive_control_operations"."created_at" and "drive_control_operations"."expires_at" > "drive_control_operations"."created_at" and ("drive_control_operations"."terminal_at" is null or ("drive_control_operations"."terminal_at" >= "drive_control_operations"."created_at" and "drive_control_operations"."terminal_at" <= "drive_control_operations"."updated_at"))),
	CONSTRAINT "drive_control_terminal" CHECK(("drive_control_operations"."phase" in ('completed','failed') and "drive_control_operations"."terminal_at" is not null) or ("drive_control_operations"."phase" not in ('completed','failed') and "drive_control_operations"."terminal_at" is null)),
	CONSTRAINT "drive_control_data" CHECK(coalesce(json_valid("drive_control_operations"."data") and length(cast("drive_control_operations"."data" as blob)) <= 65536 and json_type("drive_control_operations"."data",'$.phase') = 'text' and json_extract("drive_control_operations"."data",'$.phase') = "drive_control_operations"."phase",0)),
	CONSTRAINT "drive_control_failure" CHECK(coalesce("drive_control_operations"."phase" != 'failed' or json_extract("drive_control_operations"."data",'$.failure') in ('DRIVE_CANCELLED','DRIVE_EXPIRED','DRIVE_CONTEXT_CHANGED','DRIVE_CONNECTION_CHANGED','DRIVE_EXCHANGE_UNKNOWN','DRIVE_REFRESH_UNKNOWN','DRIVE_SCOPE_REQUIRED','DRIVE_REFRESH_REQUIRED','DRIVE_UNVERIFIED','DRIVE_PROVIDER_REJECTED','DRIVE_UNAVAILABLE','DRIVE_RATE_LIMIT','DRIVE_FOLDER_TRASHED','DRIVE_FOLDER_DENIED','DRIVE_FOLDER_UNAVAILABLE','DRIVE_FOLDER_INVALID','DRIVE_CREATE_UNKNOWN','DRIVE_CREATE_CONFLICT'),0)),
	CONSTRAINT "drive_control_bound" CHECK("drive_control_operations"."expected_epoch" >= 1 and "drive_control_operations"."expected_credential_version" >= 1 and length("drive_control_operations"."subject") between 1 and 255 and "drive_control_operations"."expires_at" = "drive_control_operations"."created_at" + case when "drive_control_operations"."kind" = 'picker' then 300000 else 600000 end),
	CONSTRAINT "drive_control_kind" CHECK(coalesce(json_extract("drive_control_operations"."data",'$.kind') = "drive_control_operations"."kind" and (
    ("drive_control_operations"."kind" = 'refresh' and "drive_control_operations"."phase" in ('queued','running','completed','failed')) or
    ("drive_control_operations"."kind" = 'picker' and "drive_control_operations"."phase" in ('queued','running','awaiting-selection','completed','failed')) or
    ("drive_control_operations"."kind" = 'folder-select' and "drive_control_operations"."phase" in ('queued','running','ready','completed','failed')) or
    ("drive_control_operations"."kind" = 'folder-create' and "drive_control_operations"."phase" in ('queued','allocating','prepared','running','reconciling','ready','completed','failed')) or
    ("drive_control_operations"."kind" = 'disconnect' and "drive_control_operations"."phase" in ('queued','completed','failed'))),0)),
	CONSTRAINT "drive_control_phase_owner" CHECK(("drive_control_operations"."phase" = 'queued' and "drive_control_operations"."owner_state" = 'none') or ("drive_control_operations"."phase" in ('running','allocating') and "drive_control_operations"."owner_state" in ('active','unknown')) or ("drive_control_operations"."phase" in ('ready','prepared','awaiting-selection') and "drive_control_operations"."owner_state" = 'closed') or ("drive_control_operations"."phase" = 'completed' and "drive_control_operations"."owner_state" in ('none','closed')) or "drive_control_operations"."phase" in ('failed','reconciling')),
	CONSTRAINT "drive_control_creation" CHECK(coalesce("drive_control_operations"."kind" != 'folder-create' or "drive_control_operations"."phase" in ('queued','allocating','failed') or (json_type("drive_control_operations"."data",'$.fileId') = 'text' and length(json_extract("drive_control_operations"."data",'$.fileId')) between 1 and 1024 and json_type("drive_control_operations"."data",'$.marker') = 'text' and length(json_extract("drive_control_operations"."data",'$.marker')) between 1 and 128 and json_type("drive_control_operations"."data",'$.sends') = 'integer' and (("drive_control_operations"."phase" = 'prepared' and json_extract("drive_control_operations"."data",'$.sends') = 0) or ("drive_control_operations"."phase" != 'prepared' and json_extract("drive_control_operations"."data",'$.sends') between 1 and 2))),0)),
	CONSTRAINT "drive_control_result" CHECK(coalesce(
    ("drive_control_operations"."phase" = 'failed') or
    ("drive_control_operations"."kind" = 'refresh' and ("drive_control_operations"."phase" != 'completed' or (json_type("drive_control_operations"."data",'$.resultCredentialVersion') = 'integer' and json_extract("drive_control_operations"."data",'$.resultCredentialVersion') > "drive_control_operations"."expected_credential_version"))) or
    ("drive_control_operations"."kind" = 'disconnect' and ("drive_control_operations"."phase" != 'completed' or (json_type("drive_control_operations"."data",'$.resultEpoch') = 'integer' and json_extract("drive_control_operations"."data",'$.resultEpoch') > "drive_control_operations"."expected_epoch"))) or
    ("drive_control_operations"."kind" = 'picker' and ("drive_control_operations"."phase" != 'awaiting-selection' or (json_type("drive_control_operations"."data",'$.ticketHash') = 'text' and length(cast(json_extract("drive_control_operations"."data",'$.ticketHash') as blob)) between 1 and 128))) or
    ("drive_control_operations"."kind" = 'folder-create') or
    ("drive_control_operations"."kind" = 'folder-select' and (
      ("drive_control_operations"."phase" in ('queued','running') and json_type("drive_control_operations"."data",'$.fileId') = 'text' and length(json_extract("drive_control_operations"."data",'$.fileId')) between 1 and 1024 and json_type("drive_control_operations"."data",'$.pickerId') = 'text' and json_type("drive_control_operations"."data",'$.resourceKeyEnvelope') in ('text','null')) or
      ("drive_control_operations"."phase" = 'ready' and json_type("drive_control_operations"."data",'$.targetId') = 'text' and length(json_extract("drive_control_operations"."data",'$.targetId')) between 1 and 1024 and json_type("drive_control_operations"."data",'$.sourceId') = 'text' and json_type("drive_control_operations"."data",'$.targetKeyEnvelope') in ('text','null')) or
      ("drive_control_operations"."phase" = 'completed' and json_type("drive_control_operations"."data",'$.folderId') = 'text' and length(json_extract("drive_control_operations"."data",'$.folderId')) between 1 and 1024))),0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `drive_control_command` ON `drive_control_operations` (`account_id`,`command_id`);--> statement-breakpoint
CREATE INDEX `drive_control_owner` ON `drive_control_operations` (`owner_state`,`account_id`);--> statement-breakpoint
CREATE INDEX `drive_control_expiry` ON `drive_control_operations` (`expires_at`,`id`);--> statement-breakpoint
CREATE INDEX `drive_control_history` ON `drive_control_operations` (`account_id`,`created_at`);
--> statement-breakpoint
CREATE TRIGGER drive_connection_update_guard BEFORE UPDATE ON drive_connections
WHEN NEW.account_id IS NOT OLD.account_id OR NEW.version != OLD.version + 1 OR NEW.updated_at < OLD.updated_at
 OR NEW.epoch < OLD.epoch OR NEW.epoch > OLD.epoch + 1
 OR NEW.credential_version < OLD.credential_version OR NEW.credential_version > OLD.credential_version + 1
 OR NEW.settings_version < OLD.settings_version OR NEW.settings_version > OLD.settings_version + 1
 OR NEW.admission_sequence < OLD.admission_sequence OR NEW.admission_sequence > OLD.admission_sequence + 1
 OR (NEW.epoch = OLD.epoch AND json_extract(NEW.credential,'$.subject') IS NOT json_extract(OLD.credential,'$.subject'))
 OR (NEW.epoch != OLD.epoch AND (NEW.credential_version != OLD.credential_version + 1 OR NEW.settings_version != OLD.settings_version + 1 OR NEW.folder IS NOT NULL OR NEW.last_used_at IS NOT NULL))
BEGIN SELECT RAISE(ABORT,'DRIVE_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_attempt_update_guard BEFORE UPDATE ON drive_authorization_attempts
WHEN NEW.id IS NOT OLD.id OR NEW.account_id IS NOT OLD.account_id OR NEW.command_id IS NOT OLD.command_id
 OR NEW.state_hash IS NOT OLD.state_hash OR NEW.nonce_hash IS NOT OLD.nonce_hash OR NEW.return_to IS NOT OLD.return_to
 OR NEW.confirmed_admission_sequence IS NOT OLD.confirmed_admission_sequence
 OR NEW.expected_epoch IS NOT OLD.expected_epoch OR NEW.expected_credential_version IS NOT OLD.expected_credential_version OR NEW.expected_settings_version IS NOT OLD.expected_settings_version
 OR NEW.created_at IS NOT OLD.created_at OR NEW.expires_at IS NOT OLD.expires_at OR NEW.version != OLD.version + 1 OR NEW.updated_at < OLD.updated_at
 OR NEW.cancel_generation < OLD.cancel_generation OR NEW.cancel_generation > OLD.cancel_generation + 1
 OR (NEW.session_hash IS NOT NULL AND (NEW.session_hash IS NOT OLD.session_hash OR NEW.auth_version IS NOT OLD.auth_version OR NEW.browser_hash IS NOT OLD.browser_hash OR NEW.browser_epoch IS NOT OLD.browser_epoch))
 OR (NEW.session_hash IS NULL AND OLD.session_hash IS NOT NULL AND (OLD.terminal_at IS NULL OR NEW.updated_at < OLD.terminal_at + 86400000 OR OLD.owner_state IN ('active','unknown')))
 OR (OLD.terminal_at IS NOT NULL AND (NEW.phase IS NOT OLD.phase OR NEW.data IS NOT OLD.data OR NEW.terminal_at IS NOT OLD.terminal_at))
 OR (OLD.owner_state IN ('active','unknown') AND (NEW.runtime_generation IS NOT OLD.runtime_generation OR NEW.owner_token IS NOT OLD.owner_token OR NEW.owner_state NOT IN ('active','unknown','closed')))
 OR (OLD.owner_state = 'unknown' AND NEW.owner_state = 'active')
 OR (OLD.owner_state = 'closed' AND NOT ((NEW.owner_state = 'closed' AND NEW.runtime_generation IS OLD.runtime_generation AND NEW.owner_token IS OLD.owner_token) OR (NEW.owner_state = 'active' AND (NEW.runtime_generation IS NOT OLD.runtime_generation OR NEW.owner_token IS NOT OLD.owner_token))))
 OR (NEW.cancel_generation > 0 AND NEW.phase != OLD.phase AND NEW.phase != 'failed')
BEGIN SELECT RAISE(ABORT,'DRIVE_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_control_update_guard BEFORE UPDATE ON drive_control_operations
WHEN NEW.id IS NOT OLD.id OR NEW.account_id IS NOT OLD.account_id OR NEW.command_id IS NOT OLD.command_id
 OR NEW.subject IS NOT OLD.subject OR NEW.kind IS NOT OLD.kind
 OR NEW.expected_epoch IS NOT OLD.expected_epoch OR NEW.expected_credential_version IS NOT OLD.expected_credential_version OR NEW.expected_settings_version IS NOT OLD.expected_settings_version
 OR NEW.created_at IS NOT OLD.created_at OR NEW.expires_at IS NOT OLD.expires_at OR NEW.version != OLD.version + 1 OR NEW.updated_at < OLD.updated_at
 OR NEW.cancel_generation < OLD.cancel_generation OR NEW.cancel_generation > OLD.cancel_generation + 1
 OR (NEW.session_hash IS NOT NULL AND (NEW.session_hash IS NOT OLD.session_hash OR NEW.auth_version IS NOT OLD.auth_version OR NEW.browser_hash IS NOT OLD.browser_hash OR NEW.browser_epoch IS NOT OLD.browser_epoch))
 OR (NEW.session_hash IS NULL AND OLD.session_hash IS NOT NULL AND (OLD.terminal_at IS NULL OR NEW.updated_at < OLD.terminal_at + 86400000 OR OLD.owner_state IN ('active','unknown')))
 OR (OLD.terminal_at IS NOT NULL AND (NEW.phase IS NOT OLD.phase OR NEW.data IS NOT OLD.data OR NEW.terminal_at IS NOT OLD.terminal_at))
 OR (OLD.owner_state IN ('active','unknown') AND (NEW.runtime_generation IS NOT OLD.runtime_generation OR NEW.owner_token IS NOT OLD.owner_token OR NEW.owner_state NOT IN ('active','unknown','closed')))
 OR (OLD.owner_state = 'unknown' AND NEW.owner_state = 'active')
 OR (OLD.owner_state = 'closed' AND NOT ((NEW.owner_state = 'closed' AND NEW.runtime_generation IS OLD.runtime_generation AND NEW.owner_token IS OLD.owner_token) OR (NEW.owner_state = 'active' AND (NEW.runtime_generation IS NOT OLD.runtime_generation OR NEW.owner_token IS NOT OLD.owner_token))))
 OR (NEW.cancel_generation > 0 AND NEW.phase != OLD.phase AND NEW.phase != 'failed')
 OR (OLD.kind = 'folder-create' AND json_type(OLD.data,'$.fileId') = 'text' AND (
   coalesce(json_extract(NEW.data,'$.fileId'),json_extract(NEW.data,'$.identity.fileId')) IS NOT json_extract(OLD.data,'$.fileId') OR
   coalesce(json_extract(NEW.data,'$.marker'),json_extract(NEW.data,'$.identity.marker')) IS NOT json_extract(OLD.data,'$.marker') OR
   coalesce(json_extract(NEW.data,'$.sends'),json_extract(NEW.data,'$.identity.sends')) NOT BETWEEN json_extract(OLD.data,'$.sends') AND json_extract(OLD.data,'$.sends') + 1))
BEGIN SELECT RAISE(ABORT,'DRIVE_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_attempt_delete_owner_guard BEFORE DELETE ON drive_authorization_attempts
WHEN OLD.owner_state IN ('active','unknown') BEGIN SELECT RAISE(ABORT,'DRIVE_OWNER_ACTIVE'); END;
--> statement-breakpoint
CREATE TABLE __drive_fk_assertion(valid INTEGER NOT NULL CHECK(valid=1));
--> statement-breakpoint
INSERT INTO __drive_fk_assertion SELECT CASE WHEN EXISTS(SELECT 1 FROM pragma_foreign_key_check) THEN 0 ELSE 1 END;
--> statement-breakpoint
DROP TABLE __drive_fk_assertion;
--> statement-breakpoint
CREATE TRIGGER drive_control_delete_owner_guard BEFORE DELETE ON drive_control_operations
WHEN OLD.owner_state IN ('active','unknown') BEGIN SELECT RAISE(ABORT,'DRIVE_OWNER_ACTIVE'); END;
