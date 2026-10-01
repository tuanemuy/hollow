DROP TRIGGER llm_conversion_identity;
--> statement-breakpoint
DROP TRIGGER llm_pdf_preview_identity;
--> statement-breakpoint
DROP TRIGGER llm_pdf_preview_ready;
--> statement-breakpoint
ALTER TABLE llm_conversions ADD COLUMN source_origin TEXT;
--> statement-breakpoint
ALTER TABLE llm_conversions ADD COLUMN source_binding_id TEXT REFERENCES regeneration_source_bindings(id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE llm_conversions ADD COLUMN source_memory_bytes INTEGER NOT NULL DEFAULT 0 CONSTRAINT llm_conversions_source_memory CHECK(typeof(source_memory_bytes)='integer' AND source_memory_bytes IN(0,52428800));
--> statement-breakpoint
CREATE UNIQUE INDEX llm_conversions_source_binding ON llm_conversions(job_id,source_binding_id);
--> statement-breakpoint
ALTER TABLE llm_pdf_previews ADD COLUMN source_origin TEXT;
--> statement-breakpoint
ALTER TABLE llm_pdf_previews ADD COLUMN source_binding_id TEXT REFERENCES regeneration_source_bindings(id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE llm_pdf_previews ADD COLUMN source_memory_bytes INTEGER NOT NULL DEFAULT 0 CONSTRAINT llm_pdf_previews_source_memory CHECK(typeof(source_memory_bytes)='integer' AND source_memory_bytes IN(0,52428800));
--> statement-breakpoint
CREATE UNIQUE INDEX llm_pdf_previews_source_binding ON llm_pdf_previews(id,source_binding_id);
--> statement-breakpoint
CREATE TABLE machine_regenerations (
 id TEXT PRIMARY KEY NOT NULL, executor_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE RESTRICT, original_id TEXT NOT NULL REFERENCES originals(id) ON DELETE RESTRICT,
 command_id TEXT NOT NULL, request_digest TEXT NOT NULL,
 source_origin TEXT NOT NULL, source_binding_id TEXT REFERENCES regeneration_source_bindings(id) ON DELETE RESTRICT,
 source_memory_bytes INTEGER NOT NULL CONSTRAINT machine_regenerations_shape_1 CHECK(typeof(source_memory_bytes)='integer' AND source_memory_bytes IN(0,52428800)),
 source TEXT NOT NULL CONSTRAINT machine_regenerations_shape_2 CHECK(json_valid(source)), previous TEXT NOT NULL CONSTRAINT machine_regenerations_shape_3 CHECK(json_valid(previous)),
 note_version INTEGER NOT NULL CONSTRAINT machine_regenerations_shape_4 CHECK(note_version>=0), ownership_generation INTEGER NOT NULL CONSTRAINT machine_regenerations_shape_5 CHECK(ownership_generation>0),
 original_revision_no INTEGER NOT NULL CONSTRAINT machine_regenerations_shape_6 CHECK(original_revision_no>0),
 phase TEXT NOT NULL CONSTRAINT machine_regenerations_shape_7 CHECK(phase IN('queued','acquiring','preparing','final-check','terminal')),
 outcome TEXT NOT NULL CONSTRAINT machine_regenerations_shape_8 CHECK(outcome IN('pending','succeeded','failed','cancelled','unknown')), failure TEXT, result_version INTEGER,
 owner_state TEXT NOT NULL CONSTRAINT machine_regenerations_shape_9 CHECK(owner_state IN('none','active','unknown','closed')), runtime_id TEXT, owner_token TEXT,
 cancel_generation INTEGER NOT NULL CONSTRAINT machine_regenerations_shape_10 CHECK(cancel_generation>=0), version INTEGER NOT NULL CONSTRAINT machine_regenerations_shape_11 CHECK(version>0),
 created_at INTEGER NOT NULL, deadline_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, terminal_at INTEGER,
 CONSTRAINT machine_regenerations_shape_12 CHECK((phase='terminal')=(outcome!='pending')), CONSTRAINT machine_regenerations_shape_13 CHECK((outcome='succeeded')=(result_version IS NOT NULL)),
 CONSTRAINT machine_regenerations_shape_14 CHECK((phase='terminal')=(terminal_at IS NOT NULL)),
 CONSTRAINT machine_regenerations_shape_15 CHECK((owner_state='none' AND runtime_id IS NULL AND owner_token IS NULL) OR (owner_state!='none' AND runtime_id IS NOT NULL AND owner_token IS NOT NULL)),
 CONSTRAINT machine_regenerations_shape_16 CHECK(coalesce(json_extract(source,'$.format') IN('html','markdown') AND json_extract(source,'$.bytes') BETWEEN 1 AND 52428800 AND length(json_extract(source,'$.sha256'))=64,0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX machine_regeneration_command ON machine_regenerations(executor_id,command_id);
--> statement-breakpoint
CREATE UNIQUE INDEX machine_regeneration_binding ON machine_regenerations(id,source_binding_id);
--> statement-breakpoint
CREATE UNIQUE INDEX machine_regeneration_live ON machine_regenerations(note_id) WHERE phase!='terminal' OR owner_state IN('active','unknown') OR source_memory_bytes!=0;
--> statement-breakpoint
CREATE TABLE regeneration_source_bindings (
 id TEXT PRIMARY KEY NOT NULL, record_id TEXT NOT NULL REFERENCES drive_backup_records(id) ON DELETE RESTRICT,
 executor_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 credential_owner_id TEXT NOT NULL, note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE RESTRICT,
 original_id TEXT NOT NULL REFERENCES originals(id) ON DELETE RESTRICT, subject TEXT NOT NULL, drive_epoch INTEGER NOT NULL CONSTRAINT regeneration_source_bindings_shape_1 CHECK(drive_epoch>0),
 ownership_generation INTEGER NOT NULL CONSTRAINT regeneration_source_bindings_shape_2 CHECK(ownership_generation>0), fingerprint TEXT NOT NULL CONSTRAINT regeneration_source_bindings_shape_3 CHECK(length(fingerprint)=64),
 llm_job_id TEXT, preview_id TEXT, machine_request_id TEXT,
 cancel_generation INTEGER NOT NULL CONSTRAINT regeneration_source_bindings_shape_4 CHECK(cancel_generation>=0), version INTEGER NOT NULL CONSTRAINT regeneration_source_bindings_shape_5 CHECK(version>0), created_at INTEGER NOT NULL,
 CONSTRAINT regeneration_source_bindings_shape_6 CHECK((llm_job_id IS NOT NULL)+(preview_id IS NOT NULL)+(machine_request_id IS NOT NULL)=1),
 FOREIGN KEY(llm_job_id,id) REFERENCES llm_conversions(job_id,source_binding_id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(preview_id,id) REFERENCES llm_pdf_previews(id,source_binding_id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(machine_request_id,id) REFERENCES machine_regenerations(id,source_binding_id) DEFERRABLE INITIALLY DEFERRED
);
--> statement-breakpoint
CREATE UNIQUE INDEX regeneration_binding_llm ON regeneration_source_bindings(llm_job_id);
--> statement-breakpoint
CREATE UNIQUE INDEX regeneration_binding_preview ON regeneration_source_bindings(preview_id);
--> statement-breakpoint
CREATE UNIQUE INDEX regeneration_binding_machine ON regeneration_source_bindings(machine_request_id);
--> statement-breakpoint
CREATE INDEX regeneration_binding_note ON regeneration_source_bindings(note_id);
--> statement-breakpoint
CREATE TABLE regeneration_source_attempts (
 id TEXT PRIMARY KEY NOT NULL, binding_id TEXT NOT NULL REFERENCES regeneration_source_bindings(id) ON DELETE RESTRICT,
 ordinal INTEGER NOT NULL CONSTRAINT regeneration_source_attempts_shape_1 CHECK(ordinal>0), purpose TEXT NOT NULL CONSTRAINT regeneration_source_attempts_shape_2 CHECK(purpose IN('acquire','final-check')),
 phase TEXT NOT NULL CONSTRAINT regeneration_source_attempts_shape_3 CHECK(phase IN('queued','active','unknown','terminal')),
 owner_state TEXT NOT NULL CONSTRAINT regeneration_source_attempts_shape_4 CHECK(owner_state IN('none','active','unknown','closed')), runtime_id TEXT, owner_token TEXT, completion TEXT,
 credential_version INTEGER NOT NULL CONSTRAINT regeneration_source_attempts_shape_5 CHECK(credential_version>0), cancel_generation INTEGER NOT NULL CONSTRAINT regeneration_source_attempts_shape_6 CHECK(cancel_generation>=0),
 version INTEGER NOT NULL CONSTRAINT regeneration_source_attempts_shape_7 CHECK(version>0), deadline_at INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 CONSTRAINT regeneration_source_attempts_shape_8 CHECK((owner_state='none' AND runtime_id IS NULL AND owner_token IS NULL) OR (owner_state!='none' AND runtime_id IS NOT NULL AND owner_token IS NOT NULL)),
 CONSTRAINT regeneration_source_attempts_shape_9 CHECK(coalesce((phase='queued' AND owner_state='none' AND completion IS NULL)
 OR (phase IN('active','unknown') AND phase=owner_state AND completion IS NULL)
 OR (phase='terminal' AND json_valid(completion) AND
 ((owner_state='none' AND json_extract(completion,'$.kind')='never-owned' AND json_extract(completion,'$.outcome')='cancelled' AND cancel_generation>0)
 OR (owner_state='closed' AND json_extract(completion,'$.kind')='closed' AND json_extract(completion,'$.proofId') IS NOT NULL
 AND json_type(completion,'$.callerEnded') IN('true','false') AND json_type(completion,'$.acknowledged') IN('true','false')
 AND (json_extract(completion,'$.acknowledged')=0 OR json_extract(completion,'$.callerEnded')=1)))),0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX regeneration_attempt_ordinal ON regeneration_source_attempts(binding_id,ordinal);
--> statement-breakpoint
CREATE UNIQUE INDEX regeneration_attempt_held ON regeneration_source_attempts(binding_id) WHERE NOT (phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)));
--> statement-breakpoint
UPDATE llm_conversions SET source_origin='local-original';
--> statement-breakpoint
UPDATE llm_pdf_previews SET source_origin='local-original';
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
CREATE TRIGGER regeneration_binding_insert BEFORE INSERT ON regeneration_source_bindings
WHEN NEW.version!=1 OR NEW.cancel_generation!=0 OR NOT EXISTS(
 SELECT 1 FROM drive_backup_records r JOIN originals o ON o.id=r.original_id
 WHERE r.id=NEW.record_id AND r.account_id=NEW.credential_owner_id AND r.subject=NEW.subject
 AND r.note_id=NEW.note_id AND r.original_id=NEW.original_id AND o.note_id=NEW.note_id AND o.sha256=r.sha256 AND o.bytes=r.bytes)
BEGIN SELECT RAISE(ABORT,'regeneration_binding_invalid'); END;
--> statement-breakpoint
CREATE TRIGGER regeneration_binding_update BEFORE UPDATE ON regeneration_source_bindings
WHEN NEW.id!=OLD.id OR NEW.record_id!=OLD.record_id OR NEW.executor_id!=OLD.executor_id OR NEW.credential_owner_id!=OLD.credential_owner_id
 OR NEW.note_id!=OLD.note_id OR NEW.original_id!=OLD.original_id OR NEW.subject!=OLD.subject OR NEW.drive_epoch!=OLD.drive_epoch
 OR NEW.ownership_generation!=OLD.ownership_generation OR NEW.fingerprint!=OLD.fingerprint OR NEW.created_at!=OLD.created_at
 OR NEW.llm_job_id IS NOT OLD.llm_job_id OR NEW.preview_id IS NOT OLD.preview_id OR NEW.machine_request_id IS NOT OLD.machine_request_id
 OR NEW.version!=OLD.version+1 OR NEW.cancel_generation<OLD.cancel_generation
BEGIN SELECT RAISE(ABORT,'regeneration_binding_immutable'); END;
--> statement-breakpoint
CREATE TRIGGER regeneration_attempt_insert BEFORE INSERT ON regeneration_source_attempts
WHEN NEW.phase!='queued' OR NEW.owner_state!='none' OR NEW.version!=1 OR NEW.cancel_generation!=0
 OR NOT EXISTS(SELECT 1 FROM regeneration_source_bindings b WHERE b.id=NEW.binding_id AND b.cancel_generation=0)
 OR NEW.ordinal!=(SELECT coalesce(max(ordinal),0)+1 FROM regeneration_source_attempts WHERE binding_id=NEW.binding_id)
BEGIN SELECT RAISE(ABORT,'regeneration_attempt_invalid'); END;
--> statement-breakpoint
CREATE TRIGGER regeneration_attempt_update BEFORE UPDATE ON regeneration_source_attempts
WHEN NEW.id!=OLD.id OR NEW.binding_id!=OLD.binding_id OR NEW.ordinal!=OLD.ordinal OR NEW.purpose!=OLD.purpose
 OR NEW.deadline_at!=OLD.deadline_at OR NEW.created_at!=OLD.created_at OR NEW.version!=OLD.version+1 OR NEW.cancel_generation<OLD.cancel_generation
 OR NEW.credential_version<OLD.credential_version
 OR (OLD.owner_state!='none' AND (NEW.runtime_id IS NOT OLD.runtime_id OR NEW.owner_token IS NOT OLD.owner_token OR NEW.owner_state='none'))
 OR (OLD.phase='terminal' AND (NEW.phase!='terminal' OR NEW.owner_state!=OLD.owner_state))
 OR (OLD.phase='unknown' AND NEW.phase NOT IN('unknown','terminal'))
 OR (OLD.phase='terminal' AND (json_extract(NEW.completion,'$.kind') IS NOT json_extract(OLD.completion,'$.kind') OR json_extract(NEW.completion,'$.outcome') IS NOT json_extract(OLD.completion,'$.outcome') OR json_extract(NEW.completion,'$.proofId') IS NOT json_extract(OLD.completion,'$.proofId') OR json_extract(NEW.completion,'$.digest') IS NOT json_extract(OLD.completion,'$.digest') OR json_extract(NEW.completion,'$.failure') IS NOT json_extract(OLD.completion,'$.failure')))
 OR (OLD.owner_state='closed' AND NEW.owner_state!='closed')
 OR (json_extract(OLD.completion,'$.acknowledged')=1 AND NEW.completion IS NOT OLD.completion)
 OR (json_extract(OLD.completion,'$.callerEnded')=1 AND coalesce(json_extract(NEW.completion,'$.callerEnded'),0)!=1)
BEGIN SELECT RAISE(ABORT,'regeneration_attempt_changed'); END;
--> statement-breakpoint
CREATE TRIGGER regeneration_attempt_delete BEFORE DELETE ON regeneration_source_attempts WHEN NOT coalesce(OLD.phase='terminal' AND (json_extract(OLD.completion,'$.kind')='never-owned' OR (OLD.owner_state='closed' AND json_extract(OLD.completion,'$.callerEnded')=1 AND json_extract(OLD.completion,'$.acknowledged')=1)),0) BEGIN SELECT RAISE(ABORT,'regeneration_attempt_owned'); END;
--> statement-breakpoint
CREATE TRIGGER llm_conversions_source_insert BEFORE INSERT ON llm_conversions WHEN NEW.source_origin IS NULL OR NEW.source_origin NOT IN('local-original','drive-record','redacted')
 OR (NEW.source_origin IN('local-original','redacted') AND NEW.source_binding_id IS NOT NULL)
 OR (NEW.source_origin='drive-record' AND (NEW.source_binding_id IS NULL OR NOT EXISTS(
 SELECT 1 FROM regeneration_source_bindings b JOIN drive_backup_records r ON r.id=b.record_id JOIN originals o ON o.id=b.original_id
 WHERE b.id=NEW.source_binding_id AND b.llm_job_id=NEW.job_id AND b.executor_id=NEW.account_id
 AND b.note_id=NEW.note_id AND b.original_id=NEW.original_id AND r.sha256=NEW.source_sha256 AND r.bytes=NEW.source_bytes AND o.format=NEW.source_format)))
 OR typeof(NEW.source_memory_bytes)!='integer' OR NEW.source_memory_bytes NOT IN(0,52428800)
 OR NEW.source_origin='redacted' OR NEW.source_memory_bytes!=0
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
 AND NOT coalesce(OLD.source_origin!='redacted' AND NEW.source_origin='redacted' AND (NEW.phase='terminal' AND NEW.outcome!='unknown') AND NEW.owner_state IN('idle','closed') AND NEW.source_memory_bytes=0
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts WHERE binding_id=OLD.source_binding_id AND NOT coalesce(phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)),0)),0))
 OR (NEW.source_memory_bytes<OLD.source_memory_bytes AND NOT coalesce(NEW.owner_state='closed'
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts WHERE binding_id=OLD.source_binding_id AND NOT coalesce(phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)),0)),0))
 OR (NEW.source_memory_bytes>OLD.source_memory_bytes AND NOT coalesce(
 NEW.source_origin!='redacted' AND NEW.owner_state='active' AND NEW.runtime_id IS NOT NULL AND NEW.owner_token IS NOT NULL
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
 BEGIN SELECT RAISE(ABORT,'regeneration_source_changed'); END;
--> statement-breakpoint
CREATE TRIGGER llm_conversions_source_delete BEFORE DELETE ON llm_conversions
 WHEN OLD.source_binding_id IS NOT NULL OR OLD.source_memory_bytes!=0
 BEGIN SELECT RAISE(ABORT,'regeneration_source_owned'); END;
--> statement-breakpoint
CREATE TRIGGER llm_pdf_previews_source_insert BEFORE INSERT ON llm_pdf_previews WHEN NEW.source_origin IS NULL OR NEW.source_origin NOT IN('local-original','drive-record','redacted')
 OR (NEW.source_origin IN('local-original','redacted') AND NEW.source_binding_id IS NOT NULL)
 OR (NEW.source_origin='drive-record' AND (NEW.source_binding_id IS NULL OR NOT EXISTS(
 SELECT 1 FROM regeneration_source_bindings b JOIN drive_backup_records r ON r.id=b.record_id JOIN originals o ON o.id=b.original_id
 WHERE b.id=NEW.source_binding_id AND b.preview_id=NEW.id AND b.executor_id=NEW.account_id
 AND b.note_id=NEW.note_id AND b.original_id=NEW.original_id AND r.sha256=NEW.source_sha256 AND r.bytes=NEW.source_bytes AND o.format='pdf')))
 OR typeof(NEW.source_memory_bytes)!='integer' OR NEW.source_memory_bytes NOT IN(0,52428800)
 OR NEW.source_origin='redacted' OR NEW.source_memory_bytes!=0
 BEGIN SELECT RAISE(ABORT,'regeneration_source_invalid'); END;
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
 AND NOT coalesce(OLD.source_origin!='redacted' AND NEW.source_origin='redacted' AND (NEW.state IN('consumed','failed','cancelled','expired')) AND NEW.owner_state IN('idle','closed') AND NEW.source_memory_bytes=0
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts WHERE binding_id=OLD.source_binding_id AND NOT coalesce(phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)),0)),0))
 OR (NEW.source_memory_bytes<OLD.source_memory_bytes AND NOT coalesce(NEW.owner_state='closed'
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts WHERE binding_id=OLD.source_binding_id AND NOT coalesce(phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)),0)),0))
 OR (NEW.source_memory_bytes>OLD.source_memory_bytes AND NOT coalesce(
 NEW.source_origin!='redacted' AND NEW.owner_state='active' AND NEW.runtime_id IS NOT NULL AND NEW.owner_token IS NOT NULL
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
 BEGIN SELECT RAISE(ABORT,'regeneration_source_changed'); END;
--> statement-breakpoint
CREATE TRIGGER llm_pdf_previews_source_delete BEFORE DELETE ON llm_pdf_previews
 WHEN OLD.source_binding_id IS NOT NULL OR OLD.source_memory_bytes!=0
 BEGIN SELECT RAISE(ABORT,'regeneration_source_owned'); END;
--> statement-breakpoint
CREATE TRIGGER machine_regenerations_source_insert BEFORE INSERT ON machine_regenerations WHEN NEW.source_origin IS NULL OR NEW.source_origin NOT IN('local-original','drive-record','redacted')
 OR (NEW.source_origin IN('local-original','redacted') AND NEW.source_binding_id IS NOT NULL)
 OR (NEW.source_origin='drive-record' AND (NEW.source_binding_id IS NULL OR NOT EXISTS(
 SELECT 1 FROM regeneration_source_bindings b JOIN drive_backup_records r ON r.id=b.record_id JOIN originals o ON o.id=b.original_id
 WHERE b.id=NEW.source_binding_id AND b.machine_request_id=NEW.id AND b.executor_id=NEW.executor_id
 AND b.note_id=NEW.note_id AND b.original_id=NEW.original_id AND r.sha256=json_extract(NEW.source,'$.sha256') AND r.bytes=json_extract(NEW.source,'$.bytes') AND o.format=json_extract(NEW.source,'$.format'))))
 OR typeof(NEW.source_memory_bytes)!='integer' OR NEW.source_memory_bytes NOT IN(0,52428800)
 OR NEW.source_origin='redacted' OR NEW.source_memory_bytes!=0
 BEGIN SELECT RAISE(ABORT,'regeneration_source_invalid'); END;
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
 AND NOT coalesce(OLD.source_origin!='redacted' AND NEW.source_origin='redacted' AND (NEW.phase='terminal' AND NEW.outcome!='unknown') AND NEW.owner_state IN('none','closed') AND NEW.source_memory_bytes=0
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts WHERE binding_id=OLD.source_binding_id AND NOT coalesce(phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)),0)),0))
 OR (NEW.source_memory_bytes<OLD.source_memory_bytes AND NOT coalesce(NEW.owner_state='closed'
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts WHERE binding_id=OLD.source_binding_id AND NOT coalesce(phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)),0)),0))
 OR (NEW.source_memory_bytes>OLD.source_memory_bytes AND NOT coalesce(
 NEW.source_origin!='redacted' AND NEW.owner_state='active' AND NEW.runtime_id IS NOT NULL AND NEW.owner_token IS NOT NULL
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
 BEGIN SELECT RAISE(ABORT,'regeneration_source_changed'); END;
--> statement-breakpoint
CREATE TRIGGER machine_regenerations_source_delete BEFORE DELETE ON machine_regenerations
 WHEN OLD.source_binding_id IS NOT NULL OR OLD.source_memory_bytes!=0
 BEGIN SELECT RAISE(ABORT,'regeneration_source_owned'); END;
--> statement-breakpoint
CREATE TRIGGER machine_regeneration_insert BEFORE INSERT ON machine_regenerations
WHEN NEW.phase!='queued' OR NEW.outcome!='pending' OR NEW.owner_state!='none' OR NEW.version!=1 OR NEW.cancel_generation!=0
BEGIN SELECT RAISE(ABORT,'machine_regeneration_invalid'); END;
--> statement-breakpoint
CREATE TRIGGER machine_regeneration_update BEFORE UPDATE ON machine_regenerations
WHEN NEW.id!=OLD.id OR NEW.executor_id!=OLD.executor_id OR NEW.note_id!=OLD.note_id OR NEW.original_id!=OLD.original_id
 OR NEW.command_id!=OLD.command_id OR NEW.request_digest!=OLD.request_digest OR NEW.source!=OLD.source OR NEW.previous!=OLD.previous
 OR NEW.note_version!=OLD.note_version OR NEW.ownership_generation!=OLD.ownership_generation OR NEW.original_revision_no!=OLD.original_revision_no
 OR NEW.created_at!=OLD.created_at OR NEW.deadline_at!=OLD.deadline_at OR NEW.version!=OLD.version+1 OR NEW.cancel_generation<OLD.cancel_generation
 OR (OLD.phase='terminal' AND NEW.phase!='terminal')
 OR (OLD.terminal_at IS NOT NULL AND NEW.terminal_at IS NOT OLD.terminal_at)
 OR (OLD.owner_state!='none' AND (NEW.runtime_id IS NOT OLD.runtime_id OR NEW.owner_token IS NOT OLD.owner_token OR NEW.owner_state='none'))
 OR (OLD.owner_state='unknown' AND NEW.owner_state NOT IN('unknown','closed'))
 OR (OLD.owner_state='closed' AND NEW.owner_state!='closed')
BEGIN SELECT RAISE(ABORT,'machine_regeneration_changed'); END;
--> statement-breakpoint
CREATE TRIGGER machine_regeneration_delete BEFORE DELETE ON machine_regenerations
WHEN OLD.phase!='terminal' OR OLD.outcome='unknown' OR OLD.owner_state IN('active','unknown')
BEGIN SELECT RAISE(ABORT,'machine_regeneration_owned'); END;
--> statement-breakpoint
CREATE TABLE __regeneration_fk_assertion(valid INTEGER NOT NULL CHECK(valid=1));
--> statement-breakpoint
INSERT INTO __regeneration_fk_assertion SELECT CASE WHEN EXISTS(SELECT 1 FROM pragma_foreign_key_check) THEN 0 ELSE 1 END;
--> statement-breakpoint
DROP TABLE __regeneration_fk_assertion;
