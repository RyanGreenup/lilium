import type { NoteSyntax } from "../db/types";

export interface Folder {
  id: string;
  title: string;
  parent_id?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

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

////////////////////////////////////////////////////////////
// Pandoc stuff ////////////////////////////////////////////
////////////////////////////////////////////////////////////

export interface NoteSyntaxOption {
  value: NoteSyntax;
  label: string;
  extension: string;
}

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

export const PANDOC_SUPPORTED_SYNTAXES = ["ipynb", "typ"] as const;
export type PandocSyntax = (typeof PANDOC_SUPPORTED_SYNTAXES)[number];

export const MARKDOWN_CONVERTIBLE_SYNTAXES = [
  "org",
  "dw",
  "mw",
  "tex",
] as const;
export type MarkdownConvertibleSyntax =
  (typeof MARKDOWN_CONVERTIBLE_SYNTAXES)[number];

export const CLIENT_RENDERED_SYNTAXES = [
  "md",
  "org",
  "dw",
  "mw",
  "tex",
] as const;
export type ClientRenderedSyntax = (typeof CLIENT_RENDERED_SYNTAXES)[number];

export const PASSTHROUGH_SYNTAXES = ["html"] as const;
export type PassthroughSyntax = (typeof PASSTHROUGH_SYNTAXES)[number];

export const isPandocSyntax = (syntax: string): syntax is PandocSyntax => {
  return PANDOC_SUPPORTED_SYNTAXES.includes(syntax as PandocSyntax);
};

export const isMarkdownConvertibleSyntax = (
  syntax: string,
): syntax is MarkdownConvertibleSyntax => {
  return MARKDOWN_CONVERTIBLE_SYNTAXES.includes(
    syntax as MarkdownConvertibleSyntax,
  );
};

export const isClientRenderedSyntax = (
  syntax: string,
): syntax is ClientRenderedSyntax => {
  return CLIENT_RENDERED_SYNTAXES.includes(syntax as ClientRenderedSyntax);
};

export const isPassthroughSyntax = (
  syntax: string,
): syntax is PassthroughSyntax => {
  return PASSTHROUGH_SYNTAXES.includes(syntax as PassthroughSyntax);
};
