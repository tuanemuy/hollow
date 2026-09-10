CREATE TABLE `conversion_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`original_id` text NOT NULL,
	`account_id` text NOT NULL,
	`note_id` text NOT NULL,
	`note_version` integer NOT NULL,
	`use_ai` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`attempt` integer NOT NULL,
	`retry_of` text,
	`state` text NOT NULL,
	`lease_token` text,
	`lease_until` integer,
	`failure` text,
	FOREIGN KEY (`batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`original_id`) REFERENCES `originals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "conversion_job_state_fields" CHECK(("conversion_jobs"."state" = 'running' AND "conversion_jobs"."lease_token" IS NOT NULL AND "conversion_jobs"."lease_until" IS NOT NULL AND "conversion_jobs"."failure" IS NULL) OR ("conversion_jobs"."state" = 'failed' AND "conversion_jobs"."lease_token" IS NULL AND "conversion_jobs"."lease_until" IS NULL AND "conversion_jobs"."failure" IS NOT NULL) OR ("conversion_jobs"."state" IN ('queued','succeeded','cancelled') AND "conversion_jobs"."lease_token" IS NULL AND "conversion_jobs"."lease_until" IS NULL AND "conversion_jobs"."failure" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversion_job_retry_once` ON `conversion_jobs` (`retry_of`);--> statement-breakpoint
CREATE INDEX `conversion_job_claim` ON `conversion_jobs` (`state`,`lease_until`);--> statement-breakpoint
CREATE TABLE `extraction_notices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`original_id` text NOT NULL,
	`code` text NOT NULL,
	`location` text NOT NULL,
	`message` text NOT NULL,
	FOREIGN KEY (`original_id`) REFERENCES `originals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`use_ai` integer NOT NULL,
	`cancelled_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `originals` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
	`account_id` text NOT NULL,
	`name` text NOT NULL,
	`bytes` integer NOT NULL,
	`storage_key` text NOT NULL,
	`sha256` text NOT NULL,
	`format` text NOT NULL,
	`state` text NOT NULL,
	`coverage` text NOT NULL,
	`active_job_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `originals_note_id_unique` ON `originals` (`note_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `originals_storage_key_unique` ON `originals` (`storage_key`);--> statement-breakpoint
CREATE TABLE `upload_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`account_id` text NOT NULL,
	`name` text NOT NULL,
	`bytes` integer NOT NULL,
	`storage_key` text NOT NULL,
	`state` text NOT NULL,
	`failure` text,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `upload_reservations_storage_key_unique` ON `upload_reservations` (`storage_key`);