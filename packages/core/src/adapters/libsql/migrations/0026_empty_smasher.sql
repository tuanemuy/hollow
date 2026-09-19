CREATE TABLE `export_download_rates` (
	`note_id` text NOT NULL,
	`kind` text NOT NULL,
	`subject_hash` text NOT NULL,
	`window_start` integer NOT NULL,
	`attempts` integer NOT NULL,
	PRIMARY KEY(`note_id`, `kind`, `subject_hash`),
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "export_rate_count" CHECK(typeof("export_download_rates"."attempts")='integer' and "export_download_rates"."attempts" between 1 and 30)
);
--> statement-breakpoint
CREATE INDEX `export_rate_prune` ON `export_download_rates` (`window_start`);--> statement-breakpoint
CREATE TABLE `export_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
	`authority` text NOT NULL,
	`format` text NOT NULL,
	`source_identity` text NOT NULL,
	`storage_key` text NOT NULL,
	`reserved_bytes` integer DEFAULT 0 NOT NULL,
	`state` text NOT NULL,
	`file` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`generation` integer DEFAULT 1 NOT NULL,
	`next_cleanup_at` integer NOT NULL,
	`cleanup_token` text,
	`cleanup_until` integer,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "export_operation_bytes" CHECK(typeof("export_operations"."reserved_bytes")='integer' and "export_operations"."reserved_bytes">=0 and "export_operations"."reserved_bytes"<=9007199254740991),
	CONSTRAINT "export_operation_generation" CHECK(typeof("export_operations"."generation")='integer' and "export_operations"."generation">0 and "export_operations"."generation"<=9007199254740991),
	CONSTRAINT "export_operation_file" CHECK(("export_operations"."state"='preparing' and "export_operations"."file" is null) or ("export_operations"."state" in('ready','sending') and "export_operations"."file" is not null) or "export_operations"."state"='cleanup')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `export_operations_storage_key_unique` ON `export_operations` (`storage_key`);--> statement-breakpoint
CREATE INDEX `export_operation_note` ON `export_operations` (`note_id`,`state`);--> statement-breakpoint
CREATE INDEX `export_operation_cleanup` ON `export_operations` (`state`,`next_cleanup_at`);--> statement-breakpoint
CREATE INDEX `export_operation_expiry` ON `export_operations` (`expires_at`);