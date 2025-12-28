/**
 * Link formatting utilities for different note syntaxes
 *
 * These functions format links to notes in the appropriate syntax
 * based on the current note's format (Markdown, Org, etc.).
 *
 * Link format conventions:
 * - Links always use the note ID as the URL (e.g., /note/{id})
 * - Display text can be either the title or the full path
 *
 * NOTE: The ID-based links are internal app links that get routed
 * to the appropriate note. This makes links stable even if notes
 * are renamed or moved.
 */

import type { NoteSyntax } from "./db/types";
import type { NoteWithPath } from "./db/notes/search";

/**
 * Format a note link for a specific syntax
 *
 * @param note - The note to link to (must include display_path)
 * @param syntax - The syntax of the note containing the link
 * @param useFullPath - Whether to use the full path as display text (default: false uses title)
 * @returns Formatted link string
 */
export function formatNoteLink(
  note: NoteWithPath,
  syntax: NoteSyntax,
  useFullPath: boolean = false,
): string {
  const displayText = useFullPath ? note.display_path : note.title;
  // NOTE avoid abs url for compatability sake
  // const noteUrl = `/note/${note.id}`;
  const noteUrl = note.id;

  switch (syntax) {
    case "md":
      return formatMarkdownLink(displayText, noteUrl);

    case "org":
      return formatOrgLink(displayText, noteUrl);

    case "html":
    case "jsx":
      return formatHtmlLink(displayText, noteUrl);

    case "dw":
      return formatDokuWikiLink(displayText, noteUrl);

    case "mw":
      return formatMediaWikiLink(displayText, noteUrl);

    case "tex":
      return formatLatexLink(displayText, noteUrl);

    case "typ":
      return formatTypstLink(displayText, noteUrl);

    case "ipynb":
      // Jupyter notebooks use Markdown in their markdown cells
      return formatMarkdownLink(displayText, noteUrl);

    default:
      // Fallback to markdown format
      return formatMarkdownLink(displayText, noteUrl);
  }
}

/**
 * Markdown link format: [text](url)
 */
export function formatMarkdownLink(text: string, url: string): string {
  // Escape brackets in text
  const escapedText = text.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
  return `[${escapedText}](${url})`;
}

/**
 * Org-mode link format: [[url][text]]
 */
export function formatOrgLink(text: string, url: string): string {
  // Escape brackets in text
  const escapedText = text.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
  return `[[${url}][${escapedText}]]`;
}

/**
 * HTML/JSX link format: <a href="url">text</a>
 */
export function formatHtmlLink(text: string, url: string): string {
  // Escape HTML entities
  const escapedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<a href="${url}">${escapedText}</a>`;
}

/**
 * DokuWiki link format: [[url|text]]
 */
export function formatDokuWikiLink(text: string, url: string): string {
  return `[[${url}|${text}]]`;
}

/**
 * MediaWiki link format: [url text]
 * (external link style since we're using URLs, not wiki page names)
 */
export function formatMediaWikiLink(text: string, url: string): string {
  return `[${url} ${text}]`;
}

/**
 * LaTeX link format: \href{url}{text}
 * Requires the hyperref package
 */
export function formatLatexLink(text: string, url: string): string {
  // Escape special LaTeX characters in text
  const escapedText = text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[#$%&_{}]/g, (char) => `\\${char}`)
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
  return `\\href{${url}}{${escapedText}}`;
}

/**
 * Typst link format: #link("url")[text]
 */
export function formatTypstLink(text: string, url: string): string {
  // Escape quotes in text for Typst
  const escapedText = text.replace(/"/g, '\\"');
  return `#link("${url}")[${escapedText}]`;
}
