import type { APIEvent } from "@solidjs/start/server";
import { access, mkdir, writeFile } from "fs/promises";
import { basename, extname, join } from "path";
import { requireUser } from "~/lib/auth";

// Get assets directory from environment or use default
const ASSETS_DIR = process.env.ASSETS_DIR || "./.data/uploads";

// Maximum file size: 200MB
const MAX_FILE_SIZE = 200 * 1024 * 1024;

// NOTE -- no file type restrictions, assume trusted users

/**
 * Check if a file exists at the given path
 */
const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Sanitize filename for safe filesystem storage.
 *
 * WARNING: This is minimal sanitization for internal use only.
 * Path traversal (../) and special characters could be exploited
 * if exposed to untrusted users. Current implementation assumes
 * trusted authenticated users.
 */
const sanitizeFilename = (name: string): string => {
  // Extract just the filename (no directory components)
  return basename(name);
};

/**
 * Generate a unique filename, appending timestamp on collision.
 * Recursively retries until a unique name is found.
 */
const getUniqueFilename = async (
  userDir: string,
  desiredName: string,
): Promise<string> => {
  const filePath = join(userDir, desiredName);

  if (!(await fileExists(filePath))) {
    return desiredName;
  }

  // Collision detected - append timestamp before extension
  const ext = extname(desiredName);
  const nameWithoutExt = desiredName.slice(0, -ext.length || undefined);
  const timestamp = Date.now();
  const newName = `${nameWithoutExt}_${timestamp}${ext}`;

  // Recursively check the new name (in case of rapid uploads)
  return getUniqueFilename(userDir, newName);
};

/**
 * Ensure user upload directory exists
 */
const ensureUserDir = async (userId: string): Promise<string> => {
  const userDir = join(ASSETS_DIR, `user_${userId}`);
  try {
    await mkdir(userDir, { recursive: true, mode: 0o755 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
  return userDir;
};

export const POST = async ({ request }: APIEvent) => {
  try {
    // Require user authentication
    const user = await requireUser();

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const customName = formData.get("customName") as string | null;

    if (!file || file.size === 0) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: `File too large (max ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB)`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Determine filename: use custom name if provided, otherwise original
    const desiredName = sanitizeFilename(customName || file.name);

    // Ensure user directory exists
    const userDir = await ensureUserDir(user.id);

    // Get unique filename (handles collisions with timestamp)
    const fileName = await getUniqueFilename(userDir, desiredName);

    // Convert file to buffer and save
    // NOTE: This loads the entire file into memory, which may be problematic for very large files.
    // For files larger than available memory, users can upload via rsync to the dir
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = join(userDir, fileName);

    await writeFile(filePath, buffer);

    // Return success response with file info
    return new Response(
      JSON.stringify({
        success: true,
        fileName,
        originalName: file.name,
        size: file.size,
        type: file.type,
        url: `/api/assets/${fileName}`,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error uploading file:", error);

    // Handle authentication errors
    if (error instanceof Response) {
      return error;
    }

    return new Response(JSON.stringify({ error: "Upload failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
