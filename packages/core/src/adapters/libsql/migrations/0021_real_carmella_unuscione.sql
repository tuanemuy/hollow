CREATE TABLE `bundle_scope_holdings` (
	`bundle_id` text NOT NULL,
	`scope_kind` text NOT NULL,
	`scope_id` text NOT NULL,
	`note_holds` integer DEFAULT 0 NOT NULL,
	`admission_holds` integer DEFAULT 0 NOT NULL,
	`cleanup_holds` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`bundle_id`, `scope_kind`, `scope_id`),
	FOREIGN KEY (`bundle_id`) REFERENCES `source_bundles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `notes` ADD `ownership_generation` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `notes` ADD `resource_revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `object_writes` ADD `note_id` text;--> statement-breakpoint
ALTER TABLE `object_writes` ADD `ownership_generation` integer;--> statement-breakpoint
ALTER TABLE `reference_jobs` ADD `ownership_generation` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `source_bundles` ADD `content_revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `membership_revision` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
CREATE TRIGGER notes_ownership_generation_insert_guard BEFORE INSERT ON notes
WHEN typeof(NEW.ownership_generation)!='integer' OR NEW.ownership_generation<1 OR NEW.ownership_generation>9007199254740991
BEGIN
 SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW');
END;
--> statement-breakpoint
CREATE TRIGGER notes_ownership_generation_update_guard BEFORE UPDATE OF ownership_generation ON notes
WHEN typeof(NEW.ownership_generation)!='integer' OR NEW.ownership_generation<1 OR NEW.ownership_generation>9007199254740991
BEGIN
 SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW');
END;
--> statement-breakpoint
CREATE TRIGGER notes_resource_revision_insert_guard BEFORE INSERT ON notes
WHEN typeof(NEW.resource_revision)!='integer' OR NEW.resource_revision<1 OR NEW.resource_revision>9007199254740991
BEGIN
 SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW');
END;
--> statement-breakpoint
CREATE TRIGGER notes_resource_revision_update_guard BEFORE UPDATE OF resource_revision ON notes
WHEN typeof(NEW.resource_revision)!='integer' OR NEW.resource_revision<1 OR NEW.resource_revision>9007199254740991
BEGIN
 SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW');
END;
--> statement-breakpoint
CREATE TRIGGER workspaces_membership_revision_insert_guard BEFORE INSERT ON workspaces
WHEN typeof(NEW.membership_revision)!='integer' OR NEW.membership_revision<1 OR NEW.membership_revision>9007199254740991
BEGIN
 SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW');
END;
--> statement-breakpoint
CREATE TRIGGER workspaces_membership_revision_update_guard BEFORE UPDATE OF membership_revision ON workspaces
WHEN typeof(NEW.membership_revision)!='integer' OR NEW.membership_revision<1 OR NEW.membership_revision>9007199254740991
BEGIN
 SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW');
END;
--> statement-breakpoint
CREATE TRIGGER source_bundles_content_revision_insert_guard BEFORE INSERT ON source_bundles
WHEN typeof(NEW.content_revision)!='integer' OR NEW.content_revision<1 OR NEW.content_revision>9007199254740991
BEGIN
 SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW');
END;
--> statement-breakpoint
CREATE TRIGGER source_bundles_content_revision_update_guard BEFORE UPDATE OF content_revision ON source_bundles
WHEN typeof(NEW.content_revision)!='integer' OR NEW.content_revision<1 OR NEW.content_revision>9007199254740991
BEGIN
 SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW');
END;
--> statement-breakpoint
CREATE TRIGGER bundle_scope_holdings_revision_insert_guard BEFORE INSERT ON bundle_scope_holdings
WHEN typeof(NEW.revision)!='integer' OR NEW.revision<1 OR NEW.revision>9007199254740991
BEGIN
 SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW');
END;
--> statement-breakpoint
CREATE TRIGGER bundle_scope_holdings_revision_update_guard BEFORE UPDATE OF revision ON bundle_scope_holdings
WHEN typeof(NEW.revision)!='integer' OR NEW.revision<1 OR NEW.revision>9007199254740991
BEGIN
 SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW');
END;
--> statement-breakpoint
CREATE TRIGGER write_ownership_insert_guard BEFORE INSERT ON object_writes
WHEN NOT ((NEW.note_id IS NULL AND NEW.ownership_generation IS NULL) OR (NEW.note_id IS NOT NULL AND typeof(NEW.ownership_generation)='integer' AND NEW.ownership_generation BETWEEN 1 AND 9007199254740991))
BEGIN
 SELECT RAISE(ABORT,'WRITE_OWNERSHIP_INVALID');
END;
--> statement-breakpoint
CREATE TRIGGER write_ownership_update_guard BEFORE UPDATE OF note_id,ownership_generation ON object_writes
WHEN NOT ((NEW.note_id IS NULL AND NEW.ownership_generation IS NULL) OR (NEW.note_id IS NOT NULL AND typeof(NEW.ownership_generation)='integer' AND NEW.ownership_generation BETWEEN 1 AND 9007199254740991))
BEGIN
 SELECT RAISE(ABORT,'WRITE_OWNERSHIP_INVALID');
END;
--> statement-breakpoint
CREATE TRIGGER membership_revision_insert AFTER INSERT ON workspace_members
BEGIN
 UPDATE workspaces SET membership_revision=membership_revision+1 WHERE id IN (NEW.workspace_id);
END;
--> statement-breakpoint
CREATE TRIGGER membership_revision_delete AFTER DELETE ON workspace_members
BEGIN
 UPDATE workspaces SET membership_revision=membership_revision+1 WHERE id IN (OLD.workspace_id);
END;
--> statement-breakpoint
CREATE TRIGGER membership_revision_update AFTER UPDATE OF role,workspace_id,account_id ON workspace_members
WHEN OLD.role IS NOT NEW.role OR OLD.workspace_id IS NOT NEW.workspace_id OR OLD.account_id IS NOT NEW.account_id
BEGIN
 UPDATE workspaces SET membership_revision=membership_revision+1 WHERE id IN (OLD.workspace_id,NEW.workspace_id);
END;
--> statement-breakpoint
CREATE TRIGGER draft_rebind_guard BEFORE UPDATE OF note_id ON media_drafts
WHEN OLD.note_id IS NOT NULL AND OLD.note_id IS NOT NEW.note_id
BEGIN
 SELECT RAISE(ABORT,'DRAFT_ALREADY_BOUND');
END;
--> statement-breakpoint
CREATE TRIGGER write_first_bind AFTER UPDATE OF note_id ON media_drafts
WHEN OLD.note_id IS NULL AND NEW.note_id IS NOT NULL
BEGIN
 UPDATE object_writes SET note_id=NEW.note_id,ownership_generation=(SELECT ownership_generation FROM notes WHERE id=NEW.note_id) WHERE kind='media-upload' AND owner_id IN (SELECT id FROM media_uploads WHERE draft_id=NEW.id) AND note_id IS NULL AND ownership_generation IS NULL;
END;
--> statement-breakpoint
CREATE TRIGGER reference_job_ownership AFTER INSERT ON reference_jobs
BEGIN
 UPDATE reference_jobs SET ownership_generation=(SELECT ownership_generation FROM notes WHERE id=NEW.note_id) WHERE id=NEW.id;
END;
--> statement-breakpoint
CREATE INDEX move_asset_source ON assets(source_note_id);
--> statement-breakpoint
CREATE INDEX move_asset_draft ON assets(draft_id);
--> statement-breakpoint
CREATE INDEX move_draft_note ON media_drafts(note_id);
--> statement-breakpoint
CREATE INDEX move_upload_draft ON media_uploads(draft_id,state);
--> statement-breakpoint
CREATE INDEX move_reference_job_note ON reference_jobs(note_id,state);
--> statement-breakpoint
CREATE INDEX move_reference_object_job ON reference_objects(job_id,state);
--> statement-breakpoint
CREATE INDEX move_settings_bundle ON reference_settings(bundle_id,note_id);
--> statement-breakpoint
CREATE INDEX move_upload_batch_state ON upload_reservations(batch_id,state);
--> statement-breakpoint
CREATE INDEX move_companion_bundle ON companion_sources(bundle_id);
--> statement-breakpoint
CREATE INDEX move_writer_note ON object_writes(note_id,active);
--> statement-breakpoint
CREATE TRIGGER move_resource_originals_insert AFTER INSERT ON originals
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (NEW.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_originals_delete AFTER DELETE ON originals
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (OLD.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_originals_update AFTER UPDATE OF bytes,storage_key,note_id ON originals
WHEN OLD.bytes IS NOT NEW.bytes OR OLD.storage_key IS NOT NEW.storage_key OR OLD.note_id IS NOT NEW.note_id
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (OLD.note_id,NEW.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_assets_insert AFTER INSERT ON assets
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (coalesce(NEW.source_note_id,(SELECT note_id FROM media_drafts WHERE id=NEW.draft_id)));
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_assets_delete AFTER DELETE ON assets
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (coalesce(OLD.source_note_id,(SELECT note_id FROM media_drafts WHERE id=OLD.draft_id)));
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_assets_update AFTER UPDATE OF bytes,storage_key,draft_id,source_note_id,state,unreferenced_at,committed_to_note ON assets
WHEN OLD.bytes IS NOT NEW.bytes OR OLD.storage_key IS NOT NEW.storage_key OR OLD.draft_id IS NOT NEW.draft_id OR OLD.source_note_id IS NOT NEW.source_note_id OR OLD.state IS NOT NEW.state OR OLD.unreferenced_at IS NOT NEW.unreferenced_at OR OLD.committed_to_note IS NOT NEW.committed_to_note
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (coalesce(OLD.source_note_id,(SELECT note_id FROM media_drafts WHERE id=OLD.draft_id)),coalesce(NEW.source_note_id,(SELECT note_id FROM media_drafts WHERE id=NEW.draft_id)));
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_media_uploads_insert AFTER INSERT ON media_uploads
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN ((SELECT note_id FROM media_drafts WHERE id=NEW.draft_id));
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_media_uploads_delete AFTER DELETE ON media_uploads
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN ((SELECT note_id FROM media_drafts WHERE id=OLD.draft_id));
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_media_uploads_update AFTER UPDATE OF bytes,draft_id,state,expires_at,storage_cleaned ON media_uploads
WHEN OLD.bytes IS NOT NEW.bytes OR OLD.draft_id IS NOT NEW.draft_id OR OLD.state IS NOT NEW.state OR OLD.expires_at IS NOT NEW.expires_at OR OLD.storage_cleaned IS NOT NEW.storage_cleaned
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN ((SELECT note_id FROM media_drafts WHERE id=OLD.draft_id),(SELECT note_id FROM media_drafts WHERE id=NEW.draft_id));
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_reference_objects_insert AFTER INSERT ON reference_objects
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN ((SELECT note_id FROM reference_jobs WHERE id=NEW.job_id));
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_reference_objects_delete AFTER DELETE ON reference_objects
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN ((SELECT note_id FROM reference_jobs WHERE id=OLD.job_id));
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_reference_objects_update AFTER UPDATE OF bytes,job_id,state ON reference_objects
WHEN OLD.bytes IS NOT NEW.bytes OR OLD.job_id IS NOT NEW.job_id OR OLD.state IS NOT NEW.state
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN ((SELECT note_id FROM reference_jobs WHERE id=OLD.job_id),(SELECT note_id FROM reference_jobs WHERE id=NEW.job_id));
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_note_asset_references_insert AFTER INSERT ON note_asset_references
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (NEW.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_note_asset_references_delete AFTER DELETE ON note_asset_references
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (OLD.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_note_asset_references_update AFTER UPDATE OF note_id,asset_id,version ON note_asset_references
WHEN OLD.note_id IS NOT NEW.note_id OR OLD.asset_id IS NOT NEW.asset_id OR OLD.version IS NOT NEW.version
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (OLD.note_id,NEW.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_reference_settings_insert AFTER INSERT ON reference_settings
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (NEW.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_reference_settings_delete AFTER DELETE ON reference_settings
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (OLD.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_reference_settings_update AFTER UPDATE OF note_id,bundle_id ON reference_settings
WHEN OLD.note_id IS NOT NEW.note_id OR OLD.bundle_id IS NOT NEW.bundle_id
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (OLD.note_id,NEW.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_bind AFTER UPDATE OF note_id ON media_drafts
WHEN OLD.note_id IS NOT NEW.note_id
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (OLD.note_id,NEW.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER holding_counts_revision AFTER UPDATE OF note_holds,admission_holds,cleanup_holds ON bundle_scope_holdings
WHEN OLD.note_holds IS NOT NEW.note_holds OR OLD.admission_holds IS NOT NEW.admission_holds OR OLD.cleanup_holds IS NOT NEW.cleanup_holds
BEGIN
 UPDATE bundle_scope_holdings SET revision=revision+1 WHERE bundle_id=NEW.bundle_id AND scope_kind=NEW.scope_kind AND scope_id=NEW.scope_id;
END;
--> statement-breakpoint
CREATE TRIGGER holding_values_insert BEFORE INSERT ON bundle_scope_holdings
WHEN NEW.scope_kind NOT IN ('personal','workspace') OR length(NEW.scope_id)=0 OR typeof(NEW.note_holds)!='integer' OR typeof(NEW.admission_holds)!='integer' OR typeof(NEW.cleanup_holds)!='integer' OR NEW.note_holds<0 OR NEW.admission_holds<0 OR NEW.cleanup_holds NOT IN (0,1)
BEGIN
 SELECT RAISE(ABORT,'HOLDING_INVALID');
END;
--> statement-breakpoint
CREATE TRIGGER holding_values_update BEFORE UPDATE OF note_holds,admission_holds,cleanup_holds,scope_kind,scope_id ON bundle_scope_holdings
WHEN NEW.scope_kind NOT IN ('personal','workspace') OR length(NEW.scope_id)=0 OR typeof(NEW.note_holds)!='integer' OR typeof(NEW.admission_holds)!='integer' OR typeof(NEW.cleanup_holds)!='integer' OR NEW.note_holds<0 OR NEW.admission_holds<0 OR NEW.cleanup_holds NOT IN (0,1)
BEGIN
 SELECT RAISE(ABORT,'HOLDING_INVALID');
END;
--> statement-breakpoint
CREATE TRIGGER holding_source_bundles_insert AFTER INSERT ON source_bundles
BEGIN

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=NEW.id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=NEW.id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=NEW.id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=NEW.id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_source_bundles_update AFTER UPDATE OF sealed ON source_bundles
WHEN OLD.sealed IS NOT NEW.sealed
BEGIN

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=OLD.id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=OLD.id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=OLD.id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=OLD.id;


 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=NEW.id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=NEW.id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=NEW.id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=NEW.id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_upload_reservations_insert AFTER INSERT ON upload_reservations
BEGIN

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=NEW.batch_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=NEW.batch_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=NEW.batch_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=NEW.batch_id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_upload_reservations_delete AFTER DELETE ON upload_reservations
BEGIN

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=OLD.batch_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=OLD.batch_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=OLD.batch_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=OLD.batch_id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_upload_reservations_update AFTER UPDATE OF state,batch_id ON upload_reservations
WHEN OLD.state IS NOT NEW.state OR OLD.batch_id IS NOT NEW.batch_id
BEGIN

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=OLD.batch_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=OLD.batch_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=OLD.batch_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=OLD.batch_id;


 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=NEW.batch_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=NEW.batch_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=NEW.batch_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=NEW.batch_id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_reference_settings_insert AFTER INSERT ON reference_settings
BEGIN

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=NEW.bundle_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=NEW.bundle_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=NEW.bundle_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=NEW.bundle_id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_reference_settings_delete AFTER DELETE ON reference_settings
BEGIN
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
    SELECT OLD.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id),1 FROM notes n WHERE n.id=OLD.note_id AND OLD.bundle_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=OLD.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=OLD.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=OLD.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=OLD.bundle_id)
    ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=OLD.bundle_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=OLD.bundle_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=OLD.bundle_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=OLD.bundle_id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_reference_settings_update AFTER UPDATE OF bundle_id,note_id ON reference_settings
WHEN OLD.bundle_id IS NOT NEW.bundle_id OR OLD.note_id IS NOT NEW.note_id
BEGIN
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
    SELECT OLD.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id),1 FROM notes n WHERE n.id=OLD.note_id AND OLD.bundle_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=OLD.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=OLD.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=OLD.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=OLD.bundle_id)
    ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=OLD.bundle_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=OLD.bundle_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=OLD.bundle_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=OLD.bundle_id;


 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=NEW.bundle_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=NEW.bundle_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=NEW.bundle_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=NEW.bundle_id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_companion_sources_insert AFTER INSERT ON companion_sources
BEGIN
 UPDATE source_bundles SET content_revision=content_revision+1 WHERE id IN (NEW.bundle_id);

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=NEW.bundle_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=NEW.bundle_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=NEW.bundle_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=NEW.bundle_id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_companion_sources_delete AFTER DELETE ON companion_sources
BEGIN
 UPDATE source_bundles SET content_revision=content_revision+1 WHERE id IN (OLD.bundle_id);

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=OLD.bundle_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=OLD.bundle_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=OLD.bundle_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=OLD.bundle_id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_companion_sources_update AFTER UPDATE OF bundle_id,bytes,storage_key ON companion_sources
WHEN OLD.bundle_id IS NOT NEW.bundle_id OR OLD.bytes IS NOT NEW.bytes OR OLD.storage_key IS NOT NEW.storage_key
BEGIN
 UPDATE source_bundles SET content_revision=content_revision+1 WHERE id IN (OLD.bundle_id,NEW.bundle_id);

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=OLD.bundle_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=OLD.bundle_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=OLD.bundle_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=OLD.bundle_id;


 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=NEW.bundle_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=NEW.bundle_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=NEW.bundle_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=NEW.bundle_id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_note_move AFTER UPDATE OF owner_account_id,owner_workspace_id ON notes
WHEN OLD.owner_account_id IS NOT NEW.owner_account_id OR OLD.owner_workspace_id IS NOT NEW.owner_workspace_id
BEGIN

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=(SELECT bundle_id FROM reference_settings WHERE note_id=NEW.id) GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=(SELECT bundle_id FROM reference_settings WHERE note_id=NEW.id) AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=(SELECT bundle_id FROM reference_settings WHERE note_id=NEW.id) AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=(SELECT bundle_id FROM reference_settings WHERE note_id=NEW.id);

END;
--> statement-breakpoint
INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,note_holds)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id),count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id IS NOT NULL GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id);
--> statement-breakpoint
INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,admission_holds,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),(CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')),CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) THEN 1 ELSE 0 END FROM source_bundles b WHERE ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) OR (NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id))
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET admission_holds=excluded.admission_holds,cleanup_holds=excluded.cleanup_holds;
--> statement-breakpoint
UPDATE bundle_scope_holdings SET revision=1;
