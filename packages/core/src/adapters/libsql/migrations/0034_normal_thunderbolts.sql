CREATE TABLE `llm_account_fences` (
	`account_id` text PRIMARY KEY NOT NULL,
	`sequence` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "llm_fence_sequence" CHECK("llm_account_fences"."sequence" between 0 and 9007199254740991)
);
--> statement-breakpoint
CREATE TABLE `llm_conversions` (
	`job_id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`note_id` text NOT NULL,
	`original_id` text NOT NULL,
	`command_id` text NOT NULL,
	`request_digest` text NOT NULL,
	`operation` text NOT NULL,
	`retry_of` text,
	`source_sha256` text NOT NULL,
	`source_bytes` integer NOT NULL,
	`source_format` text NOT NULL,
	`source_state` text NOT NULL,
	`source_coverage` text NOT NULL,
	`note_version` integer NOT NULL,
	`original_revision_no` integer,
	`credential_epoch` integer NOT NULL,
	`model_id` text NOT NULL,
	`instruction` text NOT NULL,
	`prompt_version` integer NOT NULL,
	`admission_sequence` integer NOT NULL,
	`created_at` integer NOT NULL,
	`deadline_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`phase` text NOT NULL,
	`outcome` text NOT NULL,
	`failure` text,
	`result_version` integer,
	`owner_state` text NOT NULL,
	`runtime_id` text,
	`owner_token` text,
	`cancel_generation` integer NOT NULL,
	`response_budget` integer NOT NULL,
	`version` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `conversion_jobs`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`original_id`) REFERENCES `originals`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "llm_conversion_values" CHECK("llm_conversions"."operation" in ('import','regenerate') and "llm_conversions"."source_format" in ('text','html','markdown') and "llm_conversions"."source_state" in ('processing','ready','needs_ai','failed','cancelled') and "llm_conversions"."source_coverage" in ('complete','partial','no_text') and "llm_conversions"."phase" in ('queued','preparing','dispatching','response-ready','finalizing','terminal')),
	CONSTRAINT "llm_conversion_limits" CHECK("llm_conversions"."source_bytes" between 1 and 52428800 and length("llm_conversions"."source_sha256")=64 and length("llm_conversions"."request_digest")=64 and length("llm_conversions"."model_id") between 1 and 255 and length(cast("llm_conversions"."instruction" as blob))<=8192 and "llm_conversions"."prompt_version"=1 and "llm_conversions"."credential_epoch">=1 and "llm_conversions"."note_version">=0 and "llm_conversions"."admission_sequence">=1 and "llm_conversions"."version">=1 and "llm_conversions"."cancel_generation">=0 and "llm_conversions"."response_budget" in (0,2097152)),
	CONSTRAINT "llm_conversion_deadline" CHECK("llm_conversions"."deadline_at"="llm_conversions"."created_at"+1800000 and "llm_conversions"."updated_at">="llm_conversions"."created_at"),
	CONSTRAINT "llm_conversion_owner" CHECK(("llm_conversions"."owner_state"='idle' and "llm_conversions"."runtime_id" is null and "llm_conversions"."owner_token" is null) or ("llm_conversions"."owner_state" in ('active','unknown','closed') and "llm_conversions"."runtime_id" is not null and length("llm_conversions"."runtime_id")>0 and "llm_conversions"."owner_token" is not null and length("llm_conversions"."owner_token")>0)),
	CONSTRAINT "llm_conversion_outcome" CHECK(("llm_conversions"."outcome"='pending' and "llm_conversions"."phase"!='terminal' and "llm_conversions"."failure" is null and "llm_conversions"."result_version" is null) or ("llm_conversions"."outcome"='succeeded' and "llm_conversions"."phase"='terminal' and "llm_conversions"."failure" is null and "llm_conversions"."result_version" is not null and "llm_conversions"."result_version">="llm_conversions"."note_version" and "llm_conversions"."owner_state"='closed') or ("llm_conversions"."outcome"='failed' and "llm_conversions"."phase"='terminal' and "llm_conversions"."failure" is not null and "llm_conversions"."result_version" is null) or ("llm_conversions"."outcome"='cancelled' and "llm_conversions"."phase"='terminal' and "llm_conversions"."failure" is null and "llm_conversions"."result_version" is null) or ("llm_conversions"."outcome"='unknown' and "llm_conversions"."failure" in ('LLM_DELIVERY_UNKNOWN','LLM_OWNERSHIP_UNKNOWN') and "llm_conversions"."failure" is not null and "llm_conversions"."result_version" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `llm_conversion_command` ON `llm_conversions` (`account_id`,`command_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `llm_conversion_active_note` ON `llm_conversions` (`note_id`) WHERE "llm_conversions"."phase" != 'terminal' or "llm_conversions"."owner_state" in ('active','unknown');--> statement-breakpoint
CREATE INDEX `llm_conversion_admission` ON `llm_conversions` (`account_id`,`credential_epoch`,`admission_sequence`);--> statement-breakpoint
CREATE INDEX `llm_conversion_phase` ON `llm_conversions` (`phase`,`created_at`);--> statement-breakpoint
CREATE TABLE `llm_dispatches` (
	`job_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`id` text NOT NULL,
	`input_sha256` text NOT NULL,
	`owner_token` text NOT NULL,
	`runtime_id` text NOT NULL,
	`state` text NOT NULL,
	`intent_at` integer,
	`content` text,
	`input_tokens` integer,
	`output_tokens` integer,
	PRIMARY KEY(`job_id`, `ordinal`),
	FOREIGN KEY (`job_id`) REFERENCES `llm_conversions`(`job_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "llm_dispatch_limits" CHECK("llm_dispatches"."ordinal" between 0 and 15 and length("llm_dispatches"."input_sha256")=64 and length("llm_dispatches"."owner_token")>0 and length("llm_dispatches"."runtime_id")>0 and ("llm_dispatches"."input_tokens" is null or "llm_dispatches"."input_tokens">=0) and ("llm_dispatches"."output_tokens" is null or "llm_dispatches"."output_tokens">=0)),
	CONSTRAINT "llm_dispatch_shape" CHECK(("llm_dispatches"."state"='prepared' and "llm_dispatches"."intent_at" is null and "llm_dispatches"."content" is null and "llm_dispatches"."input_tokens" is null and "llm_dispatches"."output_tokens" is null) or ("llm_dispatches"."state" in ('intent','unknown','not-sent','scrubbed') and "llm_dispatches"."intent_at" is not null and "llm_dispatches"."content" is null and "llm_dispatches"."input_tokens" is null and "llm_dispatches"."output_tokens" is null) or ("llm_dispatches"."state"='response' and "llm_dispatches"."intent_at" is not null and "llm_dispatches"."content" is not null and length(cast("llm_dispatches"."content" as blob)) between 1 and 65536))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `llm_dispatches_id_unique` ON `llm_dispatches` (`id`);--> statement-breakpoint
CREATE TABLE `llm_quota_buckets` (
	`account_id` text NOT NULL,
	`month` text NOT NULL,
	`reserved` integer NOT NULL,
	`consumed` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`account_id`, `month`),
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "llm_quota_nonnegative" CHECK("llm_quota_buckets"."reserved" between 0 and 9007199254740991 and "llm_quota_buckets"."consumed" between 0 and 9007199254740991 and "llm_quota_buckets"."month" glob '[0-9][0-9][0-9][0-9]-[0-1][0-9]' and substr("llm_quota_buckets"."month",6,2) between '01' and '12')
);
--> statement-breakpoint
CREATE TABLE `llm_quota_reservations` (
	`job_id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`month` text NOT NULL,
	`state` text NOT NULL,
	`first_intent_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `llm_conversions`(`job_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "llm_reservation_shape" CHECK(("llm_quota_reservations"."state"='reserved' and "llm_quota_reservations"."first_intent_at" is null) or ("llm_quota_reservations"."state"='consumed' and "llm_quota_reservations"."first_intent_at" is not null) or "llm_quota_reservations"."state"='released'),
	CONSTRAINT "llm_reservation_month" CHECK("llm_quota_reservations"."month"=strftime('%Y-%m',"llm_quota_reservations"."created_at"/1000,'unixepoch') and "llm_quota_reservations"."updated_at">="llm_quota_reservations"."created_at")
);
--> statement-breakpoint
CREATE INDEX `llm_quota_reservation_bucket` ON `llm_quota_reservations` (`account_id`,`month`,`state`);--> statement-breakpoint
ALTER TABLE `openrouter_attempts` ADD COLUMN `confirmed_admission_sequence` integer CONSTRAINT `openrouter_attempt_admission` CHECK (`confirmed_admission_sequence` is null or `confirmed_admission_sequence` between 0 and 9007199254740991);
--> statement-breakpoint
CREATE TRIGGER llm_conversion_identity BEFORE UPDATE ON llm_conversions
WHEN NEW.job_id != OLD.job_id OR NEW.account_id != OLD.account_id OR NEW.note_id != OLD.note_id
 OR NEW.original_id != OLD.original_id OR NEW.command_id != OLD.command_id OR NEW.request_digest != OLD.request_digest
 OR NEW.operation != OLD.operation OR NEW.retry_of IS NOT OLD.retry_of
 OR NEW.source_sha256 != OLD.source_sha256 OR NEW.source_bytes != OLD.source_bytes OR NEW.source_format != OLD.source_format
 OR NEW.source_state != OLD.source_state OR NEW.source_coverage != OLD.source_coverage
 OR NEW.note_version != OLD.note_version OR NEW.original_revision_no IS NOT OLD.original_revision_no
 OR NEW.credential_epoch != OLD.credential_epoch OR NEW.model_id != OLD.model_id OR NEW.instruction != OLD.instruction
 OR NEW.prompt_version != OLD.prompt_version OR NEW.admission_sequence != OLD.admission_sequence
 OR NEW.created_at != OLD.created_at OR NEW.deadline_at != OLD.deadline_at
 OR NEW.version != OLD.version + 1 OR NEW.cancel_generation < OLD.cancel_generation
 OR (OLD.phase='terminal' AND NEW.phase!='terminal')
 OR (OLD.owner_state IN ('active','unknown') AND (NEW.runtime_id IS NOT OLD.runtime_id OR NEW.owner_token IS NOT OLD.owner_token))
 OR (OLD.owner_state='unknown' AND NEW.owner_state NOT IN ('unknown','closed'))
 OR (OLD.owner_state='closed' AND NEW.owner_state='active' AND OLD.phase!='response-ready')
 OR (OLD.owner_state IN ('active','unknown') AND NEW.owner_state='idle')
 OR (NEW.response_budget < OLD.response_budget AND NEW.owner_state IN ('active','unknown'))
BEGIN SELECT RAISE(ABORT,'llm_conversion_identity'); END;
--> statement-breakpoint
CREATE TRIGGER llm_conversion_pin BEFORE DELETE ON llm_conversions
WHEN OLD.phase!='terminal' OR OLD.owner_state IN ('active','unknown') OR OLD.response_budget!=0
BEGIN SELECT RAISE(ABORT,'llm_conversion_pin'); END;
--> statement-breakpoint
CREATE TRIGGER llm_dispatch_identity BEFORE UPDATE ON llm_dispatches
WHEN NEW.job_id != OLD.job_id OR NEW.ordinal != OLD.ordinal OR NEW.id != OLD.id
 OR NEW.input_sha256 != OLD.input_sha256 OR NEW.owner_token != OLD.owner_token OR NEW.runtime_id != OLD.runtime_id
 OR (OLD.intent_at IS NOT NULL AND NEW.intent_at IS NOT OLD.intent_at)
 OR NOT ((OLD.state='prepared' AND NEW.state='intent')
   OR (OLD.state='intent' AND NEW.state IN ('response','unknown','not-sent'))
   OR (OLD.state='response' AND NEW.state='scrubbed'))
BEGIN SELECT RAISE(ABORT,'llm_dispatch_identity'); END;
--> statement-breakpoint
CREATE TRIGGER llm_dispatch_intent BEFORE UPDATE ON llm_dispatches
WHEN NEW.state='intent' AND NOT EXISTS (
 SELECT 1 FROM llm_conversions c JOIN llm_quota_reservations q ON q.job_id=c.job_id
 JOIN openrouter_connections k ON k.account_id=c.account_id
 WHERE c.job_id=NEW.job_id AND c.owner_state='active' AND c.owner_token=NEW.owner_token
 AND c.runtime_id=NEW.runtime_id AND c.phase='dispatching' AND c.outcome='pending'
 AND c.cancel_generation=0 AND c.response_budget=2097152
 AND k.epoch=c.credential_epoch AND k.state='linked' AND q.state IN ('reserved','consumed')
)
BEGIN SELECT RAISE(ABORT,'llm_dispatch_fenced'); END;
--> statement-breakpoint
CREATE TRIGGER llm_dispatch_pin BEFORE DELETE ON llm_dispatches
WHEN EXISTS (SELECT 1 FROM llm_conversions c WHERE c.job_id=OLD.job_id AND
 (c.phase!='terminal' OR c.owner_state IN ('active','unknown') OR c.response_budget!=0))
BEGIN SELECT RAISE(ABORT,'llm_dispatch_pin'); END;
--> statement-breakpoint
CREATE TRIGGER llm_reservation_identity BEFORE UPDATE ON llm_quota_reservations
WHEN NEW.job_id!=OLD.job_id OR NEW.account_id!=OLD.account_id OR NEW.month!=OLD.month
 OR NEW.created_at!=OLD.created_at
 OR (OLD.first_intent_at IS NOT NULL AND NEW.first_intent_at IS NOT OLD.first_intent_at)
 OR NOT ((OLD.state='reserved' AND NEW.state IN ('consumed','released')) OR (OLD.state='consumed' AND NEW.state='released'))
BEGIN SELECT RAISE(ABORT,'llm_reservation_identity'); END;
--> statement-breakpoint
CREATE TRIGGER llm_reservation_release BEFORE UPDATE ON llm_quota_reservations
WHEN NEW.state='released' AND (
 EXISTS (SELECT 1 FROM llm_conversions c WHERE c.job_id=OLD.job_id AND (c.phase!='terminal' OR c.owner_state IN ('active','unknown')))
 OR EXISTS (SELECT 1 FROM llm_dispatches d WHERE d.job_id=OLD.job_id AND d.state NOT IN ('prepared','not-sent'))
)
BEGIN SELECT RAISE(ABORT,'llm_reservation_release'); END;
--> statement-breakpoint
CREATE TRIGGER llm_fence_monotonic BEFORE UPDATE ON llm_account_fences
WHEN NEW.account_id!=OLD.account_id OR NEW.sequence!=OLD.sequence+1
BEGIN SELECT RAISE(ABORT,'llm_fence_monotonic'); END;
--> statement-breakpoint
CREATE TRIGGER openrouter_attempt_admission_update BEFORE UPDATE ON openrouter_attempts
WHEN NEW.confirmed_admission_sequence IS NOT OLD.confirmed_admission_sequence AND
 (OLD.state!='checking' OR NEW.state!='checking' OR NEW.confirmed_admission_sequence IS NULL
  OR NEW.confirmed_admission_sequence < coalesce(OLD.confirmed_admission_sequence,0))
BEGIN SELECT RAISE(ABORT,'openrouter_attempt_admission_update'); END;
--> statement-breakpoint
CREATE TABLE _llm_fk_assertion (valid INTEGER NOT NULL CHECK(valid=1));
--> statement-breakpoint
INSERT INTO _llm_fk_assertion SELECT CASE WHEN EXISTS(SELECT 1 FROM pragma_foreign_key_check) THEN 0 ELSE 1 END;
--> statement-breakpoint
DROP TABLE _llm_fk_assertion;
