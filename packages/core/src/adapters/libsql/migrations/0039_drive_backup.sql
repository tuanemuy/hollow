CREATE TABLE __drive_backup_assertion(valid INTEGER NOT NULL CHECK(valid=1));
--> statement-breakpoint
INSERT INTO __drive_backup_assertion SELECT CASE WHEN
  (SELECT count(*) FROM pragma_table_info('drive_connections')) != 12
  OR (SELECT count(*) FROM sqlite_schema WHERE type='trigger' AND name='drive_connection_update_guard' AND tbl_name='drive_connections') != 1
  OR EXISTS(SELECT 1 FROM sqlite_schema WHERE tbl_name='drive_connections' AND type IN ('index','trigger') AND name NOT IN ('sqlite_autoindex_drive_connections_1','drive_connection_update_guard'))
  OR EXISTS(SELECT 1 FROM sqlite_schema WHERE type IN ('trigger','view') AND instr(lower(sql),'drive_connections') > 0 AND name NOT IN ('drive_connection_update_guard','drive_control_update_guard'))
  OR EXISTS(SELECT 1 FROM sqlite_schema s, pragma_foreign_key_list(s.name) f WHERE s.type='table' AND f."table"='drive_connections')
  THEN 0 ELSE 1 END;
--> statement-breakpoint
CREATE TABLE __drive_backup_prior_control AS SELECT sql FROM sqlite_schema WHERE type='trigger' AND name='drive_control_update_guard';
--> statement-breakpoint
INSERT INTO __drive_backup_assertion SELECT CASE WHEN (SELECT count(*) FROM __drive_backup_prior_control)=1 THEN 1 ELSE 0 END;
--> statement-breakpoint
CREATE TABLE __drive_connections_next (
  account_id text PRIMARY KEY NOT NULL,
  epoch integer NOT NULL,
  version integer NOT NULL,
  credential_version integer NOT NULL,
  settings_version integer NOT NULL,
  admission_sequence integer NOT NULL,
  state text NOT NULL,
  auto_backup integer NOT NULL,
  credential text,
  folder text,
  last_used_at integer,
  updated_at integer NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON UPDATE no action ON DELETE restrict,
  CONSTRAINT drive_connection_numbers CHECK(epoch between 0 and 9007199254740991 and version between 1 and 9007199254740991 and credential_version between 0 and 9007199254740991 and settings_version between 1 and 9007199254740991 and admission_sequence between 0 and 9007199254740991 and auto_backup in (0,1) and (auto_backup=0 or (state in ('linked','needs-relink') and folder is not null))),
  CONSTRAINT drive_connection_shape CHECK(coalesce((state='unlinked' and credential is null and folder is null and last_used_at is null) or (state in ('linked','needs-relink') and epoch>=1 and credential_version>=1 and credential is not null and json_valid(credential) and json_type(credential,'$.subject')='text' and length(json_extract(credential,'$.subject')) between 1 and 255 and json_type(credential,'$.envelope')='text' and length(cast(json_extract(credential,'$.envelope') as blob)) between 1 and 65536 and json_type(credential,'$.scopes')='array' and json_type(credential,'$.accessExpiresAt')='text' and json_type(credential,'$.connectedAt')='text'),0)),
  CONSTRAINT drive_folder_shape CHECK(coalesce(folder is null or (json_valid(folder) and json_type(folder,'$.id')='text' and length(cast(json_extract(folder,'$.id') as blob)) between 1 and 1024 and json_type(folder,'$.name')='text' and length(cast(json_extract(folder,'$.name') as blob)) between 1 and 4096 and json_type(folder,'$.checkedAt')='text' and (json_type(folder,'$.resourceKeyEnvelope')='null' or (json_type(folder,'$.resourceKeyEnvelope')='text' and length(cast(json_extract(folder,'$.resourceKeyEnvelope') as blob)) between 1 and 65536))),0))
);
--> statement-breakpoint
INSERT INTO __drive_connections_next(account_id,epoch,version,credential_version,settings_version,admission_sequence,state,auto_backup,credential,folder,last_used_at,updated_at)
SELECT account_id,epoch,version,credential_version,settings_version,admission_sequence,state,auto_backup,credential,folder,last_used_at,updated_at FROM drive_connections;
--> statement-breakpoint
INSERT INTO __drive_backup_assertion SELECT CASE WHEN
  (SELECT count(*) FROM drive_connections)=(SELECT count(*) FROM __drive_connections_next)
  AND NOT EXISTS(SELECT account_id,epoch,version,credential_version,settings_version,admission_sequence,state,auto_backup,cast(credential as blob),cast(folder as blob),last_used_at,updated_at FROM drive_connections EXCEPT SELECT account_id,epoch,version,credential_version,settings_version,admission_sequence,state,auto_backup,cast(credential as blob),cast(folder as blob),last_used_at,updated_at FROM __drive_connections_next)
  AND NOT EXISTS(SELECT account_id,epoch,version,credential_version,settings_version,admission_sequence,state,auto_backup,cast(credential as blob),cast(folder as blob),last_used_at,updated_at FROM __drive_connections_next EXCEPT SELECT account_id,epoch,version,credential_version,settings_version,admission_sequence,state,auto_backup,cast(credential as blob),cast(folder as blob),last_used_at,updated_at FROM drive_connections)
  THEN 1 ELSE 0 END;
--> statement-breakpoint
DROP TRIGGER drive_control_update_guard;
--> statement-breakpoint
DROP TABLE drive_connections;
--> statement-breakpoint
ALTER TABLE __drive_connections_next RENAME TO drive_connections;
--> statement-breakpoint
CREATE TRIGGER drive_connection_update_guard BEFORE UPDATE ON drive_connections
WHEN NEW.account_id IS NOT OLD.account_id OR NEW.version != OLD.version + 1 OR NEW.updated_at < OLD.updated_at
 OR NEW.epoch < OLD.epoch OR NEW.epoch > OLD.epoch + 1
 OR NEW.credential_version < OLD.credential_version OR NEW.credential_version > OLD.credential_version + 1
 OR NEW.settings_version < OLD.settings_version OR NEW.settings_version > OLD.settings_version + 1
 OR NEW.admission_sequence < OLD.admission_sequence OR NEW.admission_sequence > OLD.admission_sequence + 1
 OR (NEW.epoch = OLD.epoch AND json_extract(NEW.credential,'$.subject') IS NOT json_extract(OLD.credential,'$.subject'))
 OR (NEW.epoch != OLD.epoch AND (NEW.credential_version != OLD.credential_version + 1 OR NEW.settings_version != OLD.settings_version + 1 OR NEW.folder IS NOT NULL OR NEW.last_used_at IS NOT NULL OR NEW.auto_backup != 0))
 OR (NEW.auto_backup != OLD.auto_backup AND NEW.settings_version != OLD.settings_version + 1)
 OR (NEW.auto_backup = 1 AND OLD.auto_backup = 0 AND NEW.state != 'linked')
BEGIN SELECT RAISE(ABORT,'DRIVE_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_control_update_guard BEFORE UPDATE ON drive_control_operations
WHEN NEW.id IS NOT OLD.id OR NEW.account_id IS NOT OLD.account_id OR NEW.command_id IS NOT OLD.command_id
 OR NEW.intent_digest IS NOT OLD.intent_digest
 OR NEW.subject IS NOT OLD.subject OR NEW.kind IS NOT OLD.kind
 OR (NEW.credential_use IS NOT OLD.credential_use AND NOT coalesce((
   (OLD.terminal_at IS NULL AND OLD.cancel_generation = 0 AND OLD.owner_state IN ('none','closed') AND NEW.owner_state = 'active' AND json_extract(NEW.credential_use,'$.kind') = 'bound' AND
    json_extract(NEW.credential_use,'$.version') = (SELECT credential_version FROM drive_connections WHERE account_id = NEW.account_id AND epoch = NEW.expected_epoch AND settings_version = NEW.expected_settings_version AND state = 'linked' AND json_extract(credential,'$.subject') = NEW.subject)) OR
   (OLD.terminal_at IS NULL AND OLD.cancel_generation = 0 AND OLD.owner_state = 'active' AND NEW.owner_state = 'active' AND NEW.owner_token IS OLD.owner_token AND NEW.runtime_generation IS OLD.runtime_generation AND NEW.phase IS OLD.phase AND NEW.data IS OLD.data AND
    json_extract(OLD.credential_use,'$.kind') = 'bound' AND json_extract(NEW.credential_use,'$.kind') = 'self-refreshed' AND json_extract(NEW.credential_use,'$.fromVersion') = json_extract(OLD.credential_use,'$.version') AND
    json_extract(NEW.credential_use,'$.version') = (SELECT credential_version FROM drive_connections WHERE account_id = NEW.account_id AND epoch = NEW.expected_epoch AND settings_version = NEW.expected_settings_version AND state = 'linked' AND json_extract(credential,'$.subject') = NEW.subject))
 ),0))
 OR (NEW.phase = 'verifying-target' AND OLD.phase != 'verifying-target' AND NOT (
   OLD.phase = 'ready' AND OLD.owner_state = 'closed' AND NEW.owner_state = 'active' AND
   json_extract(NEW.data,'$.confirmedReadyVersion') = OLD.version AND
   json_extract(NEW.data,'$.sourceId') IS json_extract(OLD.data,'$.sourceId') AND
   json_extract(NEW.data,'$.targetId') IS json_extract(OLD.data,'$.targetId') AND
   json_extract(NEW.data,'$.targetKeyEnvelope') IS json_extract(OLD.data,'$.targetKeyEnvelope')
 ))
 OR NEW.expected_epoch IS NOT OLD.expected_epoch OR NEW.expected_credential_version IS NOT OLD.expected_credential_version OR NEW.expected_settings_version IS NOT OLD.expected_settings_version
 OR NEW.created_at IS NOT OLD.created_at OR NEW.expires_at IS NOT OLD.expires_at OR NEW.version != OLD.version + 1 OR NEW.updated_at < OLD.updated_at
 OR NEW.cancel_generation < OLD.cancel_generation OR NEW.cancel_generation > OLD.cancel_generation + 1
 OR (NEW.session_hash IS NOT NULL AND (NEW.session_hash IS NOT OLD.session_hash OR NEW.auth_version IS NOT OLD.auth_version OR NEW.browser_hash IS NOT OLD.browser_hash OR NEW.browser_epoch IS NOT OLD.browser_epoch))
 OR (NEW.session_hash IS NULL AND OLD.session_hash IS NOT NULL AND (OLD.terminal_at IS NULL OR NEW.updated_at < OLD.terminal_at + 86400000 OR OLD.owner_state IN ('active','unknown')))
 OR (OLD.terminal_at IS NOT NULL AND (NEW.phase IS NOT OLD.phase OR NEW.data IS NOT OLD.data OR NEW.terminal_at IS NOT OLD.terminal_at))
 OR (OLD.terminal_at IS NOT NULL AND OLD.owner_state IN ('none','closed') AND NEW.owner_state IN ('active','unknown'))
 OR (OLD.owner_state IN ('active','unknown') AND (NEW.runtime_generation IS NOT OLD.runtime_generation OR NEW.owner_token IS NOT OLD.owner_token OR NEW.owner_state NOT IN ('active','unknown','closed')))
 OR (OLD.owner_state = 'unknown' AND NEW.owner_state = 'active')
 OR (OLD.owner_state = 'closed' AND NOT ((NEW.owner_state = 'closed' AND NEW.runtime_generation IS OLD.runtime_generation AND NEW.owner_token IS OLD.owner_token) OR (NEW.owner_state = 'active' AND (NEW.runtime_generation IS NOT OLD.runtime_generation OR NEW.owner_token IS NOT OLD.owner_token))))
 OR (NEW.cancel_generation > 0 AND NEW.phase != OLD.phase AND NEW.phase != 'failed')
 OR (OLD.kind = 'folder-create' AND json_type(OLD.data,'$.fileId') = 'text' AND (
   coalesce(json_extract(NEW.data,'$.fileId'),json_extract(NEW.data,'$.identity.fileId')) IS NOT json_extract(OLD.data,'$.fileId') OR
   coalesce(json_extract(NEW.data,'$.marker'),json_extract(NEW.data,'$.identity.marker')) IS NOT json_extract(OLD.data,'$.marker') OR
   coalesce(json_extract(NEW.data,'$.sends'),json_extract(NEW.data,'$.identity.sends')) NOT BETWEEN json_extract(OLD.data,'$.sends') AND json_extract(OLD.data,'$.sends') + 1 OR
   (NEW.phase = 'running' AND (OLD.phase != 'running' OR NEW.owner_token IS NOT OLD.owner_token OR NEW.runtime_generation IS NOT OLD.runtime_generation) AND
    (NEW.owner_state != 'active' OR OLD.owner_state NOT IN ('none','closed') OR json_extract(NEW.data,'$.sends') IS NOT json_extract(OLD.data,'$.sends') + 1)) OR
   (coalesce(json_extract(NEW.data,'$.sends'),json_extract(NEW.data,'$.identity.sends')) != json_extract(OLD.data,'$.sends') AND
    (NEW.phase != 'running' OR NEW.owner_state != 'active' OR OLD.owner_state NOT IN ('none','closed')))))
BEGIN SELECT RAISE(ABORT,'DRIVE_STATE_INVALID'); END;
--> statement-breakpoint
INSERT INTO __drive_backup_assertion SELECT CASE WHEN (SELECT sql FROM __drive_backup_prior_control) IS (SELECT sql FROM sqlite_schema WHERE type='trigger' AND name='drive_control_update_guard') THEN 1 ELSE 0 END;
--> statement-breakpoint
DROP TABLE __drive_backup_prior_control;
--> statement-breakpoint
CREATE TABLE drive_backup_requests (
  id text PRIMARY KEY NOT NULL,
  account_id text NOT NULL,
  command_id text NOT NULL,
  intent_digest text NOT NULL,
  kind text NOT NULL,
  version integer NOT NULL,
  created_at integer NOT NULL,
  cancelled_at integer,
  count integer NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON UPDATE no action ON DELETE restrict,
  CONSTRAINT drive_backup_request_shape CHECK(version between 1 and 9007199254740991 and count between 1 and 500 and kind in ('manual','automatic','bulk') and length(intent_digest)=64 and intent_digest not glob '*[^a-f0-9]*' and (cancelled_at is null or cancelled_at>=created_at))
);
--> statement-breakpoint
CREATE UNIQUE INDEX drive_backup_request_command ON drive_backup_requests(account_id,command_id);
--> statement-breakpoint
CREATE TABLE drive_backup_targets (
  id text PRIMARY KEY NOT NULL,
  original_id text NOT NULL,
  note_id text NOT NULL,
  account_id text NOT NULL,
  subject text NOT NULL,
  marker text NOT NULL,
  folder text NOT NULL,
  folder_epoch integer NOT NULL,
  file_id text,
  state text NOT NULL,
  version integer NOT NULL,
  created_at integer NOT NULL,
  updated_at integer NOT NULL,
  FOREIGN KEY (original_id) REFERENCES originals(id) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON UPDATE no action ON DELETE restrict,
  CONSTRAINT drive_backup_target_shape CHECK(coalesce(version between 1 and 9007199254740991 and folder_epoch between 1 and 9007199254740991 and updated_at>=created_at and length(subject) between 1 and 255 and json_valid(folder) and ((state='unallocated' and file_id is null) or (state in ('allocated','unknown','confirmed') and file_id is not null and length(file_id) between 1 and 1024)),0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX drive_backup_target_original ON drive_backup_targets(original_id,account_id,subject);
--> statement-breakpoint
CREATE UNIQUE INDEX drive_backup_target_file ON drive_backup_targets(file_id);
--> statement-breakpoint
CREATE TABLE drive_backup_jobs (
  id text PRIMARY KEY NOT NULL,
  request_id text NOT NULL,
  account_id text NOT NULL,
  ordinal integer NOT NULL,
  attempt integer NOT NULL,
  retry_of text,
  note_id text,
  target_id text,
  title text NOT NULL,
  version integer NOT NULL,
  created_at integer NOT NULL,
  updated_at integer NOT NULL,
  terminal_at integer,
  state text NOT NULL,
  bytes integer NOT NULL,
  failure text,
  record_id text,
  FOREIGN KEY (request_id) REFERENCES drive_backup_requests(id) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (target_id) REFERENCES drive_backup_targets(id) ON UPDATE no action ON DELETE restrict,
  CONSTRAINT drive_backup_job_shape CHECK(version between 1 and 9007199254740991 and attempt between 1 and 9007199254740991 and ordinal between 0 and 499 and bytes between 0 and 209715200 and updated_at>=created_at and ((state in ('queued','running') and terminal_at is null and failure is null and record_id is null) or (state='succeeded' and terminal_at is not null and failure is null and record_id is not null) or (state='failed' and terminal_at is not null and failure is not null and record_id is null) or (state='cancelled' and terminal_at is not null and failure is null and record_id is null)))
);
--> statement-breakpoint
CREATE UNIQUE INDEX drive_backup_job_attempt ON drive_backup_jobs(request_id,ordinal,attempt);
--> statement-breakpoint
CREATE INDEX drive_backup_job_history ON drive_backup_jobs(account_id,created_at,id);
--> statement-breakpoint
CREATE INDEX drive_backup_job_note ON drive_backup_jobs(note_id,state);
--> statement-breakpoint
CREATE TABLE drive_backup_transfers (
  id text PRIMARY KEY NOT NULL,
  job_id text,
  target_id text NOT NULL,
  note_id text NOT NULL,
  account_id text NOT NULL,
  workspace_id text,
  epoch integer NOT NULL,
  identity text NOT NULL,
  owner_state text NOT NULL,
  runtime_generation text,
  owner_token text,
  credential_version integer NOT NULL,
  version integer NOT NULL,
  cancel_generation integer NOT NULL,
  received integer NOT NULL,
  session_envelope text,
  status_attempts integer NOT NULL,
  created_at integer NOT NULL,
  updated_at integer NOT NULL,
  deadline_at integer NOT NULL,
  read_pinned integer NOT NULL,
  refresh_pending integer DEFAULT 0 NOT NULL,
  phase text NOT NULL,
  offset integer,
  length integer,
  record_id text,
  failure text,
  FOREIGN KEY (job_id) REFERENCES drive_backup_jobs(id) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (target_id) REFERENCES drive_backup_targets(id) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON UPDATE no action ON DELETE restrict,
  CONSTRAINT drive_backup_transfer_identity CHECK(coalesce(json_valid(identity) and json_extract(identity,'$.noteId')=note_id and json_extract(identity,'$.accountId')=account_id and json_extract(identity,'$.epoch')=epoch and json_extract(identity,'$.workspaceId') is workspace_id and json_extract(identity,'$.bytes') between 1 and 209715200 and received between 0 and json_extract(identity,'$.bytes'),0)),
  CONSTRAINT drive_backup_transfer_numbers CHECK(version between 1 and 9007199254740991 and credential_version between 1 and 9007199254740991 and cancel_generation between 0 and 9007199254740991 and status_attempts between 0 and 3 and deadline_at>created_at and updated_at>=created_at and read_pinned in (0,1) and refresh_pending in (0,1)),
  CONSTRAINT drive_backup_transfer_owner_shape CHECK((owner_state='none' and runtime_generation is null and owner_token is null and read_pinned=0 and refresh_pending=0 and phase in ('queued','failed','cancelled')) or (owner_state in ('active','unknown','closed') and runtime_generation is not null and owner_token is not null and (owner_state!='closed' or (read_pinned=0 and refresh_pending=0)))),
  CONSTRAINT drive_backup_transfer_phase CHECK(coalesce(phase in ('queued','checking','allocating','refreshing','initiating','uploading','reconciling','verifying','succeeded','failed','cancelled') and (cancel_generation=0 or phase='cancelled') and (phase not in ('uploading','reconciling') or session_envelope is not null) and (phase!='uploading' or (offset=received and length between 1 and 1048576 and offset+length<=json_extract(identity,'$.bytes'))) and ((phase='failed' and failure is not null) or (phase!='failed' and failure is null)) and ((phase='succeeded' and record_id is not null and owner_state='closed' and received=json_extract(identity,'$.bytes')) or (phase!='succeeded' and record_id is null)),0))
);
--> statement-breakpoint
CREATE INDEX drive_backup_transfer_owner ON drive_backup_transfers(owner_state,account_id);
--> statement-breakpoint
CREATE INDEX drive_backup_transfer_note ON drive_backup_transfers(note_id,phase);
--> statement-breakpoint
CREATE INDEX drive_backup_transfer_queue ON drive_backup_transfers(phase,created_at,id);
--> statement-breakpoint
CREATE UNIQUE INDEX drive_backup_transfer_live ON drive_backup_transfers(target_id) WHERE phase not in ('succeeded','failed','cancelled') or owner_state in ('active','unknown');
--> statement-breakpoint
CREATE TABLE drive_backup_records (
  id text PRIMARY KEY NOT NULL,
  version integer NOT NULL,
  target_id text NOT NULL,
  note_id text NOT NULL,
  original_id text NOT NULL,
  account_id text NOT NULL,
  subject text NOT NULL,
  file_id text NOT NULL,
  folder text NOT NULL,
  bytes integer NOT NULL,
  sha256 text NOT NULL,
  created_at integer NOT NULL,
  web_view_link text,
  resource_key_envelope text,
  FOREIGN KEY (target_id) REFERENCES drive_backup_targets(id) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (original_id) REFERENCES originals(id) ON UPDATE no action ON DELETE restrict,
  CONSTRAINT drive_backup_record_shape CHECK(version=1 and bytes between 1 and 209715200 and length(sha256)=64 and sha256 not glob '*[^a-f0-9]*' and length(subject) between 1 and 255 and length(file_id) between 1 and 1024 and json_valid(folder))
);
--> statement-breakpoint
CREATE UNIQUE INDEX drive_backup_record_target ON drive_backup_records(target_id);
--> statement-breakpoint
CREATE INDEX drive_backup_record_note ON drive_backup_records(note_id,account_id);
--> statement-breakpoint
CREATE TRIGGER drive_backup_request_insert_guard BEFORE INSERT ON drive_backup_requests
WHEN NEW.version != 1
 OR EXISTS(SELECT 1 FROM drive_authorization_attempts WHERE account_id=NEW.account_id AND command_id=NEW.command_id)
 OR EXISTS(SELECT 1 FROM drive_control_operations WHERE account_id=NEW.account_id AND command_id=NEW.command_id)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_request_update_guard BEFORE UPDATE ON drive_backup_requests
WHEN NEW.id IS NOT OLD.id OR NEW.account_id IS NOT OLD.account_id OR NEW.command_id IS NOT OLD.command_id
 OR NEW.intent_digest IS NOT OLD.intent_digest OR NEW.kind IS NOT OLD.kind OR NEW.count IS NOT OLD.count
 OR NEW.created_at IS NOT OLD.created_at OR NEW.version != OLD.version+1 OR OLD.cancelled_at IS NOT NULL
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_target_insert_guard BEFORE INSERT ON drive_backup_targets
WHEN NEW.version != 1 OR NEW.state != 'unallocated'
 OR NOT EXISTS(SELECT 1 FROM originals WHERE id=NEW.original_id AND note_id=NEW.note_id)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_target_update_guard BEFORE UPDATE ON drive_backup_targets
WHEN NEW.id IS NOT OLD.id OR NEW.original_id IS NOT OLD.original_id OR NEW.note_id IS NOT OLD.note_id
 OR NEW.account_id IS NOT OLD.account_id OR NEW.subject IS NOT OLD.subject OR NEW.marker IS NOT OLD.marker
 OR NEW.folder IS NOT OLD.folder OR NEW.folder_epoch IS NOT OLD.folder_epoch OR NEW.created_at IS NOT OLD.created_at
 OR NEW.version != OLD.version+1 OR NEW.updated_at < OLD.updated_at OR OLD.state='confirmed'
 OR (OLD.file_id IS NOT NULL AND NEW.file_id IS NOT OLD.file_id)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_job_insert_guard BEFORE INSERT ON drive_backup_jobs
WHEN NEW.version != 1
 OR NOT EXISTS(SELECT 1 FROM drive_backup_requests WHERE id=NEW.request_id AND account_id=NEW.account_id AND NEW.ordinal<count)
 OR (NEW.target_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM drive_backup_targets WHERE id=NEW.target_id AND account_id=NEW.account_id AND note_id IS NEW.note_id))
 OR (NEW.state='succeeded' AND NOT EXISTS(SELECT 1 FROM drive_backup_records WHERE id=NEW.record_id AND target_id IS NEW.target_id AND account_id=NEW.account_id AND note_id IS NEW.note_id AND bytes=NEW.bytes))
 OR (NEW.state='queued' AND NEW.bytes!=0)
 OR (NEW.terminal_at IS NOT NULL AND (NEW.terminal_at<NEW.created_at OR NEW.terminal_at>NEW.updated_at))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_job_update_guard BEFORE UPDATE ON drive_backup_jobs
WHEN NEW.id IS NOT OLD.id OR NEW.request_id IS NOT OLD.request_id OR NEW.account_id IS NOT OLD.account_id
 OR NEW.ordinal IS NOT OLD.ordinal OR NEW.attempt IS NOT OLD.attempt OR NEW.created_at IS NOT OLD.created_at
 OR NOT coalesce(
   (OLD.terminal_at IS NULL AND NEW.version=OLD.version+1 AND NEW.updated_at>=OLD.updated_at
    AND NEW.note_id IS OLD.note_id AND NEW.target_id IS OLD.target_id AND NEW.retry_of IS OLD.retry_of AND NEW.title IS OLD.title
    AND NEW.bytes>=OLD.bytes AND (OLD.state='queued' OR NEW.state!='queued')
    AND (NEW.state!='queued' OR NEW.bytes=0)
    AND (NEW.terminal_at IS NULL OR NEW.terminal_at BETWEEN NEW.created_at AND NEW.updated_at)
    AND (NEW.state!='succeeded' OR EXISTS(SELECT 1 FROM drive_backup_records WHERE id=NEW.record_id AND target_id IS NEW.target_id AND account_id=NEW.account_id AND note_id IS NEW.note_id AND bytes=NEW.bytes)))
   OR
   (NEW.version=OLD.version AND NEW.updated_at IS OLD.updated_at AND NEW.state IS OLD.state
    AND NEW.terminal_at IS OLD.terminal_at AND NEW.bytes IS OLD.bytes AND NEW.failure IS OLD.failure AND NEW.record_id IS OLD.record_id
    AND NEW.note_id IS OLD.note_id AND NEW.target_id IS OLD.target_id AND NEW.title IS OLD.title
    AND OLD.retry_of IS NOT NULL AND NEW.retry_of IS NULL)
   OR
   (OLD.terminal_at IS NOT NULL AND NEW.version=OLD.version AND NEW.updated_at IS OLD.updated_at AND NEW.state IS OLD.state
    AND NEW.terminal_at IS OLD.terminal_at AND NEW.bytes IS OLD.bytes AND NEW.failure IS OLD.failure AND NEW.record_id IS OLD.record_id
    AND NEW.retry_of IS OLD.retry_of AND OLD.note_id IS NOT NULL AND NEW.note_id IS NULL AND NEW.target_id IS NULL AND NEW.title='削除済みノート'
    AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers WHERE note_id=OLD.note_id AND (phase NOT IN ('succeeded','failed','cancelled') OR owner_state IN ('active','unknown') OR read_pinned!=0 OR refresh_pending!=0)))
 ,0)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_job_delete_guard BEFORE DELETE ON drive_backup_jobs
WHEN OLD.terminal_at IS NULL
 OR EXISTS(SELECT 1 FROM drive_backup_transfers WHERE job_id=OLD.id AND (phase NOT IN ('succeeded','failed','cancelled') OR owner_state IN ('active','unknown') OR read_pinned!=0 OR refresh_pending!=0))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_OWNER_ACTIVE'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_transfer_insert_guard BEFORE INSERT ON drive_backup_transfers
WHEN NEW.version!=1 OR NEW.phase!='queued' OR NEW.owner_state!='none' OR NEW.cancel_generation!=0
 OR NEW.received!=0 OR NEW.read_pinned!=0 OR NEW.refresh_pending!=0 OR NEW.status_attempts!=0 OR NEW.session_envelope IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM drive_backup_targets WHERE id=NEW.target_id AND note_id=NEW.note_id AND account_id=NEW.account_id
   AND original_id=json_extract(NEW.identity,'$.originalId') AND subject=json_extract(NEW.identity,'$.subject')
   AND json_extract(folder,'$.id') IS json_extract(NEW.identity,'$.folder.id')
   AND json_extract(folder,'$.driveId') IS json_extract(NEW.identity,'$.folder.driveId')
   AND json_extract(folder,'$.resourceKeyEnvelope') IS json_extract(NEW.identity,'$.folder.resourceKeyEnvelope'))
 OR NOT EXISTS(SELECT 1 FROM originals WHERE id=json_extract(NEW.identity,'$.originalId') AND note_id=NEW.note_id
   AND storage_key=json_extract(NEW.identity,'$.storageKey') AND bytes=json_extract(NEW.identity,'$.bytes') AND sha256=json_extract(NEW.identity,'$.sha256'))
 OR NOT EXISTS(SELECT 1 FROM drive_backup_jobs WHERE id=NEW.job_id AND target_id=NEW.target_id AND account_id=NEW.account_id AND note_id=NEW.note_id AND state='queued')
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_transfer_update_guard BEFORE UPDATE ON drive_backup_transfers
WHEN NEW.id IS NOT OLD.id OR NEW.target_id IS NOT OLD.target_id OR NEW.note_id IS NOT OLD.note_id
 OR NEW.account_id IS NOT OLD.account_id OR NEW.workspace_id IS NOT OLD.workspace_id OR NEW.epoch IS NOT OLD.epoch
 OR NEW.identity IS NOT OLD.identity OR NEW.created_at IS NOT OLD.created_at OR NEW.deadline_at IS NOT OLD.deadline_at
 OR NOT coalesce(
   (NEW.version=OLD.version+1 AND NEW.updated_at>=OLD.updated_at AND NEW.job_id IS OLD.job_id
    AND NEW.received>=OLD.received AND NEW.cancel_generation BETWEEN OLD.cancel_generation AND OLD.cancel_generation+1
    AND NEW.credential_version>=OLD.credential_version
    AND (NEW.phase!='succeeded' OR EXISTS(SELECT 1 FROM drive_backup_records WHERE id=NEW.record_id AND target_id=NEW.target_id AND note_id=NEW.note_id AND account_id=NEW.account_id AND bytes=NEW.received))
    AND (OLD.phase NOT IN ('succeeded','failed','cancelled') OR
      (NEW.phase IS OLD.phase AND NEW.received IS OLD.received AND NEW.session_envelope IS OLD.session_envelope
       AND NEW.status_attempts IS OLD.status_attempts AND NEW.offset IS OLD.offset AND NEW.length IS OLD.length
       AND NEW.record_id IS OLD.record_id AND NEW.failure IS OLD.failure AND NEW.credential_version IS OLD.credential_version))
    AND (OLD.owner_state!='none' OR NEW.owner_state IN ('none','active'))
    AND (OLD.owner_state NOT IN ('active','unknown') OR
      (NEW.runtime_generation IS OLD.runtime_generation AND NEW.owner_token IS OLD.owner_token AND NEW.owner_state IN ('active','unknown','closed')))
    AND (OLD.owner_state!='unknown' OR NEW.owner_state!='active')
    AND (OLD.owner_state!='closed' OR
      ((NEW.owner_state='closed' AND NEW.runtime_generation IS OLD.runtime_generation AND NEW.owner_token IS OLD.owner_token)
       OR (NEW.owner_state='active' AND OLD.phase NOT IN ('succeeded','failed','cancelled') AND (NEW.runtime_generation IS NOT OLD.runtime_generation OR NEW.owner_token IS NOT OLD.owner_token))))
    AND (OLD.read_pinned=0 OR NEW.read_pinned=1 OR NEW.owner_state='closed')
    AND (OLD.refresh_pending=0 OR NEW.refresh_pending=1 OR NEW.owner_state IN ('active','closed'))
    AND (OLD.refresh_pending=1 OR NEW.refresh_pending=0 OR
      (OLD.owner_state='active' AND NEW.owner_state='active' AND OLD.phase NOT IN ('succeeded','failed','cancelled') AND OLD.cancel_generation=0)))
   OR
   (OLD.phase IN ('succeeded','failed','cancelled') AND OLD.owner_state IN ('none','closed') AND OLD.read_pinned=0 AND OLD.refresh_pending=0
    AND OLD.job_id IS NOT NULL AND NEW.job_id IS NULL AND NEW.version IS OLD.version AND NEW.updated_at IS OLD.updated_at
    AND NEW.owner_state IS OLD.owner_state AND NEW.runtime_generation IS OLD.runtime_generation AND NEW.owner_token IS OLD.owner_token
    AND NEW.credential_version IS OLD.credential_version AND NEW.cancel_generation IS OLD.cancel_generation
    AND NEW.received IS OLD.received AND NEW.session_envelope IS OLD.session_envelope AND NEW.status_attempts IS OLD.status_attempts
    AND NEW.read_pinned IS OLD.read_pinned AND NEW.refresh_pending IS OLD.refresh_pending AND NEW.phase IS OLD.phase
    AND NEW.offset IS OLD.offset AND NEW.length IS OLD.length AND NEW.record_id IS OLD.record_id AND NEW.failure IS OLD.failure)
 ,0)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_transfer_claim_guard BEFORE UPDATE ON drive_backup_transfers
WHEN OLD.owner_state IN ('none','closed') AND NEW.owner_state='active'
 AND EXISTS(SELECT 1 FROM drive_backup_transfers WHERE id!=OLD.id AND owner_state IN ('active','unknown'))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_OWNER_ACTIVE'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_transfer_delete_guard BEFORE DELETE ON drive_backup_transfers
WHEN OLD.phase NOT IN ('succeeded','failed','cancelled') OR OLD.owner_state IN ('active','unknown') OR OLD.read_pinned!=0 OR OLD.refresh_pending!=0
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_OWNER_ACTIVE'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_record_insert_guard BEFORE INSERT ON drive_backup_records
WHEN NOT EXISTS(SELECT 1 FROM drive_backup_targets WHERE id=NEW.target_id AND state='confirmed'
  AND file_id=NEW.file_id AND original_id=NEW.original_id AND note_id=NEW.note_id AND account_id=NEW.account_id AND subject=NEW.subject
  AND json_extract(folder,'$.id') IS json_extract(NEW.folder,'$.id')
  AND json_extract(folder,'$.name') IS json_extract(NEW.folder,'$.name')
  AND json_extract(folder,'$.driveId') IS json_extract(NEW.folder,'$.driveId')
  AND json_extract(folder,'$.checkedAt') IS json_extract(NEW.folder,'$.checkedAt'))
 OR NOT EXISTS(SELECT 1 FROM originals WHERE id=NEW.original_id AND note_id=NEW.note_id AND bytes=NEW.bytes AND sha256=NEW.sha256)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_record_update_guard BEFORE UPDATE ON drive_backup_records
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_record_delete_guard BEFORE DELETE ON drive_backup_records
WHEN EXISTS(SELECT 1 FROM drive_backup_transfers WHERE target_id=OLD.target_id AND (phase NOT IN ('succeeded','failed','cancelled') OR owner_state IN ('active','unknown') OR read_pinned!=0 OR refresh_pending!=0))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_OWNER_ACTIVE'); END;
--> statement-breakpoint
INSERT INTO __drive_backup_assertion SELECT CASE WHEN EXISTS(SELECT 1 FROM pragma_foreign_key_check) THEN 0 ELSE 1 END;
--> statement-breakpoint
DROP TABLE __drive_backup_assertion;
