/**
 * Database initialization and connection
 * 
 * This module initializes the SQLite database and creates the necessary tables.
 */

"use server";

import Database from "better-sqlite3";

// Initialize SQLite database for notes app
export const db = new Database("./.data/notes.sqlite");

// Create notes table
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    abstract TEXT,
    content TEXT NOT NULL,
    syntax TEXT NOT NULL DEFAULT 'markdown',
    parent_id TEXT,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES notes(id) ON DELETE CASCADE
  )
`);

// Create tags table
db.exec(`
  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    parent_id TEXT,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES tags(id) ON DELETE SET NULL,
    UNIQUE(title, user_id)
  )
`);

// Create note_tags junction table
db.exec(`
  CREATE TABLE IF NOT EXISTS note_tags (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(note_id, tag_id)
  )
`);

// Create view for note hierarchy statistics
db.exec(`
  CREATE VIEW IF NOT EXISTS note_child_counts AS
  SELECT 
    n.id,
    n.user_id,
    COALESCE(child_counts.child_count, 0) as child_count
  FROM notes n
  LEFT JOIN (
    SELECT 
      parent_id,
      COUNT(*) as child_count
    FROM notes 
    WHERE parent_id IS NOT NULL
    GROUP BY parent_id
  ) child_counts ON n.id = child_counts.parent_id;
`);

// Create FTS5 virtual table for full-text search
db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    id UNINDEXED,
    title,
    abstract,
    content,
    user_id UNINDEXED
  );
`);

// Create triggers to keep FTS5 table in sync with notes table
db.exec(`
  CREATE TRIGGER IF NOT EXISTS notes_fts_insert AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts(id, title, abstract, content, user_id)
    VALUES (new.id, new.title, new.abstract, new.content, new.user_id);
  END;
`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS notes_fts_delete AFTER DELETE ON notes BEGIN
    DELETE FROM notes_fts WHERE id = old.id;
  END;
`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS notes_fts_update AFTER UPDATE ON notes BEGIN
    DELETE FROM notes_fts WHERE id = old.id;
    INSERT INTO notes_fts(id, title, abstract, content, user_id)
    VALUES (new.id, new.title, new.abstract, new.content, new.user_id);
  END;
`);

// Populate FTS5 table with existing data if it's empty
const ftsCount = db.prepare("SELECT COUNT(*) as count FROM notes_fts").get() as { count: number };
if (ftsCount.count === 0) {
  // Insert existing notes into FTS5 table
  db.exec(`
    INSERT INTO notes_fts(id, title, abstract, content, user_id)
    SELECT id, title, abstract, content, user_id FROM notes;
  `);
}

// Create indexes for better query performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
  CREATE INDEX IF NOT EXISTS idx_notes_parent_id ON notes(parent_id);
  CREATE INDEX IF NOT EXISTS idx_notes_syntax ON notes(syntax);
  CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
  CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
  CREATE INDEX IF NOT EXISTS idx_tags_parent_id ON tags(parent_id);
  CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
  CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id);
`);