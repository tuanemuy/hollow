CREATE TABLE `auth_continuations` (
	`id` text PRIMARY KEY NOT NULL,
	`browser_hash` text NOT NULL,
	`invitation_id` text NOT NULL,
	`generation` integer NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `continuation_expiry` ON `auth_continuations` (`expires_at`);--> statement-breakpoint
CREATE TABLE `invitation_history` (
	`id` text NOT NULL,
	`generation` integer NOT NULL,
	`workspace_id` text NOT NULL,
	`state` text NOT NULL,
	`issued_at` integer NOT NULL,
	`terminal_at` integer NOT NULL,
	PRIMARY KEY(`id`, `generation`)
);
--> statement-breakpoint
CREATE INDEX `invitation_history_expiry` ON `invitation_history` (`terminal_at`);--> statement-breakpoint
CREATE TABLE `invitation_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `invitation_rate_workspace` ON `invitation_rates` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `invitation_rate_actor` ON `invitation_rates` (`actor_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `invitation_receipts` (
	`actor_id` text NOT NULL,
	`request_id` text NOT NULL,
	`digest` text NOT NULL,
	`ids` text NOT NULL,
	`skipped` integer NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`actor_id`, `request_id`)
);
--> statement-breakpoint
CREATE TABLE `workspace_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`issuer_id` text NOT NULL,
	`generation` integer NOT NULL,
	`token_hash` text,
	`envelope` text,
	`state` text NOT NULL,
	`created_at` integer NOT NULL,
	`issued_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`terminal_at` integer,
	`accepted_by` text,
	`delivery_state` text NOT NULL,
	`attempts` integer NOT NULL,
	`first_attempt_at` integer,
	`next_attempt_at` integer NOT NULL,
	`lease_token` text,
	`lease_until` integer,
	`delivery_failure` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_invitations_token_hash_unique` ON `workspace_invitations` (`token_hash`);--> statement-breakpoint
CREATE INDEX `invitation_workspace` ON `workspace_invitations` (`workspace_id`,`id`);--> statement-breakpoint
CREATE INDEX `invitation_recipient` ON `workspace_invitations` (`workspace_id`,`email`);--> statement-breakpoint
CREATE INDEX `invitation_issuer` ON `workspace_invitations` (`workspace_id`,`issuer_id`,`state`);--> statement-breakpoint
CREATE INDEX `invitation_due` ON `workspace_invitations` (`state`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `invitation_expiry` ON `workspace_invitations` (`expires_at`);--> statement-breakpoint
ALTER TABLE `workspace_members` ADD `joined_at` integer;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `settings_version` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE workspace_members SET joined_at=(SELECT created_at FROM workspaces WHERE workspaces.id=workspace_members.workspace_id AND workspaces.creator_id=workspace_members.account_id) WHERE role='owner' AND EXISTS(SELECT 1 FROM workspaces WHERE workspaces.id=workspace_members.workspace_id AND workspaces.creator_id=workspace_members.account_id);
--> statement-breakpoint
CREATE INDEX conversion_actor_state_note ON conversion_jobs(account_id,state,note_id);
--> statement-breakpoint
CREATE INDEX reference_actor_state_note ON reference_jobs(account_id,state,note_id);
