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
	CONSTRAINT "notes_lifecycle_valid" CHECK(("__new_notes"."lifecycle" = 'active' AND "__new_notes"."trashed_at" IS NULL AND "__new_notes"."purge_after" IS NULL AND "__new_notes"."trash_operation_id" IS NULL) OR ("__new_notes"."lifecycle" = 'trashed' AND "__new_notes"."trashed_at" IS NOT NULL AND "__new_notes"."purge_after" IS NOT NULL AND "__new_notes"."purge_after" > "__new_notes"."trashed_at" AND "__new_notes"."trash_operation_id" IS NOT NULL))
);
--> statement-breakpoint
INSERT INTO `__new_notes`("id", "owner_account_id", "owner_workspace_id", "title", "html", "display", "version", "created_at", "updated_at") SELECT "id", "owner_account_id", "owner_workspace_id", "title", "html", "display", "version", "created_at", "updated_at" FROM `notes`;--> statement-breakpoint
DROP TABLE `notes`;--> statement-breakpoint
ALTER TABLE `__new_notes` RENAME TO `notes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_notes_trash` ON `notes` (`owner_account_id`,`lifecycle`,`trashed_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_notes_personal_updated` ON `notes` (`owner_account_id`,`updated_at`,`id`);
