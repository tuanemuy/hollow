CREATE TABLE `workspace_icons` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`settings_version` integer NOT NULL,
	`input_bytes` integer NOT NULL,
	`mime` text NOT NULL,
	`storage_key` text NOT NULL,
	`bytes` integer NOT NULL,
	`state` text NOT NULL,
	`sha256` text,
	`width` integer,
	`height` integer,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`next_attempt_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_icons_storage_key_unique` ON `workspace_icons` (`storage_key`);--> statement-breakpoint
CREATE INDEX `workspace_icon_cleanup` ON `workspace_icons` (`state`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `workspace_icon_actor` ON `workspace_icons` (`workspace_id`,`actor_id`,`state`);--> statement-breakpoint
ALTER TABLE `workspaces` ADD `icon_id` text;