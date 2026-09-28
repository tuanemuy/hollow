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
DROP TRIGGER llm_dispatch_identity;
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
	`model_id` text,
	`instruction` text NOT NULL,
	`prompt_version` integer,
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
	`selection_state` text DEFAULT 'fixed' NOT NULL,
	`candidate_text_model_id` text,
	`candidate_image_model_id` text,
	`candidate_settings_version` integer,
	`pdf_selection_manifest` text,
	`source_ownership_generation` integer,
	FOREIGN KEY (`job_id`) REFERENCES `conversion_jobs`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`original_id`) REFERENCES `originals`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "llm_conversion_values" CHECK("__new_llm_conversions"."operation" in ('import','regenerate') and "__new_llm_conversions"."source_format" in ('text','html','markdown','docx','xlsx','pptx','pdf','image') and "__new_llm_conversions"."source_state" in ('processing','ready','needs_ai','failed','cancelled') and "__new_llm_conversions"."source_coverage" in ('complete','partial','no_text') and "__new_llm_conversions"."phase" in ('queued','classifying','preparing','dispatching','response-ready','finalizing','terminal')),
	CONSTRAINT "llm_conversion_preparation" CHECK(("__new_llm_conversions"."selection_state"='pdf-pending' and "__new_llm_conversions"."source_format"='pdf' and "__new_llm_conversions"."operation"='import' and "__new_llm_conversions"."model_id" is null and "__new_llm_conversions"."preparation_version" is null and "__new_llm_conversions"."prompt_version" is null and "__new_llm_conversions"."pdf_selection_manifest" is null and "__new_llm_conversions"."candidate_text_model_id" is not null and length("__new_llm_conversions"."candidate_text_model_id") between 1 and 255 and "__new_llm_conversions"."candidate_image_model_id" is not null and length("__new_llm_conversions"."candidate_image_model_id") between 1 and 255 and typeof("__new_llm_conversions"."candidate_settings_version")='integer' and "__new_llm_conversions"."candidate_settings_version">=1 and typeof("__new_llm_conversions"."source_ownership_generation")='integer' and "__new_llm_conversions"."source_ownership_generation" between 1 and 9007199254740991 and "__new_llm_conversions"."phase" in ('queued','classifying','terminal') and "__new_llm_conversions"."outcome"!='succeeded') or ("__new_llm_conversions"."selection_state"='fixed' and "__new_llm_conversions"."model_id" is not null and "__new_llm_conversions"."prompt_version" is not null and "__new_llm_conversions"."candidate_text_model_id" is null and "__new_llm_conversions"."candidate_image_model_id" is null and "__new_llm_conversions"."candidate_settings_version" is null and "__new_llm_conversions"."phase"!='classifying' and (("__new_llm_conversions"."source_format" in ('text','html','markdown') and ("__new_llm_conversions"."preparation_version" is null or "__new_llm_conversions"."preparation_version"=1) and "__new_llm_conversions"."prompt_version"=1) or ("__new_llm_conversions"."source_format" in ('docx','xlsx','pptx','pdf') and "__new_llm_conversions"."preparation_version" is not null and "__new_llm_conversions"."preparation_version"=2 and "__new_llm_conversions"."prompt_version"=1) or ("__new_llm_conversions"."source_format"='image' and "__new_llm_conversions"."preparation_version" is not null and "__new_llm_conversions"."preparation_version"=3 and "__new_llm_conversions"."prompt_version"=2) or ("__new_llm_conversions"."source_format"='pdf' and "__new_llm_conversions"."preparation_version" is not null and "__new_llm_conversions"."preparation_version"=4 and "__new_llm_conversions"."prompt_version"=3 and "__new_llm_conversions"."pdf_selection_manifest" is not null)) and (("__new_llm_conversions"."pdf_selection_manifest" is null and "__new_llm_conversions"."source_ownership_generation" is null) or ("__new_llm_conversions"."pdf_selection_manifest" is not null and "__new_llm_conversions"."source_format"='pdf' and "__new_llm_conversions"."preparation_version" in (2,4) and typeof("__new_llm_conversions"."source_ownership_generation")='integer' and "__new_llm_conversions"."source_ownership_generation" between 1 and 9007199254740991 and length(cast("__new_llm_conversions"."pdf_selection_manifest" as blob)) between 1 and 65536 and json_valid("__new_llm_conversions"."pdf_selection_manifest"))))),
	CONSTRAINT "llm_conversion_pdf_proof" CHECK("__new_llm_conversions"."pdf_selection_manifest" is null or case when json_valid("__new_llm_conversions"."pdf_selection_manifest") then coalesce((json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.preparationVersion')="__new_llm_conversions"."preparation_version" and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.promptVersion')="__new_llm_conversions"."prompt_version" and ((json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.kind')='strict-text' and "__new_llm_conversions"."preparation_version"=2 and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.modelKind')='chat-text' and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.policy')='strict-text-v1' and length(json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.preparedDocumentHash'))=64 and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.pages') between 1 and 200) or (json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.kind')='pages' and "__new_llm_conversions"."preparation_version"=4 and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.modelKind')='chat-image' and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.reason') in ('VISUAL_CONTENT','ORDER_UNPROVEN') and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.kind')='pdf-pages' and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.preparationVersion')=4 and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.source.originalId')="__new_llm_conversions"."original_id" and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.source.sha256')="__new_llm_conversions"."source_sha256" and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.source.bytes')="__new_llm_conversions"."source_bytes" and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.source.format')='pdf' and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.policy')='display-crop-white-144dpi-v1' and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.renderer')='pdfjs-6.3.289-canvas-1.0.8-v1' and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.total') between 1 and 32 and json_array_length("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.pages')=json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.total') and length(json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.sha256'))=64))),0) else 0 end),
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
CREATE TABLE `__new_llm_dispatches` (
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
	CONSTRAINT "llm_dispatch_limits" CHECK("__new_llm_dispatches"."ordinal" between 0 and 31 and length("__new_llm_dispatches"."input_sha256")=64 and length("__new_llm_dispatches"."owner_token")>0 and length("__new_llm_dispatches"."runtime_id")>0 and ("__new_llm_dispatches"."input_tokens" is null or "__new_llm_dispatches"."input_tokens">=0) and ("__new_llm_dispatches"."output_tokens" is null or "__new_llm_dispatches"."output_tokens">=0)),
	CONSTRAINT "llm_dispatch_shape" CHECK(("__new_llm_dispatches"."state"='prepared' and "__new_llm_dispatches"."intent_at" is null and "__new_llm_dispatches"."content" is null and "__new_llm_dispatches"."input_tokens" is null and "__new_llm_dispatches"."output_tokens" is null) or ("__new_llm_dispatches"."state" in ('intent','unknown','not-sent','scrubbed') and "__new_llm_dispatches"."intent_at" is not null and "__new_llm_dispatches"."content" is null and "__new_llm_dispatches"."input_tokens" is null and "__new_llm_dispatches"."output_tokens" is null) or ("__new_llm_dispatches"."state"='response' and "__new_llm_dispatches"."intent_at" is not null and "__new_llm_dispatches"."content" is not null and length(cast("__new_llm_dispatches"."content" as blob)) between 1 and 65536))
);
--> statement-breakpoint
INSERT INTO __new_llm_dispatches("job_id","ordinal","id","input_sha256","owner_token","runtime_id","state","intent_at","content","input_tokens","output_tokens") SELECT "job_id","ordinal","id","input_sha256","owner_token","runtime_id","state","intent_at","content","input_tokens","output_tokens" FROM llm_dispatches;
--> statement-breakpoint
DROP TABLE llm_dispatches;
--> statement-breakpoint
ALTER TABLE __new_llm_dispatches RENAME TO llm_dispatches;
--> statement-breakpoint
CREATE UNIQUE INDEX `llm_dispatches_id_unique` ON `llm_dispatches` (`id`);--> statement-breakpoint
CREATE TABLE llm_pdf_previews (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"command_id" text NOT NULL,
	"request_digest" text NOT NULL,
	"note_id" text NOT NULL,
	"note_version" integer NOT NULL,
	"ownership_generation" integer NOT NULL,
	"original_id" text NOT NULL,
	"source_sha256" text NOT NULL,
	"source_bytes" integer NOT NULL,
	"credential_epoch" integer NOT NULL,
	"policy_version" integer DEFAULT 1 NOT NULL,
	"created_at" integer NOT NULL,
	"expires_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	"state" text NOT NULL,
	"owner_state" text NOT NULL,
	"owner_token" text,
	"runtime_id" text,
	"cancel_generation" integer NOT NULL,
	"version" integer NOT NULL,
	"result_json" text,
	"failure_code" text,
	"consumed_job_id" text,
	FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY ("original_id") REFERENCES "originals"("id") ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY ("consumed_job_id") REFERENCES "llm_conversions"("job_id") ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "llm_pdf_preview_limits" CHECK(length("llm_pdf_previews"."id")>0 and length("llm_pdf_previews"."command_id")>0 and length("llm_pdf_previews"."request_digest")=64 and length("llm_pdf_previews"."source_sha256")=64 and "llm_pdf_previews"."source_bytes" between 1 and 52428800 and "llm_pdf_previews"."note_version">=0 and typeof("llm_pdf_previews"."ownership_generation")='integer' and "llm_pdf_previews"."ownership_generation" between 1 and 9007199254740991 and "llm_pdf_previews"."credential_epoch">=1 and "llm_pdf_previews"."policy_version"=1 and "llm_pdf_previews"."cancel_generation">=0 and "llm_pdf_previews"."version">=1 and "llm_pdf_previews"."expires_at"="llm_pdf_previews"."created_at"+300000 and "llm_pdf_previews"."updated_at">="llm_pdf_previews"."created_at"),
	CONSTRAINT "llm_pdf_preview_owner" CHECK(("llm_pdf_previews"."owner_state"='idle' and "llm_pdf_previews"."owner_token" is null and "llm_pdf_previews"."runtime_id" is null) or ("llm_pdf_previews"."owner_state" in ('active','closed','unknown') and "llm_pdf_previews"."owner_token" is not null and length("llm_pdf_previews"."owner_token")>0 and "llm_pdf_previews"."runtime_id" is not null and length("llm_pdf_previews"."runtime_id")>0)),
	CONSTRAINT "llm_pdf_preview_shape" CHECK(("llm_pdf_previews"."state"='queued' and "llm_pdf_previews"."owner_state"='idle' and "llm_pdf_previews"."result_json" is null and "llm_pdf_previews"."failure_code" is null and "llm_pdf_previews"."consumed_job_id" is null) or ("llm_pdf_previews"."state"='running' and "llm_pdf_previews"."owner_state"='active' and "llm_pdf_previews"."result_json" is null and "llm_pdf_previews"."failure_code" is null and "llm_pdf_previews"."consumed_job_id" is null) or ("llm_pdf_previews"."state"='ready' and "llm_pdf_previews"."owner_state"='closed' and "llm_pdf_previews"."result_json" is not null and json_valid("llm_pdf_previews"."result_json") and length(cast("llm_pdf_previews"."result_json" as blob)) between 1 and 65536 and "llm_pdf_previews"."failure_code" is null and "llm_pdf_previews"."consumed_job_id" is null and "llm_pdf_previews"."cancel_generation"=0) or ("llm_pdf_previews"."state"='consumed' and "llm_pdf_previews"."owner_state"='closed' and "llm_pdf_previews"."result_json" is null and "llm_pdf_previews"."failure_code" is null and "llm_pdf_previews"."consumed_job_id" is not null) or ("llm_pdf_previews"."state"='failed' and "llm_pdf_previews"."owner_state" in ('idle','closed') and "llm_pdf_previews"."result_json" is null and "llm_pdf_previews"."failure_code" is not null and "llm_pdf_previews"."failure_code" in ('LLM_DOCUMENT_CORRUPT','LLM_DOCUMENT_ENCRYPTED','LLM_DOCUMENT_UNSUPPORTED','LLM_DOCUMENT_NO_TEXT','LLM_RESOURCE_LIMIT','LLM_TIMEOUT','LLM_SOURCE_CHANGED','LLM_UNAVAILABLE') and "llm_pdf_previews"."consumed_job_id" is null) or ("llm_pdf_previews"."state" in ('cancelled','expired') and "llm_pdf_previews"."owner_state" in ('idle','closed') and "llm_pdf_previews"."result_json" is null and "llm_pdf_previews"."failure_code" is null and "llm_pdf_previews"."consumed_job_id" is null) or ("llm_pdf_previews"."state"='unknown' and "llm_pdf_previews"."owner_state"='unknown' and "llm_pdf_previews"."result_json" is null and "llm_pdf_previews"."failure_code" is null and "llm_pdf_previews"."consumed_job_id" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX llm_pdf_preview_command ON llm_pdf_previews(account_id,command_id);
--> statement-breakpoint
CREATE UNIQUE INDEX llm_pdf_preview_live_note ON llm_pdf_previews(note_id) WHERE state IN ('queued','running','ready','unknown') OR owner_state IN ('active','unknown');
--> statement-breakpoint
CREATE UNIQUE INDEX llm_pdf_preview_live_actor ON llm_pdf_previews(account_id) WHERE state IN ('queued','running','ready','unknown') OR owner_state IN ('active','unknown');
--> statement-breakpoint
CREATE INDEX llm_pdf_preview_claim ON llm_pdf_previews(state,created_at);
--> statement-breakpoint
CREATE INDEX llm_pdf_preview_expiry ON llm_pdf_previews(expires_at);
--> statement-breakpoint
CREATE TRIGGER llm_conversion_identity BEFORE UPDATE ON llm_conversions
WHEN NEW.job_id != OLD.job_id OR NEW.account_id != OLD.account_id OR NEW.note_id != OLD.note_id
 OR NEW.original_id != OLD.original_id OR NEW.command_id != OLD.command_id OR NEW.request_digest != OLD.request_digest
 OR NEW.operation != OLD.operation OR NEW.retry_of IS NOT OLD.retry_of
 OR NEW.source_sha256 != OLD.source_sha256 OR NEW.source_bytes != OLD.source_bytes OR NEW.source_format != OLD.source_format
 OR NEW.source_state != OLD.source_state OR NEW.source_coverage != OLD.source_coverage
 OR NEW.note_version != OLD.note_version OR NEW.original_revision_no IS NOT OLD.original_revision_no
 OR NEW.credential_epoch != OLD.credential_epoch OR NEW.instruction != OLD.instruction
 OR NEW.admission_sequence != OLD.admission_sequence
 OR NEW.source_ownership_generation IS NOT OLD.source_ownership_generation
 OR NEW.created_at != OLD.created_at OR NEW.deadline_at != OLD.deadline_at
 OR NEW.version != OLD.version + 1 OR NEW.cancel_generation < OLD.cancel_generation
 OR (OLD.phase='terminal' AND NEW.phase!='terminal')
 OR (OLD.owner_state IN ('active','unknown') AND (NEW.runtime_id IS NOT OLD.runtime_id OR NEW.owner_token IS NOT OLD.owner_token))
 OR (OLD.owner_state='unknown' AND NEW.owner_state NOT IN ('unknown','closed'))
 OR (OLD.owner_state='closed' AND NEW.owner_state='active' AND OLD.phase!='response-ready')
 OR (OLD.owner_state IN ('active','unknown') AND NEW.owner_state='idle')
 OR (NEW.response_budget < OLD.response_budget AND NEW.owner_state IN ('active','unknown'))
 OR ((NEW.selection_state IS NOT OLD.selection_state OR NEW.model_id IS NOT OLD.model_id
 OR NEW.preparation_version IS NOT OLD.preparation_version OR NEW.prompt_version IS NOT OLD.prompt_version
 OR NEW.candidate_text_model_id IS NOT OLD.candidate_text_model_id OR NEW.candidate_image_model_id IS NOT OLD.candidate_image_model_id
 OR NEW.candidate_settings_version IS NOT OLD.candidate_settings_version OR NEW.pdf_selection_manifest IS NOT OLD.pdf_selection_manifest)
 AND NOT coalesce((OLD.selection_state='pdf-pending' AND NEW.selection_state='fixed'
 AND OLD.phase='classifying' AND NEW.phase='preparing' AND OLD.outcome='pending' AND NEW.outcome='pending'
 AND OLD.owner_state='active' AND NEW.owner_state='active' AND NEW.runtime_id=OLD.runtime_id AND NEW.owner_token=OLD.owner_token
 AND OLD.cancel_generation=0 AND NEW.cancel_generation=0 AND NEW.updated_at<OLD.deadline_at
 AND NEW.model_id=CASE json_extract(NEW.pdf_selection_manifest,'$.kind') WHEN 'strict-text' THEN OLD.candidate_text_model_id WHEN 'pages' THEN OLD.candidate_image_model_id END
 AND NOT EXISTS(SELECT 1 FROM llm_dispatches WHERE job_id=OLD.job_id)
 AND EXISTS(SELECT 1 FROM notes n JOIN originals o ON o.note_id=n.id JOIN openrouter_connections k ON k.account_id=OLD.account_id
 WHERE n.id=OLD.note_id AND n.version=OLD.note_version AND n.ownership_generation=OLD.source_ownership_generation
 AND o.id=OLD.original_id AND o.sha256=OLD.source_sha256 AND o.bytes=OLD.source_bytes
 AND k.state='linked' AND k.epoch=OLD.credential_epoch)),0))
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
 AND c.runtime_id=NEW.runtime_id AND c.selection_state='fixed' AND c.phase='dispatching' AND c.outcome='pending'
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
CREATE TRIGGER llm_dispatch_identity BEFORE UPDATE ON llm_dispatches
WHEN NEW.job_id != OLD.job_id OR NEW.ordinal != OLD.ordinal OR NEW.id != OLD.id
 OR NEW.input_sha256 != OLD.input_sha256 OR NEW.owner_token != OLD.owner_token OR NEW.runtime_id != OLD.runtime_id
 OR (OLD.intent_at IS NOT NULL AND NEW.intent_at IS NOT OLD.intent_at)
 OR NOT ((OLD.state='prepared' AND NEW.state='intent')
   OR (OLD.state='intent' AND NEW.state IN ('response','unknown','not-sent'))
   OR (OLD.state='response' AND NEW.state='scrubbed'))
BEGIN SELECT RAISE(ABORT,'llm_dispatch_identity'); END;
--> statement-breakpoint
CREATE TRIGGER llm_dispatch_recipe BEFORE INSERT ON llm_dispatches
WHEN NOT EXISTS (
 SELECT 1 FROM llm_conversions c WHERE c.job_id=NEW.job_id AND c.selection_state='fixed'
 AND ((coalesce(c.preparation_version,1) IN (1,2) AND NEW.ordinal BETWEEN 0 AND 15)
 OR (c.preparation_version=3 AND NEW.ordinal=0)
 OR (c.preparation_version=4 AND NEW.ordinal>=0 AND NEW.ordinal<json_extract(c.pdf_selection_manifest,'$.manifest.total')))
)
BEGIN SELECT RAISE(ABORT,'llm_dispatch_recipe'); END;
--> statement-breakpoint
CREATE TRIGGER llm_conversion_queue BEFORE INSERT ON llm_conversions
WHEN NEW.phase='queued' AND (SELECT count(*) FROM llm_conversions WHERE account_id=NEW.account_id AND phase='queued')
 +(SELECT count(*) FROM llm_pdf_previews WHERE account_id=NEW.account_id AND state='queued')>=100
BEGIN SELECT RAISE(ABORT,'llm_account_queue_full'); END;
--> statement-breakpoint
CREATE TRIGGER llm_pdf_preview_admission BEFORE INSERT ON llm_pdf_previews
WHEN NEW.state!='queued' OR NEW.owner_state!='idle' OR NEW.cancel_generation!=0 OR NEW.version!=1
 OR (SELECT count(*) FROM llm_conversions WHERE account_id=NEW.account_id AND phase='queued')
 +(SELECT count(*) FROM llm_pdf_previews WHERE account_id=NEW.account_id AND state='queued')>=100
 OR (SELECT count(*) FROM llm_pdf_previews WHERE account_id=NEW.account_id AND state IN ('consumed','failed','cancelled','expired'))>=100
 OR EXISTS(SELECT 1 FROM llm_conversions c WHERE c.note_id=NEW.note_id AND (c.phase!='terminal' OR c.owner_state IN ('active','unknown')))
BEGIN SELECT RAISE(ABORT,'llm_pdf_preview_admission'); END;
--> statement-breakpoint
CREATE TRIGGER llm_pdf_preview_identity BEFORE UPDATE ON llm_pdf_previews
WHEN NEW.id!=OLD.id OR NEW.account_id!=OLD.account_id OR NEW.command_id!=OLD.command_id OR NEW.request_digest!=OLD.request_digest
 OR NEW.note_id!=OLD.note_id OR NEW.note_version!=OLD.note_version OR NEW.ownership_generation!=OLD.ownership_generation
 OR NEW.original_id!=OLD.original_id OR NEW.source_sha256!=OLD.source_sha256 OR NEW.source_bytes!=OLD.source_bytes
 OR NEW.credential_epoch!=OLD.credential_epoch OR NEW.policy_version!=OLD.policy_version
 OR NEW.created_at!=OLD.created_at OR NEW.expires_at!=OLD.expires_at
 OR NEW.version!=OLD.version+1 OR NEW.cancel_generation<OLD.cancel_generation
 OR (OLD.owner_state IN ('active','unknown') AND (NEW.runtime_id IS NOT OLD.runtime_id OR NEW.owner_token IS NOT OLD.owner_token))
 OR (OLD.owner_state='unknown' AND NEW.owner_state NOT IN ('unknown','closed'))
 OR (OLD.owner_state IN ('active','unknown') AND NEW.owner_state='idle')
 OR (OLD.owner_state='closed' AND NEW.owner_state!='closed')
 OR (OLD.state='ready' AND NEW.state='ready' AND NEW.result_json IS NOT OLD.result_json)
 OR (OLD.state='consumed' AND NEW.consumed_job_id IS NOT OLD.consumed_job_id)
 OR NOT (
 (OLD.state='queued' AND NEW.state IN ('queued','running','failed','cancelled','expired'))
 OR (OLD.state='running' AND NEW.state IN ('running','ready','failed','cancelled','expired','unknown'))
 OR (OLD.state='unknown' AND NEW.state IN ('unknown','failed','cancelled','expired'))
 OR (OLD.state='ready' AND NEW.state IN ('ready','consumed','failed','cancelled','expired'))
 OR (OLD.state IN ('consumed','failed','cancelled','expired') AND NEW.state=OLD.state)
 )
BEGIN SELECT RAISE(ABORT,'llm_pdf_preview_identity'); END;
--> statement-breakpoint
CREATE TRIGGER llm_pdf_preview_ready BEFORE UPDATE ON llm_pdf_previews
WHEN NEW.state='ready' AND (NEW.updated_at>=NEW.expires_at OR NOT EXISTS (
 SELECT 1 FROM notes n JOIN originals o ON o.note_id=n.id JOIN openrouter_connections k ON k.account_id=NEW.account_id
 WHERE n.id=NEW.note_id AND n.version=NEW.note_version AND n.ownership_generation=NEW.ownership_generation
 AND o.id=NEW.original_id AND o.sha256=NEW.source_sha256 AND o.bytes=NEW.source_bytes
 AND k.state='linked' AND k.epoch=NEW.credential_epoch
))
BEGIN SELECT RAISE(ABORT,'llm_pdf_preview_changed'); END;
--> statement-breakpoint
CREATE TRIGGER llm_pdf_preview_consume BEFORE UPDATE ON llm_pdf_previews
WHEN NEW.state='consumed' AND OLD.state!='consumed' AND (
 OLD.state!='ready' OR OLD.cancel_generation!=0 OR NEW.cancel_generation!=0 OR NEW.updated_at>=OLD.expires_at
 OR NOT EXISTS(SELECT 1 FROM llm_conversions c WHERE c.job_id=NEW.consumed_job_id AND c.selection_state='fixed' AND c.operation='regenerate'
 AND c.account_id=OLD.account_id AND c.note_id=OLD.note_id AND c.note_version=OLD.note_version
 AND c.original_id=OLD.original_id AND c.source_sha256=OLD.source_sha256 AND c.source_bytes=OLD.source_bytes
 AND c.source_ownership_generation=OLD.ownership_generation AND c.credential_epoch=OLD.credential_epoch
 AND c.pdf_selection_manifest=OLD.result_json)
)
BEGIN SELECT RAISE(ABORT,'llm_pdf_preview_consumed'); END;
--> statement-breakpoint
CREATE TRIGGER llm_pdf_preview_pin BEFORE DELETE ON llm_pdf_previews
WHEN OLD.state IN ('queued','running','unknown') OR OLD.owner_state IN ('active','unknown')
BEGIN SELECT RAISE(ABORT,'llm_pdf_preview_pin'); END;
--> statement-breakpoint
CREATE TABLE __llm_pdf_fk_assertion(valid INTEGER NOT NULL CHECK(valid=1));
--> statement-breakpoint
INSERT INTO __llm_pdf_fk_assertion SELECT CASE WHEN EXISTS(SELECT 1 FROM pragma_foreign_key_check) THEN 0 ELSE 1 END;
--> statement-breakpoint
DROP TABLE __llm_pdf_fk_assertion;
