ALTER TABLE `note_projections` ADD `title_words` text NOT NULL;--> statement-breakpoint
ALTER TABLE `note_projections` ADD `body_words` text NOT NULL;--> statement-breakpoint
CREATE VIRTUAL TABLE note_search USING fts5(tokens,content='',detail=none,tokenize='ascii');--> statement-breakpoint
CREATE TRIGGER projection_search_insert AFTER INSERT ON note_projections BEGIN INSERT INTO note_search(rowid,tokens) VALUES(new.id,new.tokens); END;--> statement-breakpoint
CREATE TRIGGER projection_search_delete AFTER DELETE ON note_projections BEGIN INSERT INTO note_search(note_search,rowid,tokens) VALUES('delete',old.id,old.tokens); END;--> statement-breakpoint
CREATE TRIGGER projection_search_update AFTER UPDATE OF tokens ON note_projections BEGIN INSERT INTO note_search(note_search,rowid,tokens) VALUES('delete',old.id,old.tokens); INSERT INTO note_search(rowid,tokens) VALUES(new.id,new.tokens); END;--> statement-breakpoint
CREATE TRIGGER projection_control_version AFTER UPDATE OF version ON notes WHEN old.html=new.html AND old.title=new.title BEGIN UPDATE note_projections SET note_version=new.version WHERE note_id=new.id AND note_version=old.version; END;
