ALTER TABLE import_batches ADD COLUMN requested_visibility TEXT NOT NULL DEFAULT 'private' CHECK (requested_visibility IN ('private', 'link', 'public'));
