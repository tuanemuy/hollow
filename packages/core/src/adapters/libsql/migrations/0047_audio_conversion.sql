DROP TRIGGER IF EXISTS openrouter_connection_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_conversion_pin;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_dispatch_intent;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_dispatch_pin;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_reservation_release;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_dispatch_identity;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_dispatch_recipe;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_conversion_queue;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_pdf_preview_admission;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_pdf_preview_consume;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_conversion_identity;
--> statement-breakpoint
DROP TRIGGER IF EXISTS regeneration_binding_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS machine_regeneration_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_conversions_source_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_conversions_source_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_conversions_source_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_pdf_previews_source_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS machine_regenerations_source_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS machine_regenerations_source_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS p5d_regeneration_source_bindings_retirement;
--> statement-breakpoint
DROP TRIGGER IF EXISTS p5d_llm_conversions_admission;
--> statement-breakpoint
DROP TRIGGER IF EXISTS p5d_llm_conversions_claim;
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_llm_conversions` (
	`source_origin` text,
	`source_binding_id` text,
	`source_memory_bytes` integer DEFAULT 0 NOT NULL,
	`source_input_receipt` text,
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
	`audio_recipe` text,
	`audio_plan` text,
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
	FOREIGN KEY (`source_binding_id`) REFERENCES `regeneration_source_bindings`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`job_id`) REFERENCES `conversion_jobs`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`original_id`) REFERENCES `originals`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "llm_conversions_source_memory" CHECK(typeof("__new_llm_conversions"."source_memory_bytes")='integer' and "__new_llm_conversions"."source_memory_bytes" in (0,52428800)),
	CONSTRAINT "llm_conversion_values" CHECK("__new_llm_conversions"."operation" in ('import','regenerate') and "__new_llm_conversions"."source_format" in ('text','html','markdown','docx','xlsx','pptx','pdf','image','audio') and "__new_llm_conversions"."source_state" in ('processing','ready','needs_ai','failed','cancelled') and "__new_llm_conversions"."source_coverage" in ('complete','partial','no_text') and "__new_llm_conversions"."phase" in ('queued','classifying','preparing','dispatching','response-ready','finalizing','terminal')),
	CONSTRAINT "llm_conversion_preparation" CHECK(((("__new_llm_conversions"."selection_state"='pdf-pending' and "__new_llm_conversions"."source_format"='pdf' and "__new_llm_conversions"."operation"='import' and "__new_llm_conversions"."model_id" is null and "__new_llm_conversions"."preparation_version" is null and "__new_llm_conversions"."prompt_version" is null and "__new_llm_conversions"."pdf_selection_manifest" is null and "__new_llm_conversions"."candidate_text_model_id" is not null and length("__new_llm_conversions"."candidate_text_model_id") between 1 and 255 and "__new_llm_conversions"."candidate_image_model_id" is not null and length("__new_llm_conversions"."candidate_image_model_id") between 1 and 255 and typeof("__new_llm_conversions"."candidate_settings_version")='integer' and "__new_llm_conversions"."candidate_settings_version">=1 and typeof("__new_llm_conversions"."source_ownership_generation")='integer' and "__new_llm_conversions"."source_ownership_generation" between 1 and 9007199254740991 and "__new_llm_conversions"."phase" in ('queued','classifying','terminal') and "__new_llm_conversions"."outcome"!='succeeded') or ("__new_llm_conversions"."selection_state"='fixed' and "__new_llm_conversions"."model_id" is not null and "__new_llm_conversions"."prompt_version" is not null and "__new_llm_conversions"."candidate_text_model_id" is null and "__new_llm_conversions"."candidate_image_model_id" is null and "__new_llm_conversions"."candidate_settings_version" is null and "__new_llm_conversions"."phase"!='classifying' and (("__new_llm_conversions"."source_format" in ('text','html','markdown') and ("__new_llm_conversions"."preparation_version" is null or "__new_llm_conversions"."preparation_version"=1) and "__new_llm_conversions"."prompt_version"=1) or ("__new_llm_conversions"."source_format" in ('docx','xlsx','pptx','pdf') and "__new_llm_conversions"."preparation_version" is not null and "__new_llm_conversions"."preparation_version"=2 and "__new_llm_conversions"."prompt_version"=1) or ("__new_llm_conversions"."source_format"='image' and "__new_llm_conversions"."preparation_version" is not null and "__new_llm_conversions"."preparation_version"=3 and "__new_llm_conversions"."prompt_version"=2) or ("__new_llm_conversions"."source_format"='pdf' and "__new_llm_conversions"."preparation_version" is not null and "__new_llm_conversions"."preparation_version"=4 and "__new_llm_conversions"."prompt_version"=3 and "__new_llm_conversions"."pdf_selection_manifest" is not null)) and (("__new_llm_conversions"."pdf_selection_manifest" is null and "__new_llm_conversions"."source_ownership_generation" is null) or ("__new_llm_conversions"."pdf_selection_manifest" is not null and "__new_llm_conversions"."source_format"='pdf' and "__new_llm_conversions"."preparation_version" in (2,4) and typeof("__new_llm_conversions"."source_ownership_generation")='integer' and "__new_llm_conversions"."source_ownership_generation" between 1 and 9007199254740991 and length(cast("__new_llm_conversions"."pdf_selection_manifest" as blob)) between 1 and 65536 and json_valid("__new_llm_conversions"."pdf_selection_manifest"))))) and "__new_llm_conversions"."audio_recipe" is null and "__new_llm_conversions"."audio_plan" is null) or ("__new_llm_conversions"."selection_state"='fixed' and "__new_llm_conversions"."source_format"='audio' and "__new_llm_conversions"."preparation_version"=5 and "__new_llm_conversions"."prompt_version"=4 and "__new_llm_conversions"."model_id" is not null and "__new_llm_conversions"."candidate_text_model_id" is null and "__new_llm_conversions"."candidate_image_model_id" is null and "__new_llm_conversions"."candidate_settings_version" is null and "__new_llm_conversions"."pdf_selection_manifest" is null and "__new_llm_conversions"."source_ownership_generation" is null and "__new_llm_conversions"."phase"!='classifying' and "__new_llm_conversions"."audio_recipe" is not null and json_valid("__new_llm_conversions"."audio_recipe") and json_extract("__new_llm_conversions"."audio_recipe",'$.pipelineVersion')=1 and json_extract("__new_llm_conversions"."audio_recipe",'$.decoderPolicy')='ffmpeg-8.0.1-pcm16-16k-v1' and length(json_extract("__new_llm_conversions"."audio_recipe",'$.sttModelId')) between 1 and 255 and "__new_llm_conversions"."audio_plan" is not null and json_valid("__new_llm_conversions"."audio_plan") and json_extract("__new_llm_conversions"."audio_plan",'$.kind') in ('awaiting-manifest','transcribing','structuring','responses-complete') and length(cast("__new_llm_conversions"."audio_plan" as blob)) between 1 and 131072)),
	CONSTRAINT "llm_conversion_pdf_proof" CHECK("__new_llm_conversions"."pdf_selection_manifest" is null or case when json_valid("__new_llm_conversions"."pdf_selection_manifest") then coalesce((json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.preparationVersion')="__new_llm_conversions"."preparation_version" and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.promptVersion')="__new_llm_conversions"."prompt_version" and ((json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.kind')='strict-text' and "__new_llm_conversions"."preparation_version"=2 and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.modelKind')='chat-text' and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.policy')='strict-text-v1' and length(json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.preparedDocumentHash'))=64 and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.pages') between 1 and 200) or (json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.kind')='pages' and "__new_llm_conversions"."preparation_version"=4 and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.modelKind')='chat-image' and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.reason') in ('VISUAL_CONTENT','ORDER_UNPROVEN') and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.kind')='pdf-pages' and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.preparationVersion')=4 and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.source.originalId')="__new_llm_conversions"."original_id" and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.source.sha256')="__new_llm_conversions"."source_sha256" and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.source.bytes')="__new_llm_conversions"."source_bytes" and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.source.format')='pdf' and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.policy')='display-crop-white-144dpi-v1' and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.renderer')='pdfjs-6.3.289-canvas-1.0.8-v1' and json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.total') between 1 and 32 and json_array_length("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.pages')=json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.total') and length(json_extract("__new_llm_conversions"."pdf_selection_manifest",'$.manifest.sha256'))=64))),0) else 0 end),
	CONSTRAINT "llm_conversion_limits" CHECK(("__new_llm_conversions"."source_bytes" between 1 and 52428800 or ("__new_llm_conversions"."source_format"='audio' and "__new_llm_conversions"."source_bytes" between 1 and 209715200)) and length("__new_llm_conversions"."source_sha256")=64 and length("__new_llm_conversions"."request_digest")=64 and length("__new_llm_conversions"."model_id") between 1 and 255 and length(cast("__new_llm_conversions"."instruction" as blob))<=8192 and "__new_llm_conversions"."credential_epoch">=1 and "__new_llm_conversions"."note_version">=0 and "__new_llm_conversions"."admission_sequence">=1 and "__new_llm_conversions"."version">=1 and "__new_llm_conversions"."cancel_generation">=0 and "__new_llm_conversions"."response_budget" in (0,2097152)),
	CONSTRAINT "llm_conversion_deadline" CHECK("__new_llm_conversions"."deadline_at"="__new_llm_conversions"."created_at"+1800000 and "__new_llm_conversions"."updated_at">="__new_llm_conversions"."created_at"),
	CONSTRAINT "llm_conversion_owner" CHECK(("__new_llm_conversions"."owner_state"='idle' and "__new_llm_conversions"."runtime_id" is null and "__new_llm_conversions"."owner_token" is null) or ("__new_llm_conversions"."owner_state" in ('active','unknown','closed') and "__new_llm_conversions"."runtime_id" is not null and length("__new_llm_conversions"."runtime_id")>0 and "__new_llm_conversions"."owner_token" is not null and length("__new_llm_conversions"."owner_token")>0)),
	CONSTRAINT "llm_conversion_outcome" CHECK(("__new_llm_conversions"."outcome"='pending' and "__new_llm_conversions"."phase"!='terminal' and "__new_llm_conversions"."failure" is null and "__new_llm_conversions"."result_version" is null) or ("__new_llm_conversions"."outcome"='succeeded' and "__new_llm_conversions"."phase"='terminal' and "__new_llm_conversions"."failure" is null and "__new_llm_conversions"."result_version" is not null and "__new_llm_conversions"."result_version">="__new_llm_conversions"."note_version" and "__new_llm_conversions"."owner_state"='closed') or ("__new_llm_conversions"."outcome"='failed' and "__new_llm_conversions"."phase"='terminal' and "__new_llm_conversions"."failure" is not null and "__new_llm_conversions"."result_version" is null) or ("__new_llm_conversions"."outcome"='cancelled' and "__new_llm_conversions"."phase"='terminal' and "__new_llm_conversions"."failure" is null and "__new_llm_conversions"."result_version" is null) or ("__new_llm_conversions"."outcome"='unknown' and "__new_llm_conversions"."failure" in ('LLM_DELIVERY_UNKNOWN','LLM_OWNERSHIP_UNKNOWN') and "__new_llm_conversions"."failure" is not null and "__new_llm_conversions"."result_version" is null))
);
--> statement-breakpoint
INSERT INTO `__new_llm_conversions`("source_origin", "source_binding_id", "source_memory_bytes", "source_input_receipt", "job_id", "account_id", "note_id", "original_id", "command_id", "request_digest", "operation", "retry_of", "source_sha256", "source_bytes", "source_format", "source_state", "source_coverage", "note_version", "original_revision_no", "credential_epoch", "model_id", "audio_recipe", "audio_plan", "instruction", "prompt_version", "admission_sequence", "created_at", "deadline_at", "updated_at", "phase", "outcome", "failure", "result_version", "owner_state", "runtime_id", "owner_token", "cancel_generation", "response_budget", "version", "preparation_version", "selection_state", "candidate_text_model_id", "candidate_image_model_id", "candidate_settings_version", "pdf_selection_manifest", "source_ownership_generation") SELECT "source_origin", "source_binding_id", "source_memory_bytes", "source_input_receipt", "job_id", "account_id", "note_id", "original_id", "command_id", "request_digest", "operation", "retry_of", "source_sha256", "source_bytes", "source_format", "source_state", "source_coverage", "note_version", "original_revision_no", "credential_epoch", "model_id", NULL, NULL, "instruction", "prompt_version", "admission_sequence", "created_at", "deadline_at", "updated_at", "phase", "outcome", "failure", "result_version", "owner_state", "runtime_id", "owner_token", "cancel_generation", "response_budget", "version", "preparation_version", "selection_state", "candidate_text_model_id", "candidate_image_model_id", "candidate_settings_version", "pdf_selection_manifest", "source_ownership_generation" FROM `llm_conversions`;--> statement-breakpoint
DROP TABLE `llm_conversions`;--> statement-breakpoint
ALTER TABLE `__new_llm_conversions` RENAME TO `llm_conversions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `llm_conversion_command` ON `llm_conversions` (`account_id`,`command_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `llm_conversions_source_binding` ON `llm_conversions` (`job_id`,`source_binding_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `llm_conversion_active_note` ON `llm_conversions` (`note_id`) WHERE "llm_conversions"."phase" != 'terminal' or "llm_conversions"."owner_state" in ('active','unknown');--> statement-breakpoint
CREATE INDEX `llm_conversion_admission` ON `llm_conversions` (`account_id`,`credential_epoch`,`admission_sequence`);--> statement-breakpoint
CREATE INDEX `llm_conversion_phase` ON `llm_conversions` (`phase`,`created_at`);--> statement-breakpoint
CREATE TABLE `__new_llm_dispatches` (
	`job_id` text NOT NULL,
	`stage` text DEFAULT 'structure' NOT NULL,
	`response_kind` text DEFAULT 'chat' NOT NULL,
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
	PRIMARY KEY(`job_id`, `stage`, `ordinal`),
	FOREIGN KEY (`job_id`) REFERENCES `llm_conversions`(`job_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "llm_dispatch_limits" CHECK((("__new_llm_dispatches"."stage"='structure' and "__new_llm_dispatches"."response_kind"='chat' and "__new_llm_dispatches"."ordinal" between 0 and 31) or ("__new_llm_dispatches"."stage"='transcribe' and "__new_llm_dispatches"."response_kind"='transcript' and "__new_llm_dispatches"."ordinal" between 0 and 511)) and length("__new_llm_dispatches"."input_sha256")=64 and length("__new_llm_dispatches"."owner_token")>0 and length("__new_llm_dispatches"."runtime_id")>0 and ("__new_llm_dispatches"."input_tokens" is null or "__new_llm_dispatches"."input_tokens">=0) and ("__new_llm_dispatches"."output_tokens" is null or "__new_llm_dispatches"."output_tokens">=0)),
	CONSTRAINT "llm_dispatch_shape" CHECK(("__new_llm_dispatches"."state"='prepared' and "__new_llm_dispatches"."intent_at" is null and "__new_llm_dispatches"."content" is null and "__new_llm_dispatches"."input_tokens" is null and "__new_llm_dispatches"."output_tokens" is null) or ("__new_llm_dispatches"."state" in ('intent','unknown','not-sent','scrubbed') and "__new_llm_dispatches"."intent_at" is not null and "__new_llm_dispatches"."content" is null and "__new_llm_dispatches"."input_tokens" is null and "__new_llm_dispatches"."output_tokens" is null) or ("__new_llm_dispatches"."state"='response' and "__new_llm_dispatches"."intent_at" is not null and "__new_llm_dispatches"."content" is not null and length(cast("__new_llm_dispatches"."content" as blob)) between case when "__new_llm_dispatches"."response_kind"='transcript' then 0 else 1 end and 65536))
);
--> statement-breakpoint
INSERT INTO `__new_llm_dispatches`("job_id", "stage", "response_kind", "ordinal", "id", "input_sha256", "owner_token", "runtime_id", "state", "intent_at", "content", "input_tokens", "output_tokens") SELECT "job_id", 'structure', 'chat', "ordinal", "id", "input_sha256", "owner_token", "runtime_id", "state", "intent_at", "content", "input_tokens", "output_tokens" FROM `llm_dispatches`;--> statement-breakpoint
DROP TABLE `llm_dispatches`;--> statement-breakpoint
ALTER TABLE `__new_llm_dispatches` RENAME TO `llm_dispatches`;--> statement-breakpoint
CREATE UNIQUE INDEX `llm_dispatches_id_unique` ON `llm_dispatches` (`id`);
--> statement-breakpoint
CREATE TRIGGER openrouter_connection_update_guard BEFORE UPDATE ON openrouter_connections
WHEN NEW.account_id != OLD.account_id OR NEW.version != OLD.version + 1
 OR NEW.epoch NOT IN (OLD.epoch, OLD.epoch + 1)
 OR (OLD.ever_linked_at IS NOT NULL AND NEW.ever_linked_at IS NOT OLD.ever_linked_at AND NOT (coalesce(
   OLD.credential_envelope IS NOT NULL
   AND NEW.account_id = OLD.account_id AND NEW.version = OLD.version + 1 AND NEW.epoch = OLD.epoch + 1
   AND NEW.state = 'unlinked' AND NEW.ever_linked_at IS NULL
   AND NEW.credential_envelope IS NULL AND NEW.provider_user_id IS NULL AND NEW.key_expires_at IS NULL
   AND NEW.linked_at IS NULL AND NEW.last_used_at IS NULL
   AND EXISTS(
     SELECT 1 FROM accounts a
     JOIN account_deletions d ON d.id = a.deletion_id AND d.account_id = a.id AND d.fence_auth_version = a.auth_version
     JOIN account_deletion_credential_origins o ON o.account_id = a.id AND o.provider = 'openrouter' AND o.mode = 'native-v1' AND o.credential_epoch = OLD.epoch
     JOIN account_deletion_credential_uses u ON u.id = o.use_id AND u.provider = o.provider AND u.account_id = a.id AND u.result_account_id = a.id
     WHERE a.id = OLD.account_id AND a.state = 'deleted'
       AND d.state = 'running' AND d.cursor_table = 'openrouter-connection' AND d.lease_token IS NOT NULL AND d.lease_until >= NEW.updated_at
       AND u.state = 'closed' AND u.caller_ended = 1 AND u.acknowledged = 1 AND u.evidence_id IS NOT NULL
   ),0) OR coalesce(
   OLD.state = 'unlinked' AND OLD.credential_envelope IS NULL AND OLD.provider_user_id IS NULL
   AND OLD.key_expires_at IS NULL AND OLD.linked_at IS NULL AND OLD.last_used_at IS NULL
   AND NEW.account_id = OLD.account_id AND NEW.version = OLD.version + 1 AND NEW.epoch = OLD.epoch + 1
   AND NEW.state = 'unlinked' AND NEW.ever_linked_at IS NULL
   AND NEW.credential_envelope IS NULL AND NEW.provider_user_id IS NULL AND NEW.key_expires_at IS NULL
   AND NEW.linked_at IS NULL AND NEW.last_used_at IS NULL
   AND EXISTS(
     SELECT 1 FROM accounts a
     JOIN account_deletions d ON d.id = a.deletion_id AND d.account_id = a.id AND d.fence_auth_version = a.auth_version
     JOIN account_deletion_credential_origins o ON o.account_id = a.id AND o.provider = 'openrouter' AND o.mode = 'native-v1' AND o.credential_epoch = OLD.epoch - 1
     JOIN account_deletion_credential_uses u ON u.id = o.use_id AND u.provider = o.provider AND u.account_id = a.id AND u.result_account_id = a.id
     WHERE a.id = OLD.account_id AND a.state = 'deleted'
       AND d.state = 'running' AND d.cursor_table = 'openrouter-connection' AND d.lease_token IS NOT NULL AND d.lease_until >= NEW.updated_at
       AND u.state = 'closed' AND u.caller_ended = 1 AND u.acknowledged = 1 AND u.evidence_id IS NOT NULL
       AND NOT EXISTS(SELECT 1 FROM account_deletion_debts debt WHERE debt.intent_id = d.id)
   )
   AND NOT EXISTS(SELECT 1 FROM openrouter_attempts attempt WHERE attempt.account_id = OLD.account_id AND attempt.state IN('exchanging','checking'))
   AND (NOT EXISTS(SELECT 1 FROM drive_authorization_attempts x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='authorization' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_control_operations x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='control' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR x.read_pinned!=0 OR x.refresh_pending!=0 OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='backup' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN regeneration_source_attempts x ON x.binding_id=b.id WHERE (b.executor_id=OLD.account_id OR b.credential_owner_id=OLD.account_id) AND NOT coalesce(x.phase='terminal' AND (json_extract(x.completion,'$.kind')='never-owned' OR (x.owner_state='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
AND NOT EXISTS(SELECT 1 FROM account_deletion_credential_uses u WHERE (u.account_id=OLD.account_id OR u.result_account_id=OLD.account_id) AND (u.state!='closed' OR u.caller_ended!=1 OR u.acknowledged!=1))
AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (w.note_id IN(SELECT id FROM notes WHERE owner_account_id=OLD.account_id AND owner_workspace_id IS NULL) OR w.owner_id IN(SELECT id FROM drive_backup_transfers WHERE account_id=OLD.account_id))))
   AND NOT (      exists(select 1 from drive_authorization_attempts where account_id=OLD.account_id and owner_state in('active','unknown'))
      or exists(select 1 from drive_control_operations where account_id=OLD.account_id and owner_state in('active','unknown'))
      or exists(select 1 from drive_backup_transfers where account_id=OLD.account_id and (owner_state in('active','unknown') or read_pinned!=0 or refresh_pending!=0))
      or exists(select 1 from regeneration_source_bindings b join regeneration_source_attempts a on a.binding_id=b.id where (b.executor_id=OLD.account_id or b.credential_owner_id=OLD.account_id) and (a.owner_state in('active','unknown') or (a.owner_state='closed' and (coalesce(json_extract(a.completion,'$.callerEnded'),0)!=1 or coalesce(json_extract(a.completion,'$.acknowledged'),0)!=1))))
      or exists(select 1 from llm_conversions where account_id=OLD.account_id and (owner_state in('active','unknown') or source_memory_bytes!=0 or (source_input_receipt is not null and json_extract(source_input_receipt,'$.state')!='closed')))
      or exists(select 1 from llm_pdf_previews where account_id=OLD.account_id and (owner_state in('active','unknown') or source_memory_bytes!=0 or (source_input_receipt is not null and json_extract(source_input_receipt,'$.state')!='closed')))
      or exists(select 1 from machine_regenerations where executor_id=OLD.account_id and (owner_state in('active','unknown') or source_memory_bytes!=0 or (source_input_receipt is not null and json_extract(source_input_receipt,'$.state')!='closed')))
      or exists(select 1 from account_deletion_credential_uses where (account_id=OLD.account_id or result_account_id=OLD.account_id) and (state!='closed' or caller_ended!=1 or acknowledged!=1))
      or exists(select 1 from drive_authorization_attempts d where d.account_id=OLD.account_id and d.owner_state='closed' and not exists(select 1 from account_deletion_drive_acknowledgments a where a.kind='authorization' and a.id=d.id and a.runtime_generation=d.runtime_generation and a.owner_token=d.owner_token))
      or exists(select 1 from drive_control_operations d where d.account_id=OLD.account_id and d.owner_state='closed' and not exists(select 1 from account_deletion_drive_acknowledgments a where a.kind='control' and a.id=d.id and a.runtime_generation=d.runtime_generation and a.owner_token=d.owner_token))
      or exists(select 1 from drive_backup_transfers d where d.account_id=OLD.account_id and d.owner_state='closed' and not exists(select 1 from account_deletion_drive_acknowledgments a where a.kind='backup' and a.id=d.id and a.runtime_generation=d.runtime_generation and a.owner_token=d.owner_token))
      or exists(select 1 from object_writes w where w.active=1 and (w.note_id in(select id from notes where owner_account_id=OLD.account_id and owner_workspace_id is null) or w.owner_id in(select id from drive_backup_transfers where account_id=OLD.account_id))))
   ,0)))
 OR (NEW.epoch = OLD.epoch AND (
   NEW.credential_envelope IS NOT OLD.credential_envelope
   OR NEW.linked_at IS NOT OLD.linked_at
   OR NEW.provider_user_id IS NOT OLD.provider_user_id
   OR NEW.key_expires_at IS NOT OLD.key_expires_at
   OR (NEW.state != OLD.state AND NOT (OLD.state = 'linked' AND NEW.state = 'needs_relink'))
 ))
 OR (NEW.epoch = OLD.epoch + 1 AND NEW.state = 'needs_relink')
BEGIN SELECT RAISE(ABORT, 'openrouter_connection_update_guard'); END;
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
 OR NEW.stage != OLD.stage OR NEW.response_kind != OLD.response_kind
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
 AND ((NEW.stage='structure' AND NEW.response_kind='chat' AND ((coalesce(c.preparation_version,1) IN (1,2) AND NEW.ordinal BETWEEN 0 AND 15)
 OR (c.preparation_version=3 AND NEW.ordinal=0)
 OR (c.preparation_version=4 AND NEW.ordinal>=0 AND NEW.ordinal<json_extract(c.pdf_selection_manifest,'$.manifest.total'))))
 OR (c.preparation_version=5 AND NEW.stage='transcribe' AND NEW.response_kind='transcript' AND json_extract(c.audio_plan,'$.kind')='transcribing' AND NEW.ordinal>=0 AND NEW.ordinal<json_array_length(c.audio_plan,'$.manifest.chunks') AND NEW.input_sha256=json_extract(c.audio_plan,'$.manifest.chunks['||NEW.ordinal||'].sha256'))
 OR (c.preparation_version=5 AND NEW.stage='structure' AND NEW.response_kind='chat' AND json_extract(c.audio_plan,'$.kind')='structuring' AND NEW.ordinal>=0 AND NEW.ordinal<json_array_length(c.audio_plan,'$.segments') AND NEW.input_sha256=json_extract(c.audio_plan,'$.segments['||NEW.ordinal||'].sha256')))
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
CREATE TRIGGER llm_conversion_identity BEFORE UPDATE ON llm_conversions
WHEN NEW.job_id != OLD.job_id OR NEW.account_id != OLD.account_id OR NEW.note_id != OLD.note_id
 OR NEW.original_id != OLD.original_id OR NEW.command_id != OLD.command_id OR NEW.request_digest != OLD.request_digest
 OR NEW.audio_recipe IS NOT OLD.audio_recipe
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
CREATE TRIGGER regeneration_binding_update BEFORE UPDATE ON regeneration_source_bindings
WHEN (NEW.id!=OLD.id OR NEW.record_id!=OLD.record_id OR NEW.executor_id!=OLD.executor_id OR NEW.credential_owner_id!=OLD.credential_owner_id
 OR NEW.note_id!=OLD.note_id OR NEW.original_id!=OLD.original_id OR NEW.subject!=OLD.subject OR NEW.drive_epoch!=OLD.drive_epoch
 OR NEW.ownership_generation!=OLD.ownership_generation OR NEW.fingerprint!=OLD.fingerprint OR NEW.created_at!=OLD.created_at
 OR NEW.llm_job_id IS NOT OLD.llm_job_id OR NEW.preview_id IS NOT OLD.preview_id OR NEW.machine_request_id IS NOT OLD.machine_request_id
 OR NEW.version!=OLD.version+1 OR NEW.cancel_generation<OLD.cancel_generation) AND NOT coalesce((OLD.retention='usable' AND NEW.retention='recorder-deleted' AND (EXISTS(SELECT 1 FROM account_deletions d JOIN accounts a ON a.id=d.account_id WHERE d.id=NEW.deletion_id AND d.account_id=OLD.executor_id AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state='running') OR EXISTS(SELECT 1 FROM account_deletions d JOIN accounts a ON a.id=d.account_id WHERE d.id=NEW.deletion_id AND d.account_id=OLD.credential_owner_id AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state='running')) AND NEW.id IS OLD.id AND NEW.record_id IS OLD.record_id AND NEW.executor_id IS OLD.executor_id AND NEW.credential_owner_id IS OLD.credential_owner_id AND NEW.note_id IS OLD.note_id AND NEW.original_id IS OLD.original_id AND NEW.drive_epoch IS OLD.drive_epoch AND NEW.ownership_generation IS OLD.ownership_generation AND NEW.fingerprint IS OLD.fingerprint AND NEW.llm_job_id IS OLD.llm_job_id AND NEW.preview_id IS OLD.preview_id AND NEW.machine_request_id IS OLD.machine_request_id AND NEW.cancel_generation IS OLD.cancel_generation AND NEW.created_at IS OLD.created_at AND NEW.version=OLD.version+1 AND NEW.redaction_version=1 AND NEW.subject IS NULL AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts a WHERE a.binding_id=OLD.id AND NOT coalesce(a.phase='terminal' AND (json_extract(a.completion,'$.kind')='never-owned' OR (a.owner_state='closed' AND json_extract(a.completion,'$.callerEnded')=1 AND json_extract(a.completion,'$.acknowledged')=1)),0))
AND NOT EXISTS(SELECT 1 FROM llm_conversions c WHERE c.source_binding_id=OLD.id AND (c.phase!='terminal' OR c.owner_state IN('active','unknown') OR c.source_memory_bytes!=0 OR (c.source_input_receipt IS NOT NULL AND json_extract(c.source_input_receipt,'$.state')!='closed')))
AND NOT EXISTS(SELECT 1 FROM llm_pdf_previews c WHERE c.source_binding_id=OLD.id AND (c.state='running' OR c.owner_state IN('active','unknown') OR c.source_memory_bytes!=0 OR (c.source_input_receipt IS NOT NULL AND json_extract(c.source_input_receipt,'$.state')!='closed')))
AND NOT EXISTS(SELECT 1 FROM machine_regenerations c WHERE c.source_binding_id=OLD.id AND (c.phase!='terminal' OR c.owner_state IN('active','unknown') OR c.source_memory_bytes!=0 OR (c.source_input_receipt IS NOT NULL AND json_extract(c.source_input_receipt,'$.state')!='closed')))),0)
BEGIN SELECT RAISE(ABORT,'regeneration_binding_immutable'); END;
--> statement-breakpoint
CREATE TRIGGER machine_regeneration_delete BEFORE DELETE ON machine_regenerations
WHEN (OLD.phase!='terminal' OR OLD.outcome='unknown' OR OLD.owner_state IN('active','unknown')) AND NOT coalesce((EXISTS(SELECT 1 FROM notes n
 JOIN note_purges p ON p.id=n.trash_operation_id AND p.note_id=n.id
 JOIN account_deletion_purges ap ON ap.purge_id=p.id AND ap.note_id=n.id AND ap.intent_id=p.account_deletion_id
 JOIN account_deletions d ON d.id=ap.intent_id
 JOIN accounts a ON a.id=d.account_id
 WHERE n.id=OLD.note_id AND n.owner_workspace_id IS NULL AND n.owner_account_id=d.account_id
 AND n.lifecycle='purging' AND p.cause='account-deletion' AND p.operation_id=d.id
 AND p.deleted_account_id=d.account_id AND p.account_id IS NULL AND p.workspace_id IS NULL AND p.workspace_deletion_id IS NULL
 AND p.state='running' AND p.lease_token IS NOT NULL AND p.lease_until>p.updated_at
 AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state!='succeeded')
 AND OLD.phase='terminal' AND OLD.outcome='unknown' AND OLD.owner_state='closed'
 AND OLD.runtime_id IS NOT NULL AND OLD.owner_token IS NOT NULL AND OLD.source_memory_bytes=0
 AND OLD.source_input_receipt IS NOT NULL AND json_valid(OLD.source_input_receipt)
 AND json_extract(OLD.source_input_receipt,'$.state')='closed'
 AND json_extract(OLD.source_input_receipt,'$.runtimeId')=OLD.runtime_id
 AND json_extract(OLD.source_input_receipt,'$.token')=OLD.owner_token
 AND json_type(OLD.source_input_receipt,'$.generation')='integer'
 AND json_extract(OLD.source_input_receipt,'$.generation') BETWEEN 1 AND 9007199254740991
 AND json_type(OLD.source_input_receipt,'$.proofId')='text' AND length(json_extract(OLD.source_input_receipt,'$.proofId'))=36
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts x JOIN regeneration_source_bindings b ON b.id=x.binding_id WHERE b.note_id=OLD.note_id AND NOT coalesce(x.phase='terminal' AND ((x.owner_state='none' AND x.cancel_generation>0 AND json_extract(x.completion,'$.kind')='never-owned' AND json_extract(x.completion,'$.outcome')='cancelled') OR (x.owner_state='closed' AND json_extract(x.completion,'$.kind')='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
 AND NOT EXISTS(SELECT 1 FROM machine_regenerations m WHERE m.note_id=OLD.note_id AND (m.phase!='terminal' OR m.owner_state IN('active','unknown') OR m.source_memory_bytes!=0 OR (m.source_input_receipt IS NOT NULL AND json_extract(m.source_input_receipt,'$.state')!='closed')))
 AND NOT EXISTS(SELECT 1 FROM llm_conversions c WHERE c.note_id=OLD.note_id AND (c.phase!='terminal' OR c.owner_state IN('active','unknown') OR c.response_budget!=0 OR c.source_memory_bytes!=0 OR (c.source_input_receipt IS NOT NULL AND json_extract(c.source_input_receipt,'$.state')!='closed') OR EXISTS(SELECT 1 FROM llm_quota_reservations q WHERE q.job_id=c.job_id AND q.state='reserved')))
 AND NOT EXISTS(SELECT 1 FROM llm_pdf_previews x WHERE x.note_id=OLD.note_id AND (x.state IN('queued','running','unknown') OR x.owner_state IN('active','unknown') OR x.source_memory_bytes!=0 OR (x.source_input_receipt IS NOT NULL AND json_extract(x.source_input_receipt,'$.state')!='closed')))
 AND NOT EXISTS(SELECT 1 FROM drive_backup_jobs j WHERE j.note_id=OLD.note_id AND j.terminal_at IS NULL)
 AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.note_id=OLD.note_id AND (t.owner_state IN('active','unknown') OR t.phase NOT IN('succeeded','failed','cancelled') OR t.read_pinned!=0 OR t.refresh_pending!=0 OR (t.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments ack WHERE ack.kind='backup' AND ack.id=t.id AND ack.runtime_generation=t.runtime_generation AND ack.owner_token=t.owner_token))))
 AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (
 w.note_id=OLD.note_id OR
 (w.kind='media-upload' AND EXISTS(SELECT 1 FROM media_uploads u JOIN media_drafts md ON md.id=u.draft_id WHERE u.id=w.owner_id AND md.note_id=OLD.note_id)) OR
 (w.kind='reference-job' AND EXISTS(SELECT 1 FROM reference_jobs j WHERE j.id=w.owner_id AND (j.note_id=OLD.note_id OR EXISTS(SELECT 1 FROM reference_settings rs JOIN reference_settings own ON own.bundle_id=rs.bundle_id WHERE rs.note_id=j.note_id AND own.note_id=OLD.note_id)))) OR
 (w.kind='conversion-job' AND EXISTS(SELECT 1 FROM conversion_jobs j WHERE j.id=w.owner_id AND j.note_id=OLD.note_id)) OR
 (w.kind='llm-pdf-preview' AND EXISTS(SELECT 1 FROM llm_pdf_previews v WHERE v.id=w.owner_id AND v.note_id=OLD.note_id)) OR
 (w.kind='drive-backup' AND EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.id=w.owner_id AND t.note_id=OLD.note_id)) OR
 (w.kind='export-operation' AND EXISTS(SELECT 1 FROM export_operations e WHERE e.id=w.owner_id AND e.note_id=OLD.note_id)) OR
 (w.kind='pdf-artifact' AND EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=w.owner_id AND a.live_note_id=OLD.note_id)) OR
 (w.kind='pdf-delivery' AND EXISTS(SELECT 1 FROM pdf_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE v.id=w.owner_id AND a.live_note_id=OLD.note_id)) OR
 (w.kind='pdf-anonymous-delivery' AND EXISTS(SELECT 1 FROM pdf_anonymous_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE v.id=w.owner_id AND a.live_note_id=OLD.note_id)) OR
 (w.kind='zip-source' AND EXISTS(SELECT 1 FROM zip_attempts v JOIN zip_targets t ON t.request_id=v.request_id AND t.ordinal=v.ordinal WHERE v.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-spool' AND EXISTS(SELECT 1 FROM zip_spools z JOIN zip_attempts v ON v.id=z.attempt_id JOIN zip_targets t ON t.request_id=v.request_id AND t.ordinal=v.ordinal WHERE z.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-assembly' AND EXISTS(SELECT 1 FROM zip_assemblies v JOIN zip_targets t ON t.request_id=v.request_id WHERE v.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-delivery' AND EXISTS(SELECT 1 FROM zip_deliveries v JOIN zip_artifact_entries e ON e.artifact_id=v.artifact_id WHERE v.id=w.owner_id AND e.live_note_id=OLD.note_id)) OR
 (w.kind='import-upload' AND EXISTS(SELECT 1 FROM upload_reservations u JOIN originals o ON o.storage_key=u.storage_key WHERE u.id=w.owner_id AND o.note_id=OLD.note_id))))
 AND NOT EXISTS(SELECT 1 FROM pdf_computations c WHERE c.live_note_id=OLD.note_id AND (c.state!='closed' OR c.workspace_removed=0))
 AND NOT EXISTS(SELECT 1 FROM pdf_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE a.live_note_id=OLD.note_id AND v.state!='closed')
 AND NOT EXISTS(SELECT 1 FROM pdf_anonymous_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE a.live_note_id=OLD.note_id AND v.state!='closed')
 AND NOT EXISTS(SELECT 1 FROM zip_targets t JOIN zip_requests q ON q.id=t.request_id WHERE t.live_note_id=OLD.note_id AND q.state!='terminal')
 AND NOT EXISTS(SELECT 1 FROM zip_pdf_holds h JOIN pdf_artifacts a ON a.id=h.artifact_id WHERE a.live_note_id=OLD.note_id AND h.state!='released')
 AND NOT EXISTS(SELECT 1 FROM zip_spool_refs f JOIN zip_targets t ON t.request_id=f.request_id AND t.ordinal=f.ordinal WHERE t.live_note_id=OLD.note_id)
 AND NOT EXISTS(SELECT 1 FROM zip_assemblies v JOIN zip_targets t ON t.request_id=v.request_id WHERE t.live_note_id=OLD.note_id AND (v.state!='closed' OR v.storage_key IS NOT NULL))
 AND NOT EXISTS(SELECT 1 FROM zip_deliveries v JOIN zip_artifact_entries e ON e.artifact_id=v.artifact_id WHERE e.live_note_id=OLD.note_id AND v.state!='closed')
 AND json_extract(OLD.source_input_receipt,'$.consumer.kind')='machine-regeneration' AND json_extract(OLD.source_input_receipt,'$.consumer.id')=OLD.id),0)
BEGIN SELECT RAISE(ABORT,'machine_regeneration_owned'); END;
--> statement-breakpoint
CREATE TRIGGER llm_conversions_source_insert BEFORE INSERT ON llm_conversions WHEN NEW.source_origin IS NULL OR NEW.source_origin NOT IN('local-original','drive-record','redacted')
 OR (NEW.source_origin IN('local-original','redacted') AND NEW.source_binding_id IS NOT NULL)
 OR (NEW.source_origin='drive-record' AND (NEW.source_binding_id IS NULL OR NOT EXISTS(
 SELECT 1 FROM regeneration_source_bindings b JOIN drive_backup_records r ON r.id=b.record_id JOIN originals o ON o.id=b.original_id
 WHERE b.id=NEW.source_binding_id AND b.llm_job_id=NEW.job_id AND b.executor_id=NEW.account_id
 AND b.note_id=NEW.note_id AND b.original_id=NEW.original_id AND r.sha256=NEW.source_sha256 AND r.bytes=NEW.source_bytes AND o.format=NEW.source_format)))
 OR typeof(NEW.source_memory_bytes)!='integer' OR NEW.source_memory_bytes NOT IN(0,52428800)
 OR NEW.source_origin='redacted' OR NEW.source_memory_bytes!=0
 OR NEW.source_input_receipt IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'regeneration_source_invalid'); END;
--> statement-breakpoint
CREATE TRIGGER llm_conversions_source_update BEFORE UPDATE ON llm_conversions WHEN NEW.source_origin IS NULL OR NEW.source_origin NOT IN('local-original','drive-record','redacted')
 OR (NEW.source_origin IN('local-original','redacted') AND NEW.source_binding_id IS NOT NULL)
 OR (NEW.source_origin='drive-record' AND (NEW.source_binding_id IS NULL OR NOT EXISTS(
 SELECT 1 FROM regeneration_source_bindings b JOIN drive_backup_records r ON r.id=b.record_id JOIN originals o ON o.id=b.original_id
 WHERE b.id=NEW.source_binding_id AND b.llm_job_id=NEW.job_id AND b.executor_id=NEW.account_id
 AND b.note_id=NEW.note_id AND b.original_id=NEW.original_id AND r.sha256=NEW.source_sha256 AND r.bytes=NEW.source_bytes AND o.format=NEW.source_format)))
 OR typeof(NEW.source_memory_bytes)!='integer' OR NEW.source_memory_bytes NOT IN(0,52428800)
 OR (NEW.source_origin='redacted' AND NOT coalesce((NEW.phase='terminal' AND NEW.outcome!='unknown') AND NEW.owner_state IN('idle','closed') AND NEW.source_memory_bytes=0,0))
 OR ((NEW.source_origin IS NOT OLD.source_origin OR NEW.source_binding_id IS NOT OLD.source_binding_id)
 AND NOT coalesce(OLD.source_origin='drive-record' AND NEW.source_origin='redacted' AND (NEW.phase='terminal' AND NEW.outcome!='unknown') AND NEW.owner_state IN('idle','closed') AND NEW.source_memory_bytes=0
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts WHERE binding_id=OLD.source_binding_id AND NOT coalesce(phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)),0)),0))
 OR (NEW.source_memory_bytes<OLD.source_memory_bytes AND NOT coalesce(((OLD.source_input_receipt IS NULL AND NEW.source_input_receipt IS NULL AND NEW.owner_state='closed') OR (OLD.source_input_receipt IS NOT NULL AND json_extract(NEW.source_input_receipt,'$.state')='closed' AND OLD.owner_state!='unknown' AND NEW.owner_state!='unknown'))
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts WHERE binding_id=OLD.source_binding_id AND NOT coalesce(phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)),0)),0))
 OR (NEW.source_memory_bytes>OLD.source_memory_bytes AND NOT coalesce(
 NEW.source_origin!='redacted' AND NEW.source_input_receipt IS NOT NULL AND json_extract(NEW.source_input_receipt,'$.state')='active' AND NEW.owner_state='active' AND NEW.runtime_id IS NOT NULL AND NEW.owner_token IS NOT NULL
 AND NEW.cancel_generation=0 AND (NEW.phase!='terminal' AND NEW.outcome='pending')
 AND EXISTS(SELECT 1 FROM openrouter_connections k WHERE k.account_id=NEW.account_id AND k.state='linked' AND k.epoch=NEW.credential_epoch)
 AND (NEW.source_origin='local-original' OR EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN drive_connections d ON d.account_id=b.credential_owner_id JOIN notes bn ON bn.id=b.note_id WHERE b.id=NEW.source_binding_id AND b.cancel_generation=0 AND d.state='linked' AND d.epoch=b.drive_epoch AND json_extract(d.credential,'$.subject')=b.subject AND bn.ownership_generation=b.ownership_generation))
 AND EXISTS(SELECT 1 FROM notes n JOIN originals o ON o.id=NEW.original_id JOIN accounts a ON a.id=NEW.account_id
 WHERE n.id=NEW.note_id AND n.lifecycle='active' AND n.version=NEW.note_version AND o.note_id=n.id
 AND o.sha256=NEW.source_sha256 AND o.bytes=NEW.source_bytes AND a.verified_at IS NOT NULL
 AND ((n.owner_workspace_id IS NULL AND n.owner_account_id=a.id)
 OR EXISTS(SELECT 1 FROM workspace_members m JOIN workspaces w ON w.id=m.workspace_id WHERE m.workspace_id=n.owner_workspace_id AND m.account_id=a.id AND m.role IN('owner','editor') AND w.state='active')))
 AND ((SELECT coalesce(sum(source_memory_bytes),0) FROM llm_conversions)
 +(SELECT coalesce(sum(source_memory_bytes),0) FROM llm_pdf_previews)
 +(SELECT coalesce(sum(source_memory_bytes),0) FROM machine_regenerations)-OLD.source_memory_bytes+NEW.source_memory_bytes)<=104857600,0))
 OR (NEW.source_input_receipt IS NOT NULL AND NOT coalesce(CASE WHEN json_valid(NEW.source_input_receipt) THEN
 json_type(NEW.source_input_receipt)='object'
 AND (SELECT count(*) FROM json_each(NEW.source_input_receipt))=CASE json_extract(NEW.source_input_receipt,'$.state') WHEN 'closed' THEN 6 ELSE 5 END
 AND NOT EXISTS(SELECT 1 FROM json_each(NEW.source_input_receipt) WHERE key NOT IN('consumer','runtimeId','token','generation','state','proofId'))
 AND json_type(NEW.source_input_receipt,'$.consumer')='object'
 AND (SELECT count(*) FROM json_each(NEW.source_input_receipt,'$.consumer'))=2
 AND json_extract(NEW.source_input_receipt,'$.consumer.kind')='llm-conversion' AND json_extract(NEW.source_input_receipt,'$.consumer.id')=NEW.job_id
 AND json_extract(NEW.source_input_receipt,'$.runtimeId')=NEW.runtime_id AND json_extract(NEW.source_input_receipt,'$.token')=NEW.owner_token
 AND json_type(NEW.source_input_receipt,'$.generation')='integer' AND json_extract(NEW.source_input_receipt,'$.generation') BETWEEN 1 AND 9007199254740991
 AND ((NEW.source_memory_bytes=52428800 AND json_extract(NEW.source_input_receipt,'$.state') IN('active','unknown') AND json_type(NEW.source_input_receipt,'$.proofId') IS NULL)
 OR (NEW.source_memory_bytes=0 AND json_extract(NEW.source_input_receipt,'$.state')='closed' AND json_type(NEW.source_input_receipt,'$.proofId')='text' AND length(json_extract(NEW.source_input_receipt,'$.proofId'))=36))
 ELSE 0 END,0))
 OR (NEW.source_input_receipt IS NOT OLD.source_input_receipt AND NOT coalesce(
 (OLD.source_input_receipt IS NULL AND OLD.source_memory_bytes=0 AND NEW.source_memory_bytes=52428800 AND json_extract(NEW.source_input_receipt,'$.state')='active' AND json_extract(NEW.source_input_receipt,'$.generation')=1)
 OR (OLD.source_input_receipt IS NOT NULL AND NEW.source_input_receipt IS NOT NULL AND json_extract(NEW.source_input_receipt,'$.consumer.kind')=json_extract(OLD.source_input_receipt,'$.consumer.kind') AND json_extract(NEW.source_input_receipt,'$.consumer.id')=json_extract(OLD.source_input_receipt,'$.consumer.id')
 AND ((OLD.source_memory_bytes=0 AND json_extract(OLD.source_input_receipt,'$.state')='closed' AND NEW.source_memory_bytes=52428800 AND json_extract(NEW.source_input_receipt,'$.state')='active' AND json_extract(NEW.source_input_receipt,'$.generation')=json_extract(OLD.source_input_receipt,'$.generation')+1)
 OR (json_extract(NEW.source_input_receipt,'$.generation')=json_extract(OLD.source_input_receipt,'$.generation') AND json_extract(NEW.source_input_receipt,'$.runtimeId')=json_extract(OLD.source_input_receipt,'$.runtimeId') AND json_extract(NEW.source_input_receipt,'$.token')=json_extract(OLD.source_input_receipt,'$.token')
 AND ((json_extract(OLD.source_input_receipt,'$.state')='active' AND json_extract(NEW.source_input_receipt,'$.state')='unknown') OR (json_extract(OLD.source_input_receipt,'$.state') IN('active','unknown') AND json_extract(NEW.source_input_receipt,'$.state')='closed' AND OLD.owner_state!='unknown' AND NEW.owner_state!='unknown'))))),0))
 BEGIN SELECT RAISE(ABORT,'regeneration_source_changed'); END;
--> statement-breakpoint
CREATE TRIGGER llm_conversions_source_delete BEFORE DELETE ON llm_conversions
 WHEN (OLD.source_binding_id IS NOT NULL OR OLD.source_memory_bytes!=0) AND NOT coalesce((EXISTS(SELECT 1 FROM notes n
 JOIN note_purges p ON p.id=n.trash_operation_id AND p.note_id=n.id
 JOIN account_deletion_purges ap ON ap.purge_id=p.id AND ap.note_id=n.id AND ap.intent_id=p.account_deletion_id
 JOIN account_deletions d ON d.id=ap.intent_id
 JOIN accounts a ON a.id=d.account_id
 WHERE n.id=OLD.note_id AND n.owner_workspace_id IS NULL AND n.owner_account_id=d.account_id
 AND n.lifecycle='purging' AND p.cause='account-deletion' AND p.operation_id=d.id
 AND p.deleted_account_id=d.account_id AND p.account_id IS NULL AND p.workspace_id IS NULL AND p.workspace_deletion_id IS NULL
 AND p.state='running' AND p.lease_token IS NOT NULL AND p.lease_until>p.updated_at
 AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state!='succeeded')
 AND OLD.phase='terminal' AND OLD.outcome='unknown' AND OLD.owner_state='closed'
 AND OLD.runtime_id IS NOT NULL AND OLD.owner_token IS NOT NULL AND OLD.source_memory_bytes=0
 AND OLD.source_input_receipt IS NOT NULL AND json_valid(OLD.source_input_receipt)
 AND json_extract(OLD.source_input_receipt,'$.state')='closed'
 AND json_extract(OLD.source_input_receipt,'$.runtimeId')=OLD.runtime_id
 AND json_extract(OLD.source_input_receipt,'$.token')=OLD.owner_token
 AND json_type(OLD.source_input_receipt,'$.generation')='integer'
 AND json_extract(OLD.source_input_receipt,'$.generation') BETWEEN 1 AND 9007199254740991
 AND json_type(OLD.source_input_receipt,'$.proofId')='text' AND length(json_extract(OLD.source_input_receipt,'$.proofId'))=36
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts x JOIN regeneration_source_bindings b ON b.id=x.binding_id WHERE b.note_id=OLD.note_id AND NOT coalesce(x.phase='terminal' AND ((x.owner_state='none' AND x.cancel_generation>0 AND json_extract(x.completion,'$.kind')='never-owned' AND json_extract(x.completion,'$.outcome')='cancelled') OR (x.owner_state='closed' AND json_extract(x.completion,'$.kind')='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
 AND NOT EXISTS(SELECT 1 FROM machine_regenerations m WHERE m.note_id=OLD.note_id AND (m.phase!='terminal' OR m.owner_state IN('active','unknown') OR m.source_memory_bytes!=0 OR (m.source_input_receipt IS NOT NULL AND json_extract(m.source_input_receipt,'$.state')!='closed')))
 AND NOT EXISTS(SELECT 1 FROM llm_conversions c WHERE c.note_id=OLD.note_id AND (c.phase!='terminal' OR c.owner_state IN('active','unknown') OR c.response_budget!=0 OR c.source_memory_bytes!=0 OR (c.source_input_receipt IS NOT NULL AND json_extract(c.source_input_receipt,'$.state')!='closed') OR EXISTS(SELECT 1 FROM llm_quota_reservations q WHERE q.job_id=c.job_id AND q.state='reserved')))
 AND NOT EXISTS(SELECT 1 FROM llm_pdf_previews x WHERE x.note_id=OLD.note_id AND (x.state IN('queued','running','unknown') OR x.owner_state IN('active','unknown') OR x.source_memory_bytes!=0 OR (x.source_input_receipt IS NOT NULL AND json_extract(x.source_input_receipt,'$.state')!='closed')))
 AND NOT EXISTS(SELECT 1 FROM drive_backup_jobs j WHERE j.note_id=OLD.note_id AND j.terminal_at IS NULL)
 AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.note_id=OLD.note_id AND (t.owner_state IN('active','unknown') OR t.phase NOT IN('succeeded','failed','cancelled') OR t.read_pinned!=0 OR t.refresh_pending!=0 OR (t.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments ack WHERE ack.kind='backup' AND ack.id=t.id AND ack.runtime_generation=t.runtime_generation AND ack.owner_token=t.owner_token))))
 AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (
 w.note_id=OLD.note_id OR
 (w.kind='media-upload' AND EXISTS(SELECT 1 FROM media_uploads u JOIN media_drafts md ON md.id=u.draft_id WHERE u.id=w.owner_id AND md.note_id=OLD.note_id)) OR
 (w.kind='reference-job' AND EXISTS(SELECT 1 FROM reference_jobs j WHERE j.id=w.owner_id AND (j.note_id=OLD.note_id OR EXISTS(SELECT 1 FROM reference_settings rs JOIN reference_settings own ON own.bundle_id=rs.bundle_id WHERE rs.note_id=j.note_id AND own.note_id=OLD.note_id)))) OR
 (w.kind='conversion-job' AND EXISTS(SELECT 1 FROM conversion_jobs j WHERE j.id=w.owner_id AND j.note_id=OLD.note_id)) OR
 (w.kind='llm-pdf-preview' AND EXISTS(SELECT 1 FROM llm_pdf_previews v WHERE v.id=w.owner_id AND v.note_id=OLD.note_id)) OR
 (w.kind='drive-backup' AND EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.id=w.owner_id AND t.note_id=OLD.note_id)) OR
 (w.kind='export-operation' AND EXISTS(SELECT 1 FROM export_operations e WHERE e.id=w.owner_id AND e.note_id=OLD.note_id)) OR
 (w.kind='pdf-artifact' AND EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=w.owner_id AND a.live_note_id=OLD.note_id)) OR
 (w.kind='pdf-delivery' AND EXISTS(SELECT 1 FROM pdf_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE v.id=w.owner_id AND a.live_note_id=OLD.note_id)) OR
 (w.kind='pdf-anonymous-delivery' AND EXISTS(SELECT 1 FROM pdf_anonymous_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE v.id=w.owner_id AND a.live_note_id=OLD.note_id)) OR
 (w.kind='zip-source' AND EXISTS(SELECT 1 FROM zip_attempts v JOIN zip_targets t ON t.request_id=v.request_id AND t.ordinal=v.ordinal WHERE v.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-spool' AND EXISTS(SELECT 1 FROM zip_spools z JOIN zip_attempts v ON v.id=z.attempt_id JOIN zip_targets t ON t.request_id=v.request_id AND t.ordinal=v.ordinal WHERE z.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-assembly' AND EXISTS(SELECT 1 FROM zip_assemblies v JOIN zip_targets t ON t.request_id=v.request_id WHERE v.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-delivery' AND EXISTS(SELECT 1 FROM zip_deliveries v JOIN zip_artifact_entries e ON e.artifact_id=v.artifact_id WHERE v.id=w.owner_id AND e.live_note_id=OLD.note_id)) OR
 (w.kind='import-upload' AND EXISTS(SELECT 1 FROM upload_reservations u JOIN originals o ON o.storage_key=u.storage_key WHERE u.id=w.owner_id AND o.note_id=OLD.note_id))))
 AND NOT EXISTS(SELECT 1 FROM pdf_computations c WHERE c.live_note_id=OLD.note_id AND (c.state!='closed' OR c.workspace_removed=0))
 AND NOT EXISTS(SELECT 1 FROM pdf_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE a.live_note_id=OLD.note_id AND v.state!='closed')
 AND NOT EXISTS(SELECT 1 FROM pdf_anonymous_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE a.live_note_id=OLD.note_id AND v.state!='closed')
 AND NOT EXISTS(SELECT 1 FROM zip_targets t JOIN zip_requests q ON q.id=t.request_id WHERE t.live_note_id=OLD.note_id AND q.state!='terminal')
 AND NOT EXISTS(SELECT 1 FROM zip_pdf_holds h JOIN pdf_artifacts a ON a.id=h.artifact_id WHERE a.live_note_id=OLD.note_id AND h.state!='released')
 AND NOT EXISTS(SELECT 1 FROM zip_spool_refs f JOIN zip_targets t ON t.request_id=f.request_id AND t.ordinal=f.ordinal WHERE t.live_note_id=OLD.note_id)
 AND NOT EXISTS(SELECT 1 FROM zip_assemblies v JOIN zip_targets t ON t.request_id=v.request_id WHERE t.live_note_id=OLD.note_id AND (v.state!='closed' OR v.storage_key IS NOT NULL))
 AND NOT EXISTS(SELECT 1 FROM zip_deliveries v JOIN zip_artifact_entries e ON e.artifact_id=v.artifact_id WHERE e.live_note_id=OLD.note_id AND v.state!='closed')
 AND json_extract(OLD.source_input_receipt,'$.consumer.kind')='llm-conversion' AND json_extract(OLD.source_input_receipt,'$.consumer.id')=OLD.job_id),0)
BEGIN SELECT RAISE(ABORT,'regeneration_source_owned'); END;
--> statement-breakpoint
CREATE TRIGGER llm_pdf_previews_source_update BEFORE UPDATE ON llm_pdf_previews WHEN NEW.source_origin IS NULL OR NEW.source_origin NOT IN('local-original','drive-record','redacted')
 OR (NEW.source_origin IN('local-original','redacted') AND NEW.source_binding_id IS NOT NULL)
 OR (NEW.source_origin='drive-record' AND (NEW.source_binding_id IS NULL OR NOT EXISTS(
 SELECT 1 FROM regeneration_source_bindings b JOIN drive_backup_records r ON r.id=b.record_id JOIN originals o ON o.id=b.original_id
 WHERE b.id=NEW.source_binding_id AND b.preview_id=NEW.id AND b.executor_id=NEW.account_id
 AND b.note_id=NEW.note_id AND b.original_id=NEW.original_id AND r.sha256=NEW.source_sha256 AND r.bytes=NEW.source_bytes AND o.format='pdf')))
 OR typeof(NEW.source_memory_bytes)!='integer' OR NEW.source_memory_bytes NOT IN(0,52428800)
 OR (NEW.source_origin='redacted' AND NOT coalesce((NEW.state IN('consumed','failed','cancelled','expired')) AND NEW.owner_state IN('idle','closed') AND NEW.source_memory_bytes=0,0))
 OR ((NEW.source_origin IS NOT OLD.source_origin OR NEW.source_binding_id IS NOT OLD.source_binding_id)
 AND NOT coalesce(OLD.source_origin='drive-record' AND NEW.source_origin='redacted' AND (NEW.state IN('consumed','failed','cancelled','expired')) AND NEW.owner_state IN('idle','closed') AND NEW.source_memory_bytes=0
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts WHERE binding_id=OLD.source_binding_id AND NOT coalesce(phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)),0)),0))
 OR (NEW.source_memory_bytes<OLD.source_memory_bytes AND NOT coalesce(((OLD.source_input_receipt IS NULL AND NEW.source_input_receipt IS NULL AND NEW.owner_state='closed') OR (OLD.source_input_receipt IS NOT NULL AND json_extract(NEW.source_input_receipt,'$.state')='closed' AND OLD.owner_state!='unknown' AND NEW.owner_state!='unknown'))
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts WHERE binding_id=OLD.source_binding_id AND NOT coalesce(phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)),0)),0))
 OR (NEW.source_memory_bytes>OLD.source_memory_bytes AND NOT coalesce(
 NEW.source_origin!='redacted' AND NEW.source_input_receipt IS NOT NULL AND json_extract(NEW.source_input_receipt,'$.state')='active' AND NEW.owner_state='active' AND NEW.runtime_id IS NOT NULL AND NEW.owner_token IS NOT NULL
 AND NEW.cancel_generation=0 AND (NEW.state='running')
 AND EXISTS(SELECT 1 FROM openrouter_connections k WHERE k.account_id=NEW.account_id AND k.state='linked' AND k.epoch=NEW.credential_epoch)
 AND (NEW.source_origin='local-original' OR EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN drive_connections d ON d.account_id=b.credential_owner_id JOIN notes bn ON bn.id=b.note_id WHERE b.id=NEW.source_binding_id AND b.cancel_generation=0 AND d.state='linked' AND d.epoch=b.drive_epoch AND json_extract(d.credential,'$.subject')=b.subject AND bn.ownership_generation=b.ownership_generation))
 AND EXISTS(SELECT 1 FROM notes n JOIN originals o ON o.id=NEW.original_id JOIN accounts a ON a.id=NEW.account_id
 WHERE n.id=NEW.note_id AND n.lifecycle='active' AND n.version=NEW.note_version AND o.note_id=n.id
 AND o.sha256=NEW.source_sha256 AND o.bytes=NEW.source_bytes AND a.verified_at IS NOT NULL
 AND ((n.owner_workspace_id IS NULL AND n.owner_account_id=a.id)
 OR EXISTS(SELECT 1 FROM workspace_members m JOIN workspaces w ON w.id=m.workspace_id WHERE m.workspace_id=n.owner_workspace_id AND m.account_id=a.id AND m.role IN('owner','editor') AND w.state='active')))
 AND ((SELECT coalesce(sum(source_memory_bytes),0) FROM llm_conversions)
 +(SELECT coalesce(sum(source_memory_bytes),0) FROM llm_pdf_previews)
 +(SELECT coalesce(sum(source_memory_bytes),0) FROM machine_regenerations)-OLD.source_memory_bytes+NEW.source_memory_bytes)<=104857600,0))
 OR (NEW.source_input_receipt IS NOT NULL AND NOT coalesce(CASE WHEN json_valid(NEW.source_input_receipt) THEN
 json_type(NEW.source_input_receipt)='object'
 AND (SELECT count(*) FROM json_each(NEW.source_input_receipt))=CASE json_extract(NEW.source_input_receipt,'$.state') WHEN 'closed' THEN 6 ELSE 5 END
 AND NOT EXISTS(SELECT 1 FROM json_each(NEW.source_input_receipt) WHERE key NOT IN('consumer','runtimeId','token','generation','state','proofId'))
 AND json_type(NEW.source_input_receipt,'$.consumer')='object'
 AND (SELECT count(*) FROM json_each(NEW.source_input_receipt,'$.consumer'))=2
 AND json_extract(NEW.source_input_receipt,'$.consumer.kind')='pdf-preview' AND json_extract(NEW.source_input_receipt,'$.consumer.id')=NEW.id
 AND json_extract(NEW.source_input_receipt,'$.runtimeId')=NEW.runtime_id AND json_extract(NEW.source_input_receipt,'$.token')=NEW.owner_token
 AND json_type(NEW.source_input_receipt,'$.generation')='integer' AND json_extract(NEW.source_input_receipt,'$.generation') BETWEEN 1 AND 9007199254740991
 AND ((NEW.source_memory_bytes=52428800 AND json_extract(NEW.source_input_receipt,'$.state') IN('active','unknown') AND json_type(NEW.source_input_receipt,'$.proofId') IS NULL)
 OR (NEW.source_memory_bytes=0 AND json_extract(NEW.source_input_receipt,'$.state')='closed' AND json_type(NEW.source_input_receipt,'$.proofId')='text' AND length(json_extract(NEW.source_input_receipt,'$.proofId'))=36))
 ELSE 0 END,0))
 OR (NEW.source_input_receipt IS NOT OLD.source_input_receipt AND NOT coalesce(
 (OLD.source_input_receipt IS NULL AND OLD.source_memory_bytes=0 AND NEW.source_memory_bytes=52428800 AND json_extract(NEW.source_input_receipt,'$.state')='active' AND json_extract(NEW.source_input_receipt,'$.generation')=1)
 OR (OLD.source_input_receipt IS NOT NULL AND NEW.source_input_receipt IS NOT NULL AND json_extract(NEW.source_input_receipt,'$.consumer.kind')=json_extract(OLD.source_input_receipt,'$.consumer.kind') AND json_extract(NEW.source_input_receipt,'$.consumer.id')=json_extract(OLD.source_input_receipt,'$.consumer.id')
 AND ((OLD.source_memory_bytes=0 AND json_extract(OLD.source_input_receipt,'$.state')='closed' AND NEW.source_memory_bytes=52428800 AND json_extract(NEW.source_input_receipt,'$.state')='active' AND json_extract(NEW.source_input_receipt,'$.generation')=json_extract(OLD.source_input_receipt,'$.generation')+1)
 OR (json_extract(NEW.source_input_receipt,'$.generation')=json_extract(OLD.source_input_receipt,'$.generation') AND json_extract(NEW.source_input_receipt,'$.runtimeId')=json_extract(OLD.source_input_receipt,'$.runtimeId') AND json_extract(NEW.source_input_receipt,'$.token')=json_extract(OLD.source_input_receipt,'$.token')
 AND ((json_extract(OLD.source_input_receipt,'$.state')='active' AND json_extract(NEW.source_input_receipt,'$.state')='unknown') OR (json_extract(OLD.source_input_receipt,'$.state') IN('active','unknown') AND json_extract(NEW.source_input_receipt,'$.state')='closed' AND OLD.owner_state!='unknown' AND NEW.owner_state!='unknown'))))),0))
 BEGIN SELECT RAISE(ABORT,'regeneration_source_changed'); END;
--> statement-breakpoint
CREATE TRIGGER machine_regenerations_source_update BEFORE UPDATE ON machine_regenerations WHEN NEW.source_origin IS NULL OR NEW.source_origin NOT IN('local-original','drive-record','redacted')
 OR (NEW.source_origin IN('local-original','redacted') AND NEW.source_binding_id IS NOT NULL)
 OR (NEW.source_origin='drive-record' AND (NEW.source_binding_id IS NULL OR NOT EXISTS(
 SELECT 1 FROM regeneration_source_bindings b JOIN drive_backup_records r ON r.id=b.record_id JOIN originals o ON o.id=b.original_id
 WHERE b.id=NEW.source_binding_id AND b.machine_request_id=NEW.id AND b.executor_id=NEW.executor_id
 AND b.note_id=NEW.note_id AND b.original_id=NEW.original_id AND r.sha256=json_extract(NEW.source,'$.sha256') AND r.bytes=json_extract(NEW.source,'$.bytes') AND o.format=json_extract(NEW.source,'$.format'))))
 OR typeof(NEW.source_memory_bytes)!='integer' OR NEW.source_memory_bytes NOT IN(0,52428800)
 OR (NEW.source_origin='redacted' AND NOT coalesce((NEW.phase='terminal' AND NEW.outcome!='unknown') AND NEW.owner_state IN('none','closed') AND NEW.source_memory_bytes=0,0))
 OR ((NEW.source_origin IS NOT OLD.source_origin OR NEW.source_binding_id IS NOT OLD.source_binding_id)
 AND NOT coalesce(OLD.source_origin='drive-record' AND NEW.source_origin='redacted' AND (NEW.phase='terminal' AND NEW.outcome!='unknown') AND NEW.owner_state IN('none','closed') AND NEW.source_memory_bytes=0
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts WHERE binding_id=OLD.source_binding_id AND NOT coalesce(phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)),0)),0))
 OR (NEW.source_memory_bytes<OLD.source_memory_bytes AND NOT coalesce(((OLD.source_input_receipt IS NULL AND NEW.source_input_receipt IS NULL AND NEW.owner_state='closed') OR (OLD.source_input_receipt IS NOT NULL AND json_extract(NEW.source_input_receipt,'$.state')='closed' AND OLD.owner_state!='unknown' AND NEW.owner_state!='unknown'))
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts WHERE binding_id=OLD.source_binding_id AND NOT coalesce(phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)),0)),0))
 OR (NEW.source_memory_bytes>OLD.source_memory_bytes AND NOT coalesce(
 NEW.source_origin!='redacted' AND NEW.source_input_receipt IS NOT NULL AND json_extract(NEW.source_input_receipt,'$.state')='active' AND NEW.owner_state='active' AND NEW.runtime_id IS NOT NULL AND NEW.owner_token IS NOT NULL
 AND NEW.cancel_generation=0 AND (NEW.phase!='terminal' AND NEW.outcome='pending')
 AND (NEW.source_origin='local-original' OR EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN drive_connections d ON d.account_id=b.credential_owner_id JOIN notes bn ON bn.id=b.note_id WHERE b.id=NEW.source_binding_id AND b.cancel_generation=0 AND d.state='linked' AND d.epoch=b.drive_epoch AND json_extract(d.credential,'$.subject')=b.subject AND bn.ownership_generation=b.ownership_generation))
 AND EXISTS(SELECT 1 FROM notes n JOIN originals o ON o.id=NEW.original_id JOIN accounts a ON a.id=NEW.executor_id
 WHERE n.id=NEW.note_id AND n.lifecycle='active' AND n.version=NEW.note_version AND o.note_id=n.id
 AND o.sha256=json_extract(NEW.source,'$.sha256') AND o.bytes=json_extract(NEW.source,'$.bytes') AND a.verified_at IS NOT NULL
 AND ((n.owner_workspace_id IS NULL AND n.owner_account_id=a.id)
 OR EXISTS(SELECT 1 FROM workspace_members m JOIN workspaces w ON w.id=m.workspace_id WHERE m.workspace_id=n.owner_workspace_id AND m.account_id=a.id AND m.role IN('owner','editor') AND w.state='active')))
 AND ((SELECT coalesce(sum(source_memory_bytes),0) FROM llm_conversions)
 +(SELECT coalesce(sum(source_memory_bytes),0) FROM llm_pdf_previews)
 +(SELECT coalesce(sum(source_memory_bytes),0) FROM machine_regenerations)-OLD.source_memory_bytes+NEW.source_memory_bytes)<=104857600,0))
 OR (NEW.source_input_receipt IS NOT NULL AND NOT coalesce(CASE WHEN json_valid(NEW.source_input_receipt) THEN
 json_type(NEW.source_input_receipt)='object'
 AND (SELECT count(*) FROM json_each(NEW.source_input_receipt))=CASE json_extract(NEW.source_input_receipt,'$.state') WHEN 'closed' THEN 6 ELSE 5 END
 AND NOT EXISTS(SELECT 1 FROM json_each(NEW.source_input_receipt) WHERE key NOT IN('consumer','runtimeId','token','generation','state','proofId'))
 AND json_type(NEW.source_input_receipt,'$.consumer')='object'
 AND (SELECT count(*) FROM json_each(NEW.source_input_receipt,'$.consumer'))=2
 AND json_extract(NEW.source_input_receipt,'$.consumer.kind')='machine-regeneration' AND json_extract(NEW.source_input_receipt,'$.consumer.id')=NEW.id
 AND json_extract(NEW.source_input_receipt,'$.runtimeId')=NEW.runtime_id AND json_extract(NEW.source_input_receipt,'$.token')=NEW.owner_token
 AND json_type(NEW.source_input_receipt,'$.generation')='integer' AND json_extract(NEW.source_input_receipt,'$.generation') BETWEEN 1 AND 9007199254740991
 AND ((NEW.source_memory_bytes=52428800 AND json_extract(NEW.source_input_receipt,'$.state') IN('active','unknown') AND json_type(NEW.source_input_receipt,'$.proofId') IS NULL)
 OR (NEW.source_memory_bytes=0 AND json_extract(NEW.source_input_receipt,'$.state')='closed' AND json_type(NEW.source_input_receipt,'$.proofId')='text' AND length(json_extract(NEW.source_input_receipt,'$.proofId'))=36))
 ELSE 0 END,0))
 OR (NEW.source_input_receipt IS NOT OLD.source_input_receipt AND NOT coalesce(
 (OLD.source_input_receipt IS NULL AND OLD.source_memory_bytes=0 AND NEW.source_memory_bytes=52428800 AND json_extract(NEW.source_input_receipt,'$.state')='active' AND json_extract(NEW.source_input_receipt,'$.generation')=1)
 OR (OLD.source_input_receipt IS NOT NULL AND NEW.source_input_receipt IS NOT NULL AND json_extract(NEW.source_input_receipt,'$.consumer.kind')=json_extract(OLD.source_input_receipt,'$.consumer.kind') AND json_extract(NEW.source_input_receipt,'$.consumer.id')=json_extract(OLD.source_input_receipt,'$.consumer.id')
 AND ((OLD.source_memory_bytes=0 AND json_extract(OLD.source_input_receipt,'$.state')='closed' AND NEW.source_memory_bytes=52428800 AND json_extract(NEW.source_input_receipt,'$.state')='active' AND json_extract(NEW.source_input_receipt,'$.generation')=json_extract(OLD.source_input_receipt,'$.generation')+1)
 OR (json_extract(NEW.source_input_receipt,'$.generation')=json_extract(OLD.source_input_receipt,'$.generation') AND json_extract(NEW.source_input_receipt,'$.runtimeId')=json_extract(OLD.source_input_receipt,'$.runtimeId') AND json_extract(NEW.source_input_receipt,'$.token')=json_extract(OLD.source_input_receipt,'$.token')
 AND ((json_extract(OLD.source_input_receipt,'$.state')='active' AND json_extract(NEW.source_input_receipt,'$.state')='unknown') OR (json_extract(OLD.source_input_receipt,'$.state') IN('active','unknown') AND json_extract(NEW.source_input_receipt,'$.state')='closed' AND OLD.owner_state!='unknown' AND NEW.owner_state!='unknown'))))),0))
 BEGIN SELECT RAISE(ABORT,'regeneration_source_changed'); END;
--> statement-breakpoint
CREATE TRIGGER machine_regenerations_source_delete BEFORE DELETE ON machine_regenerations
 WHEN (OLD.source_binding_id IS NOT NULL OR OLD.source_memory_bytes!=0) AND NOT coalesce((EXISTS(SELECT 1 FROM notes n
 JOIN note_purges p ON p.id=n.trash_operation_id AND p.note_id=n.id
 JOIN account_deletion_purges ap ON ap.purge_id=p.id AND ap.note_id=n.id AND ap.intent_id=p.account_deletion_id
 JOIN account_deletions d ON d.id=ap.intent_id
 JOIN accounts a ON a.id=d.account_id
 WHERE n.id=OLD.note_id AND n.owner_workspace_id IS NULL AND n.owner_account_id=d.account_id
 AND n.lifecycle='purging' AND p.cause='account-deletion' AND p.operation_id=d.id
 AND p.deleted_account_id=d.account_id AND p.account_id IS NULL AND p.workspace_id IS NULL AND p.workspace_deletion_id IS NULL
 AND p.state='running' AND p.lease_token IS NOT NULL AND p.lease_until>p.updated_at
 AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state!='succeeded')
 AND OLD.phase='terminal' AND OLD.outcome='unknown' AND OLD.owner_state='closed'
 AND OLD.runtime_id IS NOT NULL AND OLD.owner_token IS NOT NULL AND OLD.source_memory_bytes=0
 AND OLD.source_input_receipt IS NOT NULL AND json_valid(OLD.source_input_receipt)
 AND json_extract(OLD.source_input_receipt,'$.state')='closed'
 AND json_extract(OLD.source_input_receipt,'$.runtimeId')=OLD.runtime_id
 AND json_extract(OLD.source_input_receipt,'$.token')=OLD.owner_token
 AND json_type(OLD.source_input_receipt,'$.generation')='integer'
 AND json_extract(OLD.source_input_receipt,'$.generation') BETWEEN 1 AND 9007199254740991
 AND json_type(OLD.source_input_receipt,'$.proofId')='text' AND length(json_extract(OLD.source_input_receipt,'$.proofId'))=36
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts x JOIN regeneration_source_bindings b ON b.id=x.binding_id WHERE b.note_id=OLD.note_id AND NOT coalesce(x.phase='terminal' AND ((x.owner_state='none' AND x.cancel_generation>0 AND json_extract(x.completion,'$.kind')='never-owned' AND json_extract(x.completion,'$.outcome')='cancelled') OR (x.owner_state='closed' AND json_extract(x.completion,'$.kind')='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
 AND NOT EXISTS(SELECT 1 FROM machine_regenerations m WHERE m.note_id=OLD.note_id AND (m.phase!='terminal' OR m.owner_state IN('active','unknown') OR m.source_memory_bytes!=0 OR (m.source_input_receipt IS NOT NULL AND json_extract(m.source_input_receipt,'$.state')!='closed')))
 AND NOT EXISTS(SELECT 1 FROM llm_conversions c WHERE c.note_id=OLD.note_id AND (c.phase!='terminal' OR c.owner_state IN('active','unknown') OR c.response_budget!=0 OR c.source_memory_bytes!=0 OR (c.source_input_receipt IS NOT NULL AND json_extract(c.source_input_receipt,'$.state')!='closed') OR EXISTS(SELECT 1 FROM llm_quota_reservations q WHERE q.job_id=c.job_id AND q.state='reserved')))
 AND NOT EXISTS(SELECT 1 FROM llm_pdf_previews x WHERE x.note_id=OLD.note_id AND (x.state IN('queued','running','unknown') OR x.owner_state IN('active','unknown') OR x.source_memory_bytes!=0 OR (x.source_input_receipt IS NOT NULL AND json_extract(x.source_input_receipt,'$.state')!='closed')))
 AND NOT EXISTS(SELECT 1 FROM drive_backup_jobs j WHERE j.note_id=OLD.note_id AND j.terminal_at IS NULL)
 AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.note_id=OLD.note_id AND (t.owner_state IN('active','unknown') OR t.phase NOT IN('succeeded','failed','cancelled') OR t.read_pinned!=0 OR t.refresh_pending!=0 OR (t.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments ack WHERE ack.kind='backup' AND ack.id=t.id AND ack.runtime_generation=t.runtime_generation AND ack.owner_token=t.owner_token))))
 AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (
 w.note_id=OLD.note_id OR
 (w.kind='media-upload' AND EXISTS(SELECT 1 FROM media_uploads u JOIN media_drafts md ON md.id=u.draft_id WHERE u.id=w.owner_id AND md.note_id=OLD.note_id)) OR
 (w.kind='reference-job' AND EXISTS(SELECT 1 FROM reference_jobs j WHERE j.id=w.owner_id AND (j.note_id=OLD.note_id OR EXISTS(SELECT 1 FROM reference_settings rs JOIN reference_settings own ON own.bundle_id=rs.bundle_id WHERE rs.note_id=j.note_id AND own.note_id=OLD.note_id)))) OR
 (w.kind='conversion-job' AND EXISTS(SELECT 1 FROM conversion_jobs j WHERE j.id=w.owner_id AND j.note_id=OLD.note_id)) OR
 (w.kind='llm-pdf-preview' AND EXISTS(SELECT 1 FROM llm_pdf_previews v WHERE v.id=w.owner_id AND v.note_id=OLD.note_id)) OR
 (w.kind='drive-backup' AND EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.id=w.owner_id AND t.note_id=OLD.note_id)) OR
 (w.kind='export-operation' AND EXISTS(SELECT 1 FROM export_operations e WHERE e.id=w.owner_id AND e.note_id=OLD.note_id)) OR
 (w.kind='pdf-artifact' AND EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=w.owner_id AND a.live_note_id=OLD.note_id)) OR
 (w.kind='pdf-delivery' AND EXISTS(SELECT 1 FROM pdf_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE v.id=w.owner_id AND a.live_note_id=OLD.note_id)) OR
 (w.kind='pdf-anonymous-delivery' AND EXISTS(SELECT 1 FROM pdf_anonymous_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE v.id=w.owner_id AND a.live_note_id=OLD.note_id)) OR
 (w.kind='zip-source' AND EXISTS(SELECT 1 FROM zip_attempts v JOIN zip_targets t ON t.request_id=v.request_id AND t.ordinal=v.ordinal WHERE v.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-spool' AND EXISTS(SELECT 1 FROM zip_spools z JOIN zip_attempts v ON v.id=z.attempt_id JOIN zip_targets t ON t.request_id=v.request_id AND t.ordinal=v.ordinal WHERE z.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-assembly' AND EXISTS(SELECT 1 FROM zip_assemblies v JOIN zip_targets t ON t.request_id=v.request_id WHERE v.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-delivery' AND EXISTS(SELECT 1 FROM zip_deliveries v JOIN zip_artifact_entries e ON e.artifact_id=v.artifact_id WHERE v.id=w.owner_id AND e.live_note_id=OLD.note_id)) OR
 (w.kind='import-upload' AND EXISTS(SELECT 1 FROM upload_reservations u JOIN originals o ON o.storage_key=u.storage_key WHERE u.id=w.owner_id AND o.note_id=OLD.note_id))))
 AND NOT EXISTS(SELECT 1 FROM pdf_computations c WHERE c.live_note_id=OLD.note_id AND (c.state!='closed' OR c.workspace_removed=0))
 AND NOT EXISTS(SELECT 1 FROM pdf_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE a.live_note_id=OLD.note_id AND v.state!='closed')
 AND NOT EXISTS(SELECT 1 FROM pdf_anonymous_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE a.live_note_id=OLD.note_id AND v.state!='closed')
 AND NOT EXISTS(SELECT 1 FROM zip_targets t JOIN zip_requests q ON q.id=t.request_id WHERE t.live_note_id=OLD.note_id AND q.state!='terminal')
 AND NOT EXISTS(SELECT 1 FROM zip_pdf_holds h JOIN pdf_artifacts a ON a.id=h.artifact_id WHERE a.live_note_id=OLD.note_id AND h.state!='released')
 AND NOT EXISTS(SELECT 1 FROM zip_spool_refs f JOIN zip_targets t ON t.request_id=f.request_id AND t.ordinal=f.ordinal WHERE t.live_note_id=OLD.note_id)
 AND NOT EXISTS(SELECT 1 FROM zip_assemblies v JOIN zip_targets t ON t.request_id=v.request_id WHERE t.live_note_id=OLD.note_id AND (v.state!='closed' OR v.storage_key IS NOT NULL))
 AND NOT EXISTS(SELECT 1 FROM zip_deliveries v JOIN zip_artifact_entries e ON e.artifact_id=v.artifact_id WHERE e.live_note_id=OLD.note_id AND v.state!='closed')
 AND json_extract(OLD.source_input_receipt,'$.consumer.kind')='machine-regeneration' AND json_extract(OLD.source_input_receipt,'$.consumer.id')=OLD.id),0)
BEGIN SELECT RAISE(ABORT,'regeneration_source_owned'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_regeneration_source_bindings_retirement BEFORE UPDATE ON regeneration_source_bindings
WHEN NOT coalesce((OLD.retention='usable' AND NEW.retention='usable' AND NEW.deletion_id IS NULL AND NEW.redaction_version=0) OR (OLD.retention='usable' AND NEW.retention='recorder-deleted' AND (EXISTS(SELECT 1 FROM account_deletions d JOIN accounts a ON a.id=d.account_id WHERE d.id=NEW.deletion_id AND d.account_id=OLD.executor_id AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state='running') OR EXISTS(SELECT 1 FROM account_deletions d JOIN accounts a ON a.id=d.account_id WHERE d.id=NEW.deletion_id AND d.account_id=OLD.credential_owner_id AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state='running')) AND NEW.id IS OLD.id AND NEW.record_id IS OLD.record_id AND NEW.executor_id IS OLD.executor_id AND NEW.credential_owner_id IS OLD.credential_owner_id AND NEW.note_id IS OLD.note_id AND NEW.original_id IS OLD.original_id AND NEW.drive_epoch IS OLD.drive_epoch AND NEW.ownership_generation IS OLD.ownership_generation AND NEW.fingerprint IS OLD.fingerprint AND NEW.llm_job_id IS OLD.llm_job_id AND NEW.preview_id IS OLD.preview_id AND NEW.machine_request_id IS OLD.machine_request_id AND NEW.cancel_generation IS OLD.cancel_generation AND NEW.created_at IS OLD.created_at AND NEW.version=OLD.version+1 AND NEW.redaction_version=1 AND NEW.subject IS NULL AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts a WHERE a.binding_id=OLD.id AND NOT coalesce(a.phase='terminal' AND (json_extract(a.completion,'$.kind')='never-owned' OR (a.owner_state='closed' AND json_extract(a.completion,'$.callerEnded')=1 AND json_extract(a.completion,'$.acknowledged')=1)),0))
AND NOT EXISTS(SELECT 1 FROM llm_conversions c WHERE c.source_binding_id=OLD.id AND (c.phase!='terminal' OR c.owner_state IN('active','unknown') OR c.source_memory_bytes!=0 OR (c.source_input_receipt IS NOT NULL AND json_extract(c.source_input_receipt,'$.state')!='closed')))
AND NOT EXISTS(SELECT 1 FROM llm_pdf_previews c WHERE c.source_binding_id=OLD.id AND (c.state='running' OR c.owner_state IN('active','unknown') OR c.source_memory_bytes!=0 OR (c.source_input_receipt IS NOT NULL AND json_extract(c.source_input_receipt,'$.state')!='closed')))
AND NOT EXISTS(SELECT 1 FROM machine_regenerations c WHERE c.source_binding_id=OLD.id AND (c.phase!='terminal' OR c.owner_state IN('active','unknown') OR c.source_memory_bytes!=0 OR (c.source_input_receipt IS NOT NULL AND json_extract(c.source_input_receipt,'$.state')!='closed')))) OR (OLD.retention='recorder-deleted' AND NEW.id IS OLD.id AND NEW.retention IS OLD.retention AND NEW.deletion_id IS OLD.deletion_id AND NEW.redaction_version IS OLD.redaction_version AND NEW.record_id IS OLD.record_id AND NEW.executor_id IS OLD.executor_id AND NEW.credential_owner_id IS OLD.credential_owner_id AND NEW.note_id IS OLD.note_id AND NEW.original_id IS OLD.original_id AND NEW.subject IS OLD.subject AND NEW.drive_epoch IS OLD.drive_epoch AND NEW.ownership_generation IS OLD.ownership_generation AND NEW.fingerprint IS OLD.fingerprint AND NEW.llm_job_id IS OLD.llm_job_id AND NEW.preview_id IS OLD.preview_id AND NEW.machine_request_id IS OLD.machine_request_id AND NEW.cancel_generation IS OLD.cancel_generation AND NEW.version IS OLD.version AND NEW.created_at IS OLD.created_at),0)
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_llm_conversions_admission BEFORE INSERT ON llm_conversions
WHEN NOT (EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active') AND EXISTS(SELECT 1 FROM notes n WHERE n.id=NEW.note_id AND n.lifecycle!='purging' AND ((n.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=n.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=n.owner_workspace_id AND w.state='active'))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_llm_conversions_claim BEFORE UPDATE ON llm_conversions
WHEN (NEW.owner_state IN('running','active') AND (NEW.owner_token IS NOT OLD.owner_token OR NEW.owner_state IS NOT OLD.owner_state)) AND NOT (EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active') AND EXISTS(SELECT 1 FROM notes n WHERE n.id=NEW.note_id AND n.lifecycle!='purging' AND ((n.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=n.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=n.owner_workspace_id AND w.state='active'))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER llm_audio_initial BEFORE INSERT ON llm_conversions
WHEN NEW.source_format='audio' AND (json_extract(NEW.audio_plan,'$.kind')!='awaiting-manifest' OR NEW.phase!='queued' OR EXISTS(SELECT 1 FROM json_each(NEW.audio_plan) WHERE key!='kind'))
BEGIN SELECT RAISE(ABORT,'llm_audio_initial'); END;
--> statement-breakpoint
CREATE TRIGGER llm_audio_seal BEFORE UPDATE ON llm_conversions
WHEN NEW.audio_plan IS NOT OLD.audio_plan AND NOT coalesce((OLD.preparation_version=5
 AND OLD.owner_state='active' AND NEW.owner_state='active' AND OLD.cancel_generation=0 AND NEW.cancel_generation=0
 AND OLD.outcome='pending' AND NEW.outcome='pending' AND NEW.updated_at<OLD.deadline_at
 AND EXISTS(SELECT 1 FROM notes n JOIN originals o ON o.note_id=n.id JOIN openrouter_connections k ON k.account_id=OLD.account_id WHERE n.id=OLD.note_id AND n.lifecycle='active' AND n.version=OLD.note_version AND o.id=OLD.original_id AND o.sha256=OLD.source_sha256 AND o.bytes=OLD.source_bytes AND k.state='linked' AND k.epoch=OLD.credential_epoch)
 AND ((json_extract(OLD.audio_plan,'$.kind')='awaiting-manifest' AND json_extract(NEW.audio_plan,'$.kind')='transcribing'
 AND NEW.phase='dispatching' AND NOT EXISTS(SELECT 1 FROM llm_dispatches WHERE job_id=OLD.job_id)
 AND json_extract(NEW.audio_plan,'$.manifest.source.originalId')=OLD.original_id AND json_extract(NEW.audio_plan,'$.manifest.source.sha256')=OLD.source_sha256 AND json_extract(NEW.audio_plan,'$.manifest.source.bytes')=OLD.source_bytes AND json_extract(NEW.audio_plan,'$.manifest.recipe')=OLD.audio_recipe)
 OR (json_extract(OLD.audio_plan,'$.kind')='transcribing' AND json_extract(NEW.audio_plan,'$.kind')='structuring' AND NEW.phase='dispatching'
 AND json_extract(NEW.audio_plan,'$.manifest')=json_extract(OLD.audio_plan,'$.manifest')
 AND json_array_length(NEW.audio_plan,'$.segments') BETWEEN 1 AND 16
 AND (SELECT count(*) FROM llm_dispatches WHERE job_id=OLD.job_id)=json_array_length(OLD.audio_plan,'$.manifest.chunks')
 AND NOT EXISTS(SELECT 1 FROM json_each(OLD.audio_plan,'$.manifest.chunks') chunk WHERE NOT EXISTS(SELECT 1 FROM llm_dispatches d WHERE d.job_id=OLD.job_id AND d.stage='transcribe' AND d.state='response' AND d.ordinal=json_extract(chunk.value,'$.ordinal') AND d.input_sha256=json_extract(chunk.value,'$.sha256'))))
 OR (json_extract(OLD.audio_plan,'$.kind')='structuring' AND json_extract(NEW.audio_plan,'$.kind')='responses-complete' AND NEW.phase='response-ready'
 AND json_remove(NEW.audio_plan,'$.kind')=json_remove(OLD.audio_plan,'$.kind')
 AND (SELECT count(*) FROM llm_dispatches WHERE job_id=OLD.job_id)=json_array_length(OLD.audio_plan,'$.manifest.chunks')+json_array_length(OLD.audio_plan,'$.segments')
 AND NOT EXISTS(SELECT 1 FROM llm_dispatches WHERE job_id=OLD.job_id AND state!='response')
 AND NOT EXISTS(SELECT 1 FROM json_each(OLD.audio_plan,'$.segments') segment WHERE NOT EXISTS(SELECT 1 FROM llm_dispatches d WHERE d.job_id=OLD.job_id AND d.stage='structure' AND d.state='response' AND d.ordinal=json_extract(segment.value,'$.ordinal') AND d.input_sha256=json_extract(segment.value,'$.sha256')))))),0)
BEGIN SELECT RAISE(ABORT,'llm_audio_seal'); END;
--> statement-breakpoint
CREATE TRIGGER llm_audio_ready BEFORE UPDATE ON llm_conversions
WHEN NEW.preparation_version=5 AND NEW.phase IN ('response-ready','finalizing') AND json_extract(NEW.audio_plan,'$.kind')!='responses-complete'
BEGIN SELECT RAISE(ABORT,'llm_audio_ready'); END;
