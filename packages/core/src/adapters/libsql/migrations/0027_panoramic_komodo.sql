CREATE TABLE `account_profile_icons` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`session_hash` text NOT NULL,
	`profile_version` integer NOT NULL,
	`input_bytes` integer NOT NULL,
	`mime` text NOT NULL,
	`storage_key` text NOT NULL,
	`bytes` integer NOT NULL,
	`state` text NOT NULL,
	`sha256` text,
	`width` integer,
	`height` integer,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`failure` text,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "profile_icon_bytes" CHECK("account_profile_icons"."bytes">=0 and "account_profile_icons"."input_bytes">0 and "account_profile_icons"."profile_version">=0),
	CONSTRAINT "profile_icon_output" CHECK("account_profile_icons"."state" not in ('writing','ready') or ("account_profile_icons"."sha256" is not null and "account_profile_icons"."width" is not null and "account_profile_icons"."height" is not null and "account_profile_icons"."width">0 and "account_profile_icons"."height">0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_profile_icons_storage_key_unique` ON `account_profile_icons` (`storage_key`);--> statement-breakpoint
CREATE INDEX `profile_icon_cleanup` ON `account_profile_icons` (`state`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `profile_icon_account` ON `account_profile_icons` (`account_id`,`state`);--> statement-breakpoint
CREATE TABLE `public_discovery_rates` (
	`kind` text NOT NULL,
	`subject_hash` text NOT NULL,
	`window_start` integer NOT NULL,
	`attempts` integer NOT NULL,
	PRIMARY KEY(`kind`, `subject_hash`)
);
--> statement-breakpoint
CREATE INDEX `public_rate_expiry` ON `public_discovery_rates` (`window_start`);--> statement-breakpoint
CREATE TABLE `note_public_identities` (
	`note_id` text PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`url_generation` integer NOT NULL,
	`access_epoch` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "public_identity_versions" CHECK("note_public_identities"."url_generation"=1 and "note_public_identities"."access_epoch">=0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `note_public_identities_public_id_unique` ON `note_public_identities` (`public_id`);--> statement-breakpoint
CREATE TABLE `account_public_profiles` (
	`account_id` text PRIMARY KEY NOT NULL,
	`handle` text,
	`bio` text DEFAULT '' NOT NULL,
	`icon_id` text,
	`version` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`icon_id`) REFERENCES `account_profile_icons`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "profile_version" CHECK("account_public_profiles"."version">=0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_public_handle` ON `account_public_profiles` (`handle`);--> statement-breakpoint
CREATE TABLE `workspace_public_settings` (
	`workspace_id` text PRIMARY KEY NOT NULL,
	`page_public` integer NOT NULL,
	`version` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "workspace_public_version" CHECK("workspace_public_settings"."version">=0 and "workspace_public_settings"."page_public" in (0,1))
);
--> statement-breakpoint
CREATE TRIGGER note_public_identity_required_insert BEFORE INSERT ON note_sharing
WHEN NEW.visibility='public' AND NOT EXISTS(SELECT 1 FROM note_public_identities WHERE note_id=NEW.note_id)
BEGIN SELECT RAISE(ABORT,'Public note identity required'); END;
--> statement-breakpoint
CREATE TRIGGER note_public_identity_required_update BEFORE UPDATE OF visibility,note_id ON note_sharing
WHEN NEW.visibility='public' AND NOT EXISTS(SELECT 1 FROM note_public_identities WHERE note_id=NEW.note_id)
BEGIN SELECT RAISE(ABORT,'Public note identity required'); END;
--> statement-breakpoint
CREATE TRIGGER note_public_identity_preserve BEFORE DELETE ON note_public_identities
WHEN EXISTS(SELECT 1 FROM notes WHERE id=OLD.note_id)
BEGIN SELECT RAISE(ABORT,'Public note identity is permanent'); END;
--> statement-breakpoint
CREATE TRIGGER note_public_identity_immutable BEFORE UPDATE ON note_public_identities
WHEN NEW.note_id!=OLD.note_id OR NEW.public_id!=OLD.public_id OR NEW.url_generation!=OLD.url_generation OR NEW.created_at!=OLD.created_at OR NEW.access_epoch<OLD.access_epoch
BEGIN SELECT RAISE(ABORT,'Public note identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER profile_icon_pointer_insert BEFORE INSERT ON account_public_profiles
WHEN NEW.icon_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM account_profile_icons WHERE id=NEW.icon_id AND account_id=NEW.account_id AND state='ready')
BEGIN SELECT RAISE(ABORT,'Profile icon is not ready for this account'); END;
--> statement-breakpoint
CREATE TRIGGER profile_icon_pointer_update BEFORE UPDATE OF icon_id,account_id ON account_public_profiles
WHEN NEW.icon_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM account_profile_icons WHERE id=NEW.icon_id AND account_id=NEW.account_id AND state='ready')
BEGIN SELECT RAISE(ABORT,'Profile icon is not ready for this account'); END;
--> statement-breakpoint
CREATE TRIGGER profile_icon_ready_preserve BEFORE UPDATE ON account_profile_icons
WHEN EXISTS(SELECT 1 FROM account_public_profiles WHERE icon_id=OLD.id) AND (NEW.id!=OLD.id OR NEW.account_id!=OLD.account_id OR NEW.state!='ready' OR NEW.storage_key!=OLD.storage_key OR NEW.bytes!=OLD.bytes OR NEW.sha256 IS NOT OLD.sha256 OR NEW.width IS NOT OLD.width OR NEW.height IS NOT OLD.height)
BEGIN SELECT RAISE(ABORT,'Current profile icon must remain ready'); END;
--> statement-breakpoint
CREATE TRIGGER workspace_public_active_insert BEFORE INSERT ON workspace_public_settings
WHEN NEW.page_public=1 AND NOT EXISTS(SELECT 1 FROM workspaces WHERE id=NEW.workspace_id AND state='active' AND slug IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'Public workspace requires an active slug'); END;
--> statement-breakpoint
CREATE TRIGGER workspace_public_active_update BEFORE UPDATE ON workspace_public_settings
WHEN NEW.page_public=1 AND NOT EXISTS(SELECT 1 FROM workspaces WHERE id=NEW.workspace_id AND state='active' AND slug IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'Public workspace requires an active slug'); END;
--> statement-breakpoint
CREATE TRIGGER workspace_public_slug_required BEFORE UPDATE OF slug ON workspaces
WHEN NEW.state='active' AND NEW.slug IS NULL AND EXISTS(SELECT 1 FROM workspace_public_settings WHERE workspace_id=NEW.id AND page_public=1)
BEGIN SELECT RAISE(ABORT,'Public workspace slug cannot be cleared'); END;
