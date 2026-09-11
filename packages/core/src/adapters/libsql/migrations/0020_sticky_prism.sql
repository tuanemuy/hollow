ALTER TABLE `tags` ADD `mutation_revision` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
CREATE TRIGGER tags_revision_insert_guard BEFORE INSERT ON tags
WHEN typeof(NEW.mutation_revision) != 'integer' OR NEW.mutation_revision < 1 OR NEW.mutation_revision > 9007199254740991
BEGIN SELECT RAISE(ABORT, 'TAG_REVISION_OVERFLOW'); END;
--> statement-breakpoint
CREATE TRIGGER tags_revision_update_guard BEFORE UPDATE OF mutation_revision ON tags
WHEN typeof(NEW.mutation_revision) != 'integer' OR NEW.mutation_revision < 1 OR NEW.mutation_revision > 9007199254740991
BEGIN SELECT RAISE(ABORT, 'TAG_REVISION_OVERFLOW'); END;
--> statement-breakpoint
CREATE TRIGGER note_tags_revision_insert AFTER INSERT ON note_tags
BEGIN UPDATE tags SET mutation_revision = mutation_revision + 1 WHERE id = NEW.tag_id; END;
--> statement-breakpoint
CREATE TRIGGER note_tags_revision_delete AFTER DELETE ON note_tags
BEGIN UPDATE tags SET mutation_revision = mutation_revision + 1 WHERE id = OLD.tag_id; END;
--> statement-breakpoint
CREATE TRIGGER note_tags_revision_update AFTER UPDATE OF note_id, tag_id ON note_tags
WHEN OLD.note_id IS NOT NEW.note_id OR OLD.tag_id IS NOT NEW.tag_id
BEGIN UPDATE tags SET mutation_revision = mutation_revision + 1 WHERE id IN (OLD.tag_id, NEW.tag_id); END;
--> statement-breakpoint
CREATE TRIGGER tags_meaning_revision AFTER UPDATE OF name, normalized_key, meaning_version ON tags
WHEN OLD.name IS NOT NEW.name OR OLD.normalized_key IS NOT NEW.normalized_key OR OLD.meaning_version IS NOT NEW.meaning_version
BEGIN UPDATE tags SET mutation_revision = mutation_revision + 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER notes_lifecycle_tag_revision AFTER UPDATE OF lifecycle ON notes
WHEN OLD.lifecycle IS NOT NEW.lifecycle
BEGIN UPDATE tags SET mutation_revision = mutation_revision + 1 WHERE id IN (SELECT tag_id FROM note_tags WHERE note_id = NEW.id); END;
