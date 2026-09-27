ALTER TABLE zip_attempts ADD COLUMN pdf_compute_id TEXT REFERENCES pdf_computations(id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE zip_attempts ADD COLUMN pdf_source_identity TEXT;
--> statement-breakpoint
ALTER TABLE zip_attempts ADD COLUMN pdf_profile TEXT;
--> statement-breakpoint
ALTER TABLE zip_attempts ADD COLUMN pdf_external_identity TEXT;
--> statement-breakpoint
ALTER TABLE zip_attempts ADD COLUMN pdf_deadline_at INTEGER;
--> statement-breakpoint
ALTER TABLE zip_attempts ADD COLUMN pdf_phase TEXT CHECK(pdf_phase IN('waiting-pdf','copy-ready','copying'));
--> statement-breakpoint
CREATE INDEX zip_attempt_pdf ON zip_attempts(pdf_compute_id,pdf_phase,id);
--> statement-breakpoint
CREATE TABLE zip_pdf_holds (
 attempt_id TEXT PRIMARY KEY NOT NULL REFERENCES zip_attempts(id) ON DELETE RESTRICT,
 artifact_id TEXT NOT NULL REFERENCES pdf_artifacts(id) ON DELETE RESTRICT,
 artifact_generation INTEGER NOT NULL,
 acquired_at INTEGER NOT NULL,
 state TEXT NOT NULL CHECK(state IN('held','reading','closing','released')),
 claim_token TEXT,
 runtime_id TEXT,
 version INTEGER NOT NULL,
 CHECK((claim_token IS NULL)=(runtime_id IS NULL) AND (state NOT IN('held','released') OR claim_token IS NULL) AND (state!='reading' OR claim_token IS NOT NULL)),
 CHECK(typeof(artifact_generation)='integer' AND artifact_generation BETWEEN 1 AND 9007199254740991 AND typeof(version)='integer' AND version BETWEEN 1 AND 9007199254740991 AND typeof(acquired_at)='integer' AND acquired_at BETWEEN 0 AND 9007199254740991)
);
--> statement-breakpoint
CREATE INDEX zip_pdf_hold_artifact ON zip_pdf_holds(artifact_id,state,attempt_id);
--> statement-breakpoint
CREATE INDEX zip_pdf_hold_state ON zip_pdf_holds(state,attempt_id);
--> statement-breakpoint
CREATE TRIGGER zip_pdf_binding_insert BEFORE INSERT ON zip_attempts
WHEN NEW.pdf_compute_id IS NOT NULL OR NEW.pdf_source_identity IS NOT NULL OR NEW.pdf_profile IS NOT NULL OR NEW.pdf_external_identity IS NOT NULL OR NEW.pdf_deadline_at IS NOT NULL OR NEW.pdf_phase IS NOT NULL
BEGIN SELECT RAISE(ABORT,'zip PDF must attach after admission'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_binding_shape BEFORE UPDATE ON zip_attempts
WHEN NOT (
 (NEW.pdf_compute_id IS NULL AND NEW.pdf_source_identity IS NULL AND NEW.pdf_profile IS NULL AND NEW.pdf_external_identity IS NULL AND NEW.pdf_deadline_at IS NULL AND NEW.pdf_phase IS NULL)
 OR (NEW.state='running' AND NEW.pdf_compute_id IS NOT NULL AND NEW.pdf_source_identity IS NOT NULL AND length(NEW.pdf_source_identity)=64 AND NEW.pdf_source_identity NOT GLOB '*[^a-f0-9]*' AND NEW.pdf_profile IS NOT NULL AND length(NEW.pdf_profile)>0 AND NEW.pdf_external_identity IS NOT NULL AND length(NEW.pdf_external_identity)=64 AND NEW.pdf_external_identity NOT GLOB '*[^a-f0-9]*' AND typeof(NEW.pdf_deadline_at)='integer' AND NEW.pdf_deadline_at BETWEEN 0 AND 9007199254740991 AND NEW.pdf_phase IS NOT NULL
 AND EXISTS(SELECT 1 FROM zip_requests q JOIN zip_runs r ON r.request_id=q.id AND r.generation=NEW.generation JOIN zip_targets t ON t.request_id=q.id AND t.ordinal=NEW.ordinal JOIN pdf_computations c ON c.id=NEW.pdf_compute_id WHERE q.id=NEW.request_id AND q.format='pdf' AND q.generation=NEW.generation AND t.latest_attempt_number=NEW.attempt_number AND t.target_note_id=c.target_note_id AND c.source_identity=NEW.pdf_source_identity AND c.profile=NEW.pdf_profile AND NEW.pdf_deadline_at<=r.deadline_at))
)
BEGIN SELECT RAISE(ABORT,'zip PDF binding mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_binding_attach BEFORE UPDATE ON zip_attempts
WHEN OLD.pdf_compute_id IS NULL AND NEW.pdf_compute_id IS NOT NULL AND (NEW.pdf_phase!='waiting-pdf' OR EXISTS(SELECT 1 FROM zip_pdf_holds WHERE attempt_id=NEW.id) OR NOT EXISTS(SELECT 1 FROM zip_requests q JOIN zip_runs r ON r.request_id=q.id AND r.generation=NEW.generation WHERE q.id=NEW.request_id AND q.state='active' AND q.cancel_generation<NEW.generation AND r.state='running' AND NOT EXISTS(SELECT 1 FROM json_each(r.exclusions) e WHERE json_extract(e.value,'$.ordinal')=NEW.ordinal)))
BEGIN SELECT RAISE(ABORT,'zip PDF attachment unavailable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_binding_immutable BEFORE UPDATE ON zip_attempts
WHEN OLD.pdf_compute_id IS NOT NULL AND NEW.pdf_compute_id IS NOT NULL AND (NEW.pdf_compute_id!=OLD.pdf_compute_id OR NEW.pdf_source_identity!=OLD.pdf_source_identity OR NEW.pdf_profile!=OLD.pdf_profile OR NEW.pdf_external_identity!=OLD.pdf_external_identity OR NEW.pdf_deadline_at!=OLD.pdf_deadline_at OR (OLD.pdf_phase='copying' AND NEW.pdf_phase!='copying') OR (OLD.pdf_phase='copy-ready' AND NEW.pdf_phase='waiting-pdf'))
BEGIN SELECT RAISE(ABORT,'zip PDF binding is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_binding_ready BEFORE UPDATE ON zip_attempts
WHEN NEW.pdf_phase IN('copy-ready','copying') AND NOT EXISTS(SELECT 1 FROM zip_pdf_holds h WHERE h.attempt_id=NEW.id AND ((NEW.pdf_phase='copy-ready' AND h.state IN('held','closing')) OR (NEW.pdf_phase='copying' AND h.state IN('reading','closing'))))
BEGIN SELECT RAISE(ABORT,'zip PDF hold missing'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_binding_release BEFORE UPDATE ON zip_attempts
WHEN OLD.pdf_compute_id IS NOT NULL AND NEW.pdf_compute_id IS NULL AND (
 EXISTS(SELECT 1 FROM zip_pdf_holds h WHERE h.attempt_id=NEW.id AND h.state!='released') OR
 EXISTS(SELECT 1 FROM object_writes w WHERE w.kind='zip-source' AND w.owner_id=NEW.id AND w.active=1) OR
 (OLD.pdf_phase='waiting-pdf' AND EXISTS(SELECT 1 FROM pdf_computations c WHERE c.id=OLD.pdf_compute_id AND c.state='stopping')))
BEGIN SELECT RAISE(ABORT,'zip PDF still owned'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_hold_insert BEFORE INSERT ON zip_pdf_holds
WHEN NEW.state!='held' OR NEW.version!=1 OR NOT EXISTS(
 SELECT 1 FROM zip_attempts p JOIN zip_runs r ON r.request_id=p.request_id AND r.generation=p.generation JOIN zip_requests q ON q.id=p.request_id JOIN pdf_artifacts a ON a.id=NEW.artifact_id
 WHERE p.id=NEW.attempt_id AND p.state='running' AND p.pdf_phase='waiting-pdf' AND p.pdf_deadline_at>NEW.acquired_at AND r.state='running' AND r.lease_until>NEW.acquired_at AND r.deadline_at>NEW.acquired_at AND q.state='active' AND q.generation=p.generation AND q.cancel_generation<p.generation
 AND NOT EXISTS(SELECT 1 FROM json_each(r.exclusions) e WHERE json_extract(e.value,'$.ordinal')=p.ordinal)
 AND a.state='ready' AND a.expires_at>NEW.acquired_at AND a.generation=NEW.artifact_generation AND a.compute_id=p.pdf_compute_id AND a.source_identity=p.pdf_source_identity AND a.profile=p.pdf_profile AND a.cleanup_token IS NULL
 AND NOT EXISTS(SELECT 1 FROM object_deletes d WHERE d.storage_key=a.storage_key))
BEGIN SELECT RAISE(ABORT,'zip PDF hold unavailable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_hold_update BEFORE UPDATE ON zip_pdf_holds
WHEN NEW.attempt_id!=OLD.attempt_id OR NEW.artifact_id!=OLD.artifact_id OR NEW.artifact_generation!=OLD.artifact_generation OR NEW.acquired_at!=OLD.acquired_at OR NEW.version!=OLD.version+1 OR
 (OLD.state='held' AND NEW.state NOT IN('reading','closing')) OR
 (OLD.state='reading' AND (NEW.state!='closing' OR NEW.claim_token IS NOT OLD.claim_token OR NEW.runtime_id IS NOT OLD.runtime_id)) OR
 (OLD.state='closing' AND NEW.state!='released') OR OLD.state='released'
BEGIN SELECT RAISE(ABORT,'zip PDF hold transition'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_hold_release BEFORE UPDATE ON zip_pdf_holds
WHEN NEW.state='released' AND EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND ((w.kind='zip-source' AND w.owner_id=NEW.attempt_id) OR (w.kind='zip-spool' AND EXISTS(SELECT 1 FROM zip_spools s WHERE s.id=w.owner_id AND s.attempt_id=NEW.attempt_id))))
BEGIN SELECT RAISE(ABORT,'zip PDF copy still owned'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_hold_delete BEFORE DELETE ON zip_pdf_holds
WHEN OLD.state!='released' OR EXISTS(SELECT 1 FROM zip_attempts p WHERE p.id=OLD.attempt_id AND p.pdf_compute_id IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'zip PDF hold retained'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_artifact_zip_hold BEFORE UPDATE ON pdf_artifacts
WHEN ((OLD.state='cleanup' AND NEW.state='ready') OR NEW.state NOT IN('ready','cleanup') OR NEW.storage_key IS NOT OLD.storage_key OR NEW.file IS NOT OLD.file OR NEW.generation!=OLD.generation OR NEW.reserved_bytes!=OLD.reserved_bytes OR NEW.cleanup_token IS NOT NULL) AND EXISTS(SELECT 1 FROM zip_pdf_holds h WHERE h.artifact_id=OLD.id AND h.state!='released')
BEGIN SELECT RAISE(ABORT,'PDF pinned by ZIP'); END;
--> statement-breakpoint
CREATE TRIGGER object_delete_zip_pdf_hold BEFORE INSERT ON object_deletes
WHEN EXISTS(SELECT 1 FROM pdf_artifacts a JOIN zip_pdf_holds h ON h.artifact_id=a.id WHERE a.storage_key=NEW.storage_key AND h.state!='released')
BEGIN SELECT RAISE(ABORT,'PDF pinned by ZIP'); END;
--> statement-breakpoint
CREATE TRIGGER zip_run_pdf_terminal BEFORE UPDATE ON zip_runs
WHEN NEW.state IN('succeeded','partial','failed','cancelled') AND EXISTS(SELECT 1 FROM zip_attempts p WHERE p.request_id=NEW.request_id AND p.generation=NEW.generation AND (p.pdf_compute_id IS NOT NULL OR EXISTS(SELECT 1 FROM zip_pdf_holds h WHERE h.attempt_id=p.id AND h.state!='released')))
BEGIN SELECT RAISE(ABORT,'zip PDF work not closed'); END;
