export type NoteSyntax =
  | "md"
  | "org"
  | "html"
  | "jsx"
  | "ipynb"
  | "dw"
  | "mw"
  | "tex"
  | "typ";

export interface NoteSyntaxOption {
  value: NoteSyntax;
  label: string;
  extension: string;
}

/**
 * @deprecated Use SYNTAX_OPTIONS from db_new/types.ts instead
 */
export const SYNTAX_OPTIONS: NoteSyntaxOption[] = [
  { value: "md", label: "Markdown", extension: ".md" },
  { value: "org", label: "Org Mode", extension: ".org" },
  { value: "html", label: "HTML", extension: ".html" },
  { value: "jsx", label: "JSX", extension: ".jsx" },
  { value: "ipynb", label: "Jupyter Notebook", extension: ".ipynb" },
  { value: "dw", label: "DokuWiki", extension: ".dw" },
  { value: "mw", label: "MediaWiki", extension: ".mw" },
  { value: "tex", label: "LaTeX", extension: ".tex" },
  { value: "typ", label: "Typst", extension: ".typ" },
];

/**
 * @deprecated Use from db_new/types.ts instead
 */
export const PANDOC_SUPPORTED_SYNTAXES = ["ipynb", "typ"] as const;
/**
 * @deprecated Use from db_new/types.ts instead
 */
export type PandocSyntax = (typeof PANDOC_SUPPORTED_SYNTAXES)[number];

/**
 * @deprecated Use from db_new/types.ts instead
 */
export const MARKDOWN_CONVERTIBLE_SYNTAXES = [
  "org",
  "dw",
  "mw",
  "tex",
] as const;
/**
 * @deprecated Use from db_new/types.ts instead
 */
export type MarkdownConvertibleSyntax =
  (typeof MARKDOWN_CONVERTIBLE_SYNTAXES)[number];

/**
 * @deprecated Use from db_new/types.ts instead
 */
export const CLIENT_RENDERED_SYNTAXES = [
  "md",
  "org",
  "dw",
  "mw",
  "tex",
] as const;
/**
 * @deprecated Use from db_new/types.ts instead
 */
export type ClientRenderedSyntax = (typeof CLIENT_RENDERED_SYNTAXES)[number];

/**
 * @deprecated Use from db_new/types.ts instead
 */
export const PASSTHROUGH_SYNTAXES = ["html"] as const;
/**
 * @deprecated Use from db_new/types.ts instead
 */
export type PassthroughSyntax = (typeof PASSTHROUGH_SYNTAXES)[number];

/**
 * @deprecated Use from db_new/types.ts instead
 */
export const isPandocSyntax = (syntax: string): syntax is PandocSyntax => {
  return PANDOC_SUPPORTED_SYNTAXES.includes(syntax as PandocSyntax);
};

/**
 * @deprecated Use from db_new/types.ts instead
 */
export const isMarkdownConvertibleSyntax = (
  syntax: string,
): syntax is MarkdownConvertibleSyntax => {
  return MARKDOWN_CONVERTIBLE_SYNTAXES.includes(
    syntax as MarkdownConvertibleSyntax,
  );
};

/**
 * @deprecated Use from db_new/types.ts instead
 */
export const isClientRenderedSyntax = (
  syntax: string,
): syntax is ClientRenderedSyntax => {
  return CLIENT_RENDERED_SYNTAXES.includes(syntax as ClientRenderedSyntax);
};

/**
 * @deprecated Use from db_new/types.ts instead
 */
export const isPassthroughSyntax = (
  syntax: string,
): syntax is PassthroughSyntax => {
  return PASSTHROUGH_SYNTAXES.includes(syntax as PassthroughSyntax);
};

/**
 * @deprecated Use from db_new/types.ts instead
 */
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

/**
 * @deprecated Use from db_new/types.ts instead
 */
export interface Tag {
  id: string;
  title: string;
  parent_id?: string;
  user_id: string;
  created_at: string;
}

/**
 * @deprecated Use from db_new/types.ts instead
 */
export interface NoteTag {
  id: string;
  note_id: string;
  tag_id: string;
  created_at: string;
}

/**
 * @deprecated Use from db_new/types.ts instead
 */
export interface NoteWithTags extends Note {
  tags: Tag[];
}

/**
 * @deprecated Use from db_new/types.ts instead
 */
export interface NoteChildCount {
  id: string;
  user_id: string;
  child_count: number;
}
