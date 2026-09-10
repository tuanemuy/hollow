CREATE TABLE `_occ_guard` (
	`n` integer NOT NULL,
	CONSTRAINT "occ_guard_positive" CHECK("_occ_guard"."n" > 0)
);
--> statement-breakpoint
CREATE TABLE `outbox_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`aggregate_id` text NOT NULL,
	`payload` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`processed_at` integer,
	`created_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`next_attempt_at` integer,
	`failed_at` integer,
	`claimed_at` integer,
	`claimed_by` text
);
--> statement-breakpoint
CREATE INDEX `idx_outbox_pending` ON `outbox_events` (`next_attempt_at`,`created_at`,`id`) WHERE processed_at IS NULL AND failed_at IS NULL;--> statement-breakpoint
CREATE TABLE `processed_events` (
	`id` text PRIMARY KEY NOT NULL,
	`processed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `todos` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_todos_created_id` ON `todos` ("created_at" desc,"id" desc);--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`verified_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_email_unique` ON `accounts` (`email`);--> statement-breakpoint
CREATE TABLE `auth_throttles` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`blocked_until` integer NOT NULL,
	`last_attempt_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `email_verifications` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`browser_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_account_id` text,
	`owner_workspace_id` text,
	`title` text NOT NULL,
	`html` text NOT NULL,
	`version` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "notes_one_owner" CHECK(("notes"."owner_account_id" IS NOT NULL) != ("notes"."owner_workspace_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX `idx_notes_personal_updated` ON `notes` (`owner_account_id`,`updated_at`,`id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_account` ON `sessions` (`account_id`);