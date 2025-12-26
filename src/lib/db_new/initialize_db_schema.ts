import Database from "better-sqlite3";

// {{{1 Main Init function ////////////////////////////////////////////////////

export function initializeDatabase(db: Database.Database) {
  // Set WAL and performance stuff
  setPragma(db);

  // Main Tables for Notes and folders
  createTables(db);

  // Keep old notes around for a bit
  createNoteHistory(db);

  // Search
  createFTS(db);

  // Views to get Paths (unused)
  createPathViews(db);

  // materialized Views for quick path <-> ID resolution
  createMaterializedPathViews(db);
}

// {{{2 Helpers ////////////////////////////////////////////////////////////////
// {{{3 Pragma
function setPragma(db: Database.Database) {
  // Enable foreign key constraints (CRITICAL: required for CASCADE to work)
  db.pragma("foreign_keys = ON");

  // Enable WAL mode for better concurrency and performance
  db.pragma("journal_mode = WAL");

  // Performance optimizations
  db.pragma("synchronous = NORMAL"); // Faster than FULL, still safe with WAL
  db.pragma("cache_size = -64000"); // 64MB cache (negative = KB)
  db.pragma("temp_store = MEMORY"); // Store temp tables in memory
  db.pragma("mmap_size = 30000000000"); // 30GB memory-mapped I/O
}
// {{{3 main Tables
function createTables(db: Database.Database) {
  // Folders
  db.exec(`
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  parent_id TEXT,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_user_title ON folders(parent_id, user_id, title);
CREATE INDEX IF NOT EXISTS idx_folders_root_user_title ON folders(user_id, title) WHERE parent_id IS NULL;
        `);

  // Notes
  db.exec(`
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    abstract TEXT,
    content TEXT NOT NULL,
    syntax TEXT NOT NULL DEFAULT 'md',
    parent_id TEXT,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
    -- Include syntax to for pandoc sake
    UNIQUE(parent_id, title, syntax)
  );
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_parent_id ON notes(parent_id);
CREATE INDEX IF NOT EXISTS idx_notes_syntax ON notes(syntax);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_parent_title ON notes(parent_id, title);
CREATE INDEX IF NOT EXISTS idx_notes_parent_updated ON notes(parent_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_content ON notes(content IS NULL);
CREATE INDEX IF NOT EXISTS idx_notes_parent_user ON notes(parent_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notes_root_user_title ON notes(user_id, title) WHERE parent_id IS NULL;
        `);
}

// {{{3 Search
function createFTS(db: Database.Database) {
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
  const ftsCount = db
    .prepare("SELECT COUNT(*) as count FROM notes_fts")
    .get() as { count: number };
  if (ftsCount.count === 0) {
    // Insert existing notes into FTS5 table
    db.exec(`
    INSERT INTO notes_fts(id, title, abstract, content, user_id)
    SELECT id, title, abstract, content, user_id FROM notes;
  `);
  }
}

// {{{3 History
function createNoteHistory(db: Database.Database) {
  db.exec(`

CREATE TABLE IF NOT EXISTS notes_history (
      id TEXT,
      title TEXT NOT NULL,
      abstract TEXT,
      content TEXT NOT NULL,
      syntax TEXT NOT NULL DEFAULT 'md',
      -- Why it was logged
      log_action TEXT CHECK (log_action IN ('DELETE', 'UPDATE')) DEFAULT 'DELETE',
      parent_id TEXT,
      user_id TEXT NOT NULL,
      created_at DATETIME,
      updated_at DATETIME,
      deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      history_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))
  );
CREATE INDEX IF NOT EXISTS idx_notes_history_user_id ON notes_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_history_parent_id ON notes_history(parent_id);
CREATE INDEX IF NOT EXISTS idx_notes_history_deleted_at ON notes_history(deleted_at);
CREATE INDEX IF NOT EXISTS idx_notes_history_id ON notes_history(id);
CREATE TRIGGER IF NOT EXISTS notes_before_update
BEFORE UPDATE ON notes
BEGIN
    -- Copy the old version of the note to notes_history
    INSERT INTO notes_history (id, title, abstract, content, syntax, log_action, parent_id, user_id, created_at, updated_at, deleted_at)
    VALUES (old.id, old.title, old.abstract, old.content, old.syntax, 'UPDATE', old.parent_id, old.user_id, old.created_at, old.updated_at, CURRENT_TIMESTAMP);

    -- Delete older history entries beyond the last 30 for this note where log_action is 'UPDATE'
    DELETE FROM notes_history
    WHERE id = old.id
    AND log_action = 'UPDATE'
    AND history_id NOT IN (
        SELECT history_id FROM notes_history
        WHERE id = old.id
        AND log_action = 'UPDATE'
        ORDER BY deleted_at DESC
        LIMIT 30
    );
END;
CREATE TRIGGER IF NOT EXISTS notes_before_delete
BEFORE DELETE ON notes
BEGIN
    -- Copy the note being deleted to notes_history
    INSERT INTO notes_history (id, title, abstract, content, syntax, log_action, parent_id, user_id, created_at, updated_at, deleted_at)
    VALUES (old.id, old.title, old.abstract, old.content, old.syntax, 'DELETE', old.parent_id, old.user_id, old.created_at, old.updated_at, CURRENT_TIMESTAMP);

    -- Delete older history entries beyond the last 15 for this note where log_action is 'DELETE'
    DELETE FROM notes_history
    WHERE id = old.id
    AND log_action = 'DELETE'
    AND history_id NOT IN (
        SELECT history_id FROM notes_history
        WHERE id = old.id
        AND log_action = 'DELETE'
        ORDER BY deleted_at DESC
        LIMIT 15
    );
END;


       `);
}

// {{{3 File Path to Id
// {{{4 Main Functions
function createPathViews(db: Database.Database) {
  createFolderIdPathMappingView(db);
  createNoteIdPathMappingView(db);
}

function createMaterializedPathViews(db: Database.Database) {
  createMvTables(db);
  createMvTriggers(db);
}

// {{{4 Views
// {{{5 Folders
function createFolderIdPathMappingView(db: Database.Database) {
  db.exec(`

CREATE VIEW IF NOT EXISTS v_folder_id_path_mapping AS
WITH RECURSIVE folder_path AS (
    -- Base case: root folders (folders with no parent)
    SELECT
        id,
        title,
        parent_id,
        user_id,
        title AS path
    FROM folders
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive case: build path for nested folders
    SELECT
        f.id,
        f.title,
        f.parent_id,
        f.user_id,
        fp.path || '/' || f.title AS path
    FROM folders f
    INNER JOIN folder_path fp ON f.parent_id = fp.id
)
SELECT
    id,
    title,
    parent_id,
    user_id,
    path AS full_path
FROM folder_path;


        `);
}
// {{{5 Notes
function createNoteIdPathMappingView(db: Database.Database) {
  db.exec(`
CREATE VIEW IF NOT EXISTS v_note_id_path_mapping AS
WITH RECURSIVE folder_path AS (
    -- Base case: root folders (folders with no parent)
    SELECT
        id,
        title,
        parent_id,
        user_id,
        title AS path
    FROM folders
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive case: build path for nested folders
    SELECT
        f.id,
        f.title,
        f.parent_id,
        f.user_id,
        fp.path || '/' || f.title AS path
    FROM folders f
    INNER JOIN folder_path fp ON f.parent_id = fp.id
)
SELECT
    n.id,
    n.title,
    n.syntax,
    n.user_id,
    CASE
        WHEN n.parent_id IS NULL THEN n.title || '.' || n.syntax
        ELSE fp.path || '/' || n.title || '.' || n.syntax
    END AS full_path
FROM notes n
LEFT JOIN folder_path fp ON n.parent_id = fp.id
`);
}

// {{{4 Materialized Views
// {{{5 Tables
function createMvTables(db: Database.Database) {
  db.exec(`
CREATE TABLE IF NOT EXISTS mv_folder_paths (
  folder_id TEXT PRIMARY KEY,
  full_path TEXT NOT NULL,
  user_id TEXT NOT NULL,
  FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mv_folder_paths_user ON mv_folder_paths (user_id);
CREATE INDEX IF NOT EXISTS idx_mv_folder_paths_full_path ON mv_folder_paths (full_path);

CREATE TABLE IF NOT EXISTS mv_note_paths (
  note_id TEXT PRIMARY KEY,
  full_path TEXT NOT NULL,
  user_id TEXT NOT NULL,
  FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mv_note_paths_user ON mv_note_paths (user_id);
CREATE INDEX IF NOT EXISTS idx_mv_note_paths_full_path ON mv_note_paths (full_path);

`);
}
// {{{5 Triggers
// {{{6 Main
function createMvTriggers(db: Database.Database) {
  // NOTE order matters, note triggers leverage mv folders table
  // to improve performance
  createMvFolderTriggers(db);
  createMvNoteTriggers(db);
}
// {{{6 Folders
function createMvFolderTriggers(db: Database.Database) {
  db.exec(`
-- INSERT: Compute path using parent's cached path
CREATE TRIGGER IF NOT EXISTS mv_folder_paths_insert AFTER INSERT ON folders BEGIN
INSERT INTO mv_folder_paths (folder_id, full_path, user_id)
VALUES (
  new.id,
  CASE
    WHEN new.parent_id IS NULL THEN new.title
    ELSE (SELECT full_path FROM mv_folder_paths WHERE folder_id = new.parent_id) || '/' || new.title
  END,
  new.user_id
);
END;

-- UPDATE: Cascade update this folder and all descendants
CREATE TRIGGER IF NOT EXISTS mv_folder_paths_update
AFTER UPDATE ON folders
WHEN old.title != new.title OR old.parent_id IS NOT new.parent_id BEGIN

-- Update this folder's path
UPDATE mv_folder_paths
SET full_path = CASE
  WHEN new.parent_id IS NULL THEN new.title
  ELSE (SELECT full_path FROM mv_folder_paths WHERE folder_id = new.parent_id) || '/' || new.title
END
WHERE folder_id = new.id;

-- Update all descendant folders' paths (must process in tree order)
-- We use a trick: repeatedly update until no changes, processing one level at a time
UPDATE mv_folder_paths
SET full_path = (
  SELECT
    CASE
      WHEN f.parent_id IS NULL THEN f.title
      ELSE (SELECT full_path FROM mv_folder_paths WHERE folder_id = f.parent_id) || '/' || f.title
    END
  FROM folders f
  WHERE f.id = mv_folder_paths.folder_id
)
WHERE folder_id IN (
  WITH RECURSIVE descendant_folders AS (
    SELECT id FROM folders WHERE parent_id = new.id
    UNION ALL
    SELECT f.id FROM folders f
    INNER JOIN descendant_folders df ON f.parent_id = df.id
  )
  SELECT id FROM descendant_folders
);

-- Update all notes under this folder tree
UPDATE mv_note_paths
SET full_path = (
  SELECT
    CASE
      WHEN n.parent_id IS NULL THEN n.title || '.' || n.syntax
      ELSE (SELECT full_path FROM mv_folder_paths WHERE folder_id = n.parent_id) || '/' || n.title || '.' || n.syntax
    END
  FROM notes n
  WHERE n.id = mv_note_paths.note_id
)
WHERE note_id IN (
  WITH RECURSIVE descendant_folders AS (
    SELECT id FROM folders WHERE id = new.id
    UNION ALL
    SELECT f.id FROM folders f
    INNER JOIN descendant_folders df ON f.parent_id = df.id
  )
  SELECT n.id FROM notes n
  WHERE n.parent_id IN (SELECT id FROM descendant_folders)
);

END;

-- DELETE: Remove from mv_folder_paths (CASCADE handles it, but explicit for safety)
CREATE TRIGGER IF NOT EXISTS mv_folder_paths_delete AFTER DELETE ON folders BEGIN
DELETE FROM mv_folder_paths WHERE folder_id = old.id;
END;
`);
}
// {{{6 Notes
function createMvNoteTriggers(db: Database.Database) {
  db.exec(`
-- INSERT: Compute path using parent folder's cached path
CREATE TRIGGER IF NOT EXISTS mv_note_paths_insert AFTER INSERT ON notes BEGIN
INSERT INTO mv_note_paths (note_id, full_path, user_id)
VALUES (
  new.id,
  CASE
    WHEN new.parent_id IS NULL THEN new.title || '.' || new.syntax
    ELSE (SELECT full_path FROM mv_folder_paths WHERE folder_id = new.parent_id) || '/' || new.title || '.' || new.syntax
  END,
  new.user_id
);
END;

-- UPDATE: Recompute path if title/parent_id/syntax changed
CREATE TRIGGER IF NOT EXISTS mv_note_paths_update
AFTER UPDATE ON notes
WHEN old.title != new.title OR old.parent_id IS NOT new.parent_id OR old.syntax != new.syntax BEGIN
UPDATE mv_note_paths
SET full_path = CASE
  WHEN new.parent_id IS NULL THEN new.title || '.' || new.syntax
  ELSE (SELECT full_path FROM mv_folder_paths WHERE folder_id = new.parent_id) || '/' || new.title || '.' || new.syntax
END
WHERE note_id = new.id;
END;

-- DELETE: Remove from mv_note_paths
CREATE TRIGGER IF NOT EXISTS mv_note_paths_delete AFTER DELETE ON notes BEGIN
DELETE FROM mv_note_paths WHERE note_id = old.id;
END;
`);
}
