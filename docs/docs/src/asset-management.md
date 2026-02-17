# Asset Management

The asset management system is designed for **simplicity and direct filesystem control**. Manage assets directly on the filesystem; the application provides seamless integration with markdown notes.

## Core Principles

1. **No Database Overhead** — Assets are managed purely through the filesystem
2. **User Isolation** — Each user has their own asset directory
3. **Transparent Resolution** — Simple filenames in markdown resolve automatically
4. **Direct File Management** — Manage files directly via filesystem or the optional web interface

## Directory Structure

```
{ASSETS_DIR}/
└── user_{userId}/
    ├── image1.png
    ├── document.pdf
    ├── screenshots/
    │   ├── ui-mockup.png
    │   └── workflow.png
    └── diagrams/
        └── architecture.svg
```

## Configuration

Set `ASSETS_DIR` in your `.env` file (defaults to `./.data/uploads`):

```bash
ASSETS_DIR="./.data/uploads"         # Default
# ASSETS_DIR="/var/lilium/assets"    # Custom location
```

The directory is auto-created on first use. User subdirectories are created on first asset request or upload:

```typescript
const userAssetDir = join(ASSETS_DIR, `user_${user.id}`);
await mkdir(userAssetDir, { recursive: true });
```

## Using Assets in Notes

Reference assets by filename (or relative path) in markdown — no absolute paths needed:

```markdown
![Alt text](my-diagram.png)
<img src="screenshots/ui-mockup.png" alt="UI Mockup">
[Download PDF](document.pdf)
```

The renderer resolves these automatically:

| Reference | Resolved URL |
|---|---|
| `my-diagram.png` | `/api/assets/my-diagram.png` |
| `screenshots/ui-mockup.png` | `/api/assets/screenshots/ui-mockup.png` |
| `document.pdf` | `/api/assets/document.pdf` |

External URLs (`http://...`) and absolute paths pass through unchanged.

## Components

### Asset Serving API

**Route:** `/api/assets/[...path]`

Serves user assets with authentication and path validation. Requires a valid session and restricts access to the requesting user's directory only. The API supports HTTP Range requests for video seeking — see [Streaming & Range Requests](./asset-streaming.md).

### Markdown Renderer

The `MarkdownRenderer` component detects local asset references and prefixes them with `/api/assets/` automatically.

### Upload Interface (Optional)

A web-based upload interface provides drag-and-drop upload, subdirectory creation, and file management (rename, delete, move) for users who prefer not to manage files directly on the filesystem.

## Security

- **Path traversal prevention** — Paths containing `../` or `..\` are rejected
- **User isolation** — Users can only access their own asset directory
- **Session required** — All asset requests require a valid authenticated session
- **File type restrictions** — MIME type validation and allowed extensions are configurable
- **Size limits** — Configurable via environment variables

## File Management

**Direct filesystem:** Navigate to `{ASSETS_DIR}/user_{userId}/`, add or organize files — they are immediately available in notes.

**Backup and migration:** The `.data/` directory contains both the SQLite databases and assets; copy it to back up or migrate the entire application.

## Future Considerations

- **Note sharing** — Shared notes could reference assets via user ID prefixes or shared asset directories
- **Performance** — Asset caching headers, CDN integration, image optimization
- **Advanced** — Asset versioning, metadata storage, content search (PDFs)
