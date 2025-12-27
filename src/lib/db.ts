/**
 * Main database module - re-exports for backward compatibility
 *
 * All database functionality has been moved to specialized modules:
 * - notes/create.ts, notes/read.ts, notes/update.ts, notes/delete.ts, notes/search.ts
 * - tags/create.ts, tags/read.ts, tags/update.ts, tags/delete.ts
 * - noteStats.ts
 * - Database initialization is in db/index.ts
 */

// Re-export types for convenience
export type { Note, NoteWithTags, Tag, NoteChildCount } from "./db/types";
