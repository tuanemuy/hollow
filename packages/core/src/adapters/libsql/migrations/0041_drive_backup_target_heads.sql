CREATE TABLE __drive_backup_head_assertion (valid INTEGER NOT NULL CHECK(valid=1));
--> statement-breakpoint
INSERT INTO __drive_backup_head_assertion SELECT CASE WHEN EXISTS(SELECT 1 FROM pragma_foreign_key_check)
 OR NOT EXISTS(SELECT 1 FROM sqlite_schema WHERE type='index' AND name='drive_backup_target_original')
 OR EXISTS(SELECT 1 FROM drive_backup_targets t LEFT JOIN originals o ON o.id=t.original_id WHERE o.id IS NULL OR o.note_id!=t.note_id)
 OR EXISTS(SELECT 1 FROM drive_backup_transfers x JOIN drive_backup_targets t ON t.id=x.target_id WHERE NOT coalesce(
   x.note_id=t.note_id AND x.account_id=t.account_id AND json_extract(x.identity,'$.originalId')=t.original_id
   AND json_extract(x.identity,'$.subject')=t.subject,0))
 THEN 0 ELSE 1 END;
--> statement-breakpoint
CREATE UNIQUE INDEX drive_backup_target_head_identity ON drive_backup_targets(id,original_id,account_id,subject);
--> statement-breakpoint
CREATE TABLE drive_backup_target_heads (
 original_id TEXT NOT NULL,
 account_id TEXT NOT NULL,
 subject TEXT NOT NULL,
 target_id TEXT NOT NULL,
 version INTEGER NOT NULL CONSTRAINT drive_backup_head_version CHECK(version BETWEEN 1 AND 9007199254740991),
 PRIMARY KEY(original_id,account_id,subject),
 FOREIGN KEY(target_id,original_id,account_id,subject) REFERENCES drive_backup_targets(id,original_id,account_id,subject) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED
);
--> statement-breakpoint
CREATE UNIQUE INDEX drive_backup_target_heads_target_id_unique ON drive_backup_target_heads(target_id);
--> statement-breakpoint
INSERT INTO drive_backup_target_heads(original_id,account_id,subject,target_id,version)
SELECT original_id,account_id,subject,id,1 FROM drive_backup_targets;
--> statement-breakpoint
INSERT INTO __drive_backup_head_assertion SELECT CASE WHEN
 (SELECT count(*) FROM drive_backup_targets)!=(SELECT count(*) FROM drive_backup_target_heads)
 OR EXISTS(SELECT 1 FROM drive_backup_targets t WHERE NOT EXISTS(SELECT 1 FROM drive_backup_target_heads h WHERE h.target_id=t.id AND h.original_id=t.original_id AND h.account_id=t.account_id AND h.subject=t.subject AND h.version=1))
 OR EXISTS(SELECT 1 FROM pragma_foreign_key_check) THEN 0 ELSE 1 END;
--> statement-breakpoint
DROP INDEX drive_backup_target_original;
--> statement-breakpoint
CREATE TRIGGER drive_backup_head_insert BEFORE INSERT ON drive_backup_target_heads
WHEN NEW.version!=1 OR EXISTS(SELECT 1 FROM drive_backup_targets t WHERE t.original_id=NEW.original_id AND t.account_id=NEW.account_id AND t.subject=NEW.subject)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_head_update BEFORE UPDATE ON drive_backup_target_heads
WHEN NEW.original_id IS NOT OLD.original_id OR NEW.account_id IS NOT OLD.account_id OR NEW.subject IS NOT OLD.subject
 OR NEW.version!=OLD.version+1 OR NEW.target_id=OLD.target_id
 OR EXISTS(SELECT 1 FROM drive_backup_targets WHERE id=NEW.target_id)
 OR NOT EXISTS(SELECT 1 FROM drive_backup_targets WHERE id=OLD.target_id AND original_id=OLD.original_id AND account_id=OLD.account_id AND subject=OLD.subject)
 OR EXISTS(SELECT 1 FROM drive_backup_records r WHERE r.original_id=OLD.original_id AND r.account_id=OLD.account_id AND r.subject=OLD.subject)
 OR EXISTS(SELECT 1 FROM drive_backup_targets t WHERE t.original_id=OLD.original_id AND t.account_id=OLD.account_id AND t.subject=OLD.subject AND (
   t.state!='unallocated' OR t.file_id IS NOT NULL
   OR EXISTS(SELECT 1 FROM drive_backup_records r WHERE r.target_id=t.id)
   OR EXISTS(SELECT 1 FROM drive_backup_jobs j WHERE j.target_id=t.id AND NOT coalesce(
     j.state IN ('failed','cancelled') AND j.terminal_at IS NOT NULL AND j.bytes=0 AND j.account_id=t.account_id AND j.note_id=t.note_id
     AND (j.failure IS NULL OR j.failure NOT IN ('DRIVE_BACKUP_UNKNOWN','DRIVE_BACKUP_CONFLICT'))
     AND (SELECT count(*) FROM drive_backup_transfers x WHERE x.job_id=j.id)<=1
     AND (j.admission_identity IS NOT NULL OR EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE x.job_id=j.id))
     AND (j.admission_identity IS NULL OR (json_extract(j.admission_identity,'$.originalId')=t.original_id
       AND json_extract(j.admission_identity,'$.noteId')=t.note_id AND json_extract(j.admission_identity,'$.accountId')=t.account_id
       AND json_extract(j.admission_identity,'$.subject')=t.subject
       AND json_extract(j.admission_identity,'$.folder.id')=json_extract(t.folder,'$.id')
       AND json_extract(j.admission_identity,'$.folder.driveId') IS json_extract(t.folder,'$.driveId')
       AND json_extract(j.admission_identity,'$.folder.resourceKeyEnvelope') IS json_extract(t.folder,'$.resourceKeyEnvelope'))),0))
   OR EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE (x.target_id=t.id OR x.job_id IN (SELECT id FROM drive_backup_jobs WHERE target_id=t.id)) AND NOT coalesce(
     x.target_id=t.id AND x.note_id=t.note_id AND x.account_id=t.account_id
     AND json_extract(x.identity,'$.originalId')=t.original_id AND json_extract(x.identity,'$.subject')=t.subject
     AND json_extract(x.identity,'$.noteId')=t.note_id AND json_extract(x.identity,'$.accountId')=t.account_id
     AND json_extract(x.identity,'$.folder.id')=json_extract(t.folder,'$.id')
     AND json_extract(x.identity,'$.folder.driveId') IS json_extract(t.folder,'$.driveId')
     AND json_extract(x.identity,'$.folder.resourceKeyEnvelope') IS json_extract(t.folder,'$.resourceKeyEnvelope')
     AND (x.job_id IS NULL OR EXISTS(SELECT 1 FROM drive_backup_jobs j WHERE j.id=x.job_id AND j.target_id=t.id AND j.account_id=t.account_id AND j.note_id=t.note_id))
     AND x.phase IN ('failed','cancelled') AND x.received=0 AND x.session_envelope IS NULL AND x.status_attempts=0
     AND x.offset IS NULL AND x.length IS NULL AND x.read_pinned=0 AND x.refresh_pending=0
     AND (x.failure IS NULL OR x.failure NOT IN ('DRIVE_BACKUP_UNKNOWN','DRIVE_BACKUP_CONFLICT'))
     AND (x.owner_state='none' OR (x.owner_state='closed' AND x.phase='failed' AND x.failure IN ('DRIVE_BACKUP_FOLDER_TRASHED','DRIVE_BACKUP_FOLDER_UNAVAILABLE')))
     AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.kind='drive-backup' AND w.owner_id=x.id AND w.active=1),0))
 ))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_head_delete BEFORE DELETE ON drive_backup_target_heads
WHEN NOT EXISTS(SELECT 1 FROM drive_backup_targets t JOIN notes n ON n.id=t.note_id WHERE t.id=OLD.target_id AND n.lifecycle='purging'
 AND NOT EXISTS(SELECT 1 FROM drive_backup_jobs j WHERE j.note_id=n.id AND j.terminal_at IS NULL)
 AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE x.note_id=n.id AND (x.phase NOT IN ('failed','cancelled','succeeded') OR x.owner_state IN ('active','unknown') OR x.read_pinned!=0 OR x.refresh_pending!=0))
 AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.kind='drive-backup' AND w.active=1 AND w.owner_id IN (SELECT id FROM drive_backup_transfers WHERE note_id=n.id)))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_OWNER_ACTIVE'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_target_head_insert BEFORE INSERT ON drive_backup_targets
WHEN NEW.file_id IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM drive_backup_target_heads h WHERE h.target_id=NEW.id AND h.original_id=NEW.original_id AND h.account_id=NEW.account_id AND h.subject=NEW.subject)
 OR NOT EXISTS(SELECT 1 FROM drive_connections d WHERE d.account_id=NEW.account_id AND d.state IN ('linked','needs-relink') AND d.epoch=NEW.folder_epoch
   AND json_extract(d.credential,'$.subject')=NEW.subject
   AND json_extract(d.folder,'$.id')=json_extract(NEW.folder,'$.id')
   AND json_extract(d.folder,'$.driveId') IS json_extract(NEW.folder,'$.driveId')
   AND json_extract(d.folder,'$.resourceKeyEnvelope') IS json_extract(NEW.folder,'$.resourceKeyEnvelope'))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_target_head_update BEFORE UPDATE ON drive_backup_targets
WHEN NOT EXISTS(SELECT 1 FROM drive_backup_target_heads WHERE target_id=OLD.id)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_job_head_insert BEFORE INSERT ON drive_backup_jobs
WHEN NEW.target_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM drive_backup_target_heads WHERE target_id=NEW.target_id)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_transfer_head_insert BEFORE INSERT ON drive_backup_transfers
WHEN NOT EXISTS(SELECT 1 FROM drive_backup_target_heads WHERE target_id=NEW.target_id)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_transfer_head_update BEFORE UPDATE ON drive_backup_transfers
WHEN NOT EXISTS(SELECT 1 FROM drive_backup_target_heads WHERE target_id=NEW.target_id)
 AND (NEW.phase NOT IN ('failed','cancelled') OR (OLD.owner_state IN ('none','closed') AND NEW.owner_state='active') OR NEW.read_pinned>OLD.read_pinned OR NEW.refresh_pending>OLD.refresh_pending OR NEW.received>OLD.received OR NEW.session_envelope IS NOT OLD.session_envelope)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_record_head_insert BEFORE INSERT ON drive_backup_records
WHEN NOT EXISTS(SELECT 1 FROM drive_backup_target_heads WHERE target_id=NEW.target_id)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
INSERT INTO __drive_backup_head_assertion SELECT CASE WHEN EXISTS(SELECT 1 FROM pragma_foreign_key_check) THEN 0 ELSE 1 END;
--> statement-breakpoint
DROP TABLE __drive_backup_head_assertion;
