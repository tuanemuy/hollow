CREATE TABLE `pdf_anonymous_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`artifact_id` text NOT NULL,
	`state` text NOT NULL,
	`generation` integer NOT NULL,
	`claim_token` text,
	`runtime_id` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`next_cleanup_at` integer NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `pdf_anonymous_requests`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`artifact_id`) REFERENCES `pdf_artifacts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "pdf_anonymous_delivery_state" CHECK("pdf_anonymous_deliveries"."state" in('ready','sending','closing','closed')),
	CONSTRAINT "pdf_anonymous_delivery_owner" CHECK(("pdf_anonymous_deliveries"."state" in('ready','closed') and "pdf_anonymous_deliveries"."claim_token" is null and "pdf_anonymous_deliveries"."runtime_id" is null) or ("pdf_anonymous_deliveries"."state" in('sending','closing') and "pdf_anonymous_deliveries"."claim_token" is not null and "pdf_anonymous_deliveries"."runtime_id" is not null)),
	CONSTRAINT "pdf_anonymous_delivery_lifetime" CHECK("pdf_anonymous_deliveries"."expires_at">"pdf_anonymous_deliveries"."created_at" and "pdf_anonymous_deliveries"."expires_at"<="pdf_anonymous_deliveries"."created_at"+120000),
	CONSTRAINT "pdf_anonymous_delivery_generation" CHECK(typeof("pdf_anonymous_deliveries"."generation")='integer' and "pdf_anonymous_deliveries"."generation" between 1 and 9007199254740991)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pdf_anonymous_delivery_request_active` ON `pdf_anonymous_deliveries` (`request_id`) WHERE "pdf_anonymous_deliveries"."state"!='closed';--> statement-breakpoint
CREATE INDEX `pdf_anonymous_delivery_artifact` ON `pdf_anonymous_deliveries` (`artifact_id`,`state`);--> statement-breakpoint
CREATE INDEX `pdf_anonymous_delivery_cleanup` ON `pdf_anonymous_deliveries` (`state`,`next_cleanup_at`,`id`);--> statement-breakpoint
CREATE TABLE `pdf_anonymous_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`browser_hash` text NOT NULL,
	`command_id` text NOT NULL,
	`input_digest` text NOT NULL,
	`target_note_id` text NOT NULL,
	`live_note_id` text,
	`source_identity` text NOT NULL,
	`profile` text NOT NULL,
	`compute_id` text,
	`artifact_id` text,
	`authority_kind` text NOT NULL,
	`public_id` text,
	`url_generation` integer,
	`access_epoch` integer,
	`token_hash` text,
	`link_generation` integer,
	`grant_epoch` integer,
	`grant_verified_at` integer,
	`grant_expires_at` integer,
	`state` text NOT NULL,
	`failure` text,
	`version` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ticket_expires_at` integer NOT NULL,
	`ticket_generation` integer NOT NULL,
	`ticket_kid` text NOT NULL,
	`auto_delivery_id` text,
	FOREIGN KEY (`live_note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`compute_id`) REFERENCES `pdf_computations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`artifact_id`) REFERENCES `pdf_artifacts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "pdf_anonymous_request_state" CHECK("pdf_anonymous_requests"."state" in('queued','running','succeeded','failed','invalidated','expired')),
	CONSTRAINT "pdf_anonymous_request_authority" CHECK(("pdf_anonymous_requests"."authority_kind"='public' and "pdf_anonymous_requests"."public_id" is not null and "pdf_anonymous_requests"."url_generation" is not null and "pdf_anonymous_requests"."url_generation">0 and "pdf_anonymous_requests"."access_epoch" is not null and "pdf_anonymous_requests"."access_epoch">=0 and "pdf_anonymous_requests"."token_hash" is null and "pdf_anonymous_requests"."link_generation" is null and "pdf_anonymous_requests"."grant_epoch" is null and "pdf_anonymous_requests"."grant_verified_at" is null and "pdf_anonymous_requests"."grant_expires_at" is null) or ("pdf_anonymous_requests"."authority_kind"='link' and "pdf_anonymous_requests"."public_id" is null and "pdf_anonymous_requests"."url_generation" is null and "pdf_anonymous_requests"."access_epoch" is null and "pdf_anonymous_requests"."token_hash" is not null and "pdf_anonymous_requests"."link_generation" is not null and "pdf_anonymous_requests"."link_generation">0 and "pdf_anonymous_requests"."grant_epoch" is not null and "pdf_anonymous_requests"."grant_epoch">=0)),
	CONSTRAINT "pdf_anonymous_request_grant" CHECK(("pdf_anonymous_requests"."grant_verified_at" is null and "pdf_anonymous_requests"."grant_expires_at" is null) or ("pdf_anonymous_requests"."grant_verified_at" is not null and "pdf_anonymous_requests"."grant_expires_at" is not null and "pdf_anonymous_requests"."grant_verified_at"<="pdf_anonymous_requests"."created_at" and "pdf_anonymous_requests"."grant_expires_at">"pdf_anonymous_requests"."created_at")),
	CONSTRAINT "pdf_anonymous_request_live" CHECK(("pdf_anonymous_requests"."live_note_id" is not null and "pdf_anonymous_requests"."live_note_id"="pdf_anonymous_requests"."target_note_id") or ("pdf_anonymous_requests"."state" in('succeeded','failed','invalidated','expired') and "pdf_anonymous_requests"."live_note_id" is null)),
	CONSTRAINT "pdf_anonymous_request_compute" CHECK("pdf_anonymous_requests"."state" not in('queued','running') or "pdf_anonymous_requests"."compute_id" is not null),
	CONSTRAINT "pdf_anonymous_request_result" CHECK(("pdf_anonymous_requests"."state"='succeeded' and "pdf_anonymous_requests"."artifact_id" is not null and "pdf_anonymous_requests"."failure" is null) or ("pdf_anonymous_requests"."state"='failed' and "pdf_anonymous_requests"."artifact_id" is null and "pdf_anonymous_requests"."failure" is not null) or ("pdf_anonymous_requests"."state" in('queued','running') and "pdf_anonymous_requests"."artifact_id" is null and "pdf_anonymous_requests"."failure" is null) or ("pdf_anonymous_requests"."state" in('invalidated','expired') and "pdf_anonymous_requests"."failure" is null)),
	CONSTRAINT "pdf_anonymous_request_lifetime" CHECK("pdf_anonymous_requests"."ticket_expires_at"="pdf_anonymous_requests"."created_at"+600000),
	CONSTRAINT "pdf_anonymous_request_version" CHECK(typeof("pdf_anonymous_requests"."version")='integer' and "pdf_anonymous_requests"."version" between 1 and 9007199254740991 and typeof("pdf_anonymous_requests"."ticket_generation")='integer' and "pdf_anonymous_requests"."ticket_generation" between 1 and 9007199254740991)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pdf_anonymous_request_command` ON `pdf_anonymous_requests` (`browser_hash`,`command_id`);--> statement-breakpoint
CREATE INDEX `pdf_anonymous_request_demand` ON `pdf_anonymous_requests` (`compute_id`,`state`,`id`);--> statement-breakpoint
CREATE INDEX `pdf_anonymous_request_note` ON `pdf_anonymous_requests` (`live_note_id`,`state`,`id`);--> statement-breakpoint
CREATE INDEX `pdf_anonymous_request_expiry` ON `pdf_anonymous_requests` (`ticket_expires_at`,`id`);--> statement-breakpoint
CREATE INDEX `pdf_anonymous_request_artifact` ON `pdf_anonymous_requests` (`artifact_id`);
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_request_identity BEFORE UPDATE ON pdf_anonymous_requests
WHEN NEW.id!=OLD.id OR NEW.browser_hash!=OLD.browser_hash OR NEW.command_id!=OLD.command_id OR NEW.input_digest!=OLD.input_digest OR NEW.target_note_id!=OLD.target_note_id OR NEW.source_identity!=OLD.source_identity OR NEW.profile!=OLD.profile OR NEW.compute_id IS NOT OLD.compute_id OR NEW.authority_kind!=OLD.authority_kind OR NEW.public_id IS NOT OLD.public_id OR NEW.url_generation IS NOT OLD.url_generation OR NEW.access_epoch IS NOT OLD.access_epoch OR NEW.token_hash IS NOT OLD.token_hash OR NEW.link_generation IS NOT OLD.link_generation OR NEW.grant_epoch IS NOT OLD.grant_epoch OR NEW.grant_verified_at IS NOT OLD.grant_verified_at OR NEW.grant_expires_at IS NOT OLD.grant_expires_at OR NEW.created_at!=OLD.created_at OR NEW.ticket_expires_at!=OLD.ticket_expires_at OR NEW.ticket_generation!=OLD.ticket_generation OR NEW.ticket_kid!=OLD.ticket_kid OR (OLD.state='invalidated' AND NEW.state!='invalidated') OR (OLD.state='expired' AND NEW.state NOT IN('expired','invalidated')) OR (OLD.state IN('succeeded','failed') AND NEW.state NOT IN(OLD.state,'expired','invalidated')) OR (OLD.artifact_id IS NOT NULL AND NEW.artifact_id IS NOT OLD.artifact_id)
BEGIN SELECT RAISE(ABORT,'Anonymous PDF request identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_request_binding BEFORE INSERT ON pdf_anonymous_requests
WHEN (NEW.compute_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pdf_computations c WHERE c.id=NEW.compute_id AND c.target_note_id=NEW.target_note_id AND c.source_identity=NEW.source_identity AND c.profile=NEW.profile)) OR (NEW.artifact_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=NEW.artifact_id AND a.target_note_id=NEW.target_note_id AND a.source_identity=NEW.source_identity AND a.profile=NEW.profile AND a.state='ready'))
BEGIN SELECT RAISE(ABORT,'Anonymous PDF binding mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_request_result BEFORE UPDATE OF artifact_id ON pdf_anonymous_requests
WHEN NEW.artifact_id IS NOT NULL AND NEW.artifact_id IS NOT OLD.artifact_id AND NOT EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=NEW.artifact_id AND a.target_note_id=NEW.target_note_id AND a.source_identity=NEW.source_identity AND a.profile=NEW.profile AND a.state='ready')
BEGIN SELECT RAISE(ABORT,'Anonymous PDF artifact mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_request_auto BEFORE UPDATE OF auto_delivery_id ON pdf_anonymous_requests
WHEN (OLD.auto_delivery_id IS NOT NULL AND NEW.auto_delivery_id IS NOT OLD.auto_delivery_id) OR (OLD.auto_delivery_id IS NULL AND NEW.auto_delivery_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pdf_anonymous_deliveries d WHERE d.id=NEW.auto_delivery_id AND d.request_id=NEW.id AND d.artifact_id=NEW.artifact_id AND d.state='ready'))
BEGIN SELECT RAISE(ABORT,'Anonymous PDF automatic delivery already consumed'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_request_auto_insert BEFORE INSERT ON pdf_anonymous_requests
WHEN NEW.auto_delivery_id IS NOT NULL
BEGIN SELECT RAISE(ABORT,'Anonymous PDF automatic delivery must start unused'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_request_unbind BEFORE UPDATE OF live_note_id ON pdf_anonymous_requests
WHEN NEW.live_note_id IS NULL AND (EXISTS(SELECT 1 FROM pdf_computations c WHERE c.id=NEW.compute_id AND (c.state!='closed' OR c.workspace_removed=0)) OR EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=NEW.artifact_id AND a.state!='removed') OR EXISTS(SELECT 1 FROM pdf_anonymous_deliveries d WHERE d.request_id=NEW.id AND d.state!='closed'))
BEGIN SELECT RAISE(ABORT,'Anonymous PDF resources remain owned'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_request_delete BEFORE DELETE ON pdf_anonymous_requests
WHEN OLD.state IN('queued','running') OR EXISTS(SELECT 1 FROM pdf_computations c WHERE c.id=OLD.compute_id AND (c.state!='closed' OR c.workspace_removed=0)) OR EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=OLD.artifact_id AND a.state!='removed')
BEGIN SELECT RAISE(ABORT,'Anonymous PDF resources remain owned'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_delivery_binding BEFORE INSERT ON pdf_anonymous_deliveries
WHEN NOT EXISTS(SELECT 1 FROM pdf_anonymous_requests r JOIN pdf_artifacts a ON a.id=r.artifact_id WHERE r.id=NEW.request_id AND r.state='succeeded' AND a.id=NEW.artifact_id AND a.state='ready' AND NEW.expires_at=min(NEW.created_at+120000,r.ticket_expires_at,a.expires_at,coalesce(r.grant_expires_at,r.ticket_expires_at)))
BEGIN SELECT RAISE(ABORT,'Anonymous PDF delivery binding mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_delivery_identity BEFORE UPDATE ON pdf_anonymous_deliveries
WHEN NEW.id!=OLD.id OR NEW.request_id!=OLD.request_id OR NEW.artifact_id!=OLD.artifact_id OR NEW.created_at!=OLD.created_at OR NEW.expires_at!=OLD.expires_at OR (OLD.state='closed' AND NEW.state!='closed')
BEGIN SELECT RAISE(ABORT,'Anonymous PDF delivery identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_delivery_delete BEFORE DELETE ON pdf_anonymous_deliveries
WHEN OLD.state!='closed'
BEGIN SELECT RAISE(ABORT,'Anonymous PDF delivery remains active'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_delivery_close BEFORE UPDATE OF state ON pdf_anonymous_deliveries
WHEN NEW.state='closed' AND EXISTS(SELECT 1 FROM object_writes w WHERE w.kind='pdf-anonymous-delivery' AND w.owner_id=NEW.id AND w.active=1)
BEGIN SELECT RAISE(ABORT,'Anonymous PDF reader remains active'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_delivery_shared_capacity BEFORE INSERT ON pdf_deliveries
WHEN NEW.state!='closed' AND (SELECT count(*) FROM pdf_deliveries WHERE state!='closed')+(SELECT count(*) FROM pdf_anonymous_deliveries WHERE state!='closed')>=2
BEGIN SELECT RAISE(ABORT,'PDF delivery capacity exhausted'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_delivery_shared_capacity BEFORE INSERT ON pdf_anonymous_deliveries
WHEN NEW.state!='closed' AND (SELECT count(*) FROM pdf_deliveries WHERE state!='closed')+(SELECT count(*) FROM pdf_anonymous_deliveries WHERE state!='closed')>=2
BEGIN SELECT RAISE(ABORT,'PDF delivery capacity exhausted'); END;
