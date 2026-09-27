CREATE TABLE `account_auth_challenges` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`purpose` text NOT NULL,
	`account_id` text NOT NULL,
	`auth_version` integer NOT NULL,
	`email` text NOT NULL,
	`generation` integer NOT NULL,
	`attempt_id` text,
	`subject` text,
	`browser_hash` text,
	`browser_epoch` integer,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`attempt_id`) REFERENCES `google_auth_attempts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "auth_challenge_binding" CHECK(("account_auth_challenges"."purpose" = 'reset' and "account_auth_challenges"."attempt_id" is null and "account_auth_challenges"."subject" is null and "account_auth_challenges"."browser_hash" is null and "account_auth_challenges"."browser_epoch" is null) or ("account_auth_challenges"."purpose" = 'google-link' and "account_auth_challenges"."attempt_id" is not null and "account_auth_challenges"."subject" is not null and "account_auth_challenges"."browser_hash" is not null and "account_auth_challenges"."browser_epoch" >= 1)),
	CONSTRAINT "auth_challenge_time" CHECK("account_auth_challenges"."expires_at" > "account_auth_challenges"."created_at" and "account_auth_challenges"."expires_at" <= "account_auth_challenges"."created_at" + case when "account_auth_challenges"."purpose" = 'reset' then 3600000 else 600000 end)
);
--> statement-breakpoint
CREATE INDEX `auth_challenge_account` ON `account_auth_challenges` (`purpose`,`account_id`,`expires_at`);--> statement-breakpoint
CREATE INDEX `auth_challenge_expiry` ON `account_auth_challenges` (`expires_at`,`token_hash`);--> statement-breakpoint
CREATE TABLE `auth_browser_contexts` (
	`browser_hash` text PRIMARY KEY NOT NULL,
	`epoch` integer NOT NULL,
	`retain_until` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "auth_browser_epoch" CHECK("auth_browser_contexts"."epoch" between 1 and 9007199254740991)
);
--> statement-breakpoint
CREATE INDEX `auth_browser_retention` ON `auth_browser_contexts` (`retain_until`,`browser_hash`);--> statement-breakpoint
CREATE TABLE `google_auth_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`state_hash` text NOT NULL,
	`nonce_hash` text NOT NULL,
	`mode` text NOT NULL,
	`browser_hash` text NOT NULL,
	`browser_epoch` integer NOT NULL,
	`actor_account_id` text,
	`actor_session_hash` text,
	`actor_auth_version` integer,
	`return_to` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`state` text NOT NULL,
	`version` integer NOT NULL,
	`verifier_envelope` text,
	`claims` text,
	`target_account_id` text,
	`target_auth_version` integer,
	`proof_hash` text,
	`proof_expires_at` integer,
	`result_account_id` text,
	`failure` text,
	FOREIGN KEY (`browser_hash`) REFERENCES `auth_browser_contexts`(`browser_hash`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`actor_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`target_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`result_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "google_attempt_actor" CHECK(("google_auth_attempts"."actor_account_id" is null and "google_auth_attempts"."actor_session_hash" is null and "google_auth_attempts"."actor_auth_version" is null and "google_auth_attempts"."mode" = 'login') or ("google_auth_attempts"."actor_account_id" is not null and "google_auth_attempts"."actor_session_hash" is not null and "google_auth_attempts"."actor_auth_version" >= 1)),
	CONSTRAINT "google_attempt_time" CHECK("google_auth_attempts"."expires_at" > "google_auth_attempts"."created_at" and "google_auth_attempts"."expires_at" <= "google_auth_attempts"."created_at" + 600000),
	CONSTRAINT "google_attempt_version" CHECK("google_auth_attempts"."version" >= 1 and "google_auth_attempts"."browser_epoch" >= 1),
	CONSTRAINT "google_attempt_secret" CHECK(("google_auth_attempts"."state" in ('pending','exchanging') and "google_auth_attempts"."verifier_envelope" is not null and "google_auth_attempts"."claims" is null) or ("google_auth_attempts"."state" not in ('pending','exchanging') and "google_auth_attempts"."verifier_envelope" is null)),
	CONSTRAINT "google_attempt_result" CHECK(("google_auth_attempts"."state" in ('verified','proof-required','reauth-ready') and "google_auth_attempts"."claims" is not null) or ("google_auth_attempts"."state" not in ('verified','proof-required','reauth-ready') and "google_auth_attempts"."claims" is null)),
	CONSTRAINT "google_attempt_proof" CHECK(("google_auth_attempts"."state" = 'reauth-ready' and "google_auth_attempts"."mode" = 'reauth' and "google_auth_attempts"."proof_hash" is not null and "google_auth_attempts"."proof_expires_at" is not null and "google_auth_attempts"."proof_expires_at" <= "google_auth_attempts"."expires_at") or ("google_auth_attempts"."state" != 'reauth-ready' and "google_auth_attempts"."proof_hash" is null and "google_auth_attempts"."proof_expires_at" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `google_auth_attempts_state_hash_unique` ON `google_auth_attempts` (`state_hash`);--> statement-breakpoint
CREATE INDEX `google_attempt_expiry` ON `google_auth_attempts` (`state`,`expires_at`,`id`);--> statement-breakpoint
CREATE INDEX `google_attempt_browser` ON `google_auth_attempts` (`browser_hash`,`browser_epoch`);--> statement-breakpoint
CREATE INDEX `google_attempt_actor` ON `google_auth_attempts` (`actor_account_id`,`state`);--> statement-breakpoint
CREATE TABLE `google_identities` (
	`account_id` text PRIMARY KEY NOT NULL,
	`issuer` text NOT NULL,
	`subject` text NOT NULL,
	`linked_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "google_identity_issuer" CHECK("google_identities"."issuer" = 'https://accounts.google.com'),
	CONSTRAINT "google_identity_subject_size" CHECK(length("google_identities"."subject") between 1 and 255)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `google_identity_subject` ON `google_identities` (`issuer`,`subject`);--> statement-breakpoint
CREATE TABLE `__new_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`auth_version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`verified_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_accounts`("id", "email", "password_hash", "auth_version", "created_at", "verified_at") SELECT "id", "email", "password_hash", 1, "created_at", "verified_at" FROM `accounts`;--> statement-breakpoint
DROP TABLE `accounts`;--> statement-breakpoint
ALTER TABLE `__new_accounts` RENAME TO `accounts`;--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_email_unique` ON `accounts` (`email`);--> statement-breakpoint
CREATE TABLE `__new_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`browser_hash` text,
	`browser_epoch` integer,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "sessions_browser_pair" CHECK(("__new_sessions"."browser_hash" is null and "__new_sessions"."browser_epoch" is null) or ("__new_sessions"."browser_hash" is not null and "__new_sessions"."browser_epoch" >= 1))
);
--> statement-breakpoint
INSERT INTO `__new_sessions`("token_hash", "account_id", "expires_at", "browser_hash", "browser_epoch") SELECT "token_hash", "account_id", "expires_at", NULL, NULL FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
CREATE INDEX `idx_sessions_account` ON `sessions` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_browser` ON `sessions` (`browser_hash`,`browser_epoch`);
--> statement-breakpoint
CREATE TRIGGER auth_password_last_method BEFORE UPDATE OF password_hash ON accounts
WHEN NEW.password_hash IS NULL AND NOT EXISTS(SELECT 1 FROM google_identities WHERE account_id=NEW.id)
BEGIN SELECT RAISE(ABORT,'AUTH_LAST_METHOD'); END;
--> statement-breakpoint
CREATE TRIGGER auth_google_last_method BEFORE DELETE ON google_identities
WHEN EXISTS(SELECT 1 FROM accounts WHERE id=OLD.account_id AND password_hash IS NULL)
BEGIN SELECT RAISE(ABORT,'AUTH_LAST_METHOD'); END;
--> statement-breakpoint
CREATE TRIGGER auth_google_immutable BEFORE UPDATE ON google_identities
BEGIN SELECT RAISE(ABORT,'AUTH_IDENTITY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER auth_version_monotonic BEFORE UPDATE OF auth_version ON accounts
WHEN NEW.auth_version IS NULL OR NEW.auth_version<=OLD.auth_version OR NEW.auth_version>9007199254740991
BEGIN SELECT RAISE(ABORT,'AUTH_VERSION'); END;
--> statement-breakpoint
CREATE TRIGGER auth_browser_monotonic BEFORE UPDATE OF epoch ON auth_browser_contexts
WHEN NEW.epoch<=OLD.epoch
BEGIN SELECT RAISE(ABORT,'AUTH_BROWSER_EPOCH'); END;
--> statement-breakpoint
CREATE TRIGGER auth_browser_pinned BEFORE DELETE ON auth_browser_contexts
WHEN EXISTS(SELECT 1 FROM sessions WHERE browser_hash=OLD.browser_hash) OR EXISTS(SELECT 1 FROM google_auth_attempts WHERE browser_hash=OLD.browser_hash)
BEGIN SELECT RAISE(ABORT,'AUTH_BROWSER_PINNED'); END;
--> statement-breakpoint
CREATE TRIGGER auth_session_browser_insert BEFORE INSERT ON sessions
WHEN (NEW.browser_hash IS NULL) != (NEW.browser_epoch IS NULL) OR (NEW.browser_hash IS NOT NULL AND NOT EXISTS(SELECT 1 FROM auth_browser_contexts WHERE browser_hash=NEW.browser_hash AND epoch=NEW.browser_epoch))
BEGIN SELECT RAISE(ABORT,'AUTH_BROWSER_SESSION'); END;
--> statement-breakpoint
CREATE TRIGGER auth_session_browser_update BEFORE UPDATE OF browser_hash,browser_epoch ON sessions
WHEN (NEW.browser_hash IS NULL) != (NEW.browser_epoch IS NULL) OR (OLD.browser_hash IS NOT NULL AND (NEW.browser_hash IS NOT OLD.browser_hash OR NEW.browser_epoch IS NOT OLD.browser_epoch)) OR (NEW.browser_hash IS NOT NULL AND NOT EXISTS(SELECT 1 FROM auth_browser_contexts WHERE browser_hash=NEW.browser_hash AND epoch=NEW.browser_epoch))
BEGIN SELECT RAISE(ABORT,'AUTH_BROWSER_SESSION'); END;
--> statement-breakpoint
CREATE TRIGGER auth_attempt_shape_insert BEFORE INSERT ON google_auth_attempts
WHEN NOT coalesce(
 NEW.mode IN ('login','link','reauth') AND NEW.state IN ('pending','exchanging','verified','proof-required','reauth-ready','completed','failed')
 AND NEW.browser_epoch BETWEEN 1 AND 9007199254740991 AND NEW.version BETWEEN 1 AND 9007199254740991
 AND ((NEW.actor_account_id IS NULL AND NEW.actor_session_hash IS NULL AND NEW.actor_auth_version IS NULL AND NEW.mode='login') OR (NEW.actor_account_id IS NOT NULL AND NEW.actor_session_hash IS NOT NULL AND NEW.actor_auth_version IS NOT NULL AND NEW.actor_auth_version>=1))
 AND ((NEW.target_account_id IS NULL AND NEW.target_auth_version IS NULL AND NEW.state!='proof-required') OR (NEW.target_account_id IS NOT NULL AND NEW.target_auth_version IS NOT NULL AND NEW.target_auth_version>=1 AND NEW.state IN ('verified','proof-required')))
 AND ((NEW.state='completed' AND NEW.result_account_id IS NOT NULL) OR (NEW.state!='completed' AND NEW.result_account_id IS NULL))
 AND ((NEW.state='failed' AND NEW.failure IN ('AUTH_EXPIRED','AUTH_CONTEXT_CHANGED','AUTH_EXCHANGE_UNKNOWN','AUTH_PROVIDER_REJECTED','AUTH_UNVERIFIED','AUTH_CONFLICT')) OR (NEW.state!='failed' AND NEW.failure IS NULL))
 AND json_valid(NEW.return_to) AND (NEW.claims IS NULL OR json_valid(NEW.claims)),0)
BEGIN SELECT RAISE(ABORT,'AUTH_ATTEMPT_SHAPE'); END;
--> statement-breakpoint
CREATE TRIGGER auth_attempt_shape_update BEFORE UPDATE ON google_auth_attempts
WHEN NOT coalesce(
 NEW.mode IN ('login','link','reauth') AND NEW.state IN ('pending','exchanging','verified','proof-required','reauth-ready','completed','failed')
 AND NEW.browser_epoch BETWEEN 1 AND 9007199254740991 AND NEW.version BETWEEN 1 AND 9007199254740991
 AND ((NEW.actor_account_id IS NULL AND NEW.actor_session_hash IS NULL AND NEW.actor_auth_version IS NULL AND NEW.mode='login') OR (NEW.actor_account_id IS NOT NULL AND NEW.actor_session_hash IS NOT NULL AND NEW.actor_auth_version IS NOT NULL AND NEW.actor_auth_version>=1))
 AND ((NEW.target_account_id IS NULL AND NEW.target_auth_version IS NULL AND NEW.state!='proof-required') OR (NEW.target_account_id IS NOT NULL AND NEW.target_auth_version IS NOT NULL AND NEW.target_auth_version>=1 AND NEW.state IN ('verified','proof-required')))
 AND ((NEW.state='completed' AND NEW.result_account_id IS NOT NULL) OR (NEW.state!='completed' AND NEW.result_account_id IS NULL))
 AND ((NEW.state='failed' AND NEW.failure IN ('AUTH_EXPIRED','AUTH_CONTEXT_CHANGED','AUTH_EXCHANGE_UNKNOWN','AUTH_PROVIDER_REJECTED','AUTH_UNVERIFIED','AUTH_CONFLICT')) OR (NEW.state!='failed' AND NEW.failure IS NULL))
 AND json_valid(NEW.return_to) AND (NEW.claims IS NULL OR json_valid(NEW.claims)),0)
BEGIN SELECT RAISE(ABORT,'AUTH_ATTEMPT_SHAPE'); END;
--> statement-breakpoint
CREATE TRIGGER auth_attempt_immutable BEFORE UPDATE ON google_auth_attempts
WHEN NEW.id IS NOT OLD.id OR NEW.state_hash IS NOT OLD.state_hash OR NEW.nonce_hash IS NOT OLD.nonce_hash OR NEW.mode IS NOT OLD.mode OR NEW.browser_hash IS NOT OLD.browser_hash OR NEW.browser_epoch IS NOT OLD.browser_epoch OR NEW.actor_account_id IS NOT OLD.actor_account_id OR NEW.actor_session_hash IS NOT OLD.actor_session_hash OR NEW.actor_auth_version IS NOT OLD.actor_auth_version OR NEW.return_to IS NOT OLD.return_to OR NEW.created_at IS NOT OLD.created_at OR NEW.expires_at IS NOT OLD.expires_at OR NEW.version<=OLD.version OR OLD.state IN ('completed','failed')
BEGIN SELECT RAISE(ABORT,'AUTH_ATTEMPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER auth_challenge_shape_insert BEFORE INSERT ON account_auth_challenges
WHEN NOT coalesce(NEW.auth_version>=1 AND NEW.generation>=1 AND ((NEW.purpose='reset' AND NEW.attempt_id IS NULL AND NEW.subject IS NULL AND NEW.browser_hash IS NULL AND NEW.browser_epoch IS NULL) OR (NEW.purpose='google-link' AND NEW.attempt_id IS NOT NULL AND NEW.subject IS NOT NULL AND NEW.browser_hash IS NOT NULL AND NEW.browser_epoch IS NOT NULL AND NEW.browser_epoch>=1 AND EXISTS(SELECT 1 FROM google_auth_attempts a WHERE a.id=NEW.attempt_id AND a.state='proof-required' AND a.target_account_id=NEW.account_id AND a.target_auth_version=NEW.auth_version AND a.browser_hash=NEW.browser_hash AND a.browser_epoch=NEW.browser_epoch AND json_extract(a.claims,'$.subject')=NEW.subject AND NEW.expires_at<=a.expires_at))),0)
BEGIN SELECT RAISE(ABORT,'AUTH_CHALLENGE_SHAPE'); END;
--> statement-breakpoint
CREATE TRIGGER auth_challenge_immutable BEFORE UPDATE ON account_auth_challenges
WHEN NEW.token_hash IS NOT OLD.token_hash OR NEW.purpose IS NOT OLD.purpose OR NEW.account_id IS NOT OLD.account_id OR NEW.auth_version IS NOT OLD.auth_version OR NEW.email IS NOT OLD.email OR NEW.generation IS NOT OLD.generation OR NEW.attempt_id IS NOT OLD.attempt_id OR NEW.subject IS NOT OLD.subject OR NEW.browser_hash IS NOT OLD.browser_hash OR NEW.browser_epoch IS NOT OLD.browser_epoch OR NEW.created_at IS NOT OLD.created_at OR NEW.expires_at IS NOT OLD.expires_at OR OLD.consumed_at IS NOT NULL OR NEW.consumed_at IS NULL
BEGIN SELECT RAISE(ABORT,'AUTH_CHALLENGE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TEMP TABLE _auth_migration_fk_guard (violations INTEGER NOT NULL CHECK(violations=0));
--> statement-breakpoint
INSERT INTO _auth_migration_fk_guard SELECT count(*) FROM pragma_foreign_key_check;
--> statement-breakpoint
DROP TABLE _auth_migration_fk_guard;
