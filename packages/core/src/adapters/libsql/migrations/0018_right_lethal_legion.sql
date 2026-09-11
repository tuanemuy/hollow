CREATE TABLE `note_projections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`note_id` text NOT NULL,
	`note_version` integer NOT NULL,
	`meaning_version` text NOT NULL,
	`title_text` text NOT NULL,
	`title_key` text NOT NULL,
	`title_segments` text NOT NULL,
	`body_text` text NOT NULL,
	`body_key` text NOT NULL,
	`body_segments` text NOT NULL,
	`tokens` text NOT NULL,
	`lead_image` text,
	`media_label` text,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `note_projections_note_id_unique` ON `note_projections` (`note_id`);--> statement-breakpoint
CREATE INDEX `projection_title` ON `note_projections` (`title_key`,`note_id`);--> statement-breakpoint
CREATE TABLE `note_tags` (
	`note_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`note_id`, `tag_id`),
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `note_tag_reverse` ON `note_tags` (`tag_id`,`note_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`scope_key` text NOT NULL,
	`name` text NOT NULL,
	`normalized_key` text NOT NULL,
	`meaning_version` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag_scope_key` ON `tags` (`scope_key`,`normalized_key`);