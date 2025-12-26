# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

The project uses a `justfile` for task management:

- `just dev` - Start development server (requires `.env` with `SESSION_SECRET`)
- `just admin` - Start development server in admin mode (`SUDO_MODE=true`) for user registration
- `just build` - Build and run production server on port 3000
- `just run_build` - Run pre-built production server on port 30847
- `npm run dev` - Direct npm development command
- `npm run build` - Build the application
- `npm run start` - Start production server

### Environment Setup

1. Create `.env` file with `SESSION_SECRET` (generate with `openssl rand -base64 32`)
2. Data directory `.data/` is auto-created and contains SQLite databases
3. Use `just admin` for initial user registration, then `just dev` for normal development

## Architecture Overview

### Tech Stack

- **Framework**: SolidJS with SolidStart (SSR/SSG)
- **Router**: @solidjs/router with file-based routing
- **Database**: SQLite with better-sqlite3
- **Styling**: TailwindCSS + DaisyUI component library
- **Build Tool**: Vinxi
- **Auth**: Session-based authentication with bcrypt

### Project Structure

```
src/
├── lib/
│   ├── auth/           # Authentication system
│   ├── hooks/          # Custom SolidJS hooks
│   ├── db.ts          # Main database layer
│   └── consumption-*.ts # Legacy consumption tracking
├── routes/            # File-based routing
│   ├── (app)/         # Protected routes
│   └── login.tsx      # Public login page
├── components/        # Reusable UI components
│   └── layout/        # Layout-specific components
└── solid-daisy-components/ # Component library (git submodule)
```

### Database Architecture

The application uses multiple SQLite databases:

- `.data/users.sqlite` - User authentication (managed by auth system)
- `.data/notes.sqlite` - Notes application data

**Notes Schema:**
- `notes` - Hierarchical notes with parent_id relationships
- `tags` - Hierarchical tags with parent_id relationships  
- `note_tags` - Many-to-many junction table
- `note_child_counts` - View for folder detection (notes with children are treated as folders)

All database functions:
- Use `"use server"` directive for server-side execution
- Include user authentication checks via `requireUser()`
- Use random hex IDs for security
- Follow consistent error handling patterns

### Authentication System

- Session-based authentication stored in SQLite
- User registration requires `SUDO_MODE=true` environment variable
- All protected routes use `getUser()` in route preload functions
- Database operations automatically scope to current user

### Component Architecture

**Server Function Pattern:**
```typescript
// Server functions for data fetching
const getDataById = async (id: string) => {
  "use server";
  const { getDataById: dbGetData } = await import("~/lib/db");
  return await dbGetData(id);
};

// Client-side usage with createAsync
const data = createAsync(() => getDataById(id));
```

**Custom Hooks Pattern:**
- Located in `src/lib/hooks/`
- Use `useXxx` naming convention
- Combine route/search parameter parsing with data fetching
- Handle both route params (`/note/:id`) and search params (`?id=123`)
- Always include error handling and loading states

**Routing Conventions:**
- `(app)` directory contains protected routes
- Route parameters accessed via `useParams()`
- Search parameters via `useSearchParams()`
- Preload functions use `getUser()` for authentication

### UI Component System

**DaisyUI Integration:**
- Custom component library in `src/solid-daisy-components/` (git submodule)
- Tailwind variants for consistent styling
- Components follow DaisyUI naming conventions

**Icon System:**
- Uses `lucide-solid` for consistent iconography
- Icons passed as JSX elements to components
- Standard sizing: `size={16}` for small icons

**Reactive Patterns:**
- Use `createAsync` for reactive data fetching
- `Show` component for conditional rendering with loading states
- `Suspense` for loading boundaries
- `For` for list rendering

### Key Conventions

**Database Functions:**
- Always include `"use server"` directive
- Import database functions dynamically in server functions
- Use `query()` function instead of `cache()` for better performance
- Handle user authentication in all data operations

**Error Handling:**
- Console.error for debugging server-side errors
- Graceful fallbacks in UI components
- Null returns for missing data

**File Organization:**
- Server functions co-located with hooks when possible
- Route-specific logic in route files
- Shared utilities in `src/lib/`
- Component-specific logic stays with components

### Data Flow

1. Route loads → `getUser()` preload for authentication
2. Component calls custom hook (e.g., `useCurrentNote()`)
3. Hook parses route parameters and creates reactive query
4. Server function executes with user scoping
5. UI updates reactively as parameters change

### Development Workflow

1. Use `just admin` for initial setup and user registration
2. Use `just dev` for normal development
3. Database seeding available via `python3 seed_database.py`
4. Component library is a git submodule - update carefully
5. Environment variables managed through `.env` and justfile

### Testing Database Changes

The project includes database seeding scripts:
- `seed_database.py` - Populates notes database with sample data
- `populate_test_data.py` - Legacy consumption data seeding
- Both scripts read from `.data/users.sqlite` for user IDs

### Performance Considerations

- Use `createAsync` for reactive data fetching
- Database includes proper indexes on foreign keys and user_id columns
- Server functions prevent database code from running client-side
- Component library uses tree-shaking for optimal bundle size

This architecture emphasizes type safety, user security, and reactive data flow while maintaining clean separation between client and server concerns.
- Ensure `bun run typecheck` passes after every single change.