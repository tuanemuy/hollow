CREATE TABLE `zip_artifact_entries` (
	`artifact_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`target_note_id` text NOT NULL,
	`live_note_id` text,
	`source_identity` text NOT NULL,
	`external_identity` text NOT NULL,
	`profile` text NOT NULL,
	`filename` text NOT NULL,
	`bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	PRIMARY KEY(`artifact_id`, `ordinal`),
	FOREIGN KEY (`artifact_id`) REFERENCES `zip_artifacts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`live_note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "zip_artifact_entry_ordinal" CHECK("zip_artifact_entries"."ordinal" between 0 and 499),
	CONSTRAINT "zip_artifact_entry_live" CHECK("zip_artifact_entries"."live_note_id" is null or "zip_artifact_entries"."live_note_id"="zip_artifact_entries"."target_note_id"),
	CONSTRAINT "zip_artifact_entry_bytes" CHECK(typeof("zip_artifact_entries"."bytes")='integer' and "zip_artifact_entries"."bytes" between 0 and 1000000000)
);
--> statement-breakpoint
CREATE INDEX `zip_artifact_entry_live` ON `zip_artifact_entries` (`live_note_id`,`artifact_id`);--> statement-breakpoint
CREATE TABLE `zip_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`assembly_id` text NOT NULL,
	`generation` integer NOT NULL,
	`state` text NOT NULL,
	`storage_key` text,
	`file` text,
	`reserved_bytes` integer NOT NULL,
	`published_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`next_cleanup_at` integer NOT NULL,
	`cleanup_token` text,
	`cleanup_until` integer,
	FOREIGN KEY (`assembly_id`) REFERENCES `zip_assemblies`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "zip_artifact_state" CHECK("zip_artifacts"."state" in('ready','cleanup','removed')),
	CONSTRAINT "zip_artifact_storage" CHECK(("zip_artifacts"."state"='removed' and "zip_artifacts"."storage_key" is null and "zip_artifacts"."file" is null and "zip_artifacts"."reserved_bytes"=0) or ("zip_artifacts"."state" in('ready','cleanup') and "zip_artifacts"."storage_key" is not null and "zip_artifacts"."file" is not null)),
	CONSTRAINT "zip_artifact_lifetime" CHECK("zip_artifacts"."expires_at"="zip_artifacts"."published_at"+604800000),
	CONSTRAINT "zip_artifact_bytes" CHECK(typeof("zip_artifacts"."reserved_bytes")='integer' and "zip_artifacts"."reserved_bytes" between 0 and 9007199254740991),
	CONSTRAINT "zip_artifact_generation" CHECK("zip_artifacts"."generation" between 1 and 9007199254740991),
	CONSTRAINT "zip_artifact_cleanup_lease" CHECK(("zip_artifacts"."cleanup_token" is null)=("zip_artifacts"."cleanup_until" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zip_artifacts_storage_key_unique` ON `zip_artifacts` (`storage_key`);--> statement-breakpoint
CREATE INDEX `zip_artifact_cleanup` ON `zip_artifacts` (`state`,`next_cleanup_at`,`id`);--> statement-breakpoint
CREATE INDEX `zip_artifact_expiry` ON `zip_artifacts` (`expires_at`,`id`);--> statement-breakpoint
CREATE TABLE `zip_assemblies` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`generation` integer NOT NULL,
	`assembly_generation` integer NOT NULL,
	`state` text NOT NULL,
	`outcome` text,
	`ordinals` text NOT NULL,
	`seal_digest` text NOT NULL,
	`storage_key` text,
	`file` text,
	`reserved_bytes` integer NOT NULL,
	`created_at` integer NOT NULL,
	`next_cleanup_at` integer NOT NULL,
	`cleanup_token` text,
	`cleanup_until` integer,
	FOREIGN KEY (`request_id`,`generation`) REFERENCES `zip_runs`(`request_id`,`generation`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "zip_assembly_state" CHECK("zip_assemblies"."state" in('writing','closing','closed')),
	CONSTRAINT "zip_assembly_outcome" CHECK(("zip_assemblies"."state"='closed' and "zip_assemblies"."outcome" in('success','failure','excluded','cancelled')) or ("zip_assemblies"."state"!='closed' and ("zip_assemblies"."outcome" is null or "zip_assemblies"."outcome" in('failure','excluded','cancelled')))),
	CONSTRAINT "zip_assembly_storage" CHECK("zip_assemblies"."storage_key" is not null or ("zip_assemblies"."state"='closed' and "zip_assemblies"."reserved_bytes"=0)),
	CONSTRAINT "zip_assembly_bytes" CHECK(typeof("zip_assemblies"."reserved_bytes")='integer' and "zip_assemblies"."reserved_bytes" between 0 and 9007199254740991),
	CONSTRAINT "zip_assembly_generation" CHECK("zip_assemblies"."assembly_generation" between 1 and 9007199254740991),
	CONSTRAINT "zip_assembly_ordinals" CHECK(json_valid("zip_assemblies"."ordinals") and json_type("zip_assemblies"."ordinals")='array' and json_array_length("zip_assemblies"."ordinals") between 1 and 500),
	CONSTRAINT "zip_assembly_cleanup_lease" CHECK(("zip_assemblies"."cleanup_token" is null)=("zip_assemblies"."cleanup_until" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zip_assemblies_storage_key_unique` ON `zip_assemblies` (`storage_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `zip_assembly_generation` ON `zip_assemblies` (`request_id`,`generation`,`assembly_generation`);--> statement-breakpoint
CREATE UNIQUE INDEX `zip_assembly_active` ON `zip_assemblies` ((1)) WHERE "zip_assemblies"."state"!='closed';--> statement-breakpoint
CREATE INDEX `zip_assembly_cleanup` ON `zip_assemblies` (`next_cleanup_at`,`id`);--> statement-breakpoint
CREATE TABLE `zip_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`generation` integer NOT NULL,
	`ordinal` integer NOT NULL,
	`attempt_number` integer NOT NULL,
	`title` text NOT NULL,
	`expected_identity` text NOT NULL,
	`state` text NOT NULL,
	`result` text,
	`failure` text,
	`created_at` integer NOT NULL,
	`history_expires_at` integer NOT NULL,
	`version` integer NOT NULL,
	FOREIGN KEY (`request_id`,`generation`) REFERENCES `zip_runs`(`request_id`,`generation`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`request_id`,`ordinal`) REFERENCES `zip_targets`(`request_id`,`ordinal`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "zip_attempt_state" CHECK("zip_attempts"."state" in('queued','running','succeeded','failed','excluded','cancelled')),
	CONSTRAINT "zip_attempt_result" CHECK(("zip_attempts"."state"='succeeded' and "zip_attempts"."result" is not null and "zip_attempts"."failure" is null) or ("zip_attempts"."state" in('failed','excluded') and "zip_attempts"."result" is null and "zip_attempts"."failure" is not null) or ("zip_attempts"."state" in('queued','running','cancelled') and "zip_attempts"."result" is null and "zip_attempts"."failure" is null)),
	CONSTRAINT "zip_attempt_lifetime" CHECK("zip_attempts"."history_expires_at"="zip_attempts"."created_at"+7776000000),
	CONSTRAINT "zip_attempt_versions" CHECK("zip_attempts"."attempt_number" between 1 and 9007199254740991 and "zip_attempts"."version" between 1 and 9007199254740991)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zip_attempt_number` ON `zip_attempts` (`request_id`,`ordinal`,`attempt_number`);--> statement-breakpoint
CREATE INDEX `zip_attempt_work` ON `zip_attempts` (`request_id`,`generation`,`state`,`ordinal`);--> statement-breakpoint
CREATE INDEX `zip_attempt_expiry` ON `zip_attempts` (`history_expires_at`,`id`);--> statement-breakpoint
CREATE TABLE `zip_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`artifact_id` text NOT NULL,
	`artifact_generation` integer NOT NULL,
	`account_id` text NOT NULL,
	`state` text NOT NULL,
	`claim_token` text,
	`runtime_id` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`artifact_id`) REFERENCES `zip_artifacts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "zip_delivery_state" CHECK("zip_deliveries"."state" in('ready','sending','closing','closed')),
	CONSTRAINT "zip_delivery_claim" CHECK(("zip_deliveries"."state" in('ready','closed') and "zip_deliveries"."claim_token" is null and "zip_deliveries"."runtime_id" is null) or ("zip_deliveries"."state" in('sending','closing') and "zip_deliveries"."claim_token" is not null and "zip_deliveries"."runtime_id" is not null)),
	CONSTRAINT "zip_delivery_lifetime" CHECK("zip_deliveries"."expires_at">"zip_deliveries"."created_at" and "zip_deliveries"."expires_at"<="zip_deliveries"."created_at"+600000),
	CONSTRAINT "zip_delivery_generation" CHECK("zip_deliveries"."artifact_generation" between 1 and 9007199254740991)
);
--> statement-breakpoint
CREATE INDEX `zip_delivery_artifact` ON `zip_deliveries` (`artifact_id`,`state`);--> statement-breakpoint
CREATE INDEX `zip_delivery_expiry` ON `zip_deliveries` (`state`,`expires_at`,`id`);--> statement-breakpoint
CREATE TABLE `zip_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`command_id` text NOT NULL,
	`input_digest` text NOT NULL,
	`format` text NOT NULL,
	`style` text NOT NULL,
	`state` text NOT NULL,
	`generation` integer NOT NULL,
	`cancel_generation` integer NOT NULL,
	`version` integer NOT NULL,
	`retry_of` text,
	`created_at` integer NOT NULL,
	`history_expires_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "zip_request_state" CHECK("zip_requests"."state" in('active','assembling','stopping','terminal')),
	CONSTRAINT "zip_request_format" CHECK("zip_requests"."format" in('html','markdown','pdf') and "zip_requests"."style"='saved'),
	CONSTRAINT "zip_request_lifetime" CHECK("zip_requests"."history_expires_at"="zip_requests"."created_at"+7776000000),
	CONSTRAINT "zip_request_versions" CHECK("zip_requests"."generation" between 1 and 9007199254740991 and "zip_requests"."version" between 1 and 9007199254740991 and "zip_requests"."cancel_generation" between 0 and "zip_requests"."generation")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zip_request_command` ON `zip_requests` (`account_id`,`command_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `zip_request_account_active` ON `zip_requests` (`account_id`) WHERE "zip_requests"."state"!='terminal';--> statement-breakpoint
CREATE UNIQUE INDEX `zip_request_global_active` ON `zip_requests` ((1)) WHERE "zip_requests"."state"!='terminal';--> statement-breakpoint
CREATE INDEX `zip_request_history` ON `zip_requests` (`account_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `zip_request_expiry` ON `zip_requests` (`history_expires_at`,`id`);--> statement-breakpoint
CREATE TABLE `zip_runs` (
	`request_id` text NOT NULL,
	`generation` integer NOT NULL,
	`account_id` text NOT NULL,
	`command_id` text NOT NULL,
	`input_digest` text NOT NULL,
	`state` text NOT NULL,
	`failure` text,
	`lease_token` text,
	`runtime_id` text,
	`lease_until` integer,
	`deadline_at` integer NOT NULL,
	`accepted_at` integer NOT NULL,
	`history_expires_at` integer NOT NULL,
	`published_at` integer,
	`finished_at` integer,
	`artifact_id` text,
	`exclusions` text DEFAULT '[]' NOT NULL,
	`results` text,
	`version` integer NOT NULL,
	PRIMARY KEY(`request_id`, `generation`),
	FOREIGN KEY (`request_id`) REFERENCES `zip_requests`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`artifact_id`) REFERENCES `zip_artifacts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "zip_run_state" CHECK("zip_runs"."state" in('queued','running','assembling','stopping','succeeded','partial','failed','cancelled')),
	CONSTRAINT "zip_run_lifetime" CHECK("zip_runs"."history_expires_at"="zip_runs"."accepted_at"+7776000000 and "zip_runs"."deadline_at">"zip_runs"."accepted_at"),
	CONSTRAINT "zip_run_lease" CHECK(("zip_runs"."lease_token" is null)=("zip_runs"."lease_until" is null) and ("zip_runs"."lease_token" is null)=("zip_runs"."runtime_id" is null) and ("zip_runs"."state" not in('running','assembling') or "zip_runs"."lease_token" is not null) and ("zip_runs"."state" not in('queued','succeeded','partial','failed','cancelled') or "zip_runs"."lease_token" is null)),
	CONSTRAINT "zip_run_failure" CHECK(("zip_runs"."state"='failed' and "zip_runs"."failure" is not null) or ("zip_runs"."state"='stopping') or ("zip_runs"."state" not in('failed','stopping') and "zip_runs"."failure" is null)),
	CONSTRAINT "zip_run_published" CHECK("zip_runs"."state" not in('succeeded','partial') or "zip_runs"."published_at" is not null),
	CONSTRAINT "zip_run_finished" CHECK(("zip_runs"."state" in('succeeded','partial','failed','cancelled') and typeof("zip_runs"."finished_at")='integer' and "zip_runs"."finished_at" between "zip_runs"."accepted_at" and 9007199254740991) or ("zip_runs"."state" in('queued','running','assembling','stopping') and "zip_runs"."finished_at" is null)),
	CONSTRAINT "zip_run_versions" CHECK("zip_runs"."generation" between 1 and 9007199254740991 and "zip_runs"."version" between 1 and 9007199254740991)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zip_run_command` ON `zip_runs` (`account_id`,`command_id`);--> statement-breakpoint
CREATE INDEX `zip_run_claim` ON `zip_runs` (`state`,`accepted_at`,`request_id`);--> statement-breakpoint
CREATE INDEX `zip_run_expiry` ON `zip_runs` (`history_expires_at`,`request_id`,`generation`);--> statement-breakpoint
CREATE INDEX `zip_run_artifact` ON `zip_runs` (`artifact_id`);--> statement-breakpoint
CREATE TABLE `zip_spool_refs` (
	`request_id` text NOT NULL,
	`generation` integer NOT NULL,
	`ordinal` integer NOT NULL,
	`spool_id` text NOT NULL,
	`purpose` text NOT NULL,
	`retry_until` integer,
	PRIMARY KEY(`request_id`, `generation`, `ordinal`),
	FOREIGN KEY (`spool_id`) REFERENCES `zip_spools`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`request_id`,`generation`) REFERENCES `zip_runs`(`request_id`,`generation`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`request_id`,`ordinal`) REFERENCES `zip_targets`(`request_id`,`ordinal`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "zip_ref_purpose" CHECK(("zip_spool_refs"."purpose"='active' and "zip_spool_refs"."retry_until" is null) or ("zip_spool_refs"."purpose"='retry' and "zip_spool_refs"."retry_until" is not null))
);
--> statement-breakpoint
CREATE INDEX `zip_ref_spool` ON `zip_spool_refs` (`spool_id`);--> statement-breakpoint
CREATE INDEX `zip_ref_expiry` ON `zip_spool_refs` (`purpose`,`retry_until`,`request_id`,`generation`);--> statement-breakpoint
CREATE TABLE `zip_spools` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt_id` text NOT NULL,
	`format` text NOT NULL,
	`generation` integer NOT NULL,
	`storage_key` text,
	`state` text NOT NULL,
	`result` text,
	`reserved_bytes` integer NOT NULL,
	`created_at` integer NOT NULL,
	`next_cleanup_at` integer NOT NULL,
	`cleanup_token` text,
	`cleanup_until` integer,
	CONSTRAINT "zip_spool_state" CHECK("zip_spools"."state" in('writing','ready','cleanup','removed')),
	CONSTRAINT "zip_spool_format" CHECK("zip_spools"."format" in('html','markdown','pdf')),
	CONSTRAINT "zip_spool_storage" CHECK(("zip_spools"."state"='removed' and "zip_spools"."storage_key" is null and "zip_spools"."result" is null and "zip_spools"."reserved_bytes"=0) or ("zip_spools"."state"!='removed' and "zip_spools"."storage_key" is not null)),
	CONSTRAINT "zip_spool_ready" CHECK("zip_spools"."state"!='ready' or "zip_spools"."result" is not null),
	CONSTRAINT "zip_spool_writing" CHECK("zip_spools"."state"!='writing' or "zip_spools"."result" is null),
	CONSTRAINT "zip_spool_bytes" CHECK(typeof("zip_spools"."reserved_bytes")='integer' and "zip_spools"."reserved_bytes" between 0 and 9007199254740991),
	CONSTRAINT "zip_spool_generation" CHECK("zip_spools"."generation" between 1 and 9007199254740991),
	CONSTRAINT "zip_spool_cleanup_lease" CHECK(("zip_spools"."cleanup_token" is null)=("zip_spools"."cleanup_until" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zip_spools_storage_key_unique` ON `zip_spools` (`storage_key`);--> statement-breakpoint
CREATE INDEX `zip_spool_cleanup` ON `zip_spools` (`state`,`next_cleanup_at`,`id`);--> statement-breakpoint
CREATE INDEX `zip_spool_attempt` ON `zip_spools` (`attempt_id`);--> statement-breakpoint
CREATE TABLE `zip_targets` (
	`request_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`target_note_id` text NOT NULL,
	`live_note_id` text,
	`latest_attempt_number` integer NOT NULL,
	PRIMARY KEY(`request_id`, `ordinal`),
	FOREIGN KEY (`request_id`) REFERENCES `zip_requests`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`live_note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "zip_target_ordinal" CHECK("zip_targets"."ordinal" between 0 and 499 and "zip_targets"."latest_attempt_number" between 1 and 9007199254740991),
	CONSTRAINT "zip_target_live" CHECK("zip_targets"."live_note_id" is null or "zip_targets"."live_note_id"="zip_targets"."target_note_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zip_target_note` ON `zip_targets` (`request_id`,`target_note_id`);--> statement-breakpoint
CREATE INDEX `zip_target_live` ON `zip_targets` (`live_note_id`,`request_id`);
--> statement-breakpoint
CREATE TRIGGER zip_request_immutable BEFORE UPDATE ON zip_requests
WHEN NEW.account_id!=OLD.account_id OR NEW.command_id!=OLD.command_id OR NEW.input_digest!=OLD.input_digest OR NEW.format!=OLD.format OR NEW.style!=OLD.style OR NEW.created_at!=OLD.created_at OR NEW.history_expires_at!=OLD.history_expires_at
BEGIN SELECT RAISE(ABORT,'zip request identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_run_parent BEFORE INSERT ON zip_runs
WHEN NOT EXISTS(SELECT 1 FROM zip_requests q WHERE q.id=NEW.request_id AND q.account_id=NEW.account_id AND q.generation=NEW.generation AND q.state='active')
BEGIN SELECT RAISE(ABORT,'zip run parent mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER zip_run_immutable BEFORE UPDATE ON zip_runs
WHEN NEW.request_id!=OLD.request_id OR NEW.generation!=OLD.generation OR NEW.account_id!=OLD.account_id OR NEW.command_id!=OLD.command_id OR NEW.input_digest!=OLD.input_digest OR NEW.accepted_at!=OLD.accepted_at OR NEW.history_expires_at!=OLD.history_expires_at OR NEW.deadline_at!=OLD.deadline_at OR (OLD.published_at IS NOT NULL AND NEW.published_at IS NOT OLD.published_at) OR (OLD.finished_at IS NOT NULL AND NEW.finished_at IS NOT OLD.finished_at)
BEGIN SELECT RAISE(ABORT,'zip run identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_target_immutable BEFORE UPDATE ON zip_targets
WHEN NEW.request_id!=OLD.request_id OR NEW.ordinal!=OLD.ordinal OR NEW.target_note_id!=OLD.target_note_id OR NEW.latest_attempt_number<OLD.latest_attempt_number OR (OLD.live_note_id IS NULL AND NEW.live_note_id IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'zip target identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_target_live_guard BEFORE UPDATE ON zip_targets
WHEN NEW.live_note_id IS NULL AND OLD.live_note_id IS NOT NULL AND (
EXISTS(SELECT 1 FROM zip_requests q WHERE q.id=NEW.request_id AND q.state!='terminal') OR
EXISTS(SELECT 1 FROM zip_spools s JOIN zip_attempts p ON p.id=s.attempt_id WHERE p.request_id=NEW.request_id AND p.ordinal=NEW.ordinal AND s.state!='removed') OR
EXISTS(SELECT 1 FROM zip_assemblies a WHERE a.request_id=NEW.request_id AND (a.state!='closed' OR a.storage_key IS NOT NULL)) OR
EXISTS(SELECT 1 FROM zip_spool_refs f WHERE f.request_id=NEW.request_id AND f.ordinal=NEW.ordinal))
BEGIN SELECT RAISE(ABORT,'zip target still retained'); END;
--> statement-breakpoint
CREATE TRIGGER zip_attempt_immutable BEFORE UPDATE ON zip_attempts
WHEN NEW.id!=OLD.id OR NEW.request_id!=OLD.request_id OR NEW.generation!=OLD.generation OR NEW.ordinal!=OLD.ordinal OR NEW.attempt_number!=OLD.attempt_number OR NEW.created_at!=OLD.created_at OR NEW.history_expires_at!=OLD.history_expires_at OR NEW.expected_identity!=OLD.expected_identity
BEGIN SELECT RAISE(ABORT,'zip attempt identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_attempt_terminal BEFORE UPDATE ON zip_attempts
WHEN OLD.state IN('succeeded','failed','excluded','cancelled') AND (NEW.state!=OLD.state OR NEW.result IS NOT OLD.result OR NEW.failure IS NOT OLD.failure)
BEGIN SELECT RAISE(ABORT,'zip attempt result is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_ref_ready_insert BEFORE INSERT ON zip_spool_refs
WHEN NOT EXISTS(SELECT 1 FROM zip_spools s WHERE s.id=NEW.spool_id AND s.state='ready')
BEGIN SELECT RAISE(ABORT,'zip spool unavailable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_ref_ready_update BEFORE UPDATE ON zip_spool_refs
WHEN NOT EXISTS(SELECT 1 FROM zip_spools s WHERE s.id=NEW.spool_id AND s.state='ready') OR NEW.spool_id!=OLD.spool_id OR NEW.request_id!=OLD.request_id OR NEW.generation!=OLD.generation OR NEW.ordinal!=OLD.ordinal
BEGIN SELECT RAISE(ABORT,'zip spool reference mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER zip_spool_cleanup_guard BEFORE UPDATE ON zip_spools
WHEN NEW.state IN('cleanup','removed') AND EXISTS(SELECT 1 FROM zip_spool_refs r WHERE r.spool_id=NEW.id)
BEGIN SELECT RAISE(ABORT,'zip spool referenced'); END;
--> statement-breakpoint
CREATE TRIGGER zip_spool_close_guard BEFORE UPDATE ON zip_spools
WHEN NEW.state IN('ready','removed') AND EXISTS(SELECT 1 FROM object_writes w WHERE w.kind='zip-spool' AND w.owner_id=NEW.id AND w.active=1)
BEGIN SELECT RAISE(ABORT,'zip spool still owned'); END;
--> statement-breakpoint
CREATE TRIGGER zip_spool_no_resurrect BEFORE UPDATE ON zip_spools
WHEN (OLD.state='removed' AND NEW.state!='removed') OR (OLD.state='cleanup' AND NEW.state NOT IN('cleanup','removed')) OR (OLD.state='ready' AND NEW.state='writing')
BEGIN SELECT RAISE(ABORT,'zip spool state regression'); END;
--> statement-breakpoint
CREATE TRIGGER zip_assembly_close_guard BEFORE UPDATE ON zip_assemblies
WHEN NEW.state='closed' AND EXISTS(SELECT 1 FROM object_writes w WHERE w.kind='zip-assembly' AND w.owner_id=NEW.id AND w.active=1)
BEGIN SELECT RAISE(ABORT,'zip assembly still owned'); END;
--> statement-breakpoint
CREATE TRIGGER zip_assembly_immutable BEFORE UPDATE ON zip_assemblies
WHEN NEW.request_id!=OLD.request_id OR NEW.generation!=OLD.generation OR NEW.assembly_generation!=OLD.assembly_generation OR NEW.ordinals!=OLD.ordinals OR NEW.seal_digest!=OLD.seal_digest OR (OLD.state='closed' AND NEW.state!='closed')
BEGIN SELECT RAISE(ABORT,'zip assembly identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_artifact_assembly BEFORE INSERT ON zip_artifacts
WHEN NOT EXISTS(SELECT 1 FROM zip_assemblies a WHERE a.id=NEW.assembly_id AND a.state='closed' AND a.outcome='success' AND a.storage_key=NEW.storage_key AND a.file=NEW.file)
BEGIN SELECT RAISE(ABORT,'zip assembly not closed'); END;
--> statement-breakpoint
CREATE TRIGGER zip_artifact_immutable BEFORE UPDATE ON zip_artifacts
WHEN NEW.assembly_id!=OLD.assembly_id OR NEW.published_at!=OLD.published_at OR NEW.expires_at!=OLD.expires_at OR (OLD.state='removed' AND NEW.state!='removed') OR (OLD.state='cleanup' AND NEW.state='ready')
BEGIN SELECT RAISE(ABORT,'zip artifact identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_artifact_remove_guard BEFORE UPDATE ON zip_artifacts
WHEN NEW.state='removed' AND EXISTS(SELECT 1 FROM zip_deliveries d WHERE d.artifact_id=NEW.id AND d.state!='closed')
BEGIN SELECT RAISE(ABORT,'zip artifact still delivered'); END;
--> statement-breakpoint
CREATE TRIGGER zip_entry_immutable BEFORE UPDATE ON zip_artifact_entries
WHEN NEW.artifact_id!=OLD.artifact_id OR NEW.ordinal!=OLD.ordinal OR NEW.target_note_id!=OLD.target_note_id OR NEW.source_identity!=OLD.source_identity OR NEW.external_identity!=OLD.external_identity OR NEW.profile!=OLD.profile OR NEW.filename!=OLD.filename OR NEW.bytes!=OLD.bytes OR NEW.sha256!=OLD.sha256 OR (OLD.live_note_id IS NULL AND NEW.live_note_id IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'zip entry identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_entry_live_guard BEFORE UPDATE ON zip_artifact_entries
WHEN NEW.live_note_id IS NULL AND EXISTS(SELECT 1 FROM zip_artifacts a WHERE a.id=NEW.artifact_id AND a.state!='removed')
BEGIN SELECT RAISE(ABORT,'zip entry still retained'); END;
--> statement-breakpoint
CREATE TRIGGER zip_delivery_capacity BEFORE INSERT ON zip_deliveries
WHEN NEW.state!='closed' AND (SELECT count(*) FROM zip_deliveries WHERE state!='closed')>=2
BEGIN SELECT RAISE(ABORT,'zip delivery capacity'); END;
--> statement-breakpoint
CREATE TRIGGER zip_delivery_artifact BEFORE INSERT ON zip_deliveries
WHEN NEW.state!='closed' AND NOT EXISTS(SELECT 1 FROM zip_artifacts a JOIN zip_assemblies s ON s.id=a.assembly_id JOIN zip_requests q ON q.id=s.request_id WHERE a.id=NEW.artifact_id AND q.account_id=NEW.account_id AND a.state='ready' AND a.generation=NEW.artifact_generation AND NEW.expires_at<=a.expires_at)
BEGIN SELECT RAISE(ABORT,'zip delivery artifact unavailable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_delivery_immutable BEFORE UPDATE ON zip_deliveries
WHEN NEW.artifact_id!=OLD.artifact_id OR NEW.artifact_generation!=OLD.artifact_generation OR NEW.account_id!=OLD.account_id OR NEW.created_at!=OLD.created_at OR NEW.expires_at!=OLD.expires_at OR (OLD.state='closed' AND NEW.state!='closed')
BEGIN SELECT RAISE(ABORT,'zip delivery identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_delivery_close_guard BEFORE UPDATE ON zip_deliveries
WHEN NEW.state='closed' AND EXISTS(SELECT 1 FROM object_writes w WHERE w.kind='zip-delivery' AND w.owner_id=NEW.id AND w.active=1)
BEGIN SELECT RAISE(ABORT,'zip delivery still owned'); END;
--> statement-breakpoint
CREATE TRIGGER zip_request_terminal_guard BEFORE UPDATE ON zip_requests
WHEN NEW.state='terminal' AND (EXISTS(SELECT 1 FROM zip_runs r WHERE r.request_id=NEW.id AND r.state IN('queued','running','assembling','stopping')) OR EXISTS(SELECT 1 FROM zip_assemblies a WHERE a.request_id=NEW.id AND a.state!='closed') OR EXISTS(SELECT 1 FROM object_writes w JOIN zip_spools s ON w.kind='zip-spool' AND w.owner_id=s.id JOIN zip_attempts a ON a.id=s.attempt_id WHERE a.request_id=NEW.id AND w.active=1))
BEGIN SELECT RAISE(ABORT,'zip request still owned'); END;
--> statement-breakpoint
CREATE TRIGGER zip_run_publish_guard BEFORE UPDATE ON zip_runs
WHEN NEW.artifact_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM zip_artifacts a JOIN zip_assemblies s ON s.id=a.assembly_id WHERE a.id=NEW.artifact_id AND s.request_id=NEW.request_id AND s.generation=NEW.generation AND a.published_at=NEW.published_at AND EXISTS(SELECT 1 FROM zip_artifact_entries e WHERE e.artifact_id=a.id))
BEGIN SELECT RAISE(ABORT,'zip run artifact mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER zip_requests_integer_insert BEFORE INSERT ON zip_requests
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.cancel_generation)!='integer' OR NEW.cancel_generation<0 OR NEW.cancel_generation>9007199254740991 OR typeof(NEW.version)!='integer' OR NEW.version<0 OR NEW.version>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.history_expires_at)!='integer' OR NEW.history_expires_at<0 OR NEW.history_expires_at>9007199254740991 OR typeof(NEW.updated_at)!='integer' OR NEW.updated_at<0 OR NEW.updated_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_requests_integer_update BEFORE UPDATE ON zip_requests
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.cancel_generation)!='integer' OR NEW.cancel_generation<0 OR NEW.cancel_generation>9007199254740991 OR typeof(NEW.version)!='integer' OR NEW.version<0 OR NEW.version>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.history_expires_at)!='integer' OR NEW.history_expires_at<0 OR NEW.history_expires_at>9007199254740991 OR typeof(NEW.updated_at)!='integer' OR NEW.updated_at<0 OR NEW.updated_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_runs_integer_insert BEFORE INSERT ON zip_runs
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.accepted_at)!='integer' OR NEW.accepted_at<0 OR NEW.accepted_at>9007199254740991 OR typeof(NEW.history_expires_at)!='integer' OR NEW.history_expires_at<0 OR NEW.history_expires_at>9007199254740991 OR typeof(NEW.deadline_at)!='integer' OR NEW.deadline_at<0 OR NEW.deadline_at>9007199254740991 OR typeof(NEW.version)!='integer' OR NEW.version<0 OR NEW.version>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_runs_integer_update BEFORE UPDATE ON zip_runs
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.accepted_at)!='integer' OR NEW.accepted_at<0 OR NEW.accepted_at>9007199254740991 OR typeof(NEW.history_expires_at)!='integer' OR NEW.history_expires_at<0 OR NEW.history_expires_at>9007199254740991 OR typeof(NEW.deadline_at)!='integer' OR NEW.deadline_at<0 OR NEW.deadline_at>9007199254740991 OR typeof(NEW.version)!='integer' OR NEW.version<0 OR NEW.version>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_targets_integer_insert BEFORE INSERT ON zip_targets
WHEN typeof(NEW.ordinal)!='integer' OR NEW.ordinal<0 OR NEW.ordinal>9007199254740991 OR typeof(NEW.latest_attempt_number)!='integer' OR NEW.latest_attempt_number<0 OR NEW.latest_attempt_number>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_targets_integer_update BEFORE UPDATE ON zip_targets
WHEN typeof(NEW.ordinal)!='integer' OR NEW.ordinal<0 OR NEW.ordinal>9007199254740991 OR typeof(NEW.latest_attempt_number)!='integer' OR NEW.latest_attempt_number<0 OR NEW.latest_attempt_number>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_attempts_integer_insert BEFORE INSERT ON zip_attempts
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.ordinal)!='integer' OR NEW.ordinal<0 OR NEW.ordinal>9007199254740991 OR typeof(NEW.attempt_number)!='integer' OR NEW.attempt_number<0 OR NEW.attempt_number>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.history_expires_at)!='integer' OR NEW.history_expires_at<0 OR NEW.history_expires_at>9007199254740991 OR typeof(NEW.version)!='integer' OR NEW.version<0 OR NEW.version>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_attempts_integer_update BEFORE UPDATE ON zip_attempts
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.ordinal)!='integer' OR NEW.ordinal<0 OR NEW.ordinal>9007199254740991 OR typeof(NEW.attempt_number)!='integer' OR NEW.attempt_number<0 OR NEW.attempt_number>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.history_expires_at)!='integer' OR NEW.history_expires_at<0 OR NEW.history_expires_at>9007199254740991 OR typeof(NEW.version)!='integer' OR NEW.version<0 OR NEW.version>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_spools_integer_insert BEFORE INSERT ON zip_spools
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.reserved_bytes)!='integer' OR NEW.reserved_bytes<0 OR NEW.reserved_bytes>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.next_cleanup_at)!='integer' OR NEW.next_cleanup_at<0 OR NEW.next_cleanup_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_spools_integer_update BEFORE UPDATE ON zip_spools
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.reserved_bytes)!='integer' OR NEW.reserved_bytes<0 OR NEW.reserved_bytes>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.next_cleanup_at)!='integer' OR NEW.next_cleanup_at<0 OR NEW.next_cleanup_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_spool_refs_integer_insert BEFORE INSERT ON zip_spool_refs
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.ordinal)!='integer' OR NEW.ordinal<0 OR NEW.ordinal>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_spool_refs_integer_update BEFORE UPDATE ON zip_spool_refs
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.ordinal)!='integer' OR NEW.ordinal<0 OR NEW.ordinal>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_assemblies_integer_insert BEFORE INSERT ON zip_assemblies
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.assembly_generation)!='integer' OR NEW.assembly_generation<0 OR NEW.assembly_generation>9007199254740991 OR typeof(NEW.reserved_bytes)!='integer' OR NEW.reserved_bytes<0 OR NEW.reserved_bytes>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.next_cleanup_at)!='integer' OR NEW.next_cleanup_at<0 OR NEW.next_cleanup_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_assemblies_integer_update BEFORE UPDATE ON zip_assemblies
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.assembly_generation)!='integer' OR NEW.assembly_generation<0 OR NEW.assembly_generation>9007199254740991 OR typeof(NEW.reserved_bytes)!='integer' OR NEW.reserved_bytes<0 OR NEW.reserved_bytes>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.next_cleanup_at)!='integer' OR NEW.next_cleanup_at<0 OR NEW.next_cleanup_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_artifacts_integer_insert BEFORE INSERT ON zip_artifacts
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.reserved_bytes)!='integer' OR NEW.reserved_bytes<0 OR NEW.reserved_bytes>9007199254740991 OR typeof(NEW.published_at)!='integer' OR NEW.published_at<0 OR NEW.published_at>9007199254740991 OR typeof(NEW.expires_at)!='integer' OR NEW.expires_at<0 OR NEW.expires_at>9007199254740991 OR typeof(NEW.next_cleanup_at)!='integer' OR NEW.next_cleanup_at<0 OR NEW.next_cleanup_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_artifacts_integer_update BEFORE UPDATE ON zip_artifacts
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.reserved_bytes)!='integer' OR NEW.reserved_bytes<0 OR NEW.reserved_bytes>9007199254740991 OR typeof(NEW.published_at)!='integer' OR NEW.published_at<0 OR NEW.published_at>9007199254740991 OR typeof(NEW.expires_at)!='integer' OR NEW.expires_at<0 OR NEW.expires_at>9007199254740991 OR typeof(NEW.next_cleanup_at)!='integer' OR NEW.next_cleanup_at<0 OR NEW.next_cleanup_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_artifact_entries_integer_insert BEFORE INSERT ON zip_artifact_entries
WHEN typeof(NEW.ordinal)!='integer' OR NEW.ordinal<0 OR NEW.ordinal>9007199254740991 OR typeof(NEW.bytes)!='integer' OR NEW.bytes<0 OR NEW.bytes>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_artifact_entries_integer_update BEFORE UPDATE ON zip_artifact_entries
WHEN typeof(NEW.ordinal)!='integer' OR NEW.ordinal<0 OR NEW.ordinal>9007199254740991 OR typeof(NEW.bytes)!='integer' OR NEW.bytes<0 OR NEW.bytes>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_deliveries_integer_insert BEFORE INSERT ON zip_deliveries
WHEN typeof(NEW.artifact_generation)!='integer' OR NEW.artifact_generation<0 OR NEW.artifact_generation>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.expires_at)!='integer' OR NEW.expires_at<0 OR NEW.expires_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_deliveries_integer_update BEFORE UPDATE ON zip_deliveries
WHEN typeof(NEW.artifact_generation)!='integer' OR NEW.artifact_generation<0 OR NEW.artifact_generation>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.expires_at)!='integer' OR NEW.expires_at<0 OR NEW.expires_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_run_exclusions_insert BEFORE INSERT ON zip_runs
WHEN NEW.exclusions!='[]'
BEGIN SELECT RAISE(ABORT,'zip initial exclusions'); END;
--> statement-breakpoint
CREATE TRIGGER zip_run_exclusions_update BEFORE UPDATE OF exclusions ON zip_runs
WHEN NOT json_valid(NEW.exclusions) OR json_type(NEW.exclusions)!='array' OR json_array_length(NEW.exclusions)>500
 OR EXISTS(SELECT 1 FROM json_each(NEW.exclusions) e WHERE json_type(e.value) IS NOT 'object' OR (SELECT count(*) FROM json_each(e.value))!=2 OR json_type(e.value,'$.ordinal') IS NOT 'integer' OR json_type(e.value,'$.reason') IS NOT 'text' OR json_extract(e.value,'$.reason') NOT IN('ZIP_NOTE_UNAVAILABLE','ZIP_CONTENT_CHANGED','ZIP_SOURCE_CHANGED','ZIP_CANCELLED') OR NOT EXISTS(SELECT 1 FROM zip_targets t WHERE t.request_id=NEW.request_id AND t.ordinal=json_extract(e.value,'$.ordinal')))
 OR EXISTS(SELECT json_extract(value,'$.ordinal') FROM json_each(NEW.exclusions) GROUP BY json_extract(value,'$.ordinal') HAVING count(*)!=1)
 OR EXISTS(SELECT 1 FROM json_each(OLD.exclusions) old WHERE NOT EXISTS(SELECT 1 FROM json_each(NEW.exclusions) new WHERE json_extract(new.value,'$.ordinal')=json_extract(old.value,'$.ordinal') AND json_extract(new.value,'$.reason')=json_extract(old.value,'$.reason')))
BEGIN SELECT RAISE(ABORT,'zip monotonic exclusions'); END;
--> statement-breakpoint
CREATE TRIGGER zip_run_results_guard BEFORE UPDATE OF results ON zip_runs
WHEN (OLD.results IS NOT NULL AND NEW.results IS NOT OLD.results) OR (NEW.results IS NOT NULL AND (NOT json_valid(NEW.results) OR json_type(NEW.results)!='array' OR json_array_length(NEW.results)>500 OR NEW.state NOT IN('succeeded','partial','failed','cancelled')))
BEGIN SELECT RAISE(ABORT,'zip terminal results'); END;
--> statement-breakpoint
CREATE TRIGGER zip_attempt_title_scrub BEFORE UPDATE OF title ON zip_attempts
WHEN NEW.title!=OLD.title AND NEW.title!=''
BEGIN SELECT RAISE(ABORT,'zip attempt title is immutable'); END;
