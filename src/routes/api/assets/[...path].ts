import type { APIEvent } from "@solidjs/start/server";
import { requireUser } from "~/lib/auth";
import { stat, mkdir } from "fs/promises";
import { createReadStream } from "fs";
import { join, resolve, relative } from "path";
import { lookup } from "mime-types";
import { Readable } from "stream";

// Get assets directory from environment or use default
const ASSETS_DIR = process.env.ASSETS_DIR || "./.data/uploads";

/**
 * Convert a Node.js Readable stream to a web ReadableStream
 */
const nodeStreamToWeb = (nodeStream: Readable): ReadableStream<Uint8Array> => {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk) => {
        controller.enqueue(
          chunk instanceof Buffer ? new Uint8Array(chunk) : chunk,
        );
      });
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
};

export const GET = async ({ params, request }: APIEvent) => {
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
    if (relativePath.startsWith("..") || relativePath.includes("..")) {
      return new Response("Forbidden: Path traversal not allowed", {
        status: 403,
      });
    }

    // Ensure user directory exists (auto-create if needed)
    try {
      await mkdir(userDir, { recursive: true, mode: 0o755 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
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

    const mimeType = lookup(fullPath) || "application/octet-stream";
    const fileSize = fileStats.size;

    const baseHeaders: Record<string, string> = {
      "Content-Type": mimeType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=31536000",
      "Last-Modified": fileStats.mtime.toUTCString(),
    };

    // Parse Range header for partial content (required for video scrubbing)
    const rangeHeader = request.headers.get("range");

    if (!rangeHeader) {
      // Full file response
      const stream = createReadStream(fullPath);
      return new Response(nodeStreamToWeb(stream), {
        headers: {
          ...baseHeaders,
          "Content-Length": fileSize.toString(),
        },
      });
    }

    // Parse "bytes=START-END" format
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!match) {
      return new Response("Invalid Range header", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

    // Validate range
    if (start >= fileSize || start > end) {
      return new Response("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    const clampedEnd = Math.min(end, fileSize - 1);
    const contentLength = clampedEnd - start + 1;

    const stream = createReadStream(fullPath, { start, end: clampedEnd });
    return new Response(nodeStreamToWeb(stream), {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${clampedEnd}/${fileSize}`,
        "Content-Length": contentLength.toString(),
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
