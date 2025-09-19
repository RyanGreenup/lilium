export type NoteSyntax = "markdown" | "org" | "html" | "jsx" | "ipynb" | "dokuwiki" | "mediawiki" | "latex";

export interface NoteSyntaxOption {
  value: NoteSyntax;
  label: string;
  extension: string;
}

export const SYNTAX_OPTIONS: NoteSyntaxOption[] = [
  { value: "markdown", label: "Markdown", extension: ".md" },
  { value: "org", label: "Org Mode", extension: ".org" },
  { value: "html", label: "HTML", extension: ".html" },
  { value: "jsx", label: "JSX", extension: ".jsx" },
  { value: "ipynb", label: "Jupyter Notebook", extension: ".ipynb" },
  { value: "dokuwiki", label: "DokuWiki", extension: ".wiki" },
  { value: "mediawiki", label: "MediaWiki", extension: ".wiki" },
  { value: "latex", label: "LaTeX", extension: ".tex" },
];

export interface Note {
  id: string;
  title: string;
  abstract?: string;
  content: string;
  syntax: NoteSyntax;
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