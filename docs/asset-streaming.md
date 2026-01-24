# Asset Streaming & Range Requests

This document describes the streaming implementation for the asset serving API (`/api/assets/[...path]`), including the motivation for HTTP Range request support and how to implement both approaches.

## Problem

HTML5 `<video>` elements require the server to support HTTP Range requests for seeking/scrubbing to work. Without range support, the browser must download the entire file before the user can jump to a specific timestamp. Chrome strictly enforces this — video scrubbing simply does not work without 206 Partial Content responses.

## Buffered Approach (Original)

The original implementation reads the entire file into memory and returns it as a single response:

```typescript
import { readFile, stat } from "fs/promises";
import { lookup } from "mime-types";

export const GET = async ({ params, request }: APIEvent) => {
  // ... auth, path resolution, security checks ...

  const fileStats = await stat(fullPath);
  const fileBuffer = await readFile(fullPath);
  const mimeType = lookup(fullPath) || "application/octet-stream";

  return new Response(fileBuffer, {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": fileStats.size.toString(),
      "Cache-Control": "private, max-age=31536000",
      "Last-Modified": fileStats.mtime.toUTCString(),
    },
  });
};
```

Limitations:
- Entire file loaded into Node.js memory (problematic for large videos)
- No `Accept-Ranges` header, so browsers don't attempt range requests
- Video seeking requires full download first
- Safari may refuse to play the video entirely

## Streaming Approach (Current)

The current implementation uses `createReadStream` for streaming and supports HTTP Range requests for partial content delivery.

### Node.js Stream to Web ReadableStream

The `Response` constructor accepts a web `ReadableStream`, but Node.js `createReadStream` returns a Node.js `Readable`. This adapter bridges them:

```typescript
import { createReadStream } from "fs";
import { Readable } from "stream";

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
```

### Full File Streaming (No Range Header)

When no `Range` header is present, stream the full file without buffering it in memory:

```typescript
const stream = createReadStream(fullPath);
return new Response(nodeStreamToWeb(stream), {
  headers: {
    "Content-Type": mimeType,
    "Accept-Ranges": "bytes",        // Signal range support
    "Content-Length": fileSize.toString(),
    "Cache-Control": "private, max-age=31536000",
    "Last-Modified": fileStats.mtime.toUTCString(),
  },
});
```

The `Accept-Ranges: bytes` header tells the browser it can make range requests for subsequent seeks.

### Partial Content (Range Header Present)

When the browser sends `Range: bytes=START-END`:

```typescript
const rangeHeader = request.headers.get("range");

// Parse "bytes=START-END" (end is optional)
const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
if (!match) {
  return new Response("Invalid Range header", {
    status: 416,
    headers: { "Content-Range": `bytes */${fileSize}` },
  });
}

const start = parseInt(match[1], 10);
const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

// Validate range bounds
if (start >= fileSize || start > end) {
  return new Response("Range Not Satisfiable", {
    status: 416,
    headers: { "Content-Range": `bytes */${fileSize}` },
  });
}

const clampedEnd = Math.min(end, fileSize - 1);
const contentLength = clampedEnd - start + 1;

// Stream only the requested byte range
const stream = createReadStream(fullPath, { start, end: clampedEnd });
return new Response(nodeStreamToWeb(stream), {
  status: 206,
  headers: {
    "Content-Type": mimeType,
    "Accept-Ranges": "bytes",
    "Content-Range": `bytes ${start}-${clampedEnd}/${fileSize}`,
    "Content-Length": contentLength.toString(),
    "Cache-Control": "private, max-age=31536000",
    "Last-Modified": fileStats.mtime.toUTCString(),
  },
});
```

### Request/Response Flow

1. Browser loads `<video src="/api/assets/tutorial.webm">`
2. Initial request has no Range header — server responds 200 with full stream + `Accept-Ranges: bytes`
3. User scrubs to 50% — browser sends `Range: bytes=5000000-`
4. Server responds 206 with bytes 5000000 through end of file
5. User scrubs again — browser sends another Range request for the new position

### Response Headers Summary

| Header | Full Response (200) | Partial Response (206) |
|--------|--------------------|-----------------------|
| `Accept-Ranges` | `bytes` | `bytes` |
| `Content-Length` | Total file size | Chunk size (end - start + 1) |
| `Content-Range` | Not present | `bytes START-END/TOTAL` |
| `Content-Type` | MIME type | MIME type |

### Error Cases

- **Malformed Range header** (no match on `bytes=\d+-\d*`): Return 416 with `Content-Range: bytes */TOTAL`
- **Start beyond file size** or **start > end**: Return 416 Range Not Satisfiable
- **End beyond file size**: Clamp to `fileSize - 1` (not an error)
