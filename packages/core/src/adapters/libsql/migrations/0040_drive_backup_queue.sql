ALTER TABLE drive_backup_requests ADD COLUMN bulk_summary text;
--> statement-breakpoint
ALTER TABLE drive_backup_requests ADD COLUMN root_request_id text REFERENCES drive_backup_requests(id) ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE drive_backup_requests ADD COLUMN generation integer NOT NULL DEFAULT 1 CONSTRAINT drive_backup_request_family CHECK(generation between 1 and 9007199254740991 and (root_request_id is null or (kind='bulk' and root_request_id!=id and generation>1)) and (bulk_summary is null or (kind='bulk' and root_request_id is null and json_valid(bulk_summary))));
--> statement-breakpoint
ALTER TABLE drive_backup_jobs ADD COLUMN admission_identity text;
--> statement-breakpoint
ALTER TABLE drive_backup_jobs ADD COLUMN root_ordinal integer CONSTRAINT drive_backup_job_admission CHECK((root_ordinal is null or root_ordinal between 0 and 499) and (admission_identity is null or (json_valid(admission_identity) and target_id is not null and json_extract(admission_identity,'$.noteId')=note_id and json_extract(admission_identity,'$.accountId')=account_id)));
--> statement-breakpoint
CREATE UNIQUE INDEX drive_backup_request_generation ON drive_backup_requests(root_request_id,generation) WHERE root_request_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX drive_backup_job_live_target ON drive_backup_jobs(target_id) WHERE terminal_at IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX drive_backup_job_root_ordinal ON drive_backup_jobs(request_id,root_ordinal) WHERE root_ordinal IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER drive_backup_request_family_insert BEFORE INSERT ON drive_backup_requests
WHEN NEW.generation NOT BETWEEN 1 AND 9007199254740991
 OR (NEW.kind='bulk' AND NEW.root_request_id IS NULL AND NEW.bulk_summary IS NULL)
 OR (NEW.root_request_id IS NULL AND NEW.generation!=1)
 OR (NEW.root_request_id IS NOT NULL AND (
   NEW.kind!='bulk' OR NEW.bulk_summary IS NOT NULL OR NEW.root_request_id=NEW.id
   OR NOT EXISTS(SELECT 1 FROM drive_backup_requests r WHERE r.id=NEW.root_request_id AND r.account_id=NEW.account_id AND r.kind='bulk' AND r.root_request_id IS NULL AND r.bulk_summary IS NOT NULL AND NEW.generation=r.generation+1)))
 OR (NEW.bulk_summary IS NOT NULL AND NOT coalesce(NEW.kind='bulk' AND NEW.root_request_id IS NULL AND json_valid(NEW.bulk_summary)
   AND json_extract(NEW.bulk_summary,'$.version')=1 AND json_extract(NEW.bulk_summary,'$.selected') BETWEEN 1 AND 500
   AND json_extract(NEW.bulk_summary,'$.noOriginal') BETWEEN 0 AND 500
   AND json_extract(NEW.bulk_summary,'$.denied') BETWEEN 0 AND 500
   AND json_extract(NEW.bulk_summary,'$.processing') BETWEEN 0 AND 500
   AND json_extract(NEW.bulk_summary,'$.recorded') BETWEEN 0 AND 500
   AND json_extract(NEW.bulk_summary,'$.pending') BETWEEN 0 AND 500
   AND json_extract(NEW.bulk_summary,'$.selected')=json_extract(NEW.bulk_summary,'$.noOriginal')+json_extract(NEW.bulk_summary,'$.denied')+json_extract(NEW.bulk_summary,'$.processing')+json_extract(NEW.bulk_summary,'$.recorded')+json_extract(NEW.bulk_summary,'$.pending')
   AND NEW.count=json_extract(NEW.bulk_summary,'$.recorded')+json_extract(NEW.bulk_summary,'$.pending')
   AND length(json_extract(NEW.bulk_summary,'$.digest'))=64 AND json_extract(NEW.bulk_summary,'$.digest') NOT GLOB '*[^a-f0-9]*',0))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
DROP TRIGGER drive_backup_request_update_guard;
--> statement-breakpoint
CREATE TRIGGER drive_backup_request_update_guard BEFORE UPDATE ON drive_backup_requests
WHEN NEW.id IS NOT OLD.id OR NEW.account_id IS NOT OLD.account_id OR NEW.command_id IS NOT OLD.command_id
 OR NEW.intent_digest IS NOT OLD.intent_digest OR NEW.kind IS NOT OLD.kind OR NEW.count IS NOT OLD.count
 OR NEW.bulk_summary IS NOT OLD.bulk_summary OR NEW.root_request_id IS NOT OLD.root_request_id
 OR NEW.created_at IS NOT OLD.created_at OR NEW.version!=OLD.version+1
 OR NOT coalesce(
   (NEW.generation=OLD.generation AND OLD.cancelled_at IS NULL AND NEW.cancelled_at IS NOT NULL)
   OR (OLD.kind='bulk' AND OLD.root_request_id IS NULL AND OLD.bulk_summary IS NOT NULL
     AND NEW.generation=OLD.generation+1 AND NEW.cancelled_at IS NULL
     AND EXISTS(SELECT 1 FROM drive_backup_requests r JOIN drive_backup_jobs j ON j.request_id=r.id
       WHERE r.root_request_id=OLD.id AND r.generation=NEW.generation AND r.account_id=OLD.account_id)
     AND NOT EXISTS(SELECT 1 FROM drive_backup_requests r WHERE r.root_request_id=OLD.id AND r.generation=NEW.generation AND r.count!=(SELECT count(*) FROM drive_backup_jobs j WHERE j.request_id=r.id))
     AND NOT EXISTS(SELECT 1 FROM drive_backup_requests r JOIN drive_backup_jobs j ON j.request_id=r.id
       LEFT JOIN drive_backup_jobs p ON p.id=j.retry_of
       WHERE r.root_request_id=OLD.id AND r.generation=NEW.generation AND
         (p.id IS NULL OR p.state!='failed' OR p.account_id!=j.account_id OR p.target_id IS NOT j.target_id
          OR p.root_ordinal IS NOT j.root_ordinal OR j.attempt!=p.attempt+1
          OR EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.job_id=p.id AND (t.owner_state IN ('active','unknown') OR t.read_pinned!=0 OR t.refresh_pending!=0 OR t.phase NOT IN ('failed','cancelled'))))))
 ,0)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_job_admission_insert BEFORE INSERT ON drive_backup_jobs
WHEN (NEW.root_ordinal IS NOT NULL AND NEW.root_ordinal NOT BETWEEN 0 AND 499)
 OR (NEW.admission_identity IS NOT NULL AND NOT coalesce(json_valid(NEW.admission_identity)
   AND json_type(NEW.admission_identity)='object' AND (SELECT count(*) FROM json_each(NEW.admission_identity))=13
   AND json_type(NEW.admission_identity,'$.epoch')='integer' AND json_extract(NEW.admission_identity,'$.epoch') BETWEEN 1 AND 9007199254740991
   AND json_type(NEW.admission_identity,'$.settingsVersion')='integer' AND json_extract(NEW.admission_identity,'$.settingsVersion') BETWEEN 1 AND 9007199254740991
   AND json_type(NEW.admission_identity,'$.ownershipGeneration')='integer' AND json_extract(NEW.admission_identity,'$.ownershipGeneration') BETWEEN 1 AND 9007199254740991
   AND json_type(NEW.admission_identity,'$.workspaceId') IN ('text','null')
   AND json_type(NEW.admission_identity,'$.name')='text' AND length(json_extract(NEW.admission_identity,'$.name')) BETWEEN 1 AND 255
   AND json_type(NEW.admission_identity,'$.bytes')='integer' AND json_extract(NEW.admission_identity,'$.bytes') BETWEEN 1 AND 209715200
   AND json_type(NEW.admission_identity,'$.sha256')='text' AND length(json_extract(NEW.admission_identity,'$.sha256'))=64 AND json_extract(NEW.admission_identity,'$.sha256') NOT GLOB '*[^a-f0-9]*'
   AND json_type(NEW.admission_identity,'$.folder')='object' AND (SELECT count(*) FROM json_each(NEW.admission_identity,'$.folder'))=5
   AND json_type(NEW.admission_identity,'$.folder.name')='text' AND length(cast(json_extract(NEW.admission_identity,'$.folder.name') as blob)) BETWEEN 1 AND 4096
   AND json_type(NEW.admission_identity,'$.folder.id')='text' AND length(cast(json_extract(NEW.admission_identity,'$.folder.id') as blob)) BETWEEN 1 AND 1024
   AND json_type(NEW.admission_identity,'$.folder.driveId') IN ('text','null')
   AND json_type(NEW.admission_identity,'$.folder.resourceKeyEnvelope') IN ('text','null')
   AND json_type(NEW.admission_identity,'$.folder.checkedAt')='text' AND json_extract(NEW.admission_identity,'$.folder.checkedAt') GLOB '????-??-??T??:??:??*' AND julianday(json_extract(NEW.admission_identity,'$.folder.checkedAt')) IS NOT NULL
   AND NEW.target_id IS NOT NULL AND NEW.note_id IS NOT NULL
   AND json_extract(NEW.admission_identity,'$.noteId')=NEW.note_id
   AND json_extract(NEW.admission_identity,'$.accountId')=NEW.account_id
   AND EXISTS(SELECT 1 FROM drive_backup_targets t JOIN originals o ON o.id=t.original_id JOIN notes n ON n.id=t.note_id
     WHERE t.id=NEW.target_id AND t.note_id=NEW.note_id AND t.account_id=NEW.account_id
     AND json_extract(NEW.admission_identity,'$.originalId')=t.original_id
     AND json_extract(NEW.admission_identity,'$.subject')=t.subject
     AND json_extract(NEW.admission_identity,'$.workspaceId') IS n.owner_workspace_id
     AND json_extract(NEW.admission_identity,'$.ownershipGeneration')=n.ownership_generation
     AND json_extract(NEW.admission_identity,'$.folder.id')=json_extract(t.folder,'$.id')
     AND json_extract(NEW.admission_identity,'$.folder.driveId') IS json_extract(t.folder,'$.driveId')
     AND json_extract(NEW.admission_identity,'$.folder.resourceKeyEnvelope') IS json_extract(t.folder,'$.resourceKeyEnvelope')
     AND json_extract(NEW.admission_identity,'$.storageKey')=o.storage_key
     AND json_extract(NEW.admission_identity,'$.sha256')=o.sha256
     AND json_extract(NEW.admission_identity,'$.bytes')=o.bytes),0))
 OR EXISTS(SELECT 1 FROM drive_backup_requests r WHERE r.id=NEW.request_id AND (
   (r.kind IN ('automatic','bulk') AND NEW.admission_identity IS NULL)
   OR (r.kind='bulk' AND (NEW.root_ordinal IS NULL
     OR (r.root_request_id IS NULL AND NEW.root_ordinal!=NEW.ordinal)
     OR (r.root_request_id IS NOT NULL AND NOT EXISTS(
       SELECT 1 FROM drive_backup_jobs p JOIN drive_backup_requests pr ON pr.id=p.request_id
       WHERE p.id=NEW.retry_of AND p.state='failed' AND p.account_id=NEW.account_id
       AND coalesce(pr.root_request_id,pr.id)=r.root_request_id AND p.root_ordinal=NEW.root_ordinal
       AND p.target_id IS NEW.target_id AND NEW.attempt=p.attempt+1
       AND json_extract(p.admission_identity,'$.originalId') IS json_extract(NEW.admission_identity,'$.originalId')
       AND json_extract(p.admission_identity,'$.workspaceId') IS json_extract(NEW.admission_identity,'$.workspaceId')
       AND json_extract(p.admission_identity,'$.ownershipGeneration') IS json_extract(NEW.admission_identity,'$.ownershipGeneration')
       AND json_extract(p.admission_identity,'$.storageKey') IS json_extract(NEW.admission_identity,'$.storageKey')
       AND json_extract(p.admission_identity,'$.bytes') IS json_extract(NEW.admission_identity,'$.bytes')
       AND json_extract(p.admission_identity,'$.sha256') IS json_extract(NEW.admission_identity,'$.sha256')
       AND json_extract(p.admission_identity,'$.name') IS json_extract(NEW.admission_identity,'$.name')
       AND NOT EXISTS(SELECT 1 FROM drive_backup_jobs newer JOIN drive_backup_requests nr ON nr.id=newer.request_id
         WHERE coalesce(nr.root_request_id,nr.id)=r.root_request_id AND newer.root_ordinal=p.root_ordinal
         AND (CASE WHEN nr.root_request_id IS NULL THEN 1 ELSE nr.generation END) > (CASE WHEN pr.root_request_id IS NULL THEN 1 ELSE pr.generation END)))))
   ) OR (r.kind!='bulk' AND NEW.root_ordinal IS NOT NULL)))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_request_retry_guard BEFORE UPDATE ON drive_backup_requests
WHEN NEW.generation>OLD.generation AND EXISTS(
  SELECT 1 FROM drive_backup_requests receipt JOIN drive_backup_jobs j ON j.request_id=receipt.id
  JOIN drive_backup_jobs p ON p.id=j.retry_of JOIN drive_backup_targets target ON target.id=p.target_id
  WHERE receipt.root_request_id=OLD.id AND receipt.generation=NEW.generation AND NOT coalesce(
    ((SELECT count(*) FROM drive_backup_transfers t WHERE t.job_id=p.id)=1
      AND EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.job_id=p.id AND t.owner_state='closed' AND t.read_pinned=0 AND t.refresh_pending=0 AND t.phase IN ('failed','cancelled')))
    OR (target.state='unallocated' AND target.file_id IS NULL
      AND (SELECT count(*) FROM drive_backup_transfers t WHERE t.job_id=p.id)<=1
      AND (p.admission_identity IS NOT NULL OR EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.job_id=p.id))
      AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.target_id=target.id AND NOT (
        t.owner_state='none' AND t.phase IN ('failed','cancelled') AND t.received=0 AND t.session_envelope IS NULL
        AND t.status_attempts=0 AND t.read_pinned=0 AND t.refresh_pending=0 AND t.offset IS NULL AND t.length IS NULL)))
  ,0))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_job_admission_update BEFORE UPDATE ON drive_backup_jobs
WHEN NEW.root_ordinal IS NOT OLD.root_ordinal
 OR (NEW.admission_identity IS NOT OLD.admission_identity AND NOT coalesce(
   OLD.terminal_at IS NOT NULL AND NEW.admission_identity IS NULL AND NEW.note_id IS NULL AND NEW.target_id IS NULL
   AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.note_id=OLD.note_id AND (t.phase NOT IN ('succeeded','failed','cancelled') OR t.owner_state IN ('active','unknown') OR t.read_pinned!=0 OR t.refresh_pending!=0)),0))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
