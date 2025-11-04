# Asset Management Architecture

This document describes the design and implementation of asset management for the Lilium note-taking application.

## Overview

The asset management system is designed for **simplicity and direct filesystem control**. Users can manage their assets directly on the filesystem while the application provides seamless integration with markdown notes.

## Core Principles

1. **No Database Overhead** - Assets are managed purely through the filesystem
2. **User Isolation** - Each user has their own asset directory
3. **Transparent Resolution** - Simple filenames in markdown resolve automatically
4. **Direct File Management** - Users can manage files directly via filesystem

## Architecture

### Directory Structure

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

### Environment Configuration

- `ASSETS_DIR` environment variable (defaults to `./.data/uploads`)
- Admin can customize storage location (e.g., `/var/lilium/assets`)
- Directory auto-created on first use

### User Experience

**In Markdown Notes:**
```markdown
# My Note

Here's an image: ![Alt text](my-diagram.png)

Or with HTML: <img src="screenshots/ui-mockup.png" alt="UI Mockup">

Links work too: [Download PDF](document.pdf)
```

**Resolved URLs:**
- `my-diagram.png` → `/api/assets/my-diagram.png`
- `screenshots/ui-mockup.png` → `/api/assets/screenshots/ui-mockup.png`
- `document.pdf` → `/api/assets/document.pdf`

## Implementation Components

### 1. Asset Serving API

**Route:** `/api/assets/[...path]`

**Purpose:** Serve user assets with authentication and path validation

**Security:**
- Requires user authentication
- Path validation to prevent directory traversal
- Only serves files from user's asset directory

### 2. Markdown Renderer Enhancement

**Component:** `MarkdownRenderer`

**Enhancement:** Automatic asset URL resolution

**Logic:**
- Detect local asset references (non-http, non-absolute paths)
- Prefix with `/api/assets/` for resolution
- Maintain existing functionality for external URLs

### 3. Optional Upload Interface

**Purpose:** Provide web-based file upload for convenience

**Features:**
- Drag & drop file upload
- File organization (create subdirectories)
- File management (rename, delete, move)

## Security Considerations

### Path Validation
- Prevent directory traversal attacks (`../`, `..\\`)
- Validate file paths stay within user directory
- Sanitize filenames

### Authentication
- All asset requests require valid user session
- Users can only access their own assets
- No cross-user asset access

### File Type Restrictions
- Optional MIME type validation
- Configurable allowed file extensions
- Size limits (configurable via environment)

## File Management Workflows

### Direct Filesystem Management
1. User navigates to `{ASSETS_DIR}/user_{userId}/`
2. User adds/removes/organizes files directly
3. Files immediately available in notes

### Web Upload Interface (Optional)
1. User uploads via web interface
2. Files saved to user's asset directory
3. Files immediately available in notes

### Backup & Migration
- Assets stored alongside database in `.data/` directory
- Simple directory copy for backup
- Easy migration between environments

## Implementation Plan

### Phase 1: Core Asset Serving
- [ ] Create asset serving API route
- [ ] Implement user directory resolution
- [ ] Add security validations

### Phase 2: Markdown Integration
- [ ] Enhance MarkdownRenderer for asset resolution
- [ ] Test with various markdown formats
- [ ] Handle edge cases (external URLs, absolute paths)

### Phase 3: Upload Interface (Optional)
- [ ] Create upload API endpoint
- [ ] Build file management UI
- [ ] Add drag & drop functionality

### Phase 4: Enhanced Features
- [ ] File browser/manager component
- [ ] Asset optimization (image resizing, etc.)
- [ ] Asset usage tracking

## Configuration Examples

### Environment Variables
```bash
# .env
ASSETS_DIR="./.data/uploads"        # Default
# ASSETS_DIR="/var/lilium/assets"   # Custom location
# ASSETS_DIR="./public/user-assets" # Public directory (less secure)
```

### User Directory Creation
```typescript
// Auto-created on first asset request or upload
const userAssetDir = join(ASSETS_DIR, `user_${user.id}`);
await mkdir(userAssetDir, { recursive: true });
```

## Future Considerations

### Note Sharing
When implementing note sharing between users:
- Shared notes could reference assets via user ID prefixes
- Copy assets to sharing user's directory
- Or implement shared asset directories

### Performance Optimization
- Asset caching headers
- CDN integration
- Image optimization pipeline

### Advanced Features
- Version control for assets
- Asset metadata storage
- Search within asset content (PDFs, documents)

## Benefits Summary

✅ **Simplicity** - No complex database schema for assets
✅ **Performance** - Direct filesystem access, no DB queries  
✅ **User Control** - Direct file management via filesystem
✅ **Security** - User isolation through directory structure
✅ **Flexibility** - Support for any file type, nested organization
✅ **Backup-Friendly** - Assets stored with application data
✅ **Scalability** - Filesystem-based, no DB bottlenecks