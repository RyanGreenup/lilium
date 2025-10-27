import type { APIEvent } from "@solidjs/start/server";
import { requireUser } from "~/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { randomBytes } from "crypto";

// Get assets directory from environment or use default
const ASSETS_DIR = process.env.ASSETS_DIR || "./.data/uploads";

// Maximum file size: 200MB
const MAX_FILE_SIZE = 200 * 1024 * 1024;

// No file type restrictions - users are trusted developers who self-host

export const POST = async ({ request }: APIEvent) => {
  try {
    // Require user authentication
    const user = await requireUser();

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || file.size === 0) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: "File too large (max 200MB)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // No file type validation - users are trusted developers

    // Generate secure filename
    const fileId = randomBytes(16).toString("hex");
    const fileExtension = extname(file.name);
    const fileName = `${fileId}${fileExtension}`;

    // Ensure user directory exists
    const userDir = join(ASSETS_DIR, `user_${user.id}`);
    try {
      await mkdir(userDir, { recursive: true, mode: 0o755 });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error("Failed to create user directory:", error);
        return new Response(JSON.stringify({ error: "Failed to create user directory" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Convert file to buffer and save
    // NOTE: This loads the entire file into memory, which may be problematic for very large files.
    // For files larger than available memory, users can upload rsync to the dir
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = join(userDir, fileName);

    await writeFile(filePath, buffer);

    // Return success response with file info
    return new Response(JSON.stringify({
      success: true,
      fileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
      url: `/api/assets/${fileName}`
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error uploading file:", error);

    // Handle authentication errors
    if (error instanceof Response) {
      return error;
    }

    return new Response(JSON.stringify({ error: "Upload failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
