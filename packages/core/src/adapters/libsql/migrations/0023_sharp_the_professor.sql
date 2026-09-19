CREATE TABLE `workspace_deletion_notes` (
	`intent_id` text NOT NULL,
	`note_id` text NOT NULL,
	`purge_id` text NOT NULL,
	`completed_at` integer,
	PRIMARY KEY(`intent_id`, `note_id`),
	FOREIGN KEY (`intent_id`) REFERENCES `workspace_deletions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workspace_deletion_note_purge` ON `workspace_deletion_notes` (`purge_id`);--> statement-breakpoint
CREATE TABLE `workspace_deletion_receipts` (
	`account_id` text NOT NULL,
	`request_id` text NOT NULL,
	`intent_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`accepted_at` integer NOT NULL,
	PRIMARY KEY(`account_id`, `request_id`),
	FOREIGN KEY (`intent_id`) REFERENCES `workspace_deletions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_deletion_receipts_intent_id_unique` ON `workspace_deletion_receipts` (`intent_id`);--> statement-breakpoint
CREATE INDEX `workspace_deletion_receipt_age` ON `workspace_deletion_receipts` (`accepted_at`);--> statement-breakpoint
CREATE TABLE `workspace_deletions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`state` text NOT NULL,
	`accepted_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`admission_cursor` text,
	`admission_complete` integer DEFAULT false NOT NULL,
	`total_notes` integer NOT NULL,
	`recoveries` integer DEFAULT 0 NOT NULL,
	`last_failure` text,
	`lease_token` text,
	`lease_until` integer,
	`completed_at` integer,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "workspace_deletion_state_fields" CHECK(("workspace_deletions"."state"='queued' AND "workspace_deletions"."lease_token" IS NULL AND "workspace_deletions"."lease_until" IS NULL AND "workspace_deletions"."completed_at" IS NULL) OR ("workspace_deletions"."state"='running' AND "workspace_deletions"."lease_token" IS NOT NULL AND "workspace_deletions"."lease_until" IS NOT NULL AND "workspace_deletions"."completed_at" IS NULL) OR ("workspace_deletions"."state"='succeeded' AND "workspace_deletions"."lease_token" IS NULL AND "workspace_deletions"."lease_until" IS NULL AND "workspace_deletions"."completed_at" IS NOT NULL)),
	CONSTRAINT "workspace_deletion_counts" CHECK("workspace_deletions"."total_notes">=0 AND "workspace_deletions"."recoveries">=0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_deletions_workspace_id_unique` ON `workspace_deletions` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_deletion_claim` ON `workspace_deletions` (`state`,`next_attempt_at`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_note_purges` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
	`account_id` text,
	`workspace_id` text,
	`operation_id` text NOT NULL,
	`title` text NOT NULL,
	`cause` text NOT NULL,
	`workspace_deletion_id` text,
	`state` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`lease_token` text,
	`lease_until` integer,
	`completed` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`failure` text,
	`recoveries` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "purge_manual_actor" CHECK(("__new_note_purges"."cause"='manual' AND "__new_note_purges"."account_id" IS NOT NULL AND "__new_note_purges"."workspace_deletion_id" IS NULL) OR ("__new_note_purges"."cause"='expired' AND "__new_note_purges"."workspace_deletion_id" IS NULL) OR ("__new_note_purges"."cause"='workspace-deletion' AND "__new_note_purges"."account_id" IS NULL AND "__new_note_purges"."workspace_deletion_id" IS NOT NULL AND "__new_note_purges"."workspace_id" IS NOT NULL))
);
--> statement-breakpoint
INSERT INTO `__new_note_purges`("id", "note_id", "account_id", "workspace_id", "operation_id", "title", "cause", "workspace_deletion_id", "state", "created_at", "updated_at", "next_attempt_at", "lease_token", "lease_until", "completed", "total", "failure", "recoveries") SELECT "id", "note_id", "account_id", "workspace_id", "operation_id", "title", "cause", NULL, "state", "created_at", "updated_at", "next_attempt_at", "lease_token", "lease_until", "completed", "total", "failure", "recoveries" FROM `note_purges`;--> statement-breakpoint
DROP TABLE `note_purges`;--> statement-breakpoint
ALTER TABLE `__new_note_purges` RENAME TO `note_purges`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `note_purges_note_id_unique` ON `note_purges` (`note_id`);--> statement-breakpoint
CREATE INDEX `purge_claim` ON `note_purges` (`state`,`next_attempt_at`);--> statement-breakpoint
DROP TRIGGER membership_revision_insert;--> statement-breakpoint
DROP TRIGGER membership_revision_delete;--> statement-breakpoint
DROP TRIGGER membership_revision_update;--> statement-breakpoint
CREATE TABLE `__new_workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`creator_id` text,
	`name` text,
	`description` text,
	`slug` text,
	`created_at` integer,
	`state` text NOT NULL,
	`settings_version` integer DEFAULT 0 NOT NULL,
	`membership_revision` integer DEFAULT 1 NOT NULL,
	`icon_id` text,
	CONSTRAINT "workspace_profile_state" CHECK(("__new_workspaces"."state"='active' AND "__new_workspaces"."creator_id" IS NOT NULL AND "__new_workspaces"."name" IS NOT NULL AND "__new_workspaces"."description" IS NOT NULL AND "__new_workspaces"."created_at" IS NOT NULL) OR ("__new_workspaces"."state"='deleted' AND "__new_workspaces"."creator_id" IS NULL AND "__new_workspaces"."name" IS NULL AND "__new_workspaces"."description" IS NULL AND "__new_workspaces"."created_at" IS NULL AND "__new_workspaces"."icon_id" IS NULL))
);
--> statement-breakpoint
INSERT INTO `__new_workspaces`("id", "creator_id", "name", "description", "slug", "created_at", "state", "settings_version", "membership_revision", "icon_id") SELECT "id", "creator_id", "name", "description", "slug", "created_at", "state", "settings_version", "membership_revision", "icon_id" FROM `workspaces`;--> statement-breakpoint
DROP TABLE `workspaces`;--> statement-breakpoint
ALTER TABLE `__new_workspaces` RENAME TO `workspaces`;--> statement-breakpoint
CREATE UNIQUE INDEX `workspaces_slug_unique` ON `workspaces` (`slug`);--> statement-breakpoint
CREATE INDEX `workspace_creator` ON `workspaces` (`creator_id`,`state`);--> statement-breakpoint
CREATE TRIGGER workspaces_membership_revision_insert_guard BEFORE INSERT ON workspaces
WHEN typeof(NEW.membership_revision)!='integer' OR NEW.membership_revision<1 OR NEW.membership_revision>9007199254740991
BEGIN SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW'); END;
--> statement-breakpoint
CREATE TRIGGER workspaces_membership_revision_update_guard BEFORE UPDATE OF membership_revision ON workspaces
WHEN typeof(NEW.membership_revision)!='integer' OR NEW.membership_revision<1 OR NEW.membership_revision>9007199254740991
BEGIN SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW'); END;
--> statement-breakpoint
CREATE TRIGGER membership_revision_insert AFTER INSERT ON workspace_members
BEGIN UPDATE workspaces SET membership_revision=membership_revision+1 WHERE id IN (NEW.workspace_id); END;
--> statement-breakpoint
CREATE TRIGGER membership_revision_delete AFTER DELETE ON workspace_members
BEGIN UPDATE workspaces SET membership_revision=membership_revision+1 WHERE id IN (OLD.workspace_id); END;
--> statement-breakpoint
CREATE TRIGGER membership_revision_update AFTER UPDATE OF role,workspace_id,account_id ON workspace_members
WHEN OLD.role IS NOT NEW.role OR OLD.workspace_id IS NOT NEW.workspace_id OR OLD.account_id IS NOT NEW.account_id
BEGIN UPDATE workspaces SET membership_revision=membership_revision+1 WHERE id IN (OLD.workspace_id,NEW.workspace_id); END;
