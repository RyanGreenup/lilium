"use server";

import { query } from "@solidjs/router";
import { execSync } from "child_process";
import { unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export async function renderWithPandoc(
  content: string,
  fromFormat: string,
  extension: string,
): Promise<string> {
  if (!content.trim()) return "No notes";

  try {
    const tempFile = join(tmpdir(), `note-${Date.now()}.${extension}`);

    writeFileSync(tempFile, content);

    const htmlOutput = execSync(
      `pandoc "${tempFile}" -f ${fromFormat} -t html${fromFormat === "ipynb" ? " --embed-resources" : ""}`,
      {
        encoding: "utf-8",
        timeout: 10000,
      },
    );

    unlinkSync(tempFile);

    return htmlOutput;
  } catch (error) {
    console.error(`Failed to render ${fromFormat}:`, error);
    return `<pre>${content}</pre>`;
  }
}

export async function renderOrgMode(orgContent: string): Promise<string> {
  return renderWithPandoc(orgContent, "org", "org");
}

export async function renderJupyterNotebook(
  notebookContent: string,
): Promise<string> {
  return renderWithPandoc(notebookContent, "ipynb", "ipynb");
}

export async function renderDokuWiki(wikiContent: string): Promise<string> {
  return renderWithPandoc(wikiContent, "dokuwiki", "wiki");
}

export async function renderMediaWiki(wikiContent: string): Promise<string> {
  return renderWithPandoc(wikiContent, "mediawiki", "wiki");
}

export async function renderLatex(latexContent: string): Promise<string> {
  return renderWithPandoc(latexContent, "latex", "tex");
}

export async function renderTypst(typstContent: string): Promise<string> {
  return renderWithPandoc(typstContent, "typst", "typ");
}

export const renderOrgModeQuery = query(async (orgContent: string) => {
  "use server";
  return await renderOrgMode(orgContent);
}, "render-org-mode");

export const renderJupyterNotebookQuery = query(
  async (notebookContent: string) => {
    "use server";
    return await renderJupyterNotebook(notebookContent);
  },
  "render-jupyter-notebook",
);

export const renderDokuWikiQuery = query(async (wikiContent: string) => {
  "use server";
  return await renderDokuWiki(wikiContent);
}, "render-dokuwiki");

export const renderMediaWikiQuery = query(async (wikiContent: string) => {
  "use server";
  return await renderMediaWiki(wikiContent);
}, "render-mediawiki");

export const renderLatexQuery = query(async (latexContent: string) => {
  "use server";
  return await renderLatex(latexContent);
}, "render-latex");

export const renderTypstQuery = query(async (typstContent: string) => {
  "use server";
  return await renderTypst(typstContent);
}, "render-typst");
