"use server";

import { query } from "@solidjs/router";
import { writeFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
import { tmpdir } from "os";

export async function renderOrgMode(orgContent: string): Promise<string> {
  if (!orgContent.trim()) return "No notes";

  try {
    const tempFile = join(tmpdir(), `note-${Date.now()}.org`);
    
    writeFileSync(tempFile, orgContent);
    
    const htmlOutput = execSync(`pandoc "${tempFile}" -f org -t html`, {
      encoding: 'utf-8',
      timeout: 10000
    });
    
    unlinkSync(tempFile);
    
    return htmlOutput;
  } catch (error) {
    console.error("Failed to render org mode:", error);
    return `<pre>${orgContent}</pre>`;
  }
}

export const renderOrgModeQuery = query(async (orgContent: string) => {
  "use server";
  return await renderOrgMode(orgContent);
}, "render-org-mode");