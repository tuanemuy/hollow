CREATE TABLE `openrouter_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`correlation_hash` text NOT NULL,
	`account_id` text NOT NULL,
	`session_hash` text NOT NULL,
	`auth_version` integer NOT NULL,
	`browser_hash` text NOT NULL,
	`browser_epoch` integer NOT NULL,
	`expected_epoch` integer NOT NULL,
	`expected_version` integer NOT NULL,
	`return_to` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`version` integer NOT NULL,
	`state` text NOT NULL,
	`verifier_envelope` text,
	`candidate_envelope` text,
	`result_epoch` integer,
	`first_link` integer,
	`failure` text,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`browser_hash`) REFERENCES `auth_browser_contexts`(`browser_hash`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "openrouter_attempt_versions" CHECK("openrouter_attempts"."auth_version" >= 1 and "openrouter_attempts"."browser_epoch" >= 1 and "openrouter_attempts"."expected_epoch" >= 0 and "openrouter_attempts"."expected_version" >= 1 and "openrouter_attempts"."version" >= 1),
	CONSTRAINT "openrouter_attempt_time" CHECK("openrouter_attempts"."expires_at" = "openrouter_attempts"."created_at" + 600000),
	CONSTRAINT "openrouter_attempt_envelopes" CHECK(("verifier_envelope" is null or length("verifier_envelope") > 0) and ("candidate_envelope" is null or length("candidate_envelope") > 0)),
	CONSTRAINT "openrouter_attempt_shape" CHECK(("openrouter_attempts"."state" = 'pending' and "openrouter_attempts"."verifier_envelope" is not null and "openrouter_attempts"."candidate_envelope" is null and "openrouter_attempts"."result_epoch" is null and "openrouter_attempts"."first_link" is null and "openrouter_attempts"."failure" is null) or ("openrouter_attempts"."state" = 'exchanging' and "openrouter_attempts"."verifier_envelope" is null and "openrouter_attempts"."candidate_envelope" is null and "openrouter_attempts"."result_epoch" is null and "openrouter_attempts"."first_link" is null and "openrouter_attempts"."failure" is null) or ("openrouter_attempts"."state" = 'checking' and "openrouter_attempts"."verifier_envelope" is null and "openrouter_attempts"."candidate_envelope" is not null and "openrouter_attempts"."result_epoch" is null and "openrouter_attempts"."first_link" is null and "openrouter_attempts"."failure" is null) or ("openrouter_attempts"."state" = 'completed' and "openrouter_attempts"."verifier_envelope" is null and "openrouter_attempts"."candidate_envelope" is null and "openrouter_attempts"."result_epoch" is not null and "openrouter_attempts"."result_epoch" >= 1 and "openrouter_attempts"."first_link" is not null and "openrouter_attempts"."first_link" in (0,1) and "openrouter_attempts"."failure" is null) or ("openrouter_attempts"."state" = 'failed' and "openrouter_attempts"."verifier_envelope" is null and "openrouter_attempts"."candidate_envelope" is null and "openrouter_attempts"."result_epoch" is null and "openrouter_attempts"."first_link" is null and "openrouter_attempts"."failure" is not null and "openrouter_attempts"."failure" in ('OPENROUTER_EXPIRED','OPENROUTER_CONTEXT_CHANGED','OPENROUTER_EXCHANGE_UNKNOWN','OPENROUTER_PROVIDER_REJECTED','OPENROUTER_CANCELLED','OPENROUTER_CONNECTION_CHANGED')))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `openrouter_attempts_correlation_hash_unique` ON `openrouter_attempts` (`correlation_hash`);--> statement-breakpoint
CREATE INDEX `openrouter_attempt_browser` ON `openrouter_attempts` (`browser_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `openrouter_attempt_account` ON `openrouter_attempts` (`account_id`,`state`);--> statement-breakpoint
CREATE INDEX `openrouter_attempt_expiry` ON `openrouter_attempts` (`expires_at`,`id`);--> statement-breakpoint
CREATE TABLE `openrouter_connections` (
	`account_id` text PRIMARY KEY NOT NULL,
	`epoch` integer NOT NULL,
	`version` integer NOT NULL,
	`state` text NOT NULL,
	`credential_envelope` text,
	`key_expires_at` integer,
	`provider_user_id` text,
	`linked_at` integer,
	`ever_linked_at` integer,
	`last_used_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "openrouter_connection_version" CHECK("openrouter_connections"."epoch" between 0 and 9007199254740991 and "openrouter_connections"."version" between 1 and 9007199254740991),
	CONSTRAINT "openrouter_connection_shape" CHECK(("openrouter_connections"."state" = 'unlinked' and "openrouter_connections"."credential_envelope" is null and "openrouter_connections"."key_expires_at" is null and "openrouter_connections"."provider_user_id" is null and "openrouter_connections"."linked_at" is null and "openrouter_connections"."last_used_at" is null) or ("openrouter_connections"."state" in ('linked','needs_relink') and "openrouter_connections"."credential_envelope" is not null and length("openrouter_connections"."credential_envelope") > 0 and "openrouter_connections"."linked_at" is not null and "openrouter_connections"."ever_linked_at" is not null and "openrouter_connections"."epoch" >= 1))
);
--> statement-breakpoint
CREATE TABLE `openrouter_model_settings` (
	`account_id` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`defaults_version` integer NOT NULL,
	`text_model` text NOT NULL,
	`image_model` text NOT NULL,
	`audio_model` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "openrouter_models_version" CHECK("openrouter_model_settings"."version" >= 1 and "openrouter_model_settings"."defaults_version" = 1),
	CONSTRAINT "openrouter_models_ids" CHECK(length("openrouter_model_settings"."text_model") between 1 and 255 and length("openrouter_model_settings"."image_model") between 1 and 255 and length("openrouter_model_settings"."audio_model") between 1 and 255)
);
--> statement-breakpoint
CREATE TRIGGER openrouter_connection_update_guard BEFORE UPDATE ON openrouter_connections
WHEN NEW.account_id != OLD.account_id OR NEW.version != OLD.version + 1
 OR NEW.epoch NOT IN (OLD.epoch, OLD.epoch + 1)
 OR (OLD.ever_linked_at IS NOT NULL AND NEW.ever_linked_at IS NOT OLD.ever_linked_at)
 OR (NEW.epoch = OLD.epoch AND (
   NEW.credential_envelope IS NOT OLD.credential_envelope
   OR NEW.linked_at IS NOT OLD.linked_at
   OR NEW.provider_user_id IS NOT OLD.provider_user_id
   OR NEW.key_expires_at IS NOT OLD.key_expires_at
   OR (NEW.state != OLD.state AND NOT (OLD.state = 'linked' AND NEW.state = 'needs_relink'))
 ))
 OR (NEW.epoch = OLD.epoch + 1 AND NEW.state = 'needs_relink')
BEGIN SELECT RAISE(ABORT, 'openrouter_connection_update_guard'); END;
--> statement-breakpoint
CREATE TRIGGER openrouter_attempt_insert_guard BEFORE INSERT ON openrouter_attempts
WHEN NEW.state != 'pending' OR NEW.version != 1
BEGIN SELECT RAISE(ABORT, 'openrouter_attempt_insert_guard'); END;
--> statement-breakpoint
CREATE TRIGGER openrouter_attempt_update_guard BEFORE UPDATE ON openrouter_attempts
WHEN NEW.id != OLD.id OR NEW.correlation_hash != OLD.correlation_hash
 OR NEW.account_id != OLD.account_id OR NEW.session_hash != OLD.session_hash
 OR NEW.auth_version != OLD.auth_version OR NEW.browser_hash != OLD.browser_hash
 OR NEW.browser_epoch != OLD.browser_epoch OR NEW.expected_epoch != OLD.expected_epoch
 OR NEW.expected_version != OLD.expected_version OR NEW.return_to != OLD.return_to
 OR NEW.created_at != OLD.created_at OR NEW.expires_at != OLD.expires_at
 OR NEW.version != OLD.version + 1
 OR NOT ((OLD.state = 'pending' AND NEW.state IN ('exchanging','failed'))
   OR (OLD.state = 'exchanging' AND NEW.state IN ('checking','failed'))
   OR (OLD.state = 'checking' AND NEW.state IN ('checking','completed','failed')))
 OR (OLD.state = 'checking' AND NEW.state = 'checking' AND NEW.candidate_envelope IS NOT OLD.candidate_envelope)
BEGIN SELECT RAISE(ABORT, 'openrouter_attempt_update_guard'); END;
--> statement-breakpoint
CREATE TRIGGER openrouter_models_update_guard BEFORE UPDATE ON openrouter_model_settings
WHEN NEW.account_id != OLD.account_id OR NEW.version != OLD.version + 1
 OR NEW.defaults_version != OLD.defaults_version
BEGIN SELECT RAISE(ABORT, 'openrouter_models_update_guard'); END;
--> statement-breakpoint
CREATE TEMP TABLE _openrouter_migration_fk_guard (violations INTEGER NOT NULL CHECK(violations=0));
--> statement-breakpoint
INSERT INTO _openrouter_migration_fk_guard SELECT count(*) FROM pragma_foreign_key_check;
--> statement-breakpoint
DROP TABLE _openrouter_migration_fk_guard;
