# Asset Streaming & Range Requests

The [asset serving API](./asset-management.md) supports HTTP Range requests so that HTML5 `<video>` elements can seek without downloading the entire file first.

## Why Range Requests Matter

`<video>` elements require HTTP Range support for scrubbing to work. Without it, the browser must buffer the entire file before the user can jump to a timestamp. Chrome strictly enforces this — seeking silently fails without 206 Partial Content responses. Safari may refuse to play the file entirely.

## Buffered vs. Streaming

The original implementation reads the whole file into memory:

```typescript
const fileBuffer = await readFile(fullPath);
return new Response(fileBuffer, { headers: { "Content-Type": mimeType, ... } });
```

Problems: large files exhaust Node.js heap memory, no `Accept-Ranges` header is sent, and video seeking requires a full download first.

The current implementation streams the file and handles Range headers.

## Node.js Stream Adapter

`Response` accepts a web `ReadableStream`, but `createReadStream` returns a Node.js `Readable`. This adapter bridges them:

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

## Full File Response (No Range Header)

Stream the entire file, and advertise range support via `Accept-Ranges`:

```typescript
const stream = createReadStream(fullPath);
return new Response(nodeStreamToWeb(stream), {
  headers: {
    "Content-Type": mimeType,
    "Accept-Ranges": "bytes",
    "Content-Length": fileSize.toString(),
    "Cache-Control": "private, max-age=31536000",
    "Last-Modified": fileStats.mtime.toUTCString(),
  },
});
```

## Partial Content Response (Range Header Present)

When the browser sends `Range: bytes=START-END`, return only the requested slice:

```typescript
const rangeHeader = request.headers.get("range");
const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);

if (!match) {
  return new Response("Invalid Range header", {
    status: 416,
    headers: { "Content-Range": `bytes */${fileSize}` },
  });
}

const start = parseInt(match[1], 10);
const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

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
    "Content-Type": mimeType,
    "Accept-Ranges": "bytes",
    "Content-Range": `bytes ${start}-${clampedEnd}/${fileSize}`,
    "Content-Length": contentLength.toString(),
    "Cache-Control": "private, max-age=31536000",
    "Last-Modified": fileStats.mtime.toUTCString(),
  },
});
```

## Request Flow

1. Browser loads `<video src="/api/assets/tutorial.webm">`
2. Initial request has no Range header — server responds 200 + `Accept-Ranges: bytes`
3. User scrubs to 50% — browser sends `Range: bytes=5000000-`
4. Server responds 206 with bytes 5000000 through end of file
5. Each subsequent seek triggers another Range request

## Response Headers

| Header | 200 (full) | 206 (partial) |
|---|---|---|
| `Accept-Ranges` | `bytes` | `bytes` |
| `Content-Length` | Total file size | `end - start + 1` |
| `Content-Range` | Not present | `bytes START-END/TOTAL` |
| `Content-Type` | MIME type | MIME type |

## Error Cases

| Condition | Status | `Content-Range` |
|---|---|---|
| Malformed Range header | 416 | `bytes */TOTAL` |
| Start ≥ file size | 416 | `bytes */TOTAL` |
| Start > end | 416 | `bytes */TOTAL` |
| End > file size | 200/206 | Clamp end to `fileSize - 1` |
