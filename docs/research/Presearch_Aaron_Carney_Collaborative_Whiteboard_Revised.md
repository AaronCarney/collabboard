# Phase 1: Market & Technical Landscape Analysis

**Research Goal:** Understand how collaborative whiteboards reached product-market fit, what infrastructure costs at scale, and which technical decisions separate successful products from failed ones.

---

## Launch Scale & Growth Trajectories

> **Business Context:** Even category-defining companies grew slowly for years before inflection. Realistic growth timelines prevent premature scaling spend and misaligned stakeholder expectations.

### Every Major Player Launched Small

**Miro (2011):** 7 years to 2M users by Series A. Just 6,000 paying customers. Now $17.5B.

**Figma (2016):** 6 years to cross 4M users. Now $68B (2025 IPO). Linear growth for years before going exponential.

**Excalidraw (2020):** Weekend project → 850K MAU entirely bootstrapped. No VC required.

**tldraw (2021):** 500K MAU on $14.1M total funding. SDK-first, monetizing through developer licensing.

### Why Slow Growth Is Structural

**High adoption friction.** Whiteboards require behavior change — teams must abandon physical boards, PowerPoint, or paper. Users need onboarding, templates, and workflow integration.

**Network effects compound slowly.** A whiteboard with one user is worthless. Value only emerges as teams adopt together, creating slow initial growth then hockey-stick acceleration.

### The COVID Inflection

> **Business Context:** Macro tailwinds like COVID are unrepeatable. Unit economics must work without viral adoption events.

Miro added **1M MAU in Q2 2020 alone**, growing from 5M to 30M users in 21 months after 9 years of linear growth. MURAL tripled ARR two years running.

The market is now mature. The "COVID bonus" is gone. New entrants compete against products with 10+ years of features, templates, and integrations.

### Current Scale

> **Business Context:** Funding-to-valuation ratios reveal capital efficiency. Excalidraw hit 850K MAU on $0; Miro needed $476M. Business model choice determines capital requirements.

| Product    | Users      | Revenue       | Funding | Valuation | Strategy                |
| ---------- | ---------- | ------------- | ------- | --------- | ----------------------- |
| Miro       | 100M+      | ~$500M ARR    | $476M   | $17.5B    | Freemium → Enterprise   |
| Figma      | 13M MAU    | $749M (2024)  | $749M   | $68B      | Prosumer → Enterprise   |
| MURAL      | Enterprise | ~$189M ARR    | $199M   | $2B       | Enterprise-first        |
| Excalidraw | 850K MAU   | Bootstrapped  | $0      | N/A       | Open-source + Plus tier |
| tldraw     | 500K MAU   | SDK licensing | $14.1M  | N/A       | Developer tool          |

Three viable paths: freemium → enterprise (Miro), developer-first SDK (tldraw), or open-source + paid features (Excalidraw). Enterprise-first (MURAL) requires significant upfront capital.

---

## Traffic Patterns

> **Business Context:** Architecture-to-usage-pattern fit is one of the highest-leverage cost decisions. Over-provisioning for steady-state when traffic is spiky wastes ~90% of infrastructure spend.

Usage clusters during business hours and **surges 10-50x during workshops**. A board may have zero users for weeks, then 200 concurrent for a 2-hour session. Most usage is calendar-driven — peak load is predictable (Monday mornings, quarterly planning).

**Figma's data:** 80%+ of WAU are outside the US. Traffic follows the sun across timezones in 24-hour cycles.

### Architectural Implications

**Serverless wins.** Provisioning for peak = 90% idle capacity. Pay-per-request (Cloudflare Workers, Lambda) eliminates waste.

**Burst capacity is the constraint.** Must scale 0 → 200 concurrent in <60 seconds. CPU/memory-based autoscaling is too slow — servers won't provision before the workshop starts.

**Connection affinity required.** All users on the same board must connect to the same server/Durable Object. Sticky sessions by document ID, not round-robin.

---

## Pricing Convergence: $8-16 Per Seat

> **Business Context:** Price convergence signals thoroughly tested willingness-to-pay. Deviating from established bands requires a clear differentiation story — otherwise prospects default to the market leader.

| Product     | Free      | Starter/Team | Business    | Enterprise   |
| ----------- | --------- | ------------ | ----------- | ------------ |
| Miro        | 3 boards  | $8/user/mo   | $16/user/mo | ~$20-28/user |
| Figma       | 3 files   | $16/user/mo  | —           | $55-90/user  |
| MURAL       | 3 murals  | $10/user/mo  | $18/user/mo | Custom       |
| Excalidraw+ | Unlimited | $6/user/mo   | —           | —            |

**$8-10 is the floor.** Below this, Stripe fees (2.9% + $0.30) and CAC exceed revenue. A $5/month sub loses $0.30 to Stripe (6%) plus $2-5 in acquisition cost.

**$16-20 is the team ceiling.** Above $25, you're in enterprise procurement territory requiring sales teams.

**Free tiers cap at 3 boards** — enough to try, not enough to run a team.

### Price Positioning

Undercutting ($3-5) signals low quality and high shutdown risk. Premium ($25+) requires features Miro lacks. **$8-12/user is optimal for MVP** — matches expectations, covers infra, leaves margin for acquisition.

---

## Infrastructure Economics

> **Business Context:** At $0.43/user/month, infrastructure is a rounding error. The real expense is customer acquisition ($50–200/customer) — engineering builds the product, marketing grows the business.

**100 concurrent users:** $100-260/month
**1,000 concurrent users:** $425-1,150/month
**10,000 concurrent users:** $2,500-6,800/month

### Why Real-Time Is Cheap

**Connections are mostly idle.** 50-200KB memory per idle connection. Users spend 90% of time reading, not writing.

**Payloads are tiny.** Cursor update: 20 bytes. Object move: 50 bytes. At 60 msg/sec, bandwidth is ~3KB/sec per user.

**Compute is bursty but predictable.** CPUs idle when no one draws, spike when 50 users draw simultaneously. But collaborative sessions have natural turn-taking — rarely do all users draw at once.

**Storage scales linearly.** 500-object board ≈ 100KB. With history: 1MB/board. At S3 pricing: 43,000 boards per dollar per month.

### Cost Breakdown at 1,000 Users

| Component           | Monthly Cost   | Purpose                           |
| ------------------- | -------------- | --------------------------------- |
| Cloudflare Workers  | $50-100        | WebSocket routing + static assets |
| Durable Objects     | $40-80         | Per-room state                    |
| Supabase (Postgres) | $25            | Metadata, users, permissions      |
| Upstash Redis       | $15-30         | Presence, pub/sub, rate limiting  |
| R2 Storage          | $5-10          | Snapshots, images                 |
| Bandwidth           | $10-20         | CDN + WebSocket                   |
| **Total**           | **$425-1,150** |                                   |

**Break-even:** $425 ÷ 1,000 = $0.43/user/month. At 10% conversion to $10/month: $1,000 revenue vs $425 cost. Margins improve dramatically at scale.

### Comparison to Other App Types

**CRUD apps** are database-bound (every action = DB write). Whiteboards keep state in memory, checkpoint every 30-60s. **Video apps** are bandwidth-bound (500-900MB/hour vs 5-10MB). **ML apps** are compute-bound ($0.10-0.50/image). Whiteboards offload rendering to the browser.

---

## Technical Architecture: CRDT vs. Simple Sync

> **Business Context:** Engineering complexity has direct cost: dev time, debugging, and onboarding friction. Choosing simpler sync over academically superior alternatives frees engineering weeks for revenue-generating features.

### Production Whiteboards Avoid Full CRDTs

**Figma:** Per-property last-writer-wins with version numbers
**Excalidraw:** Version-number reconciliation with random nonce tie-breaking
**tldraw:** Server-authoritative sync with confirmed/pending layers

**CRDTs only for:** Rich text editing (Yjs in TipTap/ProseMirror/Quill)

### Why CRDTs Are Overkill for Whiteboards

**Wrong granularity.** CRDTs handle character-level text conflicts (5,000-15,000 LOC). Whiteboards have discrete objects — probability of two users editing the same property of the same object is near zero.

**Unbounded growth.** CRDT tombstones accumulate. Yjs documents reach 10MB+ after thousands of edits, even with 100KB visible content. Breaks mobile clients.

**Hard to debug.** State diverges in subtle ways that only appear after hundreds of operations.

### Last-Writer-Wins: The Production Standard

1. Every object property has a version number
2. Concurrent edits → highest version wins
3. Random nonce for tie-breaking

Simple (50 LOC), predictable, handles 99.9% of cases. The 0.1% failure (two users drag the same sticky note simultaneously) is low-stakes — user just redoes it.

### Rendering Technology

| Technology | Max Objects     | Frame Rate | Best For                   |
| ---------- | --------------- | ---------- | -------------------------- |
| SVG        | <1,000          | 30-60 FPS  | Simple boards              |
| Canvas 2D  | 1,000-10,000    | 60 FPS     | Most use cases             |
| WebGL      | 10,000-100,000+ | 60 FPS     | Dense boards (Figma-level) |

**Canvas 2D is the default.** SVG hits DOM limits at 1,000+ nodes. WebGL requires shader knowledge and is overkill below 5,000 objects. Canvas 2D with viewport culling handles 10,000+ objects easily.

---

## AI Integration: Table Stakes

> **Business Context:** AI features went from differentiator to table stakes in 18 months. They now prevent churn rather than justify premium pricing — budget AI as a cost of competing, not a revenue driver.

### Timeline

**2024 Q1:** Miro AI beta, Figma AI roadmap
**2024 Q3:** tldraw "Make Real" goes viral
**2025 Q1:** Figma ships AI prototypes, Excalidraw adds AI diagrams
**2026 Q1:** AI is baseline expectation

### Why It Happened Fast

Canvases are ideal AI interfaces — spatial, multimodal, directly manipulable. Structured output / function calling (2023-2024) made reliable JSON generation viable. Performance-based moats (rendering, sync) are now commodity; AI features are the new differentiator.

### AI Cost Per Operation

- Sticky note clustering: ~700 tokens = $0.001 (GPT-4o-mini)
- Diagram generation: ~3,000 tokens = $0.004
- Board summarization: ~5,500 tokens = $0.008

GPT-4o-mini is sufficient — 60% cheaper than GPT-3.5 Turbo, better at structured tasks. Whiteboards need reliable JSON, not deep reasoning.

### Tiered Credits Prevent Runaway Costs

- Free: 10 AI ops/month
- Pro ($10/mo): 100 ops/month
- Team ($16/user/mo): 500 ops/month

Most users try AI 5-10 times then stop. Power users pay. Credits prevent $500 API bills from a single user.

---

## Compliance Timeline

> **Business Context:** Compliance certifications are sales enablement investments. Each unlocks a revenue tier: GDPR enables EU users (day one), SOC 2 unlocks $10K+/year enterprise deals, ISO 27001 opens international enterprise. Time spend to match revenue stage.

**Day 1:** GDPR (cursor positions, presence data = personal data. Single EU user triggers it. Penalties: 4% of global revenue.)
**~$1M ARR:** SOC 2 Type I ($10K-40K, 1-3 months). Procurement asks for it at $10K+ deal threshold.
**6-12 months later:** SOC 2 Type II ($30K-80K total). Proves controls over time.
**$5M+ ARR:** ISO 27001 for international enterprise.
**Skip:** HIPAA. Even Miro prohibits PHI. Compliance burden is enormous relative to healthcare whiteboard market.

### EU Data Residency

Schrems II (2020) invalidated Privacy Shield. EU regulators require data in EU datacenters. Not offering it eliminates you from enterprise shortlists in France, Germany, Netherlands.

Competitor approaches: Miro offers EU residency (Ireland/Germany) on all plans. Figma's EU hosting (Frankfurt/Dublin) is Enterprise-only and covers file content only — billing stays in US. MURAL offers NA, EU, APAC regions.

**What it means:** File content, edit history, user activity stay in EU. Billing metadata can live in US. Active cursor positions are exempt (considered "in transit").

---

## Performance Targets

> **Business Context:** Performance is a retention metric. Users unconsciously abandon sluggish tools. The ~200-user concurrent ceiling directly constrains maximum workshop size and addressable enterprise market.

| Metric            | Target                | Rationale                  |
| ----------------- | --------------------- | -------------------------- |
| Edit sync latency | <100ms                | Below perception threshold |
| Cursor latency    | <50ms                 | Smooth tracking            |
| Frame rate        | 60 FPS                | Monitor refresh rate       |
| Concurrent users  | 20-50 MVP, 200+ scale | Workshop sizes             |
| Object capacity   | 5,000-10,000          | Before culling required    |

### Achieving Sub-100ms Sync

Below 100ms, changes feel instant. Above 150ms, users perceive lag. Above 300ms, the tool feels broken. Achieving sub-100ms requires five techniques working together: (1) optimistic local-first rendering, (2) delta-based sync, (3) in-memory server state, (4) connection affinity, (5) regional deployment within ~1,500km.

Cursor updates need a separate lightweight channel — 20-byte payloads get queued behind 500+ byte object updates otherwise.

60 FPS requires viewport culling and spatial indexing (quadtree O(log n) vs O(n) iteration).

### The 200-User Ceiling

Miro tested 377 concurrent before degradation — unusable in practice. The real limit is ~200 because: WebSocket fan-out is O(n²), browsers hit 500MB+ at 300 cursors, and humans can't track that many anyway.

**Solution:** Editor/viewer split. 10-20 editors draw; 200+ viewers watch. Reduces fan-out 10x.

---

## Strategic Takeaways

**Growth:** Slow for years is normal. COVID was an anomaly. You're competing against 2026 Miro, not 2016 Figma.

**Business models:** Freemium → Enterprise ($20M+ funding), Developer SDK (open-source community), Open-source + paid features (bootstrappable).

**Technical:** Serverless wins under 10K concurrent. Last-writer-wins beats CRDTs. Canvas 2D is the sweet spot. AI features are mandatory.

**Economics:** Infrastructure is $0.43/user/month — negligible vs. CAC ($50-200). 10% conversion at $10/month breaks even at 500 users.

**Compliance:** SOC 2 = enterprise gate. EU residency = European enterprise gate. HIPAA = trap (skip it).

---

# Phase 2: Architecture Discovery for LLM-Assisted Development

**Core constraint:** Every component must work cohesively while remaining straightforward for LLM coding agents to implement. Favor established patterns, extensive documentation, and type safety.

## Hosting & Deployment

> **Business Context:** Deployment architecture locks in cost structure for 12–18 months; migrating requires 2–4 weeks of engineering. Choose for current scale, not aspirational scale, to preserve capital.

**Vercel cannot serve WebSocket backends** — 10-second function limit is incompatible with persistent connections.

### Deployment Strategy by Scale

**0–1,000 concurrent: Cloudflare Workers + Durable Objects.** tldraw's production stack. Each room gets a Durable Object with in-memory state, auto-scaling across Cloudflare's global network. Cost: $5/month base + ~$0.15/million requests. 50 concurrent users/room ≈ $0.10/month with hibernation. Total at 1,000 concurrent: $50–150/month.

LLM advantage: Standard Web APIs (Fetch, WebSocket, Request/Response). Straightforward CLI (`wrangler dev` / `wrangler deploy`).

**1,000–10,000 concurrent: Hybrid with Railway or Render.** Dedicated WebSocket servers become cost-effective. Railway: $20/vCPU + $10/GB RAM. A 4vCPU/8GB instance handles ~5,000 connections at $140/month. Total: $400–1,200/month. Declarative configs (`railway.json`, `render.yaml`) that AI generates reliably.

**10,000+ concurrent: Dedicated AWS/GCP with regional deployment.** Committed use discounts (40–72%). Figma runs dedicated Rust processes per document. Requires DevOps expertise. $0.02–0.05/concurrent user/month at steady state.

### CI/CD for Real-Time Apps

Key challenge: **zero-downtime deploys maintaining active WebSocket connections.**

1. Graceful shutdown with connection draining (old connections live up to 30 min)
2. Database migrations before deployment (additive only)
3. Feature flags for sync protocol changes
4. WebSocket integration tests (not just HTTP)

GitHub Actions pipeline: typecheck → WebSocket e2e (Playwright) → load test (Artillery/k6) → preview deploy per PR → canary to 5% before full rollout.

### Scaling Inflection Points

**100 → 1K:** Reserved Durable Objects + hibernatable WebSockets (10x cost reduction).
**1K → 5K:** Dedicated WebSocket servers + connection affinity (sticky sessions by document ID).
**5K → 10K:** Redis Pub/Sub for cross-server broadcasting (+2-5ms latency, unlimited horizontal scale).
**10K+:** Regional geo-routing (3+ regions) with inter-region replication.

## Authentication & Authorization

> **Business Context:** Auth is every user's first interaction. Friction here directly impacts conversion. Clerk's 7-minute setup vs. NextAuth's 1–3 hours compounds across every iteration cycle as time-to-first-user-test.

### Recommended Options

**Clerk** — Best for rapid iteration. Pre-built components (`<SignIn />`, `<UserButton />`), automatic session management. Setup: 7 minutes. Free: 10K MAU. Paid: $25/month + $0.02/MAU. Type-safe SDK, declarative React patterns:

```typescript
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Header() {
  return (
    <header>
      <SignedOut><SignInButton /></SignedOut>
      <SignedIn><UserButton /></SignedIn>
    </header>
  );
}
```

**NextAuth.js v5** — Best for cost-conscious projects. Open-source, zero per-user pricing. Setup: 1–3 hours including custom UI. Universal `auth()` works across Server Components, API routes, middleware. Multi-tenancy requires custom implementation (20–40 hours).

**Auth0** — Enterprise compliance only. SOC 2, HIPAA, ISO 27001. $23–240+/month + $0.05/MAU.

**Supabase Auth** — Best when already using Supabase. Free: 50K MAU (5x Clerk). Built-in RLS integration. No pre-built UI components. Setup: 15–30 minutes. Choose when: comfortable building auth UI, want maximum free tier, prefer database-layer authorization, value vendor consolidation.

### RBAC and Multi-Tenancy

Three permission levels: board-level (View/Edit/Comment/Admin), organization-level (Member/Admin/Owner), feature-level (AI tools, Export — for tiered pricing).

Clerk's Organizations API provides built-in multi-tenancy:

```typescript
import { auth } from "@clerk/nextjs";

export async function canEditBoard(boardId: string) {
  const { userId, orgRole } = auth();
  if (!userId) return false;
  const permission = await db.boardPermissions.findFirst({
    where: { boardId, userId },
  });
  return permission?.role === "editor" || permission?.role === "admin" || orgRole === "org:admin";
}
```

Supabase alternative — RLS policies as database-native authorization:

```sql
CREATE POLICY "Users can edit boards they own or are members of"
ON boards FOR UPDATE
USING (
  auth.uid() = owner_id OR
  auth.uid() IN (
    SELECT user_id FROM board_members
    WHERE board_id = boards.id AND role IN ('editor', 'admin')
  )
);
```

### Multi-Tenancy Patterns

**Row-based (recommended for MVP):** Single DB with `organization_id` on every table. Works to 10K organizations:

```prisma
model Board {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  @@index([organizationId])
}
```

**Schema-based:** Separate PostgreSQL schema per org. Better isolation but complex cross-tenant features.

**Database-per-tenant:** Complete isolation. Only when contractually required.

## Database & Data Layer

> **Business Context:** Database choice is the hardest infrastructure decision to reverse — migrating mid-growth takes 4–8 weeks with data-loss risk. Choose for the 12-month horizon.

### Core Architecture

**PostgreSQL** for persistent data (users, permissions, board metadata, billing). **Redis** for ephemeral state (connections, presence, pub/sub, rate limiting).

**Postgres options:**

- **Supabase:** Free 500MB + RLS + auto API. Paid: $25/month for 8GB.
- **Neon:** Serverless, scales to zero. Free 0.5GB. Branch-based dev (Git for databases). $19/month for 10GB.
- **PlanetScale:** MySQL-compatible, horizontal sharding. Free 5GB. Best at 10M+ users. $39/month for 100GB.

**Redis options:**

- **Upstash:** Serverless per-request pricing. Free 10K commands/day. REST API for serverless functions.
- **Redis Cloud:** Free 30MB. $5-15/month for 100-500MB.

### Real-Time Sync Approaches

**Last-writer-wins with version numbers** (Figma, Excalidraw): Simple, fast, handles discrete objects well:

```typescript
interface BoardObject {
  id: string;
  x: number;
  y: number;
  version: number;
  lastModified: Date;
  lastModifiedBy: string;
}

function mergeUpdates(local: BoardObject, remote: BoardObject): BoardObject {
  return {
    ...local,
    x: remote.version > local.version ? remote.x : local.x,
    y: remote.version > local.version ? remote.y : local.y,
    version: Math.max(local.version, remote.version) + 1,
  };
}
```

**Yjs CRDT** — Only for rich text (TipTap, ProseMirror, Quill):

```typescript
import * as Y from "yjs";
import { PostgresqlPersistence } from "y-postgresql";

const ydoc = new Y.Doc();
const persistence = new PostgresqlPersistence(connectionString);

const update = await persistence.getYDoc(documentId);
if (update) Y.applyUpdate(ydoc, update);

ydoc.on("update", async (update) => {
  await persistence.storeUpdate(documentId, update);
});
```

**tldraw sync** — Complete solution (`@tldraw/sync`) for document state, presence, and persistence. Production-proven if building on tldraw SDK.

### Caching Strategy

Whiteboards invert typical read/write ratios: 80% writes during editing, 95% reads during viewing.

1. **Never cache active board state**
2. **Cache thumbnails aggressively** (24-hour CDN TTL)
3. **Cache user profiles** (5-minute TTL)
4. **Cache permission checks** (30-second Redis TTL)

```typescript
async function getBoardPermission(userId: string, boardId: string) {
  const cacheKey = `perm:${userId}:${boardId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const permission = await db.permissions.findFirst({ where: { userId, boardId } });
  await redis.setex(cacheKey, 30, JSON.stringify(permission));
  return permission;
}
```

## Backend/API Architecture: tRPC

> **Business Context:** tRPC's type-sharing eliminates API contract mismatches that consume 10–20% of debugging time — effectively a fractional developer added to a small team's headcount.

**tRPC with Next.js App Router** eliminates API contracts — frontend and backend share types automatically through TypeScript.

Traditional REST requires three artifacts that drift: route definitions, TypeScript interfaces, frontend client code. tRPC collapses this to one source of truth:

```typescript
// Backend
export const boardRouter = router({
  getBoard: protectedProcedure
    .input(z.object({ boardId: z.string() }))
    .query(async ({ input, ctx }) => {
      const board = await ctx.db.board.findUnique({
        where: { id: input.boardId },
        include: { objects: true },
      });
      if (!board) throw new Error("Board not found");
      return board;
    }),
});

// Frontend — `board` is fully typed automatically
const { data: board } = trpc.board.getBoard.useQuery({ boardId });
```

### When to Use What

**tRPC:** Internal API, full-stack TypeScript, development velocity priority.
**REST:** Public API for third parties, multi-language teams, webhooks.
**GraphQL:** Deep nested data, mobile bandwidth optimization. 2–4 week setup investment.

For whiteboards: tRPC handles 95%. Public/embed endpoints use REST. Webhooks use Next.js API routes.

### Background Jobs

**0–1K users:** Vercel Cron + Upstash QStash (free tier: 10K jobs/month)
**1K–10K:** BullMQ with Redis (~$15/month)
**10K+:** Inngest ($200/month) or Temporal ($300/month)

Use cases: thumbnail generation, PDF/PNG export, AI operations, email digests, data cleanup.

## Frontend: Next.js App Router + RSC

Next.js provides the four things whiteboards need: SSR for SEO (Open Graph previews), React Server Components (server-side permission checks), API routes (tRPC co-deployment), and Edge runtime (<50ms latency).

### Rendering Strategy by Page Type

**Static (build time):** Marketing, pricing, docs, template gallery (`revalidate: 86400`). Zero cost.

**SSR (request time):** Public board previews (OG tags), user dashboard. ~1-2ms/request on Edge.

**Client-side only:** The canvas itself — WebSocket connections and real-time state are too dynamic for SSR.

```typescript
// app/boards/[id]/page.tsx (Server Component)
import { BoardCanvas } from '@/components/BoardCanvas';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';

export async function generateMetadata({ params }) {
  const board = await db.board.findUnique({ where: { id: params.id } });
  return { title: board.name, openGraph: { images: [board.thumbnailUrl] } };
}

export default async function BoardPage({ params }) {
  const { userId } = auth();
  const board = await db.board.findUnique({ where: { id: params.id } });
  if (!board.isPublic && board.ownerId !== userId) return <AccessDenied />;
  return <BoardCanvas boardId={params.id} initialData={board} />;
}
```

### Offline Support

Skip full PWA. The complexity-to-value ratio is unfavorable — offline editing requires IndexedDB for local storage, service workers for assets, conflict resolution on reconnect, UI state indicators, and background sync. Instead, use **optimistic UI**: render changes immediately, queue in memory, sync when online. Changes lost if tab closes before sync — users accept this tradeoff.

```typescript
function updateObject(id, changes) {
  setObjects((prev) => prev.map((obj) => (obj.id === id ? { ...obj, ...changes } : obj)));
  syncToServer({ id, changes }).catch(() => toast.error("Failed to sync - changes lost"));
}
```

Full PWA only if: intermittent connectivity industries, mobile-first product, or compliance requires on-device data.

## Third-Party Integrations

> **Business Context:** Each third-party service is a variable cost scaling with users and a vendor dependency scaling with reliance. The ~$560/month baseline at 1,000 users sets minimum revenue before breakeven — this drives pricing decisions.

### Stripe (Payments)

Subscriptions, billing, invoices, tax, dunning. 2.9% + $0.30/transaction.

```typescript
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ price: "price_1234", quantity: 1 }],
  customer_email: user.email,
  success_url: `${baseUrl}/boards?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/pricing`,
});

// Webhook handler — common bug source, verify signature first
export async function POST(req: Request) {
  const event = stripe.webhooks.constructEvent(
    await req.text(),
    req.headers.get("stripe-signature"),
    process.env.STRIPE_WEBHOOK_SECRET
  );
  if (event.type === "customer.subscription.updated") {
    await db.user.update({
      where: { stripeCustomerId: event.data.object.customer },
      data: { subscriptionTier: event.data.object.items.data[0].price.id },
    });
  }
}
```

**Key insight:** Monthly subs below $10 lose 30-40% to fees. Offer annual with 20% discount for better unit economics.

### Resend (Email)

React-based templates. Free: 3K emails/month. Paid: $20/month for 50K.

```typescript
await resend.emails.send({
  from: 'CollabBoard <noreply@collabboard.app>',
  to: invitee.email,
  subject: `${inviter.name} invited you to collaborate`,
  react: <BoardInviteEmail boardName={board.name} inviterName={inviter.name} />
});
```

### PostHog (Analytics)

Events, session replay, feature flags, A/B testing. Free: 1M events + 5K replays/month.

Free analytics (Plausible, Umami, Google Analytics) lack the depth SaaS needs — you must track events like "User invited collaborator," "Board exported to PDF," "AI feature used," not just page views. PostHog's free tier makes it the default.

```typescript
// Client
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, { api_host: 'https://app.posthog.com' });

// Server-side feature flags
const flags = await posthog.getAllFlags(userId);
if (flags['new-ai-features']) return <AIFeatures />;
```

### OpenAI (AI Features)

GPT-4o-mini: $0.15/1M input, $0.60/1M output — 60% cheaper than GPT-3.5 with better structured output.

```typescript
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: "Generate structured JSON for board elements." },
    { role: "user", content: "Create a SWOT analysis with 4 quadrants" },
  ],
  response_format: { type: "json_object" },
});
```

Abstract behind an interface for vendor flexibility:

```typescript
interface AIProvider {
  generateDiagram(prompt: string): Promise<BoardElement[]>;
}
```

### Cost Summary at 1,000 Users

| Service    | Monthly Cost   | Notes                                   |
| ---------- | -------------- | --------------------------------------- |
| Stripe     | $290           | 10% conversion × $10/mo (revenue share) |
| Resend     | $20            | Transactional only                      |
| PostHog    | $100           | ~100K events/user/month                 |
| OpenAI     | $50            | 10 ops/user/month                       |
| Clerk      | $25            | Free tier covers 1K users               |
| Cloudflare | $50            | Workers + R2 + Durable Objects          |
| Supabase   | $25            | Database + storage                      |
| **Total**  | **$560/month** | Break-even: $0.56/user/month            |

### Pricing Cliffs

1. **Clerk:** 10K → 10,001 MAU = $0 → $25 + $0.02/MAU
2. **PostHog:** 1M → 1.01M events = free → $0.00031/event
3. **Supabase:** 500MB → 8GB = free → $25/month
4. **Resend:** 3K → 3,001 emails = free → $20/month

Monitor at 80% of free tier limits. Rate-limit OpenAI (500 req/min Tier 1) and Stripe (25 req/sec live) client-side:

```typescript
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});
```

## Recommended Stack

**Frontend:** Next.js 14+ App Router + React + TypeScript + Tailwind + shadcn/ui
**Backend:** tRPC + Next.js API Routes + Zod
**Database:** Supabase (Postgres + auth + storage) or Neon
**Real-time:** Cloudflare Durable Objects or custom WebSocket on Railway
**Canvas:** tldraw SDK or HTML5 Canvas + Rough.js
**Auth:** Clerk or NextAuth.js v5
**Payments:** Stripe | **Email:** Resend | **Analytics:** PostHog | **AI:** OpenAI GPT-4o-mini
**Deploy:** Vercel (frontend) + Cloudflare Workers (WebSocket)
**CI/CD:** GitHub Actions + Vercel auto-deploy

**Why this works:** End-to-end type safety (Prisma → tRPC → React). Declarative configs AI parses reliably. Extensive docs in LLM training data. Progressive complexity — start simple, add sophistication when metrics justify it. $50–150/month at launch, $400–1,200 at 1K concurrent, $2,500–6,800 at 10K.

---

# Phase 3: Post-Stack Refinement

**Stack:** Next.js 14 App Router + tRPC + TypeScript + Cloudflare Durable Objects + Clerk + Supabase + Stripe + PostHog + OpenAI

## Security Vulnerabilities

> **Business Context:** Users trust collaborative tools with their IP. A single data-exposure event destroys brand trust irreversibly. Security spend is insurance — visible cost, invisible avoided loss.

### Next.js Environment Variables

Variables prefixed `NEXT_PUBLIC_` embed in client bundles permanently — even after rotation, CDN-cached bundles still contain them. AI agents will happily suggest `NEXT_PUBLIC_STRIPE_SECRET_KEY`. **Decision:** Only analytics IDs and Clerk publishable keys use the prefix.

### Server Component Serialization

RSC auto-serializes all props to Client Components. Passing a full Prisma user object exposes `email`, `stripeCustomerId`, `hashedPassword` in the client bundle. Unlike traditional SPAs where explicit API calls force you to choose return values, RSC collapses this boundary — the default is "serialize everything," the opposite of secure-by-default. **Decision:** Never pass DB records directly. Use Prisma `select` or destructure explicit allowlists.

### tRPC False Security

Type safety guarantees shape, not content validity. `{ boardId: "../../../etc/passwd" }` passes as `string`. Traditional REST APIs force validation at the HTTP boundary because request bodies are untyped; tRPC eliminates this forcing function. **Decision:** Every tRPC procedure must use `.input(z.object(...))`. Enforce via pre-commit hook.

### Supabase RLS

Without RLS on a table, the service role key bypasses all security. This differs from ORMs like Prisma where authorization is application logic — with Supabase, the database IS the security boundary. One unconfigured table = complete bypass. **Decision:** Enable RLS on every table immediately. Never use the service role key on the client (the anon key is designed for client use because RLS protects it).

### Durable Object Memory

Unlike stateless functions, DOs maintain state indefinitely. Traditional WebSocket servers have OS-enforced process limits on connections; Durable Objects are V8 isolates with soft limits that keep accepting connections until memory is exhausted. An attacker opening 10K connections to one room crashes the session. **Decision:** Per-room connection limits (max 300), per-connection rate limits (60 msg/sec), hibernatable WebSockets.

### Webhook Verification

Without signature verification, attackers forge webhooks claiming subscription upgrades. **Decision:** Always verify — Clerk's Svix library and Stripe's `constructEvent`. Never implement manually.

### Dependency Risks

This stack is young and breaking changes are frequent. Next.js 14→15 breaks App Router patterns. tRPC v10→v11 changed the entire API. Clerk SDK changes session management between versions. Prisma requires client regeneration on schema changes.

**Decision:** Pin exact versions for critical deps (e.g., `14.2.18` not `^14.0.0`). `npm audit` weekly. Dependabot auto-merge for patches only.

---

## File Structure: Monorepo

> **Business Context:** Codebase organization determines onboarding speed. A well-structured monorepo reduces "new hire to shipping features" from weeks to days — a direct multiplier on team productivity.

### Why Monorepo

1. **Type sharing** — tRPC depends on importing backend types in frontend. Polyrepo adds npm publish latency.
2. **Shared Zod schemas** — WebSocket and tRPC validation use identical schemas.
3. **Single CI/CD** — Workers backend and Next.js frontend deploy together; version mismatches cause runtime errors.
4. **LLM navigation** — AI can't easily coordinate across repos.

Use pnpm workspaces + Turborepo (10x faster CI via build caching).

**When polyrepo would win (doesn't apply here):** Multiple teams with different tech stacks, backend serving multiple frontends on different deploy schedules, or need for independent versioning.

### Organization

**Frontend: Feature-based.** Group `BoardCanvas.tsx`, `BoardToolbar.tsx`, `useBoardSync.ts` in `board/`. Frontend components are high-cohesion — related files change together, so co-location aids navigation.

**Backend: Layer-based.** tRPC routers together, services layer for shared business logic. Backend code is high-coupling — many routers use the same services, so layer separation prevents duplication when `board.ts` and `ai.ts` both need permission checking.

### Shared Packages

1. **`database`** — Prisma schema. Both Next.js and Workers import the generated client.
2. **`schemas`** — Zod schemas for tRPC inputs and WebSocket messages.
3. **`types`** — Shared TypeScript types not tied to Prisma/Zod.

---

## Naming Conventions

> LLM agents pattern-match on conventions. Inconsistency (80% kebab-case, 20% camelCase) produces inconsistent AI output. Automated enforcement (ESLint/Prettier) prevents drift.

**Files:** `kebab-case.tsx` (works cross-OS, matches URLs). Exception: Component files use PascalCase (`BoardCanvas.tsx`).

**Variables:** `camelCase` — JavaScript standard since ES5.

**tRPC procedures:** Verb prefixes — `getBoard`, `listBoards`, `createBoard`, `updateBoard`, `deleteBoard`.

**Enforcement:** ESLint + Prettier on save. Pre-commit hooks. CI failures on violations.

---

## Testing Strategy

> **Business Context:** The first 40% of coverage catches ~80% of critical bugs; each additional point costs exponentially more. Pre-PMF, shipping speed generates more value than incremental bug prevention.

### MVP Coverage: 40-50%

Focus on: auth flows, payment processing, WebSocket sync, authorization checks.
Skip for now: UI rendering tests, non-critical edge cases, performance benchmarks, accessibility.
Post-PMF target: 70-80%.

### Vitest Over Jest

5-10x faster for TypeScript (esbuild vs ts-jest). Native ESM. Sub-second watch mode reruns. Jest-compatible API so AI uses existing training data.

### Playwright Over Cypress

Built-in parallelism, multi-browser (Chromium/Firefox/WebKit), first-class WebSocket interception, TypeScript-native. Critical path: spinning up two browser contexts, connecting to same WebSocket, verifying message propagation.

### Mocking Philosophy

**Mock externals** (Clerk, Stripe, OpenAI) — rate limits, network dependency, cost accumulation.
**Don't mock your database** — RLS policies and queries are the critical path. Use in-memory SQLite for unit tests, Postgres for integration.

---

## Tooling

> **Business Context:** Developer tooling compounds over thousands of daily interactions. A 5-second CI speedup across 50 daily commits saves 20+ hours/year per developer. Optimize the tools touched most frequently.

### VS Code Extensions (5-7 max)

1. **ESLint + Prettier** — inline errors, AI self-correction
2. **Error Lens** — TypeScript errors displayed where typed
3. **Tailwind IntelliSense** — class autocomplete + CSS preview

### CLI: Global vs Local

**Global:** `pnpm`, `wrangler`, `tsx` (stable, version-agnostic)
**Local:** `prisma`, `eslint`, `vitest` (project-specific configs)

### Next.js Debugging

Server and Client Components run in separate runtimes. Configure dual debug in `launch.json`. Add `// Server Component` / `// Client Component` comments for AI disambiguation.

### Turborepo

Caches build outputs by input hash. Reduces CI from 8 min to 2 min. Minimal config (single `turbo.json`). Critical for AI workflows that make many small commits.

---

## Summary

**Security:** This stack collapses traditional boundaries (RSC serialization, tRPC skipping validation, Supabase as auth layer). Every security decision compensates.

**Structure:** Monorepo enables type sharing (tRPC's value prop). Feature-based frontend, layer-based backend.

**Conventions:** Consistency matters more with AI. Automate enforcement.

**Testing:** 40-50% MVP, 70-80% post-PMF. Vitest for speed, Playwright for WebSocket e2e.

**Tooling:** Minimize extensions. Cache builds with Turbo. Dual debug for RSC.

Each decision optimizes for: type safety, automated enforcement, clear conventions, fast feedback loops.
