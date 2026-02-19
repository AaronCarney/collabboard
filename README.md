# CollabBoard

A real-time collaborative whiteboard built with Next.js, Supabase, and Canvas 2D.

## Features

- **Real-time collaboration** — Multiple users can draw and edit on the same board simultaneously via Supabase Realtime Broadcast
- **Canvas-based rendering** — Smooth 2D canvas with pan, zoom, and selection
- **Rich object types** — Sticky notes, text, shapes (rectangle, ellipse, diamond, triangle), freehand drawing, connectors, frames
- **AI-powered commands** — Natural language commands (via `/` key) to generate and arrange board objects
- **Undo/Redo** — Full command-pattern history with Ctrl+Z / Ctrl+Shift+Z
- **Copy/Paste/Duplicate** — Internal clipboard with Ctrl+C, Ctrl+V, Ctrl+D
- **Board sharing** — Generate view/edit share links with token-based access
- **Property editing** — Color, size, and style controls for selected objects
- **Presence indicators** — See who else is on the board in real-time
- **Keyboard shortcuts** — Comprehensive shortcuts for all tools and actions
- **Loading skeletons** — Smooth Suspense-based loading states
- **Toast notifications** — Non-intrusive feedback for user actions

## Tech Stack

| Layer         | Technology                            |
| ------------- | ------------------------------------- |
| Framework     | Next.js 14 (App Router)               |
| Auth          | Clerk                                 |
| Database      | Supabase (Postgres + RLS)             |
| Real-time     | Supabase Realtime Broadcast           |
| Styling       | Tailwind CSS 3                        |
| Rendering     | Canvas 2D API                         |
| AI            | Vercel AI SDK + GPT-4o-mini           |
| Observability | LiteLLM + LangFuse                    |
| Testing       | Vitest + Testing Library + Playwright |
| Monorepo      | pnpm workspaces + Turborepo           |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Supabase project (local or cloud)
- Clerk account

### Setup

```bash
# Clone and install
git clone <repo-url>
cd collabboard
pnpm install

# Configure environment
cp .env.example .env.local
# Fill in your Clerk and Supabase credentials

# Run database migrations
pnpm supabase db push

# Start development server
pnpm dev
```

### Environment Variables

| Variable                            | Description                             |
| ----------------------------------- | --------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key                   |
| `CLERK_SECRET_KEY`                  | Clerk secret key                        |
| `NEXT_PUBLIC_SUPABASE_URL`          | Supabase project URL                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Supabase anon/public key                |
| `SUPABASE_SERVICE_ROLE_KEY`         | Supabase service role key (server-only) |
| `OPENAI_API_KEY`                    | OpenAI API key for AI commands          |

## Project Structure

```
collabboard/
├── apps/
│   └── web/                    # Next.js application
│       └── src/
│           ├── app/            # App Router pages
│           │   ├── board/      # Board editor page
│           │   ├── dashboard/  # Board listing page
│           │   └── api/        # API routes (AI, sharing)
│           ├── components/
│           │   └── board/      # Board UI components
│           ├── hooks/          # Custom React hooks
│           └── lib/            # Core logic (store, keyboard, transforms)
├── packages/
│   ├── db/                     # Supabase client + generated types
│   ├── shared/                 # Zod schemas, shared types
│   └── ui/                     # Shared React components
├── supabase/                   # Database migrations + RLS policies
├── e2e/                        # Playwright E2E tests
└── load-tests/                 # k6 WebSocket load tests
```

## Testing

```bash
# Unit & integration tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage

# E2E tests (requires running dev server)
pnpm test:e2e

# Load tests
pnpm test:load
```

## Architecture

### Canvas Rendering

Objects are rendered on an HTML5 Canvas element with a camera transform (pan + zoom). The canvas re-renders on every frame using `requestAnimationFrame` when objects or camera state change.

### Real-time Sync

Uses Supabase Realtime Broadcast for low-latency cursor and object updates. Supabase Postgres is the persistence authority with RLS policies. Conflicts are resolved via Last-Write-Wins with per-object version numbers.

### State Management

A custom Zustand-like store (`board-store.ts`) manages board state with optimistic updates. The command pattern enables undo/redo with full history.

### AI Integration

The `/` command bar triggers AI-powered object generation using Vercel AI SDK structured outputs. The AI can create, arrange, and modify board objects via tool calling.

---

Built with the [Gauntlet](../gauntlet/) meta workflow system.
