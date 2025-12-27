import type { APIEvent } from "@solidjs/start/server";
import { requireUser } from "~/lib/auth";
import { readFile, stat, mkdir } from "fs/promises";
import { join, resolve, relative } from "path";
import { lookup } from "mime-types";

// Get assets directory from environment or use default
const ASSETS_DIR = process.env.ASSETS_DIR || "./.data/uploads";

export const GET = async ({ params }: APIEvent) => {
  try {
    // Require user authentication
    const user = await requireUser();
    
    // Get the requested asset path
    const assetPath = params.path as string;
    if (!assetPath) {
      return new Response("Asset path required", { status: 400 });
    }
    
    // Construct full path: {ASSETS_DIR}/user_{userId}/{assetPath}
    const userDir = join(ASSETS_DIR, `user_${user.id}`);
    const fullPath = resolve(join(userDir, assetPath));
    
    // Security check: ensure the resolved path is within the user's directory
    const relativePath = relative(userDir, fullPath);
    if (relativePath.startsWith('..') || relativePath.includes('..')) {
      return new Response("Forbidden: Path traversal not allowed", { status: 403 });
    }
    
    // Ensure user directory exists (auto-create if needed)
    try {
      await mkdir(userDir, { recursive: true, mode: 0o755 });
    } catch (error) {
      // Directory might already exist, that's fine
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        console.error("Failed to create user directory:", error);
        return new Response("Failed to access user directory", { status: 500 });
      }
    }
    
    // Check if file exists and get stats
    let fileStats;
    try {
      fileStats = await stat(fullPath);
    } catch (error) {
      return new Response("Asset not found", { status: 404 });
    }
    
    // Ensure it's a file, not a directory
    if (!fileStats.isFile()) {
      return new Response("Not a file", { status: 400 });
    }
    
    // Read the file
    const fileBuffer = await readFile(fullPath);
    
    // Determine MIME type from file extension
    const mimeType = lookup(fullPath) || "application/octet-stream";
    
    // Return the file with appropriate headers
    return new Response(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": fileStats.size.toString(),
        "Cache-Control": "private, max-age=31536000", // Cache for 1 year since files are user-scoped
        "Last-Modified": fileStats.mtime.toUTCString(),
      },
    });
    
  } catch (error) {
    console.error("Error serving asset:", error);
    
    // Handle authentication errors
    if (error instanceof Response) {
      return error;
    }
    
    return new Response("Internal server error", { status: 500 });
  }
};
