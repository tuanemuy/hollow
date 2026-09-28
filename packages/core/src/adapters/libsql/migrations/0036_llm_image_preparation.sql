DROP TRIGGER llm_conversion_identity;
--> statement-breakpoint
DROP TRIGGER llm_conversion_pin;
--> statement-breakpoint
DROP TRIGGER llm_dispatch_intent;
--> statement-breakpoint
DROP TRIGGER llm_dispatch_pin;
--> statement-breakpoint
DROP TRIGGER llm_reservation_release;
--> statement-breakpoint
CREATE TABLE `__new_llm_conversions` (
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
	`preparation_version` integer,
	FOREIGN KEY (`job_id`) REFERENCES `conversion_jobs`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`original_id`) REFERENCES `originals`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "llm_conversion_values" CHECK("__new_llm_conversions"."operation" in ('import','regenerate') and "__new_llm_conversions"."source_format" in ('text','html','markdown','docx','xlsx','pptx','pdf','image') and "__new_llm_conversions"."source_state" in ('processing','ready','needs_ai','failed','cancelled') and "__new_llm_conversions"."source_coverage" in ('complete','partial','no_text') and "__new_llm_conversions"."phase" in ('queued','preparing','dispatching','response-ready','finalizing','terminal')),
	CONSTRAINT "llm_conversion_preparation" CHECK(("__new_llm_conversions"."source_format" in ('text','html','markdown') and ("__new_llm_conversions"."preparation_version" is null or "__new_llm_conversions"."preparation_version"=1) and "__new_llm_conversions"."prompt_version"=1) or ("__new_llm_conversions"."source_format" in ('docx','xlsx','pptx','pdf') and "__new_llm_conversions"."preparation_version" is not null and "__new_llm_conversions"."preparation_version"=2 and "__new_llm_conversions"."prompt_version"=1) or ("__new_llm_conversions"."source_format"='image' and "__new_llm_conversions"."preparation_version" is not null and "__new_llm_conversions"."preparation_version"=3 and "__new_llm_conversions"."prompt_version"=2)),
	CONSTRAINT "llm_conversion_limits" CHECK("__new_llm_conversions"."source_bytes" between 1 and 52428800 and length("__new_llm_conversions"."source_sha256")=64 and length("__new_llm_conversions"."request_digest")=64 and length("__new_llm_conversions"."model_id") between 1 and 255 and length(cast("__new_llm_conversions"."instruction" as blob))<=8192 and "__new_llm_conversions"."credential_epoch">=1 and "__new_llm_conversions"."note_version">=0 and "__new_llm_conversions"."admission_sequence">=1 and "__new_llm_conversions"."version">=1 and "__new_llm_conversions"."cancel_generation">=0 and "__new_llm_conversions"."response_budget" in (0,2097152)),
	CONSTRAINT "llm_conversion_deadline" CHECK("__new_llm_conversions"."deadline_at"="__new_llm_conversions"."created_at"+1800000 and "__new_llm_conversions"."updated_at">="__new_llm_conversions"."created_at"),
	CONSTRAINT "llm_conversion_owner" CHECK(("__new_llm_conversions"."owner_state"='idle' and "__new_llm_conversions"."runtime_id" is null and "__new_llm_conversions"."owner_token" is null) or ("__new_llm_conversions"."owner_state" in ('active','unknown','closed') and "__new_llm_conversions"."runtime_id" is not null and length("__new_llm_conversions"."runtime_id")>0 and "__new_llm_conversions"."owner_token" is not null and length("__new_llm_conversions"."owner_token")>0)),
	CONSTRAINT "llm_conversion_outcome" CHECK(("__new_llm_conversions"."outcome"='pending' and "__new_llm_conversions"."phase"!='terminal' and "__new_llm_conversions"."failure" is null and "__new_llm_conversions"."result_version" is null) or ("__new_llm_conversions"."outcome"='succeeded' and "__new_llm_conversions"."phase"='terminal' and "__new_llm_conversions"."failure" is null and "__new_llm_conversions"."result_version" is not null and "__new_llm_conversions"."result_version">="__new_llm_conversions"."note_version" and "__new_llm_conversions"."owner_state"='closed') or ("__new_llm_conversions"."outcome"='failed' and "__new_llm_conversions"."phase"='terminal' and "__new_llm_conversions"."failure" is not null and "__new_llm_conversions"."result_version" is null) or ("__new_llm_conversions"."outcome"='cancelled' and "__new_llm_conversions"."phase"='terminal' and "__new_llm_conversions"."failure" is null and "__new_llm_conversions"."result_version" is null) or ("__new_llm_conversions"."outcome"='unknown' and "__new_llm_conversions"."failure" in ('LLM_DELIVERY_UNKNOWN','LLM_OWNERSHIP_UNKNOWN') and "__new_llm_conversions"."failure" is not null and "__new_llm_conversions"."result_version" is null))
);
--> statement-breakpoint
INSERT INTO `__new_llm_conversions`("job_id", "account_id", "note_id", "original_id", "command_id", "request_digest", "operation", "retry_of", "source_sha256", "source_bytes", "source_format", "source_state", "source_coverage", "note_version", "original_revision_no", "credential_epoch", "model_id", "instruction", "prompt_version", "preparation_version", "admission_sequence", "created_at", "deadline_at", "updated_at", "phase", "outcome", "failure", "result_version", "owner_state", "runtime_id", "owner_token", "cancel_generation", "response_budget", "version") SELECT "job_id", "account_id", "note_id", "original_id", "command_id", "request_digest", "operation", "retry_of", "source_sha256", "source_bytes", "source_format", "source_state", "source_coverage", "note_version", "original_revision_no", "credential_epoch", "model_id", "instruction", "prompt_version", "preparation_version", "admission_sequence", "created_at", "deadline_at", "updated_at", "phase", "outcome", "failure", "result_version", "owner_state", "runtime_id", "owner_token", "cancel_generation", "response_budget", "version" FROM `llm_conversions`;--> statement-breakpoint
DROP TABLE `llm_conversions`;--> statement-breakpoint
ALTER TABLE `__new_llm_conversions` RENAME TO `llm_conversions`;--> statement-breakpoint
CREATE UNIQUE INDEX `llm_conversion_command` ON `llm_conversions` (`account_id`,`command_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `llm_conversion_active_note` ON `llm_conversions` (`note_id`) WHERE "llm_conversions"."phase" != 'terminal' or "llm_conversions"."owner_state" in ('active','unknown');--> statement-breakpoint
CREATE INDEX `llm_conversion_admission` ON `llm_conversions` (`account_id`,`credential_epoch`,`admission_sequence`);--> statement-breakpoint
CREATE INDEX `llm_conversion_phase` ON `llm_conversions` (`phase`,`created_at`);
--> statement-breakpoint
CREATE TRIGGER llm_conversion_identity BEFORE UPDATE ON llm_conversions
WHEN NEW.preparation_version IS NOT OLD.preparation_version OR NEW.job_id != OLD.job_id OR NEW.account_id != OLD.account_id OR NEW.note_id != OLD.note_id
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
CREATE TRIGGER llm_reservation_release BEFORE UPDATE ON llm_quota_reservations
WHEN NEW.state='released' AND (
 EXISTS (SELECT 1 FROM llm_conversions c WHERE c.job_id=OLD.job_id AND (c.phase!='terminal' OR c.owner_state IN ('active','unknown')))
 OR EXISTS (SELECT 1 FROM llm_dispatches d WHERE d.job_id=OLD.job_id AND d.state NOT IN ('prepared','not-sent'))
)
BEGIN SELECT RAISE(ABORT,'llm_reservation_release'); END;
--> statement-breakpoint
CREATE TABLE __llm_image_fk_assertion(valid INTEGER NOT NULL CHECK(valid=1));
--> statement-breakpoint
INSERT INTO __llm_image_fk_assertion SELECT CASE WHEN EXISTS(SELECT 1 FROM pragma_foreign_key_check) THEN 0 ELSE 1 END;
--> statement-breakpoint
DROP TABLE __llm_image_fk_assertion;
