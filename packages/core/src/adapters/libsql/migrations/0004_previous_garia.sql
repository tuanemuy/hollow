ALTER TABLE `assets` ADD `committed_to_note` integer DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE `assets` SET `committed_to_note` = true
WHERE EXISTS (
  SELECT 1 FROM `media_drafts` d
  WHERE d.id = assets.draft_id AND d.note_id IS NOT NULL
);
