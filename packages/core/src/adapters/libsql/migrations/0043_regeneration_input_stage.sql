ALTER TABLE llm_conversions ADD COLUMN source_input_receipt TEXT;
--> statement-breakpoint
ALTER TABLE llm_pdf_previews ADD COLUMN source_input_receipt TEXT;
--> statement-breakpoint
ALTER TABLE machine_regenerations ADD COLUMN source_input_receipt TEXT;
--> statement-breakpoint
DROP TRIGGER llm_conversions_source_insert;
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
DROP TRIGGER llm_conversions_source_update;
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
DROP TRIGGER llm_conversions_source_delete;
--> statement-breakpoint
CREATE TRIGGER llm_conversions_source_delete BEFORE DELETE ON llm_conversions
 WHEN OLD.source_binding_id IS NOT NULL OR OLD.source_memory_bytes!=0
 BEGIN SELECT RAISE(ABORT,'regeneration_source_owned'); END;
--> statement-breakpoint
DROP TRIGGER llm_pdf_previews_source_insert;
--> statement-breakpoint
CREATE TRIGGER llm_pdf_previews_source_insert BEFORE INSERT ON llm_pdf_previews WHEN NEW.source_origin IS NULL OR NEW.source_origin NOT IN('local-original','drive-record','redacted')
 OR (NEW.source_origin IN('local-original','redacted') AND NEW.source_binding_id IS NOT NULL)
 OR (NEW.source_origin='drive-record' AND (NEW.source_binding_id IS NULL OR NOT EXISTS(
 SELECT 1 FROM regeneration_source_bindings b JOIN drive_backup_records r ON r.id=b.record_id JOIN originals o ON o.id=b.original_id
 WHERE b.id=NEW.source_binding_id AND b.preview_id=NEW.id AND b.executor_id=NEW.account_id
 AND b.note_id=NEW.note_id AND b.original_id=NEW.original_id AND r.sha256=NEW.source_sha256 AND r.bytes=NEW.source_bytes AND o.format='pdf')))
 OR typeof(NEW.source_memory_bytes)!='integer' OR NEW.source_memory_bytes NOT IN(0,52428800)
 OR NEW.source_origin='redacted' OR NEW.source_memory_bytes!=0
 OR NEW.source_input_receipt IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'regeneration_source_invalid'); END;
--> statement-breakpoint
DROP TRIGGER llm_pdf_previews_source_update;
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
DROP TRIGGER llm_pdf_previews_source_delete;
--> statement-breakpoint
CREATE TRIGGER llm_pdf_previews_source_delete BEFORE DELETE ON llm_pdf_previews
 WHEN OLD.source_binding_id IS NOT NULL OR OLD.source_memory_bytes!=0
 BEGIN SELECT RAISE(ABORT,'regeneration_source_owned'); END;
--> statement-breakpoint
DROP TRIGGER machine_regenerations_source_insert;
--> statement-breakpoint
CREATE TRIGGER machine_regenerations_source_insert BEFORE INSERT ON machine_regenerations WHEN NEW.source_origin IS NULL OR NEW.source_origin NOT IN('local-original','drive-record','redacted')
 OR (NEW.source_origin IN('local-original','redacted') AND NEW.source_binding_id IS NOT NULL)
 OR (NEW.source_origin='drive-record' AND (NEW.source_binding_id IS NULL OR NOT EXISTS(
 SELECT 1 FROM regeneration_source_bindings b JOIN drive_backup_records r ON r.id=b.record_id JOIN originals o ON o.id=b.original_id
 WHERE b.id=NEW.source_binding_id AND b.machine_request_id=NEW.id AND b.executor_id=NEW.executor_id
 AND b.note_id=NEW.note_id AND b.original_id=NEW.original_id AND r.sha256=json_extract(NEW.source,'$.sha256') AND r.bytes=json_extract(NEW.source,'$.bytes') AND o.format=json_extract(NEW.source,'$.format'))))
 OR typeof(NEW.source_memory_bytes)!='integer' OR NEW.source_memory_bytes NOT IN(0,52428800)
 OR NEW.source_origin='redacted' OR NEW.source_memory_bytes!=0
 OR NEW.source_input_receipt IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'regeneration_source_invalid'); END;
--> statement-breakpoint
DROP TRIGGER machine_regenerations_source_update;
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
DROP TRIGGER machine_regenerations_source_delete;
--> statement-breakpoint
CREATE TRIGGER machine_regenerations_source_delete BEFORE DELETE ON machine_regenerations
 WHEN OLD.source_binding_id IS NOT NULL OR OLD.source_memory_bytes!=0
 BEGIN SELECT RAISE(ABORT,'regeneration_source_owned'); END;
--> statement-breakpoint
CREATE TRIGGER regeneration_attempt_claim_guard BEFORE UPDATE ON regeneration_source_attempts
WHEN OLD.owner_state='none' AND NEW.owner_state='active' AND (
 EXISTS(SELECT 1 FROM regeneration_source_attempts a WHERE a.id!=OLD.id AND (a.owner_state IN('active','unknown') OR (a.owner_state='closed' AND (coalesce(json_extract(a.completion,'$.callerEnded'),0)!=1 OR coalesce(json_extract(a.completion,'$.acknowledged'),0)!=1))))
 OR EXISTS(SELECT 1 FROM drive_backup_transfers WHERE owner_state IN('active','unknown')))
BEGIN SELECT RAISE(ABORT,'REGENERATION_SOURCE_HELD'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_source_lane_guard BEFORE UPDATE ON drive_backup_transfers
WHEN OLD.owner_state IN('none','closed') AND NEW.owner_state='active'
 AND EXISTS(SELECT 1 FROM regeneration_source_attempts a WHERE (a.owner_state IN('active','unknown') OR (a.owner_state='closed' AND (coalesce(json_extract(a.completion,'$.callerEnded'),0)!=1 OR coalesce(json_extract(a.completion,'$.acknowledged'),0)!=1))))
BEGIN SELECT RAISE(ABORT,'REGENERATION_SOURCE_HELD'); END;
--> statement-breakpoint
CREATE TABLE __regeneration_input_fk_assertion(valid INTEGER NOT NULL CHECK(valid=1));
--> statement-breakpoint
INSERT INTO __regeneration_input_fk_assertion SELECT CASE WHEN EXISTS(SELECT 1 FROM pragma_foreign_key_check) THEN 0 ELSE 1 END;
--> statement-breakpoint
DROP TABLE __regeneration_input_fk_assertion;
