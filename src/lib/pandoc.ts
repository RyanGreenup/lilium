"use server";

import { query } from "@solidjs/router";
import { writeFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
import { tmpdir } from "os";

export async function renderWithPandoc(content: string, fromFormat: string, extension: string): Promise<string> {
  if (!content.trim()) return "No notes";

  try {
    const tempFile = join(tmpdir(), `note-${Date.now()}.${extension}`);
    
    writeFileSync(tempFile, content);
    
    const htmlOutput = execSync(`pandoc "${tempFile}" -f ${fromFormat} -t html`, {
      encoding: 'utf-8',
      timeout: 10000
    });
    
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

export async function renderJupyterNotebook(notebookContent: string): Promise<string> {
  return renderWithPandoc(notebookContent, "ipynb", "ipynb");
}

export const renderOrgModeQuery = query(async (orgContent: string) => {
  "use server";
  return await renderOrgMode(orgContent);
}, "render-org-mode");

export const renderJupyterNotebookQuery = query(async (notebookContent: string) => {
  "use server";
  return await renderJupyterNotebook(notebookContent);
}, "render-jupyter-notebook");