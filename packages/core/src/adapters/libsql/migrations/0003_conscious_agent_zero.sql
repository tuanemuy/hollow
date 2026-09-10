CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`draft_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`mime` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL,
	`unreferenced_at` integer,
	`state` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`draft_id`) REFERENCES `media_drafts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_storage_key_unique` ON `assets` (`storage_key`);--> statement-breakpoint
CREATE TABLE `media_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`note_id` text,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `media_uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`draft_id` text NOT NULL,
	`account_id` text NOT NULL,
	`name` text NOT NULL,
	`bytes` integer NOT NULL,
	`state` text NOT NULL,
	`expires_at` integer NOT NULL,
	`storage_cleaned` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`draft_id`) REFERENCES `media_drafts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `note_asset_references` (
	`note_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`note_id`, `asset_id`, `version`),
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `asset_reference_pin` ON `note_asset_references` (`asset_id`);