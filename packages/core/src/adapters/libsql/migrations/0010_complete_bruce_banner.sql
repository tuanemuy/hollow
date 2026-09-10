CREATE TABLE `job_result_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`account_id` text NOT NULL,
	`batch_id` text,
	`retry_of` text,
	`name` text NOT NULL,
	`state` text NOT NULL,
	`failure` text,
	`attempt` integer NOT NULL,
	`completed` integer NOT NULL,
	`total` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `note_purges` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
	`account_id` text NOT NULL,
	`operation_id` text NOT NULL,
	`title` text NOT NULL,
	`cause` text NOT NULL,
	`state` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`lease_token` text,
	`lease_until` integer,
	`completed` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`failure` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `note_purges_note_id_unique` ON `note_purges` (`note_id`);--> statement-breakpoint
CREATE INDEX `purge_claim` ON `note_purges` (`state`,`next_attempt_at`);--> statement-breakpoint
CREATE TABLE `object_deletes` (
	`storage_key` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`writer_id` text,
	`lease_until` integer NOT NULL,
	`done` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `object_write_keys` (
	`write_id` text NOT NULL,
	`storage_key` text NOT NULL,
	PRIMARY KEY(`write_id`, `storage_key`)
);
--> statement-breakpoint
CREATE TABLE `object_writes` (
	`id` text PRIMARY KEY NOT NULL,
	`runtime` text NOT NULL,
	`kind` text NOT NULL,
	`owner_id` text NOT NULL,
	`active` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `purge_objects` (
	`purge_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`kind` text NOT NULL,
	`owner_id` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`purge_id`, `storage_key`)
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_account_id` text,
	`owner_workspace_id` text,
	`lifecycle` text DEFAULT 'active' NOT NULL,
	`trashed_at` integer,
	`purge_after` integer,
	`trash_operation_id` text,
	`title` text NOT NULL,
	`html` text NOT NULL,
	`display` text DEFAULT '{"style":"default","source":"legacy","initialization":{"kind":"complete","reason":"legacy"}}' NOT NULL,
	`version` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "notes_one_owner" CHECK(("__new_notes"."owner_account_id" IS NOT NULL) != ("__new_notes"."owner_workspace_id" IS NOT NULL)),
	CONSTRAINT "notes_lifecycle_valid" CHECK(("__new_notes"."lifecycle" = 'active' AND "__new_notes"."trashed_at" IS NULL AND "__new_notes"."purge_after" IS NULL AND "__new_notes"."trash_operation_id" IS NULL) OR ("__new_notes"."lifecycle" = 'trashed' AND "__new_notes"."trashed_at" IS NOT NULL AND "__new_notes"."purge_after" IS NOT NULL AND "__new_notes"."purge_after" > "__new_notes"."trashed_at" AND "__new_notes"."trash_operation_id" IS NOT NULL) OR ("__new_notes"."lifecycle" = 'purging' AND "__new_notes"."trashed_at" IS NULL AND "__new_notes"."purge_after" IS NULL AND "__new_notes"."trash_operation_id" IS NOT NULL))
);
--> statement-breakpoint
INSERT INTO `__new_notes`("id", "owner_account_id", "owner_workspace_id", "lifecycle", "trashed_at", "purge_after", "trash_operation_id", "title", "html", "display", "version", "created_at", "updated_at") SELECT "id", "owner_account_id", "owner_workspace_id", "lifecycle", "trashed_at", "purge_after", "trash_operation_id", "title", "html", "display", "version", "created_at", "updated_at" FROM `notes`;--> statement-breakpoint
DROP TABLE `notes`;--> statement-breakpoint
ALTER TABLE `__new_notes` RENAME TO `notes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_notes_trash` ON `notes` (`owner_account_id`,`lifecycle`,`trashed_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_notes_personal_updated` ON `notes` (`owner_account_id`,`updated_at`,`id`);