CREATE TABLE `note_batch_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`note_id` text NOT NULL,
	`title` text NOT NULL,
	`retry_of` text,
	`generation` integer NOT NULL,
	`attempt_number` integer NOT NULL,
	`expected` text,
	`base_sequence` integer NOT NULL,
	`state` text NOT NULL,
	`lease_token` text,
	`lease_until` integer,
	`failure` text,
	`result` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `note_batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `batch_attempt_pending` ON `note_batch_attempts` (`state`,`parent_id`,`generation`,`ordinal`);--> statement-breakpoint
CREATE INDEX `batch_attempt_note` ON `note_batch_attempts` (`note_id`,`state`);--> statement-breakpoint
CREATE INDEX `batch_attempt_target` ON `note_batch_attempts` (`parent_id`,`ordinal`,`created_at`);--> statement-breakpoint
CREATE TABLE `note_batch_move_receipts` (
	`parent_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`attempt_id` text NOT NULL,
	`bundle_id` text NOT NULL,
	`source` text NOT NULL,
	`destination` text NOT NULL,
	`before` text NOT NULL,
	`after` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`parent_id`, `sequence`),
	FOREIGN KEY (`parent_id`) REFERENCES `note_batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `batch_receipt_attempt` ON `note_batch_move_receipts` (`attempt_id`);--> statement-breakpoint
CREATE INDEX `batch_receipt_bundle` ON `note_batch_move_receipts` (`parent_id`,`bundle_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `note_batch_targets` (
	`parent_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`note_id` text NOT NULL,
	`latest_attempt_id` text NOT NULL,
	PRIMARY KEY(`parent_id`, `ordinal`),
	FOREIGN KEY (`parent_id`) REFERENCES `note_batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `batch_target_note` ON `note_batch_targets` (`parent_id`,`note_id`);--> statement-breakpoint
CREATE INDEX `batch_target_note_lookup` ON `note_batch_targets` (`note_id`);--> statement-breakpoint
CREATE INDEX `batch_target_latest` ON `note_batch_targets` (`latest_attempt_id`);--> statement-breakpoint
CREATE TABLE `note_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`request_id` text NOT NULL,
	`digest` text NOT NULL,
	`source` text NOT NULL,
	`source_workspace_id` text,
	`destination_workspace_id` text,
	`operation` text NOT NULL,
	`binding` text,
	`retry_digest` text,
	`total` integer NOT NULL,
	`excluded` integer NOT NULL,
	`generation` integer NOT NULL,
	`cancel_requested` integer DEFAULT 0 NOT NULL,
	`last_sequence` integer DEFAULT 0 NOT NULL,
	`pruned_through` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `batch_request` ON `note_batches` (`actor_id`,`request_id`);--> statement-breakpoint
CREATE INDEX `batch_history` ON `note_batches` (`actor_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `batch_source_actor` ON `note_batches` (`source_workspace_id`,`actor_id`);--> statement-breakpoint
CREATE INDEX `batch_destination_actor` ON `note_batches` (`destination_workspace_id`,`actor_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX batch_single_running ON note_batch_attempts(parent_id) WHERE state='running';
--> statement-breakpoint
CREATE TRIGGER batch_header_insert_guard BEFORE INSERT ON note_batches
WHEN NEW.total<1 OR NEW.total>500 OR NEW.excluded<0 OR NEW.total+NEW.excluded>500 OR NEW.generation<1 OR NEW.generation>9007199254740991 OR NEW.last_sequence<0 OR NEW.last_sequence>500 OR NEW.pruned_through<0 OR NEW.pruned_through>NEW.last_sequence
BEGIN SELECT RAISE(ABORT,'invalid batch header'); END;
--> statement-breakpoint
CREATE TRIGGER batch_header_update_guard BEFORE UPDATE ON note_batches
WHEN NEW.total!=OLD.total OR NEW.excluded!=OLD.excluded OR NEW.actor_id!=OLD.actor_id OR NEW.request_id!=OLD.request_id OR NEW.digest!=OLD.digest OR NEW.source!=OLD.source OR NEW.operation!=OLD.operation OR (OLD.binding IS NOT NULL AND NEW.binding IS NOT OLD.binding) OR NEW.generation<OLD.generation OR NEW.generation>9007199254740991 OR NEW.last_sequence<OLD.last_sequence OR NEW.last_sequence>500 OR NEW.pruned_through<OLD.pruned_through OR NEW.pruned_through>NEW.last_sequence
BEGIN SELECT RAISE(ABORT,'invalid batch update'); END;
--> statement-breakpoint
CREATE TRIGGER batch_attempt_number_guard BEFORE INSERT ON note_batch_attempts
WHEN NEW.attempt_number<1 OR NEW.attempt_number>9007199254740991
BEGIN SELECT RAISE(ABORT,'invalid batch attempt number'); END;
--> statement-breakpoint
CREATE TRIGGER batch_attempt_number_update_guard BEFORE UPDATE ON note_batch_attempts
WHEN NEW.attempt_number!=OLD.attempt_number
BEGIN SELECT RAISE(ABORT,'invalid batch attempt number update'); END;
--> statement-breakpoint
CREATE TRIGGER batch_attempt_insert_guard BEFORE INSERT ON note_batch_attempts
WHEN NEW.ordinal<0 OR NEW.ordinal>=500 OR NEW.generation<1 OR NEW.generation>9007199254740991 OR NEW.base_sequence<0 OR NEW.base_sequence>500 OR NEW.state NOT IN ('queued','running','succeeded','failed','cancelled') OR (NEW.state='running')!=(NEW.lease_token IS NOT NULL AND NEW.lease_until IS NOT NULL) OR (NEW.state='succeeded')!=(NEW.result IS NOT NULL) OR (NEW.state='failed')!=(NEW.failure IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'invalid batch attempt'); END;
--> statement-breakpoint
CREATE TRIGGER batch_attempt_update_guard BEFORE UPDATE ON note_batch_attempts
WHEN NEW.parent_id!=OLD.parent_id OR NEW.ordinal!=OLD.ordinal OR NEW.note_id!=OLD.note_id OR NEW.generation!=OLD.generation OR NEW.retry_of IS NOT OLD.retry_of OR NEW.expected IS NOT OLD.expected OR NEW.base_sequence!=OLD.base_sequence OR (OLD.state IN ('succeeded','failed','cancelled') AND NEW.state!=OLD.state) OR NEW.state NOT IN ('queued','running','succeeded','failed','cancelled') OR (NEW.state='running')!=(NEW.lease_token IS NOT NULL AND NEW.lease_until IS NOT NULL) OR (NEW.state='succeeded')!=(NEW.result IS NOT NULL) OR (NEW.state='failed')!=(NEW.failure IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'invalid batch attempt update'); END;
--> statement-breakpoint
CREATE TRIGGER batch_receipt_insert_guard BEFORE INSERT ON note_batch_move_receipts
WHEN NEW.sequence<1 OR NEW.sequence>500 OR NOT EXISTS(SELECT 1 FROM note_batches WHERE id=NEW.parent_id AND last_sequence=NEW.sequence)
BEGIN SELECT RAISE(ABORT,'invalid batch receipt'); END;
