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