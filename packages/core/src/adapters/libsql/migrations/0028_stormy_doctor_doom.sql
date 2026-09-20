CREATE TABLE `pdf_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`target_note_id` text NOT NULL,
	`live_note_id` text,
	`compute_id` text NOT NULL,
	`source_identity` text NOT NULL,
	`profile` text NOT NULL,
	`state` text NOT NULL,
	`storage_key` text,
	`file` text,
	`published_at` integer,
	`expires_at` integer,
	`reserved_bytes` integer NOT NULL,
	`generation` integer NOT NULL,
	`next_cleanup_at` integer NOT NULL,
	`cleanup_token` text,
	`cleanup_until` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`live_note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`compute_id`) REFERENCES `pdf_computations`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "pdf_artifact_state" CHECK("pdf_artifacts"."state" in('writing','ready','cleanup','removed')),
	CONSTRAINT "pdf_artifact_live" CHECK(("pdf_artifacts"."live_note_id" is not null and "pdf_artifacts"."live_note_id"="pdf_artifacts"."target_note_id") or ("pdf_artifacts"."state"='removed' and "pdf_artifacts"."live_note_id" is null)),
	CONSTRAINT "pdf_artifact_storage" CHECK(("pdf_artifacts"."state"='removed' and "pdf_artifacts"."storage_key" is null and "pdf_artifacts"."file" is null and "pdf_artifacts"."reserved_bytes"=0) or ("pdf_artifacts"."state"!='removed' and "pdf_artifacts"."storage_key" is not null)),
	CONSTRAINT "pdf_artifact_ready" CHECK("pdf_artifacts"."state"!='ready' or ("pdf_artifacts"."file" is not null and "pdf_artifacts"."published_at" is not null and "pdf_artifacts"."expires_at" is not null and "pdf_artifacts"."expires_at"="pdf_artifacts"."published_at"+86400000)),
	CONSTRAINT "pdf_artifact_unpublished" CHECK("pdf_artifacts"."state"!='writing' or ("pdf_artifacts"."file" is null and "pdf_artifacts"."published_at" is null and "pdf_artifacts"."expires_at" is null)),
	CONSTRAINT "pdf_artifact_expiry" CHECK(("pdf_artifacts"."published_at" is null and "pdf_artifacts"."expires_at" is null) or ("pdf_artifacts"."published_at" is not null and "pdf_artifacts"."expires_at" is not null and "pdf_artifacts"."expires_at"="pdf_artifacts"."published_at"+86400000)),
	CONSTRAINT "pdf_artifact_bytes" CHECK(typeof("pdf_artifacts"."reserved_bytes")='integer' and "pdf_artifacts"."reserved_bytes" between 0 and 9007199254740991),
	CONSTRAINT "pdf_artifact_generation" CHECK(typeof("pdf_artifacts"."generation")='integer' and "pdf_artifacts"."generation" between 1 and 9007199254740991),
	CONSTRAINT "pdf_artifact_cleanup_lease" CHECK(("pdf_artifacts"."cleanup_token" is null)=("pdf_artifacts"."cleanup_until" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pdf_artifacts_storage_key_unique` ON `pdf_artifacts` (`storage_key`);--> statement-breakpoint
CREATE INDEX `pdf_artifact_cache` ON `pdf_artifacts` (`live_note_id`,`source_identity`,`profile`,`state`,`expires_at`);--> statement-breakpoint
CREATE INDEX `pdf_artifact_cleanup` ON `pdf_artifacts` (`state`,`next_cleanup_at`,`id`);--> statement-breakpoint
CREATE INDEX `pdf_artifact_compute` ON `pdf_artifacts` (`compute_id`,`id`);--> statement-breakpoint
CREATE TABLE `pdf_computations` (
	`id` text PRIMARY KEY NOT NULL,
	`target_note_id` text NOT NULL,
	`live_note_id` text,
	`source_identity` text NOT NULL,
	`profile` text NOT NULL,
	`state` text NOT NULL,
	`generation` integer NOT NULL,
	`lease_token` text,
	`lease_until` integer,
	`deadline_at` integer NOT NULL,
	`workspace_id` text NOT NULL,
	`reserved_bytes` integer NOT NULL,
	`workspace_removed` integer DEFAULT false NOT NULL,
	`next_cleanup_at` integer NOT NULL,
	`cleanup_token` text,
	`cleanup_until` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`live_note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "pdf_computation_state" CHECK("pdf_computations"."state" in('queued','running','stopping','closed')),
	CONSTRAINT "pdf_computation_lease" CHECK(("pdf_computations"."state" in('queued','closed') and "pdf_computations"."lease_token" is null and "pdf_computations"."lease_until" is null) or ("pdf_computations"."state" in('running','stopping') and "pdf_computations"."lease_token" is not null and "pdf_computations"."lease_until" is not null)),
	CONSTRAINT "pdf_computation_live" CHECK(("pdf_computations"."live_note_id" is not null and "pdf_computations"."live_note_id"="pdf_computations"."target_note_id") or ("pdf_computations"."state"='closed' and "pdf_computations"."workspace_removed"=1 and "pdf_computations"."live_note_id" is null)),
	CONSTRAINT "pdf_computation_removed" CHECK("pdf_computations"."workspace_removed" in(0,1) and ("pdf_computations"."workspace_removed"=0 or ("pdf_computations"."state"='closed' and "pdf_computations"."reserved_bytes"=0))),
	CONSTRAINT "pdf_computation_bytes" CHECK(typeof("pdf_computations"."reserved_bytes")='integer' and "pdf_computations"."reserved_bytes" between 0 and 9007199254740991),
	CONSTRAINT "pdf_computation_generation" CHECK(typeof("pdf_computations"."generation")='integer' and "pdf_computations"."generation" between 1 and 9007199254740991),
	CONSTRAINT "pdf_computation_cleanup_lease" CHECK(("pdf_computations"."cleanup_token" is null)=("pdf_computations"."cleanup_until" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pdf_computations_workspace_id_unique` ON `pdf_computations` (`workspace_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `pdf_computation_active_note` ON `pdf_computations` (`live_note_id`) WHERE "pdf_computations"."state"!='closed';--> statement-breakpoint
CREATE INDEX `pdf_computation_claim` ON `pdf_computations` (`state`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `pdf_computation_cleanup` ON `pdf_computations` (`workspace_removed`,`next_cleanup_at`,`id`);--> statement-breakpoint
CREATE TABLE `pdf_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`artifact_id` text NOT NULL,
	`account_id` text NOT NULL,
	`state` text NOT NULL,
	`generation` integer NOT NULL,
	`claim_token` text,
	`runtime_id` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`next_cleanup_at` integer NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `pdf_requests`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`artifact_id`) REFERENCES `pdf_artifacts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "pdf_delivery_state" CHECK("pdf_deliveries"."state" in('ready','sending','closing','closed')),
	CONSTRAINT "pdf_delivery_owner" CHECK(("pdf_deliveries"."state" in('ready','closed') and "pdf_deliveries"."claim_token" is null and "pdf_deliveries"."runtime_id" is null) or ("pdf_deliveries"."state" in('sending','closing') and "pdf_deliveries"."claim_token" is not null and "pdf_deliveries"."runtime_id" is not null)),
	CONSTRAINT "pdf_delivery_lifetime" CHECK("pdf_deliveries"."expires_at">"pdf_deliveries"."created_at" and "pdf_deliveries"."expires_at"<="pdf_deliveries"."created_at"+120000),
	CONSTRAINT "pdf_delivery_generation" CHECK(typeof("pdf_deliveries"."generation")='integer' and "pdf_deliveries"."generation" between 1 and 9007199254740991)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pdf_delivery_request_active` ON `pdf_deliveries` (`request_id`) WHERE "pdf_deliveries"."state"!='closed';--> statement-breakpoint
CREATE INDEX `pdf_delivery_artifact` ON `pdf_deliveries` (`artifact_id`,`state`);--> statement-breakpoint
CREATE INDEX `pdf_delivery_cleanup` ON `pdf_deliveries` (`state`,`next_cleanup_at`,`id`);--> statement-breakpoint
CREATE TABLE `pdf_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`command_id` text NOT NULL,
	`input_digest` text NOT NULL,
	`target_note_id` text NOT NULL,
	`live_note_id` text,
	`title` text NOT NULL,
	`source_identity` text NOT NULL,
	`style` text NOT NULL,
	`compute_id` text,
	`artifact_id` text,
	`state` text NOT NULL,
	`failure` text,
	`retry_of` text,
	`created_at` integer NOT NULL,
	`history_expires_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`live_note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`compute_id`) REFERENCES `pdf_computations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`artifact_id`) REFERENCES `pdf_artifacts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "pdf_request_state" CHECK("pdf_requests"."state" in('queued','running','succeeded','failed','cancelled')),
	CONSTRAINT "pdf_request_style" CHECK("pdf_requests"."style" in('default','original')),
	CONSTRAINT "pdf_request_result" CHECK(("pdf_requests"."state"='succeeded' and "pdf_requests"."artifact_id" is not null and "pdf_requests"."failure" is null) or ("pdf_requests"."state"='failed' and "pdf_requests"."artifact_id" is null and "pdf_requests"."failure" is not null) or ("pdf_requests"."state" in('queued','running','cancelled') and "pdf_requests"."artifact_id" is null and "pdf_requests"."failure" is null)),
	CONSTRAINT "pdf_request_live" CHECK(("pdf_requests"."live_note_id" is not null and "pdf_requests"."live_note_id"="pdf_requests"."target_note_id") or ("pdf_requests"."state" in('succeeded','failed','cancelled') and "pdf_requests"."live_note_id" is null)),
	CONSTRAINT "pdf_request_compute" CHECK("pdf_requests"."state" not in('queued','running') or "pdf_requests"."compute_id" is not null),
	CONSTRAINT "pdf_request_lifetime" CHECK("pdf_requests"."history_expires_at"="pdf_requests"."created_at"+7776000000),
	CONSTRAINT "pdf_request_version" CHECK(typeof("pdf_requests"."version")='integer' and "pdf_requests"."version" between 1 and 9007199254740991)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pdf_request_command` ON `pdf_requests` (`account_id`,`command_id`);--> statement-breakpoint
CREATE INDEX `pdf_request_history` ON `pdf_requests` (`account_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `pdf_request_demand` ON `pdf_requests` (`compute_id`,`state`,`id`);--> statement-breakpoint
CREATE INDEX `pdf_request_note_actor` ON `pdf_requests` (`live_note_id`,`account_id`,`state`);--> statement-breakpoint
CREATE INDEX `pdf_request_expiry` ON `pdf_requests` (`history_expires_at`,`id`);--> statement-breakpoint
CREATE INDEX `pdf_request_artifact` ON `pdf_requests` (`artifact_id`);
--> statement-breakpoint
CREATE TRIGGER pdf_computation_identity_immutable BEFORE UPDATE ON pdf_computations
WHEN NEW.id!=OLD.id OR NEW.target_note_id!=OLD.target_note_id OR NEW.source_identity!=OLD.source_identity OR NEW.profile!=OLD.profile OR NEW.workspace_id!=OLD.workspace_id OR NEW.created_at!=OLD.created_at OR NEW.deadline_at!=OLD.deadline_at
BEGIN SELECT RAISE(ABORT,'PDF computation identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_computation_debt_delete BEFORE DELETE ON pdf_computations
WHEN OLD.state!='closed' OR OLD.workspace_removed!=1 OR OLD.reserved_bytes!=0
BEGIN SELECT RAISE(ABORT,'PDF workspace has not been reclaimed'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_artifact_identity_immutable BEFORE UPDATE ON pdf_artifacts
WHEN NEW.id!=OLD.id OR NEW.target_note_id!=OLD.target_note_id OR NEW.compute_id!=OLD.compute_id OR NEW.source_identity!=OLD.source_identity OR NEW.profile!=OLD.profile OR NEW.created_at!=OLD.created_at OR (OLD.published_at IS NOT NULL AND (NEW.published_at IS NOT OLD.published_at OR NEW.expires_at IS NOT OLD.expires_at)) OR (OLD.storage_key IS NOT NULL AND NEW.storage_key IS NOT NULL AND NEW.storage_key!=OLD.storage_key)
BEGIN SELECT RAISE(ABORT,'PDF artifact identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_artifact_binding_insert BEFORE INSERT ON pdf_artifacts
WHEN NOT EXISTS(SELECT 1 FROM pdf_computations c WHERE c.id=NEW.compute_id AND c.target_note_id=NEW.target_note_id AND c.source_identity=NEW.source_identity AND c.profile=NEW.profile)
BEGIN SELECT RAISE(ABORT,'PDF artifact computation mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_artifact_debt_delete BEFORE DELETE ON pdf_artifacts
WHEN OLD.state!='removed' OR OLD.storage_key IS NOT NULL OR OLD.reserved_bytes!=0
BEGIN SELECT RAISE(ABORT,'PDF artifact has not been reclaimed'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_artifact_file_insert BEFORE INSERT ON pdf_artifacts
WHEN NEW.file IS NOT NULL AND (json_valid(NEW.file)=0 OR json_type(NEW.file,'$.bytes') IS NOT 'integer' OR json_extract(NEW.file,'$.bytes')<1 OR json_extract(NEW.file,'$.bytes')>NEW.reserved_bytes OR json_type(NEW.file,'$.sha256') IS NOT 'text' OR length(json_extract(NEW.file,'$.sha256'))!=64 OR json_type(NEW.file,'$.filename') IS NOT 'text')
BEGIN SELECT RAISE(ABORT,'PDF artifact file invalid'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_artifact_file_update BEFORE UPDATE ON pdf_artifacts
WHEN NEW.file IS NOT NULL AND (json_valid(NEW.file)=0 OR json_type(NEW.file,'$.bytes') IS NOT 'integer' OR json_extract(NEW.file,'$.bytes')<1 OR json_extract(NEW.file,'$.bytes')>NEW.reserved_bytes OR json_type(NEW.file,'$.sha256') IS NOT 'text' OR length(json_extract(NEW.file,'$.sha256'))!=64 OR json_type(NEW.file,'$.filename') IS NOT 'text')
BEGIN SELECT RAISE(ABORT,'PDF artifact file invalid'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_request_identity_immutable BEFORE UPDATE ON pdf_requests
WHEN NEW.id!=OLD.id OR NEW.account_id!=OLD.account_id OR NEW.command_id!=OLD.command_id OR NEW.input_digest!=OLD.input_digest OR NEW.target_note_id!=OLD.target_note_id OR NEW.source_identity!=OLD.source_identity OR NEW.style!=OLD.style OR NEW.compute_id IS NOT OLD.compute_id OR NEW.retry_of IS NOT OLD.retry_of OR NEW.created_at!=OLD.created_at OR NEW.history_expires_at!=OLD.history_expires_at OR (OLD.state IN('succeeded','failed','cancelled') AND NEW.state!=OLD.state) OR (OLD.state='succeeded' AND NEW.artifact_id IS NOT OLD.artifact_id)
BEGIN SELECT RAISE(ABORT,'PDF request identity or terminal result is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_request_binding_insert BEFORE INSERT ON pdf_requests
WHEN (NEW.compute_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pdf_computations c WHERE c.id=NEW.compute_id AND c.target_note_id=NEW.target_note_id AND c.source_identity=NEW.source_identity)) OR (NEW.artifact_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=NEW.artifact_id AND a.target_note_id=NEW.target_note_id AND a.source_identity=NEW.source_identity AND a.state='ready'))
BEGIN SELECT RAISE(ABORT,'PDF request binding mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_request_result_update BEFORE UPDATE OF artifact_id ON pdf_requests
WHEN NEW.artifact_id IS NOT NULL AND NEW.artifact_id IS NOT OLD.artifact_id AND NOT EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=NEW.artifact_id AND a.target_note_id=NEW.target_note_id AND a.source_identity=NEW.source_identity AND a.state='ready')
BEGIN SELECT RAISE(ABORT,'PDF request result mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_request_unbind BEFORE UPDATE OF live_note_id ON pdf_requests
WHEN NEW.live_note_id IS NULL AND (EXISTS(SELECT 1 FROM pdf_computations c WHERE c.id=NEW.compute_id AND (c.state!='closed' OR c.workspace_removed=0)) OR EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=NEW.artifact_id AND a.state!='removed'))
BEGIN SELECT RAISE(ABORT,'PDF request still owns physical resources'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_delivery_binding_insert BEFORE INSERT ON pdf_deliveries
WHEN NOT EXISTS(SELECT 1 FROM pdf_requests r JOIN pdf_artifacts a ON a.id=r.artifact_id WHERE r.id=NEW.request_id AND r.account_id=NEW.account_id AND r.state='succeeded' AND a.id=NEW.artifact_id AND a.state='ready' AND NEW.expires_at=min(NEW.created_at+120000,a.expires_at))
BEGIN SELECT RAISE(ABORT,'PDF delivery binding mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_delivery_identity_immutable BEFORE UPDATE ON pdf_deliveries
WHEN NEW.id!=OLD.id OR NEW.request_id!=OLD.request_id OR NEW.artifact_id!=OLD.artifact_id OR NEW.account_id!=OLD.account_id OR NEW.created_at!=OLD.created_at OR NEW.expires_at!=OLD.expires_at OR (OLD.state='closed' AND NEW.state!='closed')
BEGIN SELECT RAISE(ABORT,'PDF delivery identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_delivery_active_delete BEFORE DELETE ON pdf_deliveries
WHEN OLD.state!='closed'
BEGIN SELECT RAISE(ABORT,'PDF delivery is not closed'); END;
