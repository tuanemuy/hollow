CREATE TABLE `note_revisions` (
	`note_id` text NOT NULL,
	`revision_no` integer NOT NULL,
	`captured_note_version` integer NOT NULL,
	`title` text NOT NULL,
	`html` text NOT NULL,
	`style` text NOT NULL,
	`saved_at` integer NOT NULL,
	`actor` text NOT NULL,
	`cause` text NOT NULL,
	`restored_from` integer,
	`resources` text NOT NULL,
	PRIMARY KEY(`note_id`, `revision_no`),
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "revision_positive" CHECK("note_revisions"."revision_no" > 0)
);
--> statement-breakpoint
CREATE TABLE `note_revision_heads` (
	`note_id` text PRIMARY KEY NOT NULL,
	`current_no` integer NOT NULL,
	`base_floor` integer NOT NULL,
	`actors` text NOT NULL,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `_revision_baseline_guard` (`invalid` integer NOT NULL CHECK (`invalid` = 0));
--> statement-breakpoint
INSERT INTO `_revision_baseline_guard` SELECT count(*) FROM note_asset_references r LEFT JOIN notes n ON n.id=r.note_id LEFT JOIN assets a ON a.id=r.asset_id WHERE r.version=0 AND (n.id IS NULL OR a.id IS NULL OR n.owner_account_id IS NULL OR n.owner_account_id != a.account_id OR a.state != 'ready' OR a.committed_to_note != 1 OR instr(n.html, '/api/notes/' || n.id || '/assets/' || a.id)=0);
--> statement-breakpoint
INSERT INTO note_revision_heads (note_id,current_no,base_floor,actors) SELECT id,1,version,'[]' FROM notes;
--> statement-breakpoint
INSERT INTO note_revisions (note_id,revision_no,captured_note_version,title,html,style,saved_at,actor,cause,restored_from,resources)
SELECT n.id,1,n.version,n.title,n.html,json_extract(n.display,'$.style'),n.updated_at,'{"kind":"legacy"}','baseline',NULL,
(SELECT json_group_array(json_object('kind',e.kind,'url',e.url,'finalUrl',e.final_url,'assetId',e.asset_id,'bytes',e.bytes)) FROM reference_entries e WHERE e.note_id=n.id AND e.current=1 AND e.state='acquired' AND e.kind IN ('image','video','stylesheet')) FROM notes n;
--> statement-breakpoint
INSERT INTO note_asset_references (note_id,asset_id,version) SELECT note_id,asset_id,1 FROM note_asset_references WHERE version=0;
--> statement-breakpoint
DROP TABLE `_revision_baseline_guard`;
