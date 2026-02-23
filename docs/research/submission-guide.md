# CollabBoard Submission Guide

Complete every step in order. Each step is self-contained — no jumping between files.

**Deadline:** Sunday 10:59 PM CT

---

## Part 1: Decisions (5 minutes)

### Step 1: Decide on AI Model

The codebase currently uses **GPT-4o-mini** via Vercel AI SDK. Three models were evaluated:

| Model                     | Monthly Cost (50K calls) |         Latency | Best At                                | Biggest Weakness          |
| ------------------------- | -----------------------: | --------------: | -------------------------------------- | ------------------------- |
| **GPT-4o-mini** (current) |                      $30 |          ~520ms | Cheapest, fastest, mature tool calling | Lower multi-step accuracy |
| Claude Haiku 4.5          |    $225 ($50 w/ caching) |          ~680ms | Best agentic reliability               | 8x more expensive         |
| Gemini 2.5 Flash          |                      $92 | Fast throughput | 1M context window                      | Least proven tool calling |

**Recommendation: Keep GPT-4o-mini.** It's 3-7x cheaper, fastest, and template commands bypass the LLM entirely for complex patterns (SWOT, Kanban, retro). Switching providers is a 3-line change if needed later.

**If you want to switch to Claude Haiku 4.5**, the exact diff in `apps/web/src/lib/ai/command-router.ts` line 84:

```diff
- model: openai("gpt-4o-mini"),
+ model: anthropic("claude-haiku-4-5-20251001"),
```

And add the import at the top:

```diff
- import { openai } from "@ai-sdk/openai";
+ import { anthropic } from "@ai-sdk/anthropic";
```

Then install the provider and set the env var:

```
Run in Claude Code: cd /home/context/projects/collabboard && cd apps/web && pnpm add @ai-sdk/anthropic
```

Set `ANTHROPIC_API_KEY` in `.env.local` and Vercel (instead of `OPENAI_API_KEY`).

**Decision: GPT-4o-mini / Claude Haiku 4.5 / Gemini 2.5 Flash** → write your choice here: \***\*\_\_\_\*\***

---

## Part 2: Verify Deployment (10 minutes)

### Step 2: Confirm Vercel Deployment is Live

The project auto-deploys from `main` via Vercel (project: `collabboard-web`).

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → find `collabboard-web`
2. Check that the latest deployment is **Ready** (green)
3. Click the deployment URL (e.g., `https://collabboard-web.vercel.app`) — confirm the app loads
4. Test the auth flow: sign up or sign in via Clerk
5. Create a board, add a sticky note — verify it persists on refresh

**If the build is failing**, check the build logs. Common issues:

- Missing env vars — verify all are set (see Step 3)
- TypeScript errors — run `pnpm typecheck` locally to reproduce

Write down your deployed URL here: `https://________________________`

### Step 3: Verify All Environment Variables in Vercel

Go to Vercel project → **Settings → Environment Variables**. Every row below must exist for **Production**:

| Variable                            | Where to Get It                                                         | Status |
| ----------------------------------- | ----------------------------------------------------------------------- | ------ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [Clerk Dashboard](https://dashboard.clerk.com) → API Keys               | ☐      |
| `CLERK_SECRET_KEY`                  | Clerk Dashboard → API Keys                                              | ☐      |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`     | Set to `/sign-in`                                                       | ☐      |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`     | Set to `/sign-up`                                                       | ☐      |
| `NEXT_PUBLIC_SUPABASE_URL`          | [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API   | ☐      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Supabase Dashboard → Settings → API                                     | ☐      |
| `SUPABASE_SERVICE_ROLE_KEY`         | Supabase Dashboard → Settings → API                                     | ☐      |
| `DATABASE_URL`                      | Supabase Dashboard → Settings → Database → Connection string (pooler)   | ☐      |
| `OPENAI_API_KEY`                    | [OpenAI Platform](https://platform.openai.com/api-keys) → Create key    | ☐      |
| `UPSTASH_REDIS_REST_URL`            | [Upstash Console](https://console.upstash.com) → Redis → REST API       | ☐      |
| `UPSTASH_REDIS_REST_TOKEN`          | Upstash Console → Redis → REST API                                      | ☐      |
| `NEXT_PUBLIC_APP_URL`               | Your Vercel deployment URL (e.g., `https://collabboard-web.vercel.app`) | ☐      |

### Step 4: Test AI Commands on the Deployed App

1. Open your deployed URL → sign in → create or open a board
2. Press `/` to open the AI command bar
3. Type: `Create a SWOT analysis` → this is a **template command** (no API key needed, instant)
4. Verify: 4 labeled quadrants appear on the board
5. Type: `Add a yellow sticky note that says "Hello World"` → this is an **LLM command** (needs OPENAI_API_KEY)
6. Verify: a sticky note appears within ~2 seconds

If the LLM command fails with a 500 error, check that `OPENAI_API_KEY` is set in Vercel env vars. Template commands should always work regardless.

---

## Part 3: Observability Setup — Optional But Recommended (15 minutes)

Both LangFuse and LangSmith are already wired into the codebase. They activate automatically when env vars are set. Both have free tiers.

### Step 5: Set Up LangFuse

1. Go to **https://cloud.langfuse.com** → sign up (GitHub/Google/email)
2. Click **"New Project"** → name it `collabboard` → select US East region
3. Go to **Settings → API Keys** → click **"Create new API keys"**
4. You'll get three values:
   - **Secret Key** (starts with `sk-lf-...`)
   - **Public Key** (starts with `pk-lf-...`)
   - **Host**: `https://cloud.langfuse.com`
5. Save these — the secret key is only shown once
6. In Vercel → **Settings → Environment Variables**, add for Production:
   - `LANGFUSE_SECRET_KEY` = your secret key
   - `LANGFUSE_PUBLIC_KEY` = your public key
   - `LANGFUSE_HOST` = `https://cloud.langfuse.com`

### Step 6: Set Up LangSmith

1. Go to **https://smith.langchain.com** → sign up (GitHub/Google/email)
2. Click **"New Project"** → name it `collabboard`
3. Click **profile icon → Settings → API Keys** → **"Create API Key"**
4. Copy the key (starts with `lsv2_...`)
5. In Vercel → **Settings → Environment Variables**, add for Production:
   - `LANGCHAIN_API_KEY` = your API key
   - `LANGCHAIN_PROJECT` = `collabboard`
   - `LANGCHAIN_TRACING_V2` = `true`

### Step 7: Install Observability Packages and Deploy

```
Run in Claude Code: cd /home/context/projects/collabboard/apps/web && pnpm add langfuse langsmith
```

Then commit and push:

```
Run in Claude Code: Stage langfuse and langsmith additions in apps/web/package.json and pnpm-lock.yaml, commit with message "chore: add langfuse and langsmith packages for observability", and push to main.
```

After deploy completes, run an AI command on the deployed board and verify traces appear in both dashboards.

---

## Part 4: Add Deployed URL to README (2 minutes)

### Step 8: Update README

```
Run in Claude Code: In /home/context/projects/collabboard/README.md, add a "Live Demo" line after the first heading. The deployed URL is [INSERT YOUR URL]. Add it as: "**Live Demo:** [CollabBoard](YOUR_URL)" right after the description paragraph. Commit and push.
```

Replace `[INSERT YOUR URL]` with your actual Vercel URL before running.

---

## Part 5: Review and Personalize AI Development Log (20 minutes)

### Step 9: Review the AI Development Log

The log at `docs/ai-development-log.md` is complete but reads like an agent wrote it (because it did). You need to add personal voice. Open it and make these specific changes:

1. **Overview paragraph (lines 5-9):** Rewrite in first person. Example: "I built CollabBoard over 7 phases using Claude Code as my primary development tool. Here's what I learned about AI-first development."

2. **Tools & Agents table (lines 16-24):** Add a sentence after the table about why you chose this tool combination. What was your experience like switching between lead and worker roles?

3. **Prompt Patterns section (lines 39-89):** These three patterns (TDD-First, File Ownership, Spec-Driven) are the strongest part. Add a personal anecdote to at least one — which moment convinced you that pattern was worth the overhead? Was there a specific phase where it saved you?

4. **Code Generation Metrics table (lines 92-101):** Review the numbers. Do they feel right? Adjust if your experience differs. Add a sentence about what "manual edits" actually meant for you — were you debugging, reviewing, or rewriting?

5. **Strengths section (lines 108-137):** Pick the strength that surprised you most and add a sentence about why. The "template commands bypass LLM" insight is unique — if this was your idea, say so.

6. **Limitations section (lines 139-175):** The ESLint compliance issue is relatable. Add whether you found a workaround or if it remained painful. The "integration wiring gap" (handleAiSubmit was a no-op) is a great story — did you discover it yourself or did testing reveal it?

7. **Key Learnings section (lines 182-217):** These are strong as-is. Add one personal learning that isn't about agent management — maybe about the domain (whiteboards, real-time, Canvas API) or about your own growth.

---

## Part 6: Social Media Posts (5 minutes)

### Step 10: Personalize and Post

#### X (Twitter) — Ready to Copy-Paste

```
Real-time collaborative whiteboard just got smarter. CollabBoard lets teams brainstorm together with live cursors, live presence, and AI-powered natural language commands. Try it: [YOUR_DEPLOYED_URL] @GauntletAI
```

(275 characters — replace `[YOUR_DEPLOYED_URL]` with your URL)

**Personalization suggestions:**

- Add what you found most challenging or interesting
- Add a screenshot or short GIF of the AI command in action
- Mention the tech stack if you're proud of it (Next.js + Supabase + Canvas 2D)

#### LinkedIn — Ready to Copy-Paste

```
We built CollabBoard: a real-time collaborative whiteboard that reimagines how teams work together.

What it is: A browser-based whiteboard where teams sketch, design, and brainstorm in real time. Add sticky notes, shapes, connectors, and frames. Invite collaborators with view or edit access. See live cursors and presence updates from everyone in the room.

The AI twist: Type natural language commands and CollabBoard generates what you need. "Create a SWOT analysis" spins up a template. "Add a kanban board with product roadmap items" builds it instantly. Powered by GPT-4o-mini, these commands turn whiteboarding from manual drawing into guided creation.

Built right: CollabBoard was developed using AI-assisted TDD and Claude Code. Every feature is tested — 445 unit and integration tests across 107 source files. 46 commits of careful, intentional development. The tech stack: Next.js 14, Supabase for real-time sync, Clerk for auth, Canvas 2D for rendering.

Why it matters: Synchronous collaboration over digital whiteboards is broken — tools are either clunky or lack presence. CollabBoard bridges that gap with real-time updates, intuitive UI, and AI that understands what you're trying to build, not just what you're trying to draw.

Try it here: [YOUR_DEPLOYED_URL]

@GauntletAI
```

(~250 words — replace `[YOUR_DEPLOYED_URL]` with your URL)

**Personalization suggestions:**

- Change "We built" to "I built" if solo
- Add a personal reflection on what AI-first development taught you
- Attach a screenshot or demo video link
- Tag relevant people or communities

---

## Part 7: Record Demo Video (30-45 minutes)

### Step 11: Record a 3-5 Minute Demo Video

Use any screen recorder (OBS, Loom, QuickTime, etc.). Follow this shot list:

#### Shot 1: Introduction (0:00 - 0:30)

- Show the landing/sign-in page
- **Say:** "This is CollabBoard — a real-time collaborative whiteboard built with Next.js, Supabase, and Canvas 2D rendering. I'll walk through the core features: real-time collaboration, AI commands, and the architecture."
- Sign in, show the dashboard

#### Shot 2: Board Basics (0:30 - 1:00)

- Create a new board
- Add a few sticky notes (different colors)
- Add shapes (rectangle, ellipse)
- Demonstrate pan and zoom (scroll wheel, drag)
- Show selection (click, shift-click for multi-select, drag-to-select)
- **Say:** "The canvas renders at 60fps using the Canvas 2D API — no DOM elements for board objects, which keeps performance smooth even with hundreds of objects."

#### Shot 3: Real-Time Collaboration (1:00 - 2:00)

- Open a second browser window (or incognito) with the same board
- Sign in as a different user (or show the share link flow)
- **Both windows visible side-by-side**
- Move objects in one window → show them move in the other
- Show live cursors moving across both windows
- Show the presence bar (who's online)
- **Say:** "Real-time sync uses Supabase Realtime Broadcast for sub-100ms object sync and sub-50ms cursor sync. The last-write-wins conflict resolution handles simultaneous edits."

#### Shot 4: AI Commands (2:00 - 3:00)

- Press `/` to open the AI command bar
- Type: "Create a SWOT analysis" → show the 4-quadrant template appearing instantly
- **Say:** "Template commands bypass the LLM entirely — this runs in under 100ms with zero API cost."
- Type: "Add a yellow sticky note that says 'User Research'" → show it appearing
- **Say:** "Free-form commands go through GPT-4o-mini via the Vercel AI SDK. The AI has tool-calling access to create, move, resize, and style board objects."
- Show the objects appearing in both browser windows simultaneously

#### Shot 5: Architecture Walkthrough (3:00 - 4:00)

- Switch to a code editor or architecture diagram
- **Say:** "The architecture: Next.js 14 App Router for the frontend, Clerk for authentication, Supabase Postgres with Row-Level Security for persistence, Supabase Realtime Broadcast for sync, and Upstash Redis for rate limiting."
- **Say:** "The AI command pipeline first checks for template matches. If none, it routes to GPT-4o-mini with tool definitions. The model calls tools like createStickyNote and createShape, which produce board objects that get persisted and broadcast to all connected clients."
- Briefly show the monorepo structure if time allows

#### Shot 6: Wrap-Up (4:00 - 4:30)

- **Say:** "The project has 445 tests including unit, integration, and E2E coverage. It was built using AI-first TDD methodology with Claude Code orchestrating specialist agents."
- Show the test count if easy (run `pnpm test` briefly)
- **Say:** "Built for GauntletAI. Thanks for watching."

**Tips:**

- Keep it under 5 minutes
- Show, don't tell — keep narration concise
- The multi-window side-by-side for real-time sync is the money shot
- If anything breaks during recording, restart that section — don't ship a demo with errors

---

## Part 8: Final Verification Checklist

Go through every row. Each maps to a line in the assignment spec's Submission Requirements table.

### Deliverables

| #   | Deliverable              | Spec Requirement                                               | Done?                                                                               |
| --- | ------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | **GitHub Repository**    | Setup guide, architecture overview, deployed link              | ☐ README has setup guide, architecture section, and deployed URL                    |
| 2   | **Demo Video (3-5 min)** | Real-time collaboration, AI commands, architecture explanation | ☐ Video recorded and accessible (YouTube/Loom/Google Drive link)                    |
| 3   | **Pre-Search Document**  | Completed checklist from Phase 1-3                             | ☐ `docs/research/Presearch_Aaron_Carney_Collaborative_Whiteboard_Revised.md` exists |
| 4   | **AI Development Log**   | 1-page breakdown using template                                | ☐ `docs/ai-development-log.md` is personalized with your voice                      |
| 5   | **AI Cost Analysis**     | Dev spend + projections for 100/1K/10K/100K users              | ☐ `docs/ai-cost-analysis.md` has all tables filled with numbers                     |
| 6   | **Deployed Application** | Publicly accessible, supports 5+ users with auth               | ☐ Vercel URL loads, auth works, boards persist, real-time sync works                |
| 7   | **Social Post**          | Description, features, demo/screenshots, tag @GauntletAI       | ☐ Posted on X or LinkedIn with link and @GauntletAI tag                             |

### Feature Checklist (from MVP + Core requirements)

| Feature                                               | Status |
| ----------------------------------------------------- | ------ |
| Infinite board with pan/zoom                          | ☐      |
| Sticky notes with editable text and colors            | ☐      |
| Shapes (rectangle, ellipse, diamond, triangle)        | ☐      |
| Connectors/lines between objects                      | ☐      |
| Frames for grouping content                           | ☐      |
| Move, resize, rotate objects                          | ☐      |
| Single and multi-select (shift-click, drag-to-select) | ☐      |
| Delete, duplicate, copy/paste                         | ☐      |
| Real-time sync between 2+ users                       | ☐      |
| Multiplayer cursors with name labels                  | ☐      |
| Presence awareness (who's online)                     | ☐      |
| User authentication (Clerk)                           | ☐      |
| Deployed and publicly accessible                      | ☐      |
| AI: 6+ distinct command types                         | ☐      |
| AI: Template commands (SWOT, Kanban, retro)           | ☐      |
| AI: Free-form LLM commands                            | ☐      |
| AI: Results visible to all connected users            | ☐      |

### Technical Verification

```
Run in Claude Code: cd /home/context/projects/collabboard && pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

All four must exit 0. If any fail, fix before submitting.

---

## Quick Reference: What's Already Done

These are complete — do not redo them:

- All feature code (Phases 1-6): canvas, real-time sync, AI commands, sharing, polish
- 445 tests passing across 42 test files
- Auto-deploy from main via Vercel (project: `collabboard-web`)
- Clerk, Supabase, OpenAI, Upstash keys configured in `.env.local` and Vercel
- AI development log (`docs/ai-development-log.md`) — needs personalization only
- AI cost analysis (`docs/ai-cost-analysis.md`) — fully populated with numbers
- Social post drafts (`docs/social-post-draft.md`) — needs URL and personalization
- Pre-search document (`docs/research/Presearch_Aaron_Carney_Collaborative_Whiteboard_Revised.md`)
