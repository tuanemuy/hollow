CREATE TABLE `empty_trash_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`retry_of` text,
	`purge_id` text,
	`state` text NOT NULL,
	`failure` text,
	`recovery_base` integer DEFAULT 0 NOT NULL,
	`recoveries` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `empty_trash_batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `empty_attempt_target` ON `empty_trash_attempts` (`parent_id`,`ordinal`,`created_at`);--> statement-breakpoint
CREATE INDEX `empty_attempt_purge` ON `empty_trash_attempts` (`purge_id`);--> statement-breakpoint
CREATE TABLE `empty_trash_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`phase` text NOT NULL,
	`created_at` integer NOT NULL,
	`accepted_at` integer,
	`expires_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`total` integer NOT NULL,
	`generation` integer DEFAULT 0 NOT NULL,
	`cancel_requested` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `empty_owner_history` ON `empty_trash_batches` (`account_id`,`phase`,`created_at`);--> statement-breakpoint
CREATE TABLE `empty_trash_targets` (
	`parent_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`note_id` text,
	`operation_id` text,
	`title` text NOT NULL,
	`latest_attempt_id` text,
	`closed_state` text,
	PRIMARY KEY(`parent_id`, `ordinal`),
	FOREIGN KEY (`parent_id`) REFERENCES `empty_trash_batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `empty_target_latest` ON `empty_trash_targets` (`latest_attempt_id`);--> statement-breakpoint
ALTER TABLE `note_purges` ADD `recoveries` integer DEFAULT 0 NOT NULL;