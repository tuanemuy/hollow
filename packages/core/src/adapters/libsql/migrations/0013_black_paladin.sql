PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_note_purges` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
	`account_id` text,
	`workspace_id` text,
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
	`failure` text,
	`recoveries` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `purge_manual_actor` CHECK("cause" = 'expired' or "account_id" is not null)
);
--> statement-breakpoint
INSERT INTO `__new_note_purges`("id", "note_id", "account_id", "workspace_id", "operation_id", "title", "cause", "state", "created_at", "updated_at", "next_attempt_at", "lease_token", "lease_until", "completed", "total", "failure", "recoveries") SELECT "id", "note_id", "account_id", NULL, "operation_id", "title", "cause", "state", "created_at", "updated_at", "next_attempt_at", "lease_token", "lease_until", "completed", "total", "failure", "recoveries" FROM `note_purges`;--> statement-breakpoint
DROP TABLE `note_purges`;--> statement-breakpoint
ALTER TABLE `__new_note_purges` RENAME TO `note_purges`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `note_purges_note_id_unique` ON `note_purges` (`note_id`);--> statement-breakpoint
CREATE INDEX `purge_claim` ON `note_purges` (`state`,`next_attempt_at`);--> statement-breakpoint
ALTER TABLE `empty_trash_batches` ADD `workspace_id` text;
