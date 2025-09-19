/**
 * Notes application database module using SQLite
 *
 * This module provides data storage functions for notes, tags, and related entities.
 * Uses random IDs for security and follows best practices.
 */

"use server";

import Database from "better-sqlite3";
import { randomBytes } from "crypto";
import { requireUser } from "./auth";
import { redirect } from "@solidjs/router";

// Initialize SQLite database for notes app
const db = new Database("./.data/notes.sqlite");

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

export interface Note {
  id: string;
  title: string;
  abstract?: string;
  content: string;
  syntax: string;
  parent_id?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  title: string;
  parent_id?: string;
  user_id: string;
  created_at: string;
}

export interface NoteTag {
  id: string;
  note_id: string;
  tag_id: string;
  created_at: string;
}

export interface NoteWithTags extends Note {
  tags: Tag[];
}

export interface NoteChildCount {
  id: string;
  user_id: string;
  child_count: number;
}

////////////////////////////////////////////////////////////////////////////////
// Note Management /////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Create a new note
 */
export async function createNote(
  title: string,
  content: string,
  syntax: string = "markdown",
  abstract?: string,
  parent_id?: string,
): Promise<Note> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const id = randomBytes(16).toString("hex");
  const stmt = db.prepare(`
    INSERT INTO notes (id, title, abstract, content, syntax, parent_id, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, title, abstract, content, syntax, parent_id, user.id);
  return getNoteById(id);
}

/**
 * Get note by ID
 */
export async function getNoteById(id: string): Promise<Note> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const stmt = db.prepare("SELECT * FROM notes WHERE id = ? AND user_id = ?");
  const note = stmt.get(id, user.id) as Note;
  if (!note) throw new Error("Note not found");
  return note;
}

/**
 * Get all notes for the current user
 */
export async function getNotes(): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const stmt = db.prepare(`
    SELECT * FROM notes 
    WHERE user_id = ? 
    ORDER BY updated_at DESC
  `);
  
  return stmt.all(user.id) as Note[];
}

/**
 * Get notes with their tags
 */
export async function getNotesWithTags(): Promise<NoteWithTags[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const stmt = db.prepare(`
    SELECT 
      n.*,
      json_group_array(
        CASE WHEN t.id IS NOT NULL 
        THEN json_object('id', t.id, 'title', t.title, 'parent_id', t.parent_id, 'user_id', t.user_id, 'created_at', t.created_at)
        ELSE NULL END
      ) as tags_json
    FROM notes n
    LEFT JOIN note_tags nt ON n.id = nt.note_id
    LEFT JOIN tags t ON nt.tag_id = t.id
    WHERE n.user_id = ?
    GROUP BY n.id
    ORDER BY n.updated_at DESC
  `);
  
  const results = stmt.all(user.id) as (Note & { tags_json: string })[];
  
  return results.map(row => {
    const tags = JSON.parse(row.tags_json).filter((tag: any) => tag !== null);
    const { tags_json, ...note } = row;
    return { ...note, tags };
  });
}

/**
 * Update note content and metadata
 */
export async function updateNote(
  id: string,
  updates: Partial<Pick<Note, "title" | "abstract" | "content" | "syntax" | "parent_id">>,
): Promise<Note> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const setPairs = Object.keys(updates).map(key => `${key} = ?`).join(", ");
  const values = Object.values(updates);
  
  const stmt = db.prepare(`
    UPDATE notes 
    SET ${setPairs}, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ? AND user_id = ?
  `);
  
  const result = stmt.run(...values, id, user.id);
  if (result.changes === 0) throw new Error("Note not found");
  
  return getNoteById(id);
}

/**
 * Delete a note
 */
export async function deleteNote(id: string): Promise<void> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const stmt = db.prepare("DELETE FROM notes WHERE id = ? AND user_id = ?");
  const result = stmt.run(id, user.id);
  if (result.changes === 0) throw new Error("Note not found");
}

/**
 * Move a note to a new parent (for cut/paste operations)
 */
export async function moveNote(id: string, newParentId?: string): Promise<Note> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }

  // Validate that the note exists and belongs to the user
  const note = await getNoteById(id);
  
  // If newParentId is provided, validate that the parent exists and belongs to the user
  if (newParentId) {
    await getNoteById(newParentId);
    
    // Prevent moving a note to itself or its descendants to avoid circular references
    const parents = await getNoteParents(newParentId);
    if (parents.some(parent => parent.id === id)) {
      throw new Error("Cannot move note to its own descendant");
    }
  }
  
  const stmt = db.prepare(`
    UPDATE notes 
    SET parent_id = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ? AND user_id = ?
  `);
  
  const result = stmt.run(newParentId, id, user.id);
  if (result.changes === 0) throw new Error("Note not found");
  
  return getNoteById(id);
}

/**
 * Get child notes (notes with parent_id = id) (NOTE that a note entry with children is a folder)
 */
export async function getChildNotes(parent_id: string): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const stmt = db.prepare(`
    SELECT * FROM notes 
    WHERE parent_id = ? AND user_id = ? 
    ORDER BY title
  `);
  
  return stmt.all(parent_id, user.id) as Note[];
}

/**
 * Get children with their folder status (enhanced version)
 */
export async function getChildNotesWithFolderStatus(parent_id?: string): Promise<(Note & { is_folder: boolean })[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const stmt = db.prepare(`
    SELECT 
      n.*,
      CASE WHEN ncc.child_count > 0 THEN 1 ELSE 0 END as is_folder
    FROM notes n
    LEFT JOIN note_child_counts ncc ON n.id = ncc.id
    WHERE ${parent_id ? 'n.parent_id = ?' : 'n.parent_id IS NULL'} 
      AND n.user_id = ?
    ORDER BY is_folder DESC, n.title ASC
  `);
  
  const params = parent_id ? [parent_id, user.id] : [user.id];
  return stmt.all(...params) as (Note & { is_folder: boolean })[];
}

/**
 * Get note child counts for all notes
 */
export async function getNoteChildCounts(): Promise<NoteChildCount[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const stmt = db.prepare(`
    SELECT id, user_id, child_count 
    FROM note_child_counts 
    WHERE user_id = ?
    ORDER BY child_count DESC, id
  `);
  
  return stmt.all(user.id) as NoteChildCount[];
}

/**
 * Get child count for a specific note
 */
export async function getNoteChildCount(note_id: string): Promise<number> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const stmt = db.prepare(`
    SELECT child_count 
    FROM note_child_counts 
    WHERE id = ? AND user_id = ?
  `);
  
  const result = stmt.get(note_id, user.id) as { child_count: number } | undefined;
  return result?.child_count ?? 0;
}

/**
 * Get the parent hierarchy of a note (from root to current note)
 */
export async function getNoteParents(note_id: string): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  // Recursive CTE to get the parent chain
  const stmt = db.prepare(`
    WITH RECURSIVE parent_chain AS (
      -- Start with the current note
      SELECT id, title, parent_id, user_id, 0 as level
      FROM notes 
      WHERE id = ? AND user_id = ?
      
      UNION ALL
      
      -- Recursively get parents
      SELECT n.id, n.title, n.parent_id, n.user_id, pc.level + 1 as level
      FROM notes n
      INNER JOIN parent_chain pc ON n.id = pc.parent_id
      WHERE n.user_id = ?
    )
    SELECT id, title, parent_id, user_id
    FROM parent_chain 
    WHERE level > 0  -- Exclude the current note itself
    ORDER BY level DESC  -- Root first, then descendants
  `);
  
  return stmt.all(note_id, user.id, user.id) as Note[];
}

////////////////////////////////////////////////////////////////////////////////
// Tag Management //////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Create a new tag
 */
export async function createTag(
  title: string,
  parent_id?: string,
): Promise<Tag> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const id = randomBytes(16).toString("hex");
  const stmt = db.prepare(`
    INSERT INTO tags (id, title, parent_id, user_id)
    VALUES (?, ?, ?, ?)
  `);
  
  try {
    stmt.run(id, title, parent_id, user.id);
    return getTagById(id);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error("Tag with this title already exists");
    }
    throw error;
  }
}

/**
 * Get tag by ID
 */
export async function getTagById(id: string): Promise<Tag> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const stmt = db.prepare("SELECT * FROM tags WHERE id = ? AND user_id = ?");
  const tag = stmt.get(id, user.id) as Tag;
  if (!tag) throw new Error("Tag not found");
  return tag;
}

/**
 * Get all tags for the current user
 */
export async function getTags(): Promise<Tag[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const stmt = db.prepare(`
    SELECT * FROM tags 
    WHERE user_id = ? 
    ORDER BY title
  `);
  
  return stmt.all(user.id) as Tag[];
}

/**
 * Delete a tag
 */
export async function deleteTag(id: string): Promise<void> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const stmt = db.prepare("DELETE FROM tags WHERE id = ? AND user_id = ?");
  const result = stmt.run(id, user.id);
  if (result.changes === 0) throw new Error("Tag not found");
}

////////////////////////////////////////////////////////////////////////////////
// Note-Tag Relationships /////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Add a tag to a note
 */
export async function addTagToNote(note_id: string, tag_id: string): Promise<void> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  // Verify both note and tag belong to the user
  await getNoteById(note_id);
  await getTagById(tag_id);
  
  const id = randomBytes(16).toString("hex");
  const stmt = db.prepare(`
    INSERT INTO note_tags (id, note_id, tag_id)
    VALUES (?, ?, ?)
  `);
  
  try {
    stmt.run(id, note_id, tag_id);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // Tag already associated with note, ignore
      return;
    }
    throw error;
  }
}

/**
 * Remove a tag from a note
 */
export async function removeTagFromNote(note_id: string, tag_id: string): Promise<void> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const stmt = db.prepare("DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?");
  stmt.run(note_id, tag_id);
}

/**
 * Get notes by tag
 */
export async function getNotesByTag(tag_id: string): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  await getTagById(tag_id); // Verify tag exists and belongs to user
  
  const stmt = db.prepare(`
    SELECT n.* FROM notes n
    INNER JOIN note_tags nt ON n.id = nt.note_id
    WHERE nt.tag_id = ? AND n.user_id = ?
    ORDER BY n.updated_at DESC
  `);
  
  return stmt.all(tag_id, user.id) as Note[];
}

////////////////////////////////////////////////////////////////////////////////
// Search and Filtering ////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Search notes by title and content
 */
export async function searchNotes(query: string): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const stmt = db.prepare(`
    SELECT * FROM notes 
    WHERE user_id = ? AND (
      title LIKE ? OR 
      content LIKE ? OR 
      abstract LIKE ?
    )
    ORDER BY updated_at DESC
  `);
  
  const searchTerm = `%${query}%`;
  return stmt.all(user.id, searchTerm, searchTerm, searchTerm) as Note[];
}

/**
 * Get notes by syntax type
 */
export async function getNotesBySyntax(syntax: string): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const stmt = db.prepare(`
    SELECT * FROM notes 
    WHERE user_id = ? AND syntax = ?
    ORDER BY updated_at DESC
  `);
  
  return stmt.all(user.id, syntax) as Note[];
}

/**
 * Get recently modified notes
 */
export async function getRecentNotes(limit: number = 10): Promise<Note[]> {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const stmt = db.prepare(`
    SELECT * FROM notes 
    WHERE user_id = ? 
    ORDER BY updated_at DESC 
    LIMIT ?
  `);
  
  return stmt.all(user.id, limit) as Note[];
}

////////////////////////////////////////////////////////////////////////////////
// Statistics //////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Get summary statistics
 */
export async function getNotesStats() {
  const user = await requireUser();
  if (!user.id) {
    throw redirect("/login");
  }
  
  const totalNotesStmt = db.prepare("SELECT COUNT(*) as count FROM notes WHERE user_id = ?");
  const totalTagsStmt = db.prepare("SELECT COUNT(*) as count FROM tags WHERE user_id = ?");
  const recentNotesStmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM notes 
    WHERE user_id = ? AND updated_at >= datetime('now', '-7 days')
  `);
  const foldersStmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM note_child_counts 
    WHERE user_id = ? AND child_count > 0
  `);
  const syntaxStatsStmt = db.prepare(`
    SELECT syntax, COUNT(*) as count 
    FROM notes 
    WHERE user_id = ? 
    GROUP BY syntax 
    ORDER BY count DESC
  `);
  
  const totalNotes = totalNotesStmt.get(user.id) as { count: number };
  const totalTags = totalTagsStmt.get(user.id) as { count: number };
  const recentNotes = recentNotesStmt.get(user.id) as { count: number };
  const folders = foldersStmt.get(user.id) as { count: number };
  const syntaxStats = syntaxStatsStmt.all(user.id) as { syntax: string; count: number }[];
  
  return {
    total_notes: totalNotes.count,
    total_tags: totalTags.count,
    recent_notes: recentNotes.count,
    folders: folders.count,
    syntax_breakdown: syntaxStats,
  };
}
