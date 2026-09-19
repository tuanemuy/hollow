CREATE TABLE `account_display_names` (
	`account_id` text PRIMARY KEY NOT NULL,
	`display_name` text,
	`version` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `note_sharing` (
	`note_id` text PRIMARY KEY NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`link_generation` integer DEFAULT 0 NOT NULL,
	`token_hash` text,
	`token_envelope` text,
	`password_hash` text,
	`grant_epoch` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "note_sharing_versions" CHECK("note_sharing"."version">=0 and "note_sharing"."link_generation">=0 and "note_sharing"."grant_epoch">=0),
	CONSTRAINT "note_sharing_token_fields" CHECK(("note_sharing"."link_generation"=0 and "note_sharing"."token_hash" is null and "note_sharing"."token_envelope" is null and "note_sharing"."password_hash" is null and "note_sharing"."visibility"='private') or ("note_sharing"."link_generation">0 and "note_sharing"."token_hash" is not null and "note_sharing"."token_envelope" is not null)),
	CONSTRAINT "note_sharing_public_password" CHECK("note_sharing"."visibility"!='public' or "note_sharing"."password_hash" is null)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `note_sharing_token` ON `note_sharing` (`token_hash`);--> statement-breakpoint
CREATE TABLE `share_grants` (
	`note_id` text NOT NULL,
	`browser_hash` text NOT NULL,
	`link_generation` integer NOT NULL,
	`grant_epoch` integer NOT NULL,
	`verified_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`note_id`, `browser_hash`),
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `share_grant_expiry` ON `share_grants` (`expires_at`);--> statement-breakpoint
CREATE TABLE `share_password_rates` (
	`note_id` text NOT NULL,
	`kind` text NOT NULL,
	`subject_hash` text NOT NULL,
	`window_start` integer NOT NULL,
	`attempts` integer NOT NULL,
	`blocked_until` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`note_id`, `kind`, `subject_hash`),
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `share_rate_prune` ON `share_password_rates` (`updated_at`);
--> statement-breakpoint
INSERT INTO note_sharing(note_id) SELECT id FROM notes;
--> statement-breakpoint
CREATE TRIGGER note_sharing_initialize AFTER INSERT ON notes BEGIN
  INSERT INTO note_sharing(note_id) VALUES (NEW.id);
END;
--> statement-breakpoint
CREATE TRIGGER note_sharing_required BEFORE DELETE ON note_sharing
WHEN EXISTS(SELECT 1 FROM notes WHERE id=OLD.note_id) BEGIN
  SELECT RAISE(ABORT, 'note_sharing_required');
END;
