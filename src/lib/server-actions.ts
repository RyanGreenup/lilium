"use server";

import Database from "better-sqlite3";
import type { TreeNode } from "~/components/tree/types";

interface DbNote {
  id: string;
  label: string;
  parent_id: string | null;
}


let db: Database.Database | null = null;

/*
If the sqlite database is ../../notes.sqlite the schema will be:

```sql
CREATE TABLE notes (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        parent_id TEXT,
        FOREIGN KEY (parent_id) REFERENCES notes (id)
    );
```
*/
// Initialize the database connection
function getDb(): Database.Database {
  if (!db) {
    const dbPath = process.env.DB_PATH;
    if (!dbPath) {
      throw new Error("DB_PATH environment variable is not set");
    }

    db = new Database(dbPath);
  }
  return db;
}

interface DbNote {
  id: string;
  label: string;
  parent_id: string | null;
}

export async function getNoteDetails(noteId: string): Promise<TreeNode | null> {
  if (noteId === "__virtual_root__") {
    return {
      id: "__virtual_root__",
      label: "Root",
      hasChildren: true,
      level: 0,
      type: "folder"
    };
  }

  const database = getDb();
  
  try {
    const note = database
      .prepare(`SELECT * FROM notes WHERE id = ?`)
      .get(noteId) as DbNote | undefined;
    
    if (!note) {
      return null;
    }

    const hasChildrenResult = database
      .prepare(`SELECT EXISTS(SELECT 1 FROM notes WHERE parent_id = ?) as has_children`)
      .get(note.id) as { has_children: number };
    
    return {
      id: note.id,
      label: note.label || "Untitled",
      hasChildren: hasChildrenResult.has_children === 1,
      level: 0,
      type: hasChildrenResult.has_children === 1 ? "folder" : "note"
    };
  } catch (error) {
    console.error("Error getting note details:", error);
    return null;
  }
}

export async function getNotePath(noteId: string): Promise<TreeNode[]> {
  if (noteId === "__virtual_root__") {
    return [{
      id: "__virtual_root__",
      label: "Root",
      hasChildren: true,
      level: 0,
      type: "folder"
    }];
  }

  const database = getDb();
  const path: TreeNode[] = [];
  let currentId: string | null = noteId;

  try {
    while (currentId) {
      const note = database
        .prepare(`SELECT * FROM notes WHERE id = ?`)
        .get(currentId) as DbNote | undefined;
      
      if (!note) break;

      const hasChildrenResult = database
        .prepare(`SELECT EXISTS(SELECT 1 FROM notes WHERE parent_id = ?) as has_children`)
        .get(note.id) as { has_children: number };
      path.unshift({
        id: note.id,
        label: note.label || "Untitled",
        hasChildren: hasChildrenResult.has_children === 1,
        level: 0,
        type: hasChildrenResult.has_children === 1 ? "folder" : "note"
      });

      currentId = note.parent_id;
    }

    // Add root if we're not starting from root
    if (path.length > 0 && path[0].id !== "__virtual_root__") {
      path.unshift({
        id: "__virtual_root__",
        label: "Root",
        hasChildren: true,
        level: 0,
        type: "folder"
      });
    }

    return path;
  } catch (error) {
    console.error("Error getting note path:", error);
    return [];
  }
}

export async function loadTreeChildren(nodeId: string): Promise<TreeNode[]> {
  const database = getDb();

  let parentCondition: string;
  let params: any[];

  if (nodeId === "__virtual_root__") {
    parentCondition = "parent_id IS NULL";
    params = [];
  } else {
    parentCondition = "parent_id = ?";
    params = [nodeId];
  }

  // Use a CTE to calculate hasChildren and sort properly
  const query = `
    WITH note_children AS (
      SELECT 
        n.id,
        n.label,
        n.parent_id,
        CASE 
          WHEN EXISTS (SELECT 1 FROM notes child WHERE child.parent_id = n.id) 
          THEN 1 
          ELSE 0 
        END as has_children
      FROM notes n
      WHERE ${parentCondition}
    )
    SELECT 
      id,
      label,
      parent_id,
      has_children
    FROM note_children
    ORDER BY 
      has_children DESC,  -- Items with children first (1 before 0)
      label ASC           -- Then alphabetically
  `;

  const notes = database.prepare(query).all(...params) as Array<{
    id: string;
    label: string;
    parent_id: string;
    has_children: number;
  }>;

  const result: TreeNode[] = [];

  for (const note of notes) {
    const hasChildren = note.has_children === 1;
    result.push({
      id: note.id,
      label: note.label || "Untitled",
      hasChildren,
      level: 0,
      type: hasChildren ? "folder" : "note"
    });
  }

  return result;
}

export async function moveItem(sourceId: string, targetId: string): Promise<boolean> {
  const database = getDb();

  try {
    const newParentId = targetId === "__virtual_root__" ? null : targetId;

    database
      .prepare(`UPDATE notes SET parent_id = ? WHERE id = ?`)
      .run(newParentId, sourceId);

    return true;
  } catch (error) {
    console.error("Error moving item:", error);
    return false;
  }
}

export async function renameItem(nodeId: string, newLabel: string): Promise<boolean> {
  const database = getDb();

  try {
    database
      .prepare(`UPDATE notes SET label = ? WHERE id = ?`)
      .run(newLabel.trim(), nodeId);

    return true;
  } catch (error) {
    console.error("Error renaming item:", error);
    return false;
  }
}

export async function createNewItem(parentId: string, type: "folder" | "note" = "note"): Promise<string | null> {
  const database = getDb();

  try {
    const id = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newParentId = parentId === "__virtual_root__" ? null : parentId;

    database
      .prepare(`
        INSERT INTO notes (id, label, parent_id)
        VALUES (?, ?, ?)
      `)
      .run(id, "New Note", newParentId);

    return id;
  } catch (error) {
    console.error("Error creating new item:", error);
    return null;
  }
}

export async function deleteItem(nodeId: string): Promise<boolean> {
  const database = getDb();

  try {
    // Delete all descendants first
    await deleteDescendants(database, nodeId);

    // Delete the item itself
    database
      .prepare(`DELETE FROM notes WHERE id = ?`)
      .run(nodeId);

    return true;
  } catch (error) {
    console.error("Error deleting item:", error);
    return false;
  }
}

async function deleteDescendants(database: Database.Database, parentId: string): Promise<void> {
  // Get all children
  const children = database
    .prepare(`SELECT id FROM notes WHERE parent_id = ?`)
    .all(parentId) as { id: string }[];

  // Recursively delete each child and their descendants
  for (const child of children) {
    await deleteDescendants(database, child.id);
    database
      .prepare(`DELETE FROM notes WHERE id = ?`)
      .run(child.id);
  }
}
