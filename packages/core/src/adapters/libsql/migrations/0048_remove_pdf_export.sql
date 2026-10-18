DROP TRIGGER `zip_attempt_immutable`;
--> statement-breakpoint
DROP TRIGGER `zip_attempt_terminal`;
--> statement-breakpoint
DROP TRIGGER `zip_attempt_title_scrub`;
--> statement-breakpoint
DROP TRIGGER `zip_attempts_integer_insert`;
--> statement-breakpoint
DROP TRIGGER `zip_attempts_integer_update`;
--> statement-breakpoint
DROP TRIGGER `p5d_zip_requests_actor_insert`;
--> statement-breakpoint
DROP TRIGGER `zip_request_immutable`;
--> statement-breakpoint
DROP TRIGGER `zip_request_terminal_guard`;
--> statement-breakpoint
DROP TRIGGER `zip_requests_integer_insert`;
--> statement-breakpoint
DROP TRIGGER `zip_requests_integer_update`;
--> statement-breakpoint
DROP TRIGGER `zip_spool_cleanup_guard`;
--> statement-breakpoint
DROP TRIGGER `zip_spool_close_guard`;
--> statement-breakpoint
DROP TRIGGER `zip_spool_no_resurrect`;
--> statement-breakpoint
DROP TRIGGER `zip_spools_integer_insert`;
--> statement-breakpoint
DROP TRIGGER `zip_spools_integer_update`;
--> statement-breakpoint
DROP TRIGGER `zip_delivery_artifact`;
--> statement-breakpoint
DROP TRIGGER `zip_run_parent`;
--> statement-breakpoint
DROP TRIGGER `zip_ref_ready_insert`;
--> statement-breakpoint
DROP TRIGGER `zip_ref_ready_update`;
--> statement-breakpoint
DROP TRIGGER `zip_target_live_guard`;
--> statement-breakpoint
DROP TRIGGER `object_delete_zip_pdf_hold`;
--> statement-breakpoint
DROP TRIGGER `zip_run_pdf_terminal`;
--> statement-breakpoint
DROP TRIGGER `zip_pdf_binding_insert`;
--> statement-breakpoint
DROP TRIGGER `zip_pdf_binding_shape`;
--> statement-breakpoint
DROP TRIGGER `zip_pdf_binding_attach`;
--> statement-breakpoint
DROP TRIGGER `zip_pdf_binding_immutable`;
--> statement-breakpoint
DROP TRIGGER `zip_pdf_binding_ready`;
--> statement-breakpoint
DROP TRIGGER `zip_pdf_binding_release`;
--> statement-breakpoint
DROP TRIGGER `machine_regeneration_delete`;
--> statement-breakpoint
DROP TRIGGER `llm_conversions_source_delete`;
--> statement-breakpoint
DROP TRIGGER `machine_regenerations_source_delete`;
--> statement-breakpoint
DROP TABLE `pdf_anonymous_deliveries`;--> statement-breakpoint
DROP TABLE `pdf_anonymous_requests`;--> statement-breakpoint
DROP TABLE `zip_pdf_holds`;--> statement-breakpoint
DROP TABLE `pdf_artifacts`;--> statement-breakpoint
DROP TABLE `pdf_computations`;--> statement-breakpoint
DROP TABLE `pdf_deliveries`;--> statement-breakpoint
DROP TABLE `pdf_requests`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_zip_attempts` (
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
	CONSTRAINT "zip_attempt_state" CHECK("__new_zip_attempts"."state" in('queued','running','succeeded','failed','excluded','cancelled')),
	CONSTRAINT "zip_attempt_result" CHECK(("__new_zip_attempts"."state"='succeeded' and "__new_zip_attempts"."result" is not null and "__new_zip_attempts"."failure" is null) or ("__new_zip_attempts"."state" in('failed','excluded') and "__new_zip_attempts"."result" is null and "__new_zip_attempts"."failure" is not null) or ("__new_zip_attempts"."state" in('queued','running','cancelled') and "__new_zip_attempts"."result" is null and "__new_zip_attempts"."failure" is null)),
	CONSTRAINT "zip_attempt_lifetime" CHECK("__new_zip_attempts"."history_expires_at"="__new_zip_attempts"."created_at"+7776000000),
	CONSTRAINT "zip_attempt_versions" CHECK("__new_zip_attempts"."attempt_number" between 1 and 9007199254740991 and "__new_zip_attempts"."version" between 1 and 9007199254740991)
);
--> statement-breakpoint
INSERT INTO `__new_zip_attempts`("id", "request_id", "generation", "ordinal", "attempt_number", "title", "expected_identity", "state", "result", "failure", "created_at", "history_expires_at", "version") SELECT "id", "request_id", "generation", "ordinal", "attempt_number", "title", "expected_identity", "state", "result", "failure", "created_at", "history_expires_at", "version" FROM `zip_attempts`;--> statement-breakpoint
DROP TABLE `zip_attempts`;--> statement-breakpoint
ALTER TABLE `__new_zip_attempts` RENAME TO `zip_attempts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `zip_attempt_number` ON `zip_attempts` (`request_id`,`ordinal`,`attempt_number`);--> statement-breakpoint
CREATE INDEX `zip_attempt_work` ON `zip_attempts` (`request_id`,`generation`,`state`,`ordinal`);--> statement-breakpoint
CREATE INDEX `zip_attempt_expiry` ON `zip_attempts` (`history_expires_at`,`id`);--> statement-breakpoint
CREATE TABLE `__new_zip_requests` (
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
	CONSTRAINT "zip_request_state" CHECK("__new_zip_requests"."state" in('active','assembling','stopping','terminal')),
	CONSTRAINT "zip_request_format" CHECK("__new_zip_requests"."format" in('html','markdown') and "__new_zip_requests"."style"='saved'),
	CONSTRAINT "zip_request_lifetime" CHECK("__new_zip_requests"."history_expires_at"="__new_zip_requests"."created_at"+7776000000),
	CONSTRAINT "zip_request_versions" CHECK("__new_zip_requests"."generation" between 1 and 9007199254740991 and "__new_zip_requests"."version" between 1 and 9007199254740991 and "__new_zip_requests"."cancel_generation" between 0 and "__new_zip_requests"."generation")
);
--> statement-breakpoint
INSERT INTO `__new_zip_requests`("id", "account_id", "command_id", "input_digest", "format", "style", "state", "generation", "cancel_generation", "version", "retry_of", "created_at", "history_expires_at", "updated_at") SELECT "id", "account_id", "command_id", "input_digest", "format", "style", "state", "generation", "cancel_generation", "version", "retry_of", "created_at", "history_expires_at", "updated_at" FROM `zip_requests`;--> statement-breakpoint
DROP TABLE `zip_requests`;--> statement-breakpoint
ALTER TABLE `__new_zip_requests` RENAME TO `zip_requests`;--> statement-breakpoint
CREATE UNIQUE INDEX `zip_request_command` ON `zip_requests` (`account_id`,`command_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `zip_request_account_active` ON `zip_requests` (`account_id`) WHERE "zip_requests"."state"!='terminal';--> statement-breakpoint
CREATE UNIQUE INDEX `zip_request_global_active` ON `zip_requests` ((1)) WHERE "zip_requests"."state"!='terminal';--> statement-breakpoint
CREATE INDEX `zip_request_history` ON `zip_requests` (`account_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `zip_request_expiry` ON `zip_requests` (`history_expires_at`,`id`);--> statement-breakpoint
CREATE TABLE `__new_zip_spools` (
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
	CONSTRAINT "zip_spool_state" CHECK("__new_zip_spools"."state" in('writing','ready','cleanup','removed')),
	CONSTRAINT "zip_spool_format" CHECK("__new_zip_spools"."format" in('html','markdown')),
	CONSTRAINT "zip_spool_storage" CHECK(("__new_zip_spools"."state"='removed' and "__new_zip_spools"."storage_key" is null and "__new_zip_spools"."result" is null and "__new_zip_spools"."reserved_bytes"=0) or ("__new_zip_spools"."state"!='removed' and "__new_zip_spools"."storage_key" is not null)),
	CONSTRAINT "zip_spool_ready" CHECK("__new_zip_spools"."state"!='ready' or "__new_zip_spools"."result" is not null),
	CONSTRAINT "zip_spool_writing" CHECK("__new_zip_spools"."state"!='writing' or "__new_zip_spools"."result" is null),
	CONSTRAINT "zip_spool_bytes" CHECK(typeof("__new_zip_spools"."reserved_bytes")='integer' and "__new_zip_spools"."reserved_bytes" between 0 and 9007199254740991),
	CONSTRAINT "zip_spool_generation" CHECK("__new_zip_spools"."generation" between 1 and 9007199254740991),
	CONSTRAINT "zip_spool_cleanup_lease" CHECK(("__new_zip_spools"."cleanup_token" is null)=("__new_zip_spools"."cleanup_until" is null))
);
--> statement-breakpoint
INSERT INTO `__new_zip_spools`("id", "attempt_id", "format", "generation", "storage_key", "state", "result", "reserved_bytes", "created_at", "next_cleanup_at", "cleanup_token", "cleanup_until") SELECT "id", "attempt_id", "format", "generation", "storage_key", "state", "result", "reserved_bytes", "created_at", "next_cleanup_at", "cleanup_token", "cleanup_until" FROM `zip_spools`;--> statement-breakpoint
DROP TABLE `zip_spools`;--> statement-breakpoint
ALTER TABLE `__new_zip_spools` RENAME TO `zip_spools`;--> statement-breakpoint
CREATE UNIQUE INDEX `zip_spools_storage_key_unique` ON `zip_spools` (`storage_key`);--> statement-breakpoint
CREATE INDEX `zip_spool_cleanup` ON `zip_spools` (`state`,`next_cleanup_at`,`id`);--> statement-breakpoint
CREATE INDEX `zip_spool_attempt` ON `zip_spools` (`attempt_id`);
--> statement-breakpoint
CREATE TRIGGER zip_attempt_immutable BEFORE UPDATE ON zip_attempts
WHEN NEW.id!=OLD.id OR NEW.request_id!=OLD.request_id OR NEW.generation!=OLD.generation OR NEW.ordinal!=OLD.ordinal OR NEW.attempt_number!=OLD.attempt_number OR NEW.created_at!=OLD.created_at OR NEW.history_expires_at!=OLD.history_expires_at OR NEW.expected_identity!=OLD.expected_identity
BEGIN SELECT RAISE(ABORT,'zip attempt identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_attempt_terminal BEFORE UPDATE ON zip_attempts
WHEN OLD.state IN('succeeded','failed','excluded','cancelled') AND (NEW.state!=OLD.state OR NEW.result IS NOT OLD.result OR NEW.failure IS NOT OLD.failure)
BEGIN SELECT RAISE(ABORT,'zip attempt result is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_attempt_title_scrub BEFORE UPDATE OF title ON zip_attempts
WHEN NEW.title!=OLD.title AND NEW.title!=''
BEGIN SELECT RAISE(ABORT,'zip attempt title is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_attempts_integer_insert BEFORE INSERT ON zip_attempts
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.ordinal)!='integer' OR NEW.ordinal<0 OR NEW.ordinal>9007199254740991 OR typeof(NEW.attempt_number)!='integer' OR NEW.attempt_number<0 OR NEW.attempt_number>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.history_expires_at)!='integer' OR NEW.history_expires_at<0 OR NEW.history_expires_at>9007199254740991 OR typeof(NEW.version)!='integer' OR NEW.version<0 OR NEW.version>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_attempts_integer_update BEFORE UPDATE ON zip_attempts
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.ordinal)!='integer' OR NEW.ordinal<0 OR NEW.ordinal>9007199254740991 OR typeof(NEW.attempt_number)!='integer' OR NEW.attempt_number<0 OR NEW.attempt_number>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.history_expires_at)!='integer' OR NEW.history_expires_at<0 OR NEW.history_expires_at>9007199254740991 OR typeof(NEW.version)!='integer' OR NEW.version<0 OR NEW.version>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_zip_requests_actor_insert BEFORE INSERT ON zip_requests
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER zip_request_immutable BEFORE UPDATE ON zip_requests
WHEN NEW.account_id!=OLD.account_id OR NEW.command_id!=OLD.command_id OR NEW.input_digest!=OLD.input_digest OR NEW.format!=OLD.format OR NEW.style!=OLD.style OR NEW.created_at!=OLD.created_at OR NEW.history_expires_at!=OLD.history_expires_at
BEGIN SELECT RAISE(ABORT,'zip request identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_request_terminal_guard BEFORE UPDATE ON zip_requests
WHEN NEW.state='terminal' AND (EXISTS(SELECT 1 FROM zip_runs r WHERE r.request_id=NEW.id AND r.state IN('queued','running','assembling','stopping')) OR EXISTS(SELECT 1 FROM zip_assemblies a WHERE a.request_id=NEW.id AND a.state!='closed') OR EXISTS(SELECT 1 FROM object_writes w JOIN zip_spools s ON w.kind='zip-spool' AND w.owner_id=s.id JOIN zip_attempts a ON a.id=s.attempt_id WHERE a.request_id=NEW.id AND w.active=1))
BEGIN SELECT RAISE(ABORT,'zip request still owned'); END;
--> statement-breakpoint
CREATE TRIGGER zip_requests_integer_insert BEFORE INSERT ON zip_requests
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.cancel_generation)!='integer' OR NEW.cancel_generation<0 OR NEW.cancel_generation>9007199254740991 OR typeof(NEW.version)!='integer' OR NEW.version<0 OR NEW.version>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.history_expires_at)!='integer' OR NEW.history_expires_at<0 OR NEW.history_expires_at>9007199254740991 OR typeof(NEW.updated_at)!='integer' OR NEW.updated_at<0 OR NEW.updated_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_requests_integer_update BEFORE UPDATE ON zip_requests
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.cancel_generation)!='integer' OR NEW.cancel_generation<0 OR NEW.cancel_generation>9007199254740991 OR typeof(NEW.version)!='integer' OR NEW.version<0 OR NEW.version>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.history_expires_at)!='integer' OR NEW.history_expires_at<0 OR NEW.history_expires_at>9007199254740991 OR typeof(NEW.updated_at)!='integer' OR NEW.updated_at<0 OR NEW.updated_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
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
CREATE TRIGGER zip_spools_integer_insert BEFORE INSERT ON zip_spools
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.reserved_bytes)!='integer' OR NEW.reserved_bytes<0 OR NEW.reserved_bytes>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.next_cleanup_at)!='integer' OR NEW.next_cleanup_at<0 OR NEW.next_cleanup_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_spools_integer_update BEFORE UPDATE ON zip_spools
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.reserved_bytes)!='integer' OR NEW.reserved_bytes<0 OR NEW.reserved_bytes>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.next_cleanup_at)!='integer' OR NEW.next_cleanup_at<0 OR NEW.next_cleanup_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
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
 (w.kind='zip-spool' AND EXISTS(SELECT 1 FROM zip_spools z JOIN zip_attempts v ON v.id=z.attempt_id JOIN zip_targets t ON t.request_id=v.request_id AND t.ordinal=v.ordinal WHERE z.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-assembly' AND EXISTS(SELECT 1 FROM zip_assemblies v JOIN zip_targets t ON t.request_id=v.request_id WHERE v.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-delivery' AND EXISTS(SELECT 1 FROM zip_deliveries v JOIN zip_artifact_entries e ON e.artifact_id=v.artifact_id WHERE v.id=w.owner_id AND e.live_note_id=OLD.note_id)) OR
 (w.kind='import-upload' AND EXISTS(SELECT 1 FROM upload_reservations u JOIN originals o ON o.storage_key=u.storage_key WHERE u.id=w.owner_id AND o.note_id=OLD.note_id))))
 AND NOT EXISTS(SELECT 1 FROM zip_targets t JOIN zip_requests q ON q.id=t.request_id WHERE t.live_note_id=OLD.note_id AND q.state!='terminal')
 AND NOT EXISTS(SELECT 1 FROM zip_spool_refs f JOIN zip_targets t ON t.request_id=f.request_id AND t.ordinal=f.ordinal WHERE t.live_note_id=OLD.note_id)
 AND NOT EXISTS(SELECT 1 FROM zip_assemblies v JOIN zip_targets t ON t.request_id=v.request_id WHERE t.live_note_id=OLD.note_id AND (v.state!='closed' OR v.storage_key IS NOT NULL))
 AND NOT EXISTS(SELECT 1 FROM zip_deliveries v JOIN zip_artifact_entries e ON e.artifact_id=v.artifact_id WHERE e.live_note_id=OLD.note_id AND v.state!='closed')
 AND json_extract(OLD.source_input_receipt,'$.consumer.kind')='llm-conversion' AND json_extract(OLD.source_input_receipt,'$.consumer.id')=OLD.job_id),0)
BEGIN SELECT RAISE(ABORT,'regeneration_source_owned'); END;
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
 (w.kind='zip-spool' AND EXISTS(SELECT 1 FROM zip_spools z JOIN zip_attempts v ON v.id=z.attempt_id JOIN zip_targets t ON t.request_id=v.request_id AND t.ordinal=v.ordinal WHERE z.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-assembly' AND EXISTS(SELECT 1 FROM zip_assemblies v JOIN zip_targets t ON t.request_id=v.request_id WHERE v.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-delivery' AND EXISTS(SELECT 1 FROM zip_deliveries v JOIN zip_artifact_entries e ON e.artifact_id=v.artifact_id WHERE v.id=w.owner_id AND e.live_note_id=OLD.note_id)) OR
 (w.kind='import-upload' AND EXISTS(SELECT 1 FROM upload_reservations u JOIN originals o ON o.storage_key=u.storage_key WHERE u.id=w.owner_id AND o.note_id=OLD.note_id))))
 AND NOT EXISTS(SELECT 1 FROM zip_targets t JOIN zip_requests q ON q.id=t.request_id WHERE t.live_note_id=OLD.note_id AND q.state!='terminal')
 AND NOT EXISTS(SELECT 1 FROM zip_spool_refs f JOIN zip_targets t ON t.request_id=f.request_id AND t.ordinal=f.ordinal WHERE t.live_note_id=OLD.note_id)
 AND NOT EXISTS(SELECT 1 FROM zip_assemblies v JOIN zip_targets t ON t.request_id=v.request_id WHERE t.live_note_id=OLD.note_id AND (v.state!='closed' OR v.storage_key IS NOT NULL))
 AND NOT EXISTS(SELECT 1 FROM zip_deliveries v JOIN zip_artifact_entries e ON e.artifact_id=v.artifact_id WHERE e.live_note_id=OLD.note_id AND v.state!='closed')
 AND json_extract(OLD.source_input_receipt,'$.consumer.kind')='machine-regeneration' AND json_extract(OLD.source_input_receipt,'$.consumer.id')=OLD.id),0)
BEGIN SELECT RAISE(ABORT,'machine_regeneration_owned'); END;
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
 (w.kind='zip-spool' AND EXISTS(SELECT 1 FROM zip_spools z JOIN zip_attempts v ON v.id=z.attempt_id JOIN zip_targets t ON t.request_id=v.request_id AND t.ordinal=v.ordinal WHERE z.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-assembly' AND EXISTS(SELECT 1 FROM zip_assemblies v JOIN zip_targets t ON t.request_id=v.request_id WHERE v.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-delivery' AND EXISTS(SELECT 1 FROM zip_deliveries v JOIN zip_artifact_entries e ON e.artifact_id=v.artifact_id WHERE v.id=w.owner_id AND e.live_note_id=OLD.note_id)) OR
 (w.kind='import-upload' AND EXISTS(SELECT 1 FROM upload_reservations u JOIN originals o ON o.storage_key=u.storage_key WHERE u.id=w.owner_id AND o.note_id=OLD.note_id))))
 AND NOT EXISTS(SELECT 1 FROM zip_targets t JOIN zip_requests q ON q.id=t.request_id WHERE t.live_note_id=OLD.note_id AND q.state!='terminal')
 AND NOT EXISTS(SELECT 1 FROM zip_spool_refs f JOIN zip_targets t ON t.request_id=f.request_id AND t.ordinal=f.ordinal WHERE t.live_note_id=OLD.note_id)
 AND NOT EXISTS(SELECT 1 FROM zip_assemblies v JOIN zip_targets t ON t.request_id=v.request_id WHERE t.live_note_id=OLD.note_id AND (v.state!='closed' OR v.storage_key IS NOT NULL))
 AND NOT EXISTS(SELECT 1 FROM zip_deliveries v JOIN zip_artifact_entries e ON e.artifact_id=v.artifact_id WHERE e.live_note_id=OLD.note_id AND v.state!='closed')
 AND json_extract(OLD.source_input_receipt,'$.consumer.kind')='machine-regeneration' AND json_extract(OLD.source_input_receipt,'$.consumer.id')=OLD.id),0)
BEGIN SELECT RAISE(ABORT,'regeneration_source_owned'); END;
--> statement-breakpoint
CREATE TRIGGER zip_delivery_artifact BEFORE INSERT ON zip_deliveries
WHEN NEW.state!='closed' AND NOT EXISTS(SELECT 1 FROM zip_artifacts a JOIN zip_assemblies s ON s.id=a.assembly_id JOIN zip_requests q ON q.id=s.request_id WHERE a.id=NEW.artifact_id AND q.account_id=NEW.account_id AND a.state='ready' AND a.generation=NEW.artifact_generation AND NEW.expires_at<=a.expires_at)
BEGIN SELECT RAISE(ABORT,'zip delivery artifact unavailable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_run_parent BEFORE INSERT ON zip_runs
WHEN NOT EXISTS(SELECT 1 FROM zip_requests q WHERE q.id=NEW.request_id AND q.account_id=NEW.account_id AND q.generation=NEW.generation AND q.state='active')
BEGIN SELECT RAISE(ABORT,'zip run parent mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER zip_ref_ready_insert BEFORE INSERT ON zip_spool_refs
WHEN NOT EXISTS(SELECT 1 FROM zip_spools s WHERE s.id=NEW.spool_id AND s.state='ready')
BEGIN SELECT RAISE(ABORT,'zip spool unavailable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_ref_ready_update BEFORE UPDATE ON zip_spool_refs
WHEN NOT EXISTS(SELECT 1 FROM zip_spools s WHERE s.id=NEW.spool_id AND s.state='ready') OR NEW.spool_id!=OLD.spool_id OR NEW.request_id!=OLD.request_id OR NEW.generation!=OLD.generation OR NEW.ordinal!=OLD.ordinal
BEGIN SELECT RAISE(ABORT,'zip spool reference mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER zip_target_live_guard BEFORE UPDATE ON zip_targets
WHEN NEW.live_note_id IS NULL AND OLD.live_note_id IS NOT NULL AND (
EXISTS(SELECT 1 FROM zip_requests q WHERE q.id=NEW.request_id AND q.state!='terminal') OR
EXISTS(SELECT 1 FROM zip_spools s JOIN zip_attempts p ON p.id=s.attempt_id WHERE p.request_id=NEW.request_id AND p.ordinal=NEW.ordinal AND s.state!='removed') OR
EXISTS(SELECT 1 FROM zip_assemblies a WHERE a.request_id=NEW.request_id AND (a.state!='closed' OR a.storage_key IS NOT NULL)) OR
EXISTS(SELECT 1 FROM zip_spool_refs f WHERE f.request_id=NEW.request_id AND f.ordinal=NEW.ordinal))
BEGIN SELECT RAISE(ABORT,'zip target still retained'); END;
