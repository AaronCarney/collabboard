# Product — CollabBoard

## Vision

CollabBoard is a real-time collaborative whiteboard that lets distributed teams work together visually with sub-100ms synchronization and an integrated AI agent that understands the board context. Built for the modern remote team: instant, tactile, and smart.

## Users

| User         | Description                   | Key Need                                 |
| ------------ | ----------------------------- | ---------------------------------------- |
| Remote teams | 2-15 person distributed teams | Real-time presence, cursor sync          |
| Facilitators | Meeting leads, workshop hosts | Control who can edit, session management |
| Designers    | UX/UI practitioners           | Precise object placement, shape tools    |
| PMs          | Product managers              | Sticky notes, vote/prioritize features   |
| Individual   | Personal whiteboarding        | Unlimited personal boards, no expiry     |

## Core Value Proposition

- **Sync under 100ms** — Cursor positions and object changes propagate in real-time via Cloudflare Durable Objects; feels local even across continents
- **AI agent in context** — An AI assistant that understands board objects, can summarize discussions, generate shapes from text, and categorize sticky notes — without leaving the whiteboard
- **60 FPS canvas** — Native Canvas 2D rendering for smooth interaction; no DOM overhead in the render path

## MVP Requirements (Hard Gate — All Must Ship)

1. **Board creation** — Create named boards, shareable via link
2. **Real-time cursor sync** — See all connected users' cursors with name labels, p95 < 50ms
3. **Basic shapes** — Rectangle, circle, line, arrow — create, move, resize, delete
4. **Sticky notes** — Text + background color, drag to reposition
5. **Multi-user object sync** — Object mutations visible to all connected users in real-time, p95 < 100ms
6. **Conflict resolution** — LWW + version number; no lost updates on concurrent edits
7. **Authentication** — Sign in with Clerk; boards are user-owned; anonymous access not permitted
8. **Persistent boards** — Board state survives page refresh and server restart (Supabase persistence)
9. **300 concurrent users** — A single board handles up to 300 connected WebSocket clients

## Feature Set

### Board Features

| Feature                        | Priority | Notes                 |
| ------------------------------ | -------- | --------------------- |
| Rectangle, circle, line, arrow | MVP      |                       |
| Sticky notes with text         | MVP      |                       |
| Multi-user cursor sync         | MVP      | p95 < 50ms            |
| Object property sync           | MVP      | p95 < 100ms           |
| Conflict resolution            | MVP      | LWW + version         |
| Persistent boards              | MVP      | Supabase              |
| Board sharing via link         | MVP      | Auth required to join |
| Free-draw / pen tool           | v1.1     | Post-MVP              |
| Images (upload + embed)        | v1.1     | Post-MVP              |
| Board export (PNG/PDF)         | Later    | Non-goal for MVP      |

### AI Commands (in-canvas)

| Command         | Trigger                 | Action                                                |
| --------------- | ----------------------- | ----------------------------------------------------- |
| Summarize       | `/summarize`            | Reads all sticky notes, outputs summary as new sticky |
| Generate shapes | `/create [description]` | Creates shapes from text description                  |
| Categorize      | `/categorize`           | Groups sticky notes by theme using color coding       |
| Label diagram   | `/label`                | Adds text labels to selected shapes                   |
| Rewrite         | `/rewrite [tone]`       | Rewrites selected sticky note text                    |
| Brainstorm      | `/brainstorm [topic]`   | Generates 5 sticky notes with ideas                   |

## Performance Targets

| Metric              | Target        | Method           |
| ------------------- | ------------- | ---------------- |
| Cursor sync latency | p95 < 50ms    | k6 WebSocket     |
| Object sync latency | p95 < 100ms   | k6 WebSocket     |
| Canvas render       | 60 FPS steady | Chrome DevTools  |
| WebSocket connect   | p95 < 500ms   | k6               |
| Page load (LCP)     | < 3s on 4G    | Lighthouse       |
| API response        | p95 < 200ms   | Vercel Analytics |

## Submission Deadlines

| Milestone        | Deadline    | Requirements                            |
| ---------------- | ----------- | --------------------------------------- |
| MVP demo         | Tuesday EOD | All 9 MVP requirements working          |
| Full feature     | Friday EOD  | AI commands + polish                    |
| Final submission | Sunday EOD  | All tests passing, performance verified |

## Non-Goals (Not Building)

- **Offline mode** — Real-time sync requires network; no offline-first architecture
- **Export to PDF/PNG** — Post-MVP; complex canvas serialization
- **Version history / undo beyond session** — Post-MVP; snapshot infrastructure needed
- **Payment integration** — Post-MVP; free tier only for competition
- **Email notifications** — Not required for core collaboration
- **Mobile native apps** — Web-responsive only
