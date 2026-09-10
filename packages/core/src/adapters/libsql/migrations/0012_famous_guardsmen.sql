CREATE TABLE `workspace_members` (
	`workspace_id` text NOT NULL,
	`account_id` text NOT NULL,
	`role` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `account_id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workspace_member_account` ON `workspace_members` (`account_id`,`workspace_id`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`creator_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`slug` text,
	`created_at` integer NOT NULL,
	`state` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspaces_slug_unique` ON `workspaces` (`slug`);--> statement-breakpoint
CREATE INDEX `workspace_creator` ON `workspaces` (`creator_id`,`state`);--> statement-breakpoint
ALTER TABLE `import_batches` ADD `workspace_id` text;--> statement-breakpoint
ALTER TABLE `media_drafts` ADD `workspace_id` text;--> statement-breakpoint
ALTER TABLE `notes` ADD `creator_id` text;--> statement-breakpoint
ALTER TABLE `reference_objects` ADD `workspace_id` text;--> statement-breakpoint
ALTER TABLE `source_bundles` ADD `workspace_id` text;