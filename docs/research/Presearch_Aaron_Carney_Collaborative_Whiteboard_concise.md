# Collaborative Whiteboard: Technical Research (Condensed)

## Phase 1: Market & Technical Landscape

### Growth Patterns

**All leaders launched small, grew slowly pre-COVID:**

- Miro (2011): 7yr→2M users, 6K paying. Now: 100M+ users, ~$500M ARR, $17.5B valuation
- Figma (2016): 6yr→4M users. Now: 13M MAU, $749M revenue, $68B valuation
- Excalidraw (2020): Bootstrapped→850K MAU
- tldraw (2021): 500K MAU, $14.1M funding, SDK licensing model

**COVID inflection:** Miro +1M MAU Q2 2020 (5M→30M in 21mo). Market now mature—no more pandemic growth.

**Business models:** (1) Freemium→Enterprise (Miro, needs $20M+ funding), (2) Developer SDK (tldraw), (3) Open-source+paid (Excalidraw, bootstrappable)

### Pricing Convergence

| Tier       | Price          | Limit    |
| ---------- | -------------- | -------- |
| Free       | $0             | 3 boards |
| Starter    | $8-10/user/mo  | -        |
| Business   | $16-20/user/mo | -        |
| Enterprise | $20-90/user/mo | Custom   |

**Why:** $8-10 minimum (Stripe 2.9%+$0.30 fees + CAC). $16-20 business equilibrium. 3-board limit forces team upgrades.

**Why you can't compete on price:**

- Undercutting ($3-5/user) signals low quality/"will shut down soon." High switching costs prevent adoption.
- Premium ($25+/user) requires features Miro lacks. New entrants lack feature parity.
- $8-12/user optimal for MVP: matches market expectations, covers infrastructure, leaves CAC margin.

### Infrastructure Costs

**Traffic patterns:** Spiky, not steady. 9AM-6PM business hours, 10-50x surges during workshops. 80%+ users outside US—traffic follows the sun (US East → EU → Asia → US West in 24hr cycle).

- 100 concurrent: $100-260/mo
- 1K concurrent: $425-1,150/mo
- 10K concurrent: $2,500-6,800/mo

**Why cheap:** WebSockets mostly idle (50-200KB/connection). Tiny payloads (cursor: 20 bytes). In-memory state, not DB-bound. Client-side rendering.

**Why whiteboards differ from other SaaS:**

- **CRUD apps:** Database-bound. Every action = DB write. Whiteboards keep state in memory, checkpoint to Postgres every 30-60s.
- **Video/audio:** Bandwidth-bound. Zoom 1hr = 500-900MB. Whiteboard 1hr = 5-10MB (static assets + tiny WebSocket messages).
- **ML inference:** Compute-bound. Stable Diffusion $0.10-0.50/image. Whiteboards offload rendering to client (Canvas in browser).

**Storage scales linearly:** 500 objects (sticky notes, shapes, text) = ~100KB. With 10 snapshots (version history) = 1MB/board. At $0.023/GB-month (S3 pricing), store 43,000 boards per dollar per month.

**Cost breakdown @ 1K users:**
| Component | Cost/mo |
|-----------|---------|
| Cloudflare Workers/DO | $90-180 |
| Supabase Postgres | $25 |
| Upstash Redis | $15-30 |
| R2 Storage | $5-10 |
| Bandwidth | $10-20 |
| **Total** | **$425-1,150** |

### Traffic Patterns

**Spiky, not steady:** 9AM-6PM business hours, 10-50x surges during workshops. 80%+ users outside US (follows sun).

**Architecture implications:** Serverless optimal (pay-per-request). Must scale 0→200 users in <60s. Connection affinity required (sticky sessions by document ID).

### Technical Architecture

**Sync:** Most avoid full CRDTs. Use **last-writer-wins + version numbers** (Figma, Excalidraw). Only use Yjs CRDT for rich text.

**Why avoid full CRDTs:**

- Complexity: 5,000-15,000 LOC for full implementation (Yjs, Automerge)
- Performance: Maintain tombstones (deleted items) for convergence. Yjs documents grow to 10MB+ after thousands of edits, even if visible content is 100KB. Breaks mobile clients.
- Dev experience: Specialized knowledge required. Debugging merge conflicts extremely difficult.

**Algorithm:**

1. Each object property has version number
2. Concurrent edits: highest version wins
3. Random nonce for tie-breaking

**When it fails:** Two users simultaneously drag same sticky note → one position update overwritten. Rare + low-stakes = users tolerate (just redo).

**Rendering:**
| Tech | Max Objects | FPS | Use Case |
|------|-------------|-----|----------|
| SVG | <1K | 30-60 | Simple, debugging |
| Canvas 2D | 1K-10K | 60 | Default choice |
| WebGL | 10K-100K+ | 60 | Figma-level density |

**Canvas 2D wins:** SVG hits DOM limits (1K+ nodes). WebGL overkill for 90%. Canvas 2D + viewport culling handles 10K objects.

### AI Integration Timeline

- 2024 Q1: Miro beta
- 2024 Q3: tldraw "Make Real" viral
- 2025 Q1: Figma Config
- 2026 Q1: Table stakes

**Why AI became table stakes so fast:**

1. **Canvases are ideal AI interfaces:** Spatial + multimodal (vs linear chat). Draw rough wireframe, point, say "make this a working app." AI output appears on canvas for iteration.
2. **Structured outputs made it viable:** GPT-4 function calling (2023) + structured outputs (2024) = reliable JSON generation. Maps directly to `createStickyNote(x, y, text)` operations. Pre-function calling, LLMs produced text requiring parsing.
3. **Competitive moat shifted:** Pre-AI differentiation = performance (Figma WebGL, Miro sync). Now commodity (Cloudflare DO gives everyone <100ms sync). AI features = new moat.

**Cost:** $0.05-0.50/user/mo. GPT-4o-mini sufficient ($0.15/1M input, $0.60/1M output—60% cheaper than GPT-3.5).

**Operations:**

- Clustering: ~$0.001
- Diagram gen: ~$0.004
- Summarization: ~$0.008

**Credit system:** Free: 10/mo, Pro: 100/mo, Team: 500/mo. Prevents runaway costs.

### Performance Targets

| Metric           | Target               | Why                  |
| ---------------- | -------------------- | -------------------- |
| Sync latency     | <100ms               | Perception threshold |
| Cursor latency   | <50ms                | Smooth tracking      |
| Frame rate       | 60 FPS               | Monitor refresh      |
| Concurrent users | 20-50 MVP, 200 scale | Workshop sizes       |
| Object capacity  | 5K-10K               | Pre-culling limit    |

**How to achieve <100ms:**

1. Optimistic local-first rendering
2. Delta-based sync
3. In-memory server state
4. Connection affinity
5. Regional deployment (<1,500km)

**200 user limit:** Miro tested 377 concurrent users on a single board before performance degraded (required dedicated instances, unusable in practice). Why 200 is the real limit:

- O(n²) message fan-out. 200 users = 200 broadcasts/edit. 300 users = 300 broadcasts. Overwhelms network buffers.
- Browser memory. 300 cursors = 500MB+ just for presence state.
- Cognitive overload. Humans can't track 300 cursors.

Solution: 10-20 editors, 200+ read-only viewers (10x reduction in message fan-out).

### Compliance Timeline

- **Day 1:** GDPR (required for EU users)
- **~$1M ARR:** SOC 2 Type I ($10K-40K, 1-3mo)
- **+6-12mo:** SOC 2 Type II ($30K-80K total)
- **$5M+ ARR:** ISO 27001
- **Avoid:** HIPAA (unless healthcare-focused)

**EU data residency:** Non-negotiable for enterprise (post-Schrems II). File content must stay in EU; metadata can be US. Cursor positions during active sessions exempt (real-time sync considered "in transit"). **Figma's approach:** EU hosting (Frankfurt/Dublin) Enterprise-only, covers file content—billing metadata stays in US.

### Strategic Takeaways

**What Product-Market Fit Looks Like:**

- Slow growth for years is normal. Miro took 7 years to reach 2M users. Figma took 6 years to reach 4M. COVID spike was anomaly, not baseline.
- Market now mature and competitive. You're competing against 2026 Miro (1,000+ templates, 50+ integrations, enterprise SSO), not 2016 Figma.
- Three viable business models: (1) Freemium→Enterprise (Miro path, requires $20M+ funding), (2) Developer SDK (tldraw path, requires strong open-source community), (3) Open-source + paid features (Excalidraw path, bootstrappable).

**What Technical Choices Actually Matter:**

- Serverless wins for 0-10K concurrent users. Cloudflare Durable Objects offer best cost/performance ratio. Self-managed WebSocket servers only make sense above 10K concurrent.
- Full CRDTs are overkill. Last-writer-wins with version numbers handles 99.9% of cases. Only use Yjs if building rich text collaboration.
- Canvas 2D hits the sweet spot. SVG too slow above 1,000 objects. WebGL too complex for most teams. Canvas 2D with viewport culling handles 10,000 objects easily.
- AI features are mandatory, not optional. Every competitor ships AI diagram generation, sticky note clustering, and board summarization. Without these, you're perceived as outdated.

**What Cost Structure Enables:**

- Infrastructure is cheap enough to ignore initially. At $100-260/month for 100 users, infrastructure cost is rounding error compared to salaries. Optimize for development speed, not infrastructure cost.
- Margins improve dramatically at scale. 10% conversion at $10/month pricing breaks even at 500 users ($500 revenue vs $500 infrastructure). At 5,000 users, margins hit 60% ($5,000 revenue vs $2,000 infrastructure).
- Real costs are sales and customer acquisition. Collaborative tools have high CAC ($50-200 per customer) because they require team adoption. Infrastructure cost per user ($0.50/month) is negligible compared to CAC.

**What Compliance Unlocks:**

- SOC 2 is the enterprise gate. Without it, can't close deals above $10K/year. 60% of businesses prefer SOC 2-compliant vendors. A third of organizations have lost deals for lacking it.
- EU data residency is table stakes for European enterprise. Not offering it eliminates you from RFPs in Germany, France, Netherlands. These represent 30-40% of global enterprise whiteboard market.
- HIPAA is a trap. Healthcare market is small for whiteboards. Compliance costs ($100K+) exceed revenue potential. Skip unless healthcare is primary market.

## Phase 2: Architecture for LLM-Assisted Development

**Core principle:** Favor established patterns, extensive docs, type safety. LLM agents struggle with novel architectures and runtime errors.

### Hosting & Deployment

**Critical constraint:** Vercel cannot serve WebSocket backends—serverless functions have 10-second execution limit incompatible with persistent connections. This pushed industry toward three deployment models.

**0-1K concurrent:** Cloudflare Workers + Durable Objects ($50-150/mo). tldraw uses this. Each room = Durable Object instance. Cost: $5/mo base + $0.15/M requests + $0.02/GB-month DO storage. 50 concurrent room with hibernation = ~$0.10/mo. Web APIs familiar to LLM agents. `wrangler dev` + `wrangler deploy`.

**Key constraint:** Must scale 0→200 concurrent users in <60s for workshop sessions. Traditional CPU/memory autoscaling too slow—by time servers provision, workshop already started. Serverless optimal (instant scale).

**1K-10K concurrent:** Railway/Render hybrid ($400-1,200/mo). Railway: $20/vCPU/mo + $10/GB RAM/mo (40-75% cost savings vs AWS). 4vCPU/8GB = ~5K WebSocket connections @ $140/mo. Combine with Cloudflare for static assets.

**10K+ concurrent:** AWS/GCP regional ($0.02-0.05/user/mo at steady state). Requires DevOps.

**CI/CD requirements:**

1. Graceful shutdown (30min connection draining)
2. Backward-compatible migrations
3. Feature flags for sync protocol
4. WebSocket integration tests (Playwright)
5. Load testing (Artillery/k6)

**Scaling inflection points:**

- 100→1K: Hibernatable WebSockets (10x cost reduction)
- 1K→5K: Dedicated servers + sticky sessions
- 5K→10K: Redis Pub/Sub cross-server (2-5ms latency)
- 10K+: Regional deployment (US-East, EU-West, APAC)

### Authentication

**Clerk (recommended for LLM dev):** Pre-built UI, 7min setup. Free: 10K MAU. Paid: $25/mo + $0.02/MAU. TypeScript-native SDK. `<SignedIn>/<SignedOut>` components.

```typescript
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/nextjs";

export default function Header() {
  return (
    <header>
      <SignedOut>
        <SignInButton />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </header>
  );
}
```

**NextAuth.js v5:** Open-source, zero per-user cost. Setup: 1-3hr. Universal `auth()` function works across Server Components, API routes, middleware—single pattern for LLM agents. Multi-tenancy requires custom implementation (20-40hr).

**Supabase Auth:** Free: 50K MAU (5x Clerk). RLS integration. No pre-built UI. Choose when already using Supabase DB.

**Auth0:** Enterprise compliance only. $23-240/mo + $0.05/MAU.

**RBAC levels:**

1. Board: View, Edit, Comment, Admin
2. Org: Member, Workspace Admin, Owner
3. Feature: AI, Export, Integrations (pricing tiers)

**Multi-tenancy patterns:**

1. **Row-based (recommended MVP):** Single DB with `organization_id` column on every table. Simplest. Works to 10K orgs. Every query includes `WHERE organization_id = ?`.
2. **Schema-based:** Separate PostgreSQL schema per org. Better isolation, enables per-tenant backups. Adds complexity for cross-tenant features (public template gallery). Manual schema management error-prone for LLM migrations.
3. **DB-per-tenant:** Complete isolation, required for some enterprise compliance. Substantial operational overhead—not recommended unless contractually required.

### Database & Data Layer

**PostgreSQL options:**

- **Supabase:** Free: 500MB + 1GB storage + 2GB transfer. Paid: $25/mo (8GB). RLS, auto API gen, real-time subs.
- **Neon:** Serverless, scales to zero. Free: 0.5GB + 3GB transfer. Paid: $19/mo (10GB). Branch-based dev (Git for databases).
- **PlanetScale:** MySQL. Free: 5GB + 1B reads/mo. Paid: $39/mo (100GB). Zero-downtime migrations. MySQL quirks confuse LLMs.

**Redis options:**

- **Upstash:** Serverless, REST API. Free: 10K commands/day. $0.20/100K commands. Ideal for Cloudflare Workers.
- **Redis Cloud:** Free: 30MB. $5/mo (100MB), $15/mo (500MB).

**Use cases:** WebSocket connections, presence, Pub/Sub, rate limiting, session cache.

**Sync protocols:**

- **Last-writer-wins (default):** Simple, 50 LOC. Works for 99.9% cases.
- **Yjs CRDT:** Rich text only (TipTap, ProseMirror, Quill).
- **tldraw sync:** If using tldraw SDK—production-proven.

**Read/write ratios:**

- Active editing: 80% writes, 20% reads
- Viewing: 95% reads, 5% writes

**Caching:**

1. Never cache active board state
2. Cache thumbnails (24hr CDN TTL)
3. Cache user profiles (5min TTL)
4. Cache permissions (30s Redis TTL)

```typescript
// Permission cache pattern
async function getBoardPermission(userId: string, boardId: string) {
  const cacheKey = `perm:${userId}:${boardId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const permission = await db.permissions.findFirst({
    where: { userId, boardId },
  });
  await redis.setex(cacheKey, 30, JSON.stringify(permission));
  return permission;
}
```

### Backend: tRPC + Next.js

**Why tRPC:** Single source of truth. Frontend/backend share types automatically. No manual API contracts. LLM agents can refactor safely—TypeScript catches breaks.

**The drift problem tRPC solves:** Traditional REST requires 3 artifacts that drift: (1) backend route definitions, (2) request/response TypeScript interfaces, (3) frontend API client. Backend change = update all 3 files. LLM agents miss edge cases in manual type mappings. tRPC collapses to single source of truth.

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

// Frontend (fully typed)
const { data: board } = trpc.board.getBoard.useQuery({ boardId });
```

**Use REST for:** Public APIs (embed board), webhooks (Stripe, Slack).

**Background jobs:**

Real-time apps need background processing for:

1. Thumbnail generation (when board updates, regenerate preview image)
2. Export to PDF/PNG (large boards take 5-30s to render)
3. AI operations (multi-step LLM workflows: analyze board → generate suggestions → create elements)
4. Email notifications (digest emails for board activity)
5. Data cleanup (delete inactive boards after 90 days)

- 0-1K users: Vercel Cron + Upstash QStash (free: 10K jobs/mo)
- 1K-10K users: BullMQ + Redis ($15/mo)
- 10K+ users: Inngest ($200/mo) or Temporal ($300/mo)

### Frontend: Next.js App Router

**Why Next.js:**

1. SSR for SEO (Open Graph previews)
2. React Server Components (fetch on server)
3. API routes (tRPC)
4. Edge runtime (<50ms global latency)

**Rendering strategy:**

- **Static gen:** Marketing, pricing, templates (CDN, $0)
- **SSR:** Public boards (OG meta), dashboards (~1-2ms)
- **CSR:** Canvas, editing UI (WebSockets, real-time)

**Offline support:** Most whiteboards skip full PWA (complexity vs value). Use optimistic UI instead—changes render immediately, queue in memory, sync when online. Lost on tab close (acceptable).

```typescript
const [objects, setObjects] = useState(initialObjects);
const [pendingChanges, setPendingChanges] = useState([]);

function updateObject(id, changes) {
  // Update UI immediately
  setObjects((prev) => prev.map((obj) => (obj.id === id ? { ...obj, ...changes } : obj)));

  // Queue for sync
  setPendingChanges((prev) => [...prev, { id, changes }]);

  // Sync to server
  syncToServer({ id, changes })
    .then(() => setPendingChanges((prev) => prev.filter((c) => c.id !== id)))
    .catch(() => toast.error("Failed to sync - changes lost"));
}
```

**PWA justified only when:**

- Industries with intermittent connectivity (aviation, construction)
- Mobile-first product (tablets in field work)
- Compliance requires data never leave device

### Third-Party Integrations

**Stripe:** 2.9% + $0.30/transaction. Below $10/mo loses 30-40% to fees. Solution: Annual subscriptions with 20% discount.

```typescript
// Create checkout session
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ price: "price_1234", quantity: 1 }],
  customer_email: user.email,
  success_url: `${baseUrl}/boards?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/pricing`,
});

// Webhook handler for subscription events
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

**Resend:** $20/mo (50K emails). React email templates.

```typescript
import { Resend } from 'resend';
import { BoardInviteEmail } from '@/emails/BoardInvite';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'CollabBoard <noreply@collabboard.app>',
  to: invitee.email,
  subject: `${inviter.name} invited you to collaborate`,
  react: <BoardInviteEmail boardName={board.name} inviterName={inviter.name} />
});
```

**PostHog:** Free: 1M events/mo + 5K replays/mo. Paid: $0.00031/event. Events + feature flags + session replay.

```typescript
// app/providers.tsx (Client Component)
'use client';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: 'https://app.posthog.com',
  });
}

export function Providers({ children }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

// Server-side feature flags
import { PostHog } from 'posthog-node';

const posthog = new PostHog(process.env.POSTHOG_API_KEY);
const flags = await posthog.getAllFlags(userId);

if (flags['new-ai-features']) {
  return <AIFeatures />;
}
```

**OpenAI:** GPT-4o-mini $0.15/1M input, $0.60/1M output. Tiered credits prevent runaway costs.

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    {
      role: "system",
      content:
        "You are a whiteboard assistant. Generate structured JSON output for creating board elements.",
    },
    { role: "user", content: `Create a SWOT analysis template with 4 quadrants` },
  ],
  response_format: { type: "json_object" },
});

const elements = JSON.parse(completion.choices[0].message.content);
```

**Vendor lock-in mitigation:** Abstract AI behind your own interface:

```typescript
interface AIProvider {
  generateDiagram(prompt: string): Promise<BoardElement[]>;
}

class OpenAIProvider implements AIProvider {
  async generateDiagram(prompt: string) {
    // OpenAI implementation
  }
}

class AnthropicProvider implements AIProvider {
  async generateDiagram(prompt: string) {
    // Claude implementation
  }
}
```

LLM agents can swap providers without touching business logic.

**Service costs @ 1K users:**
| Service | Cost/mo |
|---------|---------|
| Stripe | $290 (10% conversion) |
| Resend | $20 |
| PostHog | $100 |
| OpenAI | $50 |
| Clerk | $25 (free tier) |
| Cloudflare | $50 |
| Supabase | $25 |
| **Total** | **$560** |

**Break-even:** $0.56/user/mo. With 10% conversion @ $10/mo = $1/user revenue. Margins improve at scale.

**Pricing cliffs:**

1. Clerk: 10K→10,001 MAU = $0→$25/mo
2. PostHog: 1M→1.01M events = free→$0.00031/event
3. Supabase: 500MB→8GB = $0→$25/mo
4. Resend: 3K→3,001 emails = $0→$20/mo

**Mitigation:** Monitor weekly, set alerts @ 80% of free tiers.

**Rate limiting example (Upstash):**

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds
});

export async function POST(req: Request) {
  const { userId } = auth();
  const { success } = await ratelimit.limit(userId);

  if (!success) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  // Process request
}
```

### Recommended Stack

**Frontend:** Next.js 14+ App Router + React + TypeScript + Tailwind + shadcn/ui  
**Backend:** tRPC + Next.js API Routes + Zod  
**Database:** Supabase (Postgres + auth + storage) OR Neon  
**Real-time:** Cloudflare Durable Objects OR Railway WebSocket server  
**Canvas:** tldraw SDK OR Canvas 2D + Rough.js  
**Auth:** Clerk OR NextAuth.js v5  
**Payments:** Stripe  
**Email:** Resend  
**Analytics:** PostHog  
**AI:** OpenAI GPT-4o-mini  
**Deploy:** Vercel + Cloudflare Workers  
**CI/CD:** GitHub Actions

**Why for LLM agents:**

1. Type safety end-to-end
2. Declarative configs (`.prisma`, `wrangler.toml`, `vercel.json`)
3. Extensive docs/examples
4. Progressive complexity
5. Cost-effective scaling

## Phase 3: Post-Stack Refinement

**Stack:** Next.js 14 + tRPC + TypeScript + Cloudflare DO + Clerk + Supabase + Stripe + PostHog + OpenAI

### Security Vulnerabilities

**1. NEXT*PUBLIC* exposure:** Variables prefixed `NEXT_PUBLIC_` embed in JS bundles forever (even after rotation, CDN caches persist). LLM agents don't understand security implications. **Decision:** Only analytics IDs and designed-for-public keys (Clerk publishable).

**2. Server Component serialization:** RSC auto-serializes all props to Client Components. Passing full Prisma user object exposes `email`, `stripeCustomerId`, `hashedPassword`. **Decision:** Never pass DB records directly. Always destructure or use Prisma `select`.

**3. tRPC type safety ≠ validation:** TypeScript accepts `{ boardId: "../../../etc/passwd" }` as `string`. LLM agents skip `.input()` calls. **Decision:** Every tRPC procedure MUST use `.input(z.object(...))`. Pre-commit hook enforces.

**4. Supabase RLS:** Service role key bypasses all security if RLS not enabled. One table without RLS = complete bypass. **Decision:** Enable RLS on every table (even MVP). Test as different users. Never use service role key on client.

**5. Durable Objects memory exhaustion:** Unlike stateless functions, DOs maintain in-memory state indefinitely. Attacker opens 10K connections→crash. **Decision:** Per-room limit (300 connections), per-connection rate limit (60 msg/s). Use hibernatable WebSockets.

**6. Webhook verification:** Clerk/Stripe webhooks are public HTTP endpoints. Forged webhooks grant unauthorized access. **Decision:** Always verify signatures (Clerk's Svix, Stripe's `constructEvent`).

**7. Dependency risks:**

- **Next.js:** Major versions (14→15) break App Router patterns. Canary releases contain experimental features that become production defaults. Pin exact minor versions (`14.2.18` not `^14.0.0`).
- **tRPC:** v10→v11 changed entire API surface. Requires manual migration for every procedure.
- **Clerk:** Session management implementation changes between SDK versions. Test authentication flows after every update.
- **Prisma:** Generated client changes with schema migrations. Deploy without regenerating client = runtime errors.

**Why high-risk:** Stack younger than established frameworks (Express, Django). Breaking changes frequent, ecosystem hasn't stabilized. LLM agents trained on v10 patterns generate broken code for v11.

**Decision:** Pin exact versions. `npm audit` weekly. Dependabot auto-merge patches only.

### File Structure

**Monorepo (pnpm workspaces + Turborepo):**

1. Type sharing (tRPC `import type { AppRouter }`)
2. Shared Zod schemas (WebSocket + tRPC validation)
3. Single CI/CD pipeline
4. LLM agents navigate single workspace

**Organization:**

- **Frontend:** Feature-based (`board/`, `auth/`, `ai/`)
- **Backend:** Layer-based (routers/, services/, middleware/)

**Shared packages:**

1. `database`: Prisma schema
2. `schemas`: Zod (tRPC inputs + WebSocket messages)
3. `types`: TypeScript types (not Prisma/Zod)

### Naming Conventions

**Files:** `kebab-case.tsx` (except components: `BoardCanvas.tsx` matches export)  
**Variables:** `camelCase`  
**tRPC procedures:** Verb prefixes (`getBoard`, `createBoard`, `updateBoard`)  
**Enforcement:** ESLint + Prettier + pre-commit hooks. CI fails on violations.

**Why:** LLM agents pattern-match. 80% kebab + 20% camel = AI confusion. Automated enforcement prevents drift.

**ESLint/Prettier for LLM reasoning:** AI agents don't read style guides—they read the actual code. If a human manually violates conventions once, the AI will replicate that violation in every subsequent file it generates. Automated enforcement (ESLint fails build, Prettier auto-fixes on save, pre-commit hooks) prevents non-compliant code from entering repository.

### Testing Strategy

**MVP coverage:** 40-50% overall, 80%+ critical paths (auth, payments, permissions). 40→80% coverage = 3-4x effort.

**Test priorities:**

- ✓ Auth flows, payment processing, WebSocket sync, security
- ✗ UI rendering, edge cases, performance, a11y

**Vitest (not Jest):** 5-10x faster for TypeScript (esbuild vs ts-jest). Native ESM. Watch mode <1s. Jest-compatible API (LLM agents use same examples).

**Playwright (not Cypress):** Parallel execution built-in. Multi-browser (Chromium, Firefox, WebKit). First-class WebSocket testing (intercept frames). TypeScript-native.

**Mocking:**

- ✓ Mock: Clerk, Stripe, OpenAI (rate limits, network, latency, cost)
- ✗ Don't mock: Supabase, Prisma (test YOUR auth logic, DB is critical path)

Use SQLite in-memory for unit tests, Postgres for integration tests.

### Tooling

**VS Code extensions (5-7 max):**

1. **ESLint + Prettier:** Show errors inline before commit. For LLM-assisted development, AI sees linting errors immediately when generating code, allowing self-correction.
2. **Error Lens:** Displays TypeScript errors inline in editor (not just Problems panel). Prevents "compiles locally but fails in CI" problem—developers see errors where they're typed, not 30 lines down.
3. **Tailwind CSS IntelliSense:** Autocompletes Tailwind classes, shows generated CSS on hover. Without this, developers must memorize class names or constantly reference documentation. LLM agents don't use this extension (trained on Tailwind docs), but humans need it.

**Why not more extensions:** Every extension slows down editor. TypeScript language server already consumes significant CPU. Adding 20 extensions makes VS Code sluggish, degrading developer experience.

**CLI:**

- Global: `pnpm`, `wrangler`, `tsx`
- Local: `prisma`, `eslint`, `vitest`

**Debugging Next.js:** Dual debug configs (Server + Client Components run in separate runtimes). Server logs → terminal, Client logs → browser console. LLM agents confuse Server/Client Components—comments help.

**Turborepo:** Caches build outputs (input hash). CI: 8min→2min (5x speedup). LLM agents make many small commits—fast CI catches errors quickly.

### Summary

**Security:** Stack collapses boundaries (RSC serialization, tRPC no validation, Supabase DB-layer auth). Compensate for collapsed boundaries.

**File structure:** Monorepo enables type sharing (tRPC's value prop). Feature-based frontend (LLM navigation), layer-based backend (prevent duplication).

**Naming:** Consistency critical for LLM pattern-matching. Automated enforcement (ESLint/Prettier/hooks).

**Testing:** 40-50% MVP coverage (ship vs perfection). Vitest (speed), Playwright (WebSocket testing).

**Tooling:** Minimize extensions (editor speed). Turbo (CI speed). Dual debugging (Next.js split runtime).

All decisions optimize for LLM-assisted development: type safety, automation, clear conventions, fast feedback loops.
