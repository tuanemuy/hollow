CREATE TABLE `companion_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`bundle_id` text NOT NULL,
	`account_id` text NOT NULL,
	`path` text NOT NULL,
	`storage_key` text NOT NULL,
	`bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	FOREIGN KEY (`bundle_id`) REFERENCES `source_bundles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companion_sources_storage_key_unique` ON `companion_sources` (`storage_key`);--> statement-breakpoint
CREATE TABLE `reference_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
	`kind` text NOT NULL,
	`url` text NOT NULL,
	`location` text NOT NULL,
	`current` integer NOT NULL,
	`state` text NOT NULL,
	`reason` text,
	`asset_id` text,
	`final_url` text,
	`bytes` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reference_entry_note` ON `reference_entries` (`note_id`,`current`);--> statement-breakpoint
CREATE TABLE `reference_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
	`account_id` text NOT NULL,
	`note_version` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`attempt` integer NOT NULL,
	`retry_of` text,
	`total` integer NOT NULL,
	`completed` integer NOT NULL,
	`cancel_requested` integer NOT NULL,
	`state` text NOT NULL,
	`lease_token` text,
	`lease_until` integer,
	`failure` text,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "reference_job_fields" CHECK(("reference_jobs"."state"='running' AND "reference_jobs"."lease_token" IS NOT NULL AND "reference_jobs"."lease_until" IS NOT NULL AND "reference_jobs"."failure" IS NULL) OR ("reference_jobs"."state"='failed' AND "reference_jobs"."lease_token" IS NULL AND "reference_jobs"."lease_until" IS NULL AND "reference_jobs"."failure" IS NOT NULL) OR ("reference_jobs"."state" IN ('queued','succeeded','cancelled') AND "reference_jobs"."lease_token" IS NULL AND "reference_jobs"."lease_until" IS NULL AND "reference_jobs"."failure" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reference_retry_once` ON `reference_jobs` (`retry_of`);--> statement-breakpoint
CREATE INDEX `reference_job_claim` ON `reference_jobs` (`state`,`lease_until`);--> statement-breakpoint
CREATE TABLE `reference_objects` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`account_id` text NOT NULL,
	`bytes` integer NOT NULL,
	`state` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reference_settings` (
	`note_id` text PRIMARY KEY NOT NULL,
	`enabled` integer NOT NULL,
	`active_job_id` text,
	`bundle_id` text,
	`source_path` text,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bundle_id`) REFERENCES `source_bundles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `source_bundles` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`enabled` integer NOT NULL,
	`sealed` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`draft_id` text,
	`source_note_id` text,
	`source_job_id` text,
	`storage_key` text NOT NULL,
	`bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`mime` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL,
	`unreferenced_at` integer,
	`committed_to_note` integer DEFAULT false NOT NULL,
	`state` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`draft_id`) REFERENCES `media_drafts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_assets`("id", "account_id", "draft_id", "source_note_id", "source_job_id", "storage_key", "bytes", "sha256", "mime", "kind", "created_at", "unreferenced_at", "committed_to_note", "state") SELECT "id", "account_id", "draft_id", NULL, NULL, "storage_key", "bytes", "sha256", "mime", "kind", "created_at", "unreferenced_at", "committed_to_note", "state" FROM `assets`;--> statement-breakpoint
DROP TABLE `assets`;--> statement-breakpoint
ALTER TABLE `__new_assets` RENAME TO `assets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `assets_storage_key_unique` ON `assets` (`storage_key`);--> statement-breakpoint
ALTER TABLE `upload_reservations` ADD `role` text DEFAULT 'note' NOT NULL;--> statement-breakpoint
ALTER TABLE `upload_reservations` ADD `source_path` text DEFAULT '' NOT NULL;
