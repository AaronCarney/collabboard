# AI Cost Analysis — CollabBoard

## Provider Costs

| Provider  | Model         | Input ($/1M tokens) | Output ($/1M tokens) | Notes             |
| --------- | ------------- | ------------------- | -------------------- | ----------------- |
| Anthropic | Claude Opus   | $15.00              | $75.00               | Lead orchestrator |
| Anthropic | Claude Sonnet | $3.00               | $15.00               | Worker agents     |
| Anthropic | Claude Haiku  | $0.25               | $1.25                | Mechanical tasks  |
| OpenAI    | GPT-4o-mini   | $0.15               | $0.60                | AI board commands |

## Development Token Usage

Model mix applied per phase: Opus 60% (lead/orchestrators), Sonnet 30% (workers), Haiku 10%
(mechanical tasks). Phase 6 is an exception — heavy Sonnet usage shifts the split to 40/50/10.

Cost formula per model tier: `(input_tokens × tier_share × input_rate) + (output_tokens × tier_share × output_rate)`

| Phase     |  Input Tokens | Output Tokens |  Opus Cost | Sonnet Cost | Haiku Cost | Phase Total |
| --------- | ------------: | ------------: | ---------: | ----------: | ---------: | ----------: |
| Phase 1   |       300,000 |        80,000 |      $6.30 |       $0.63 |      $0.02 |       $6.95 |
| Phase 2   |       800,000 |       200,000 |     $16.20 |       $1.62 |      $0.05 |      $17.87 |
| Phase 3   |       600,000 |       150,000 |     $12.15 |       $1.22 |      $0.03 |      $13.40 |
| Phase 4   |       500,000 |       120,000 |      $9.90 |       $0.99 |      $0.03 |      $10.92 |
| Phase 5   |       400,000 |       100,000 |      $8.10 |       $0.81 |      $0.02 |       $8.94 |
| Phase 6   |       700,000 |       180,000 |      $9.60 |       $2.40 |      $0.04 |      $12.04 |
| Phase 7   |       300,000 |        80,000 |      $6.30 |       $0.63 |      $0.02 |       $6.95 |
| **Total** | **3,600,000** |   **910,000** | **$68.55** |   **$8.30** |  **$0.21** |  **$77.07** |

### Phase Notes

- **Phase 1 (Foundation):** Simple scaffolding, minimal back-and-forth. Straightforward Opus
  lead driving boilerplate generation.
- **Phase 2 (Canvas):** Highest token consumption. Complex canvas rendering logic required
  extensive context and iteration on geometry math, hit-testing, and WebGL considerations.
- **Phase 3 (Real-time):** 10+ fix commits visible in git history reflect debugging loops on
  Supabase Realtime CRDT conflicts, connection lifecycle, and presence. Heavy context per turn.
- **Phase 4 (AI):** AI SDK integration is architecturally focused. Opus-heavy because integration
  decisions required cross-cutting reasoning across the stack.
- **Phase 5 (Sharing):** Moderate scope — link generation, permissions, share UI. Well-bounded.
- **Phase 6 (Polish):** Many small, parallelizable component tasks shifted work to Sonnet workers.
  Model split adjusted to 40% Opus / 50% Sonnet / 10% Haiku to reflect this.
- **Phase 7 (Final):** Bug fixes and documentation. Similar profile to Phase 1.

## Runtime Cost Projections

### AI Command Usage (GPT-4o-mini)

Token model: ~2,000 tokens per AI command (800 system prompt + 500 tool definitions +
100 user input + 600 response). Template commands bypass the LLM entirely and cost $0.
At 50% template rate, only half of commands incur LLM cost.

Monthly token formula: `users × cmds/day × 0.5 × 2,000 tokens × 30 days`
Cost split: 70% input tokens, 30% output tokens.

| Scale         | Avg Commands/User/Day | Monthly Active Users | Monthly Token Usage | Monthly Cost |
| ------------- | --------------------- | -------------------- | ------------------: | -----------: |
| 100 users     | 5                     | 100                  |          15,000,000 |        $4.28 |
| 1,000 users   | 5                     | 1,000                |         150,000,000 |       $42.75 |
| 10,000 users  | 3                     | 10,000               |         900,000,000 |      $256.50 |
| 100,000 users | 2                     | 100,000              |       6,000,000,000 |    $1,710.00 |

Cost breakdown for each tier:

- **100 users:** 10.5M input × $0.15/1M = $1.58 + 4.5M output × $0.60/1M = $2.70 → **$4.28/mo**
- **1,000 users:** 105M input × $0.15/1M = $15.75 + 45M output × $0.60/1M = $27.00 → **$42.75/mo**
- **10,000 users:** 630M input × $0.15/1M = $94.50 + 270M output × $0.60/1M = $162.00 → **$256.50/mo**
- **100,000 users:** 4.2B input × $0.15/1M = $630.00 + 1.8B output × $0.60/1M = $1,080.00 → **$1,710.00/mo**

Per-user monthly AI cost: $0.043 (100 users) → $0.043 (1K) → $0.026 (10K) → $0.017 (100K).
Unit economics improve at scale because average commands/user/day decreases as the user base
broadens beyond power users.

### Real-time Infrastructure (Supabase)

Message rate: 0.5 msg/sec per concurrent connection.
Concurrent connections assumed at 20% of monthly active users (typical peak concurrency ratio).

| Scale         | Concurrent Connections | Messages/sec | Supabase Plan |  Monthly Cost |
| ------------- | ---------------------- | ------------ | ------------- | ------------: |
| 100 users     | 20                     | 10           | Free          |            $0 |
| 1,000 users   | 200                    | 100          | Pro           |           $25 |
| 10,000 users  | 2,000                  | 1,000        | Team          |          $599 |
| 100,000 users | 20,000                 | 10,000       | Enterprise    | ~$2,000–5,000 |

The Free tier supports up to 200 concurrent connections and handles the 100-user load
comfortably. Pro handles burst to 500 concurrent. At 10K users the Team tier is required for
the connection limit and the 1,000 msg/sec throughput. The 100K-user Enterprise estimate
reflects Supabase's published pricing guidance for dedicated infrastructure; actual cost
depends on negotiated contract and geographic distribution.

### Combined Monthly Cost (AI + Infrastructure)

| Scale         | AI Commands |   Supabase | Total/Month | Cost per User |
| ------------- | ----------: | ---------: | ----------: | ------------: |
| 100 users     |       $4.28 |         $0 |       $4.28 |        $0.043 |
| 1,000 users   |      $42.75 |        $25 |      $67.75 |        $0.068 |
| 10,000 users  |     $256.50 |       $599 |     $855.50 |        $0.086 |
| 100,000 users |   $1,710.00 | ~$3,500.00 |  ~$5,210.00 |        $0.052 |

Infrastructure dominates at scale. At 10K+ users, Supabase real-time costs exceed AI command
costs. At 100K, a negotiated Enterprise deal with volume discounts should push the per-user
cost below $0.05 — well within typical SaaS infrastructure budgets at that scale.

## Optimization Recommendations

### Short-term

- **Template command bypass (already implemented):** Commands that don't require LLM reasoning
  (e.g., undo, redo, zoom, color picker) are resolved client-side without any API call. At the
  50% template rate already achieved, this halves the runtime AI cost at every scale tier.
- **Response caching for repeated commands:** Cache LLM responses keyed on (system prompt hash +
  user input). Repeated "help me draw a flowchart" queries from different users hit the same
  cache entry. Estimated 15–25% hit rate for common creative prompts.
- **Trim the system prompt:** Current system prompt is ~800 tokens. Audit for redundant
  instructions and move static reference material to tool definitions. Target: 500 tokens.
  Saves $0.30/1M input tokens × all commands — meaningful at 100K-user scale.

### Medium-term

- **Anthropic prompt caching:** Cache the static prefix of the system prompt (tool definitions,
  persona, board context). Anthropic charges 10% of the normal input rate for cache reads
  (90% discount). If 700 of the 800 system-prompt tokens are cacheable, the effective input
  cost per command drops from $0.15/1M to roughly $0.045/1M on the cached portion — a ~55%
  reduction in per-command input cost overall.
- **Batch tool calls:** Group multiple canvas mutations into a single LLM round-trip. Instead
  of one call per shape operation, accumulate a 500ms window of user actions and resolve them
  in one request. Reduces total call volume without increasing per-call token count significantly.
- **Smaller system prompts with dynamic injection:** Replace the static tool-definition block
  with context-aware injection. Only include tools relevant to the current board mode (draw,
  select, AI-command). Reduces average system prompt by an estimated 200 tokens per call.

### Long-term

- **Fine-tuned smaller model for common operations:** The top 20% of AI command patterns
  account for ~80% of requests (Pareto). Fine-tune GPT-4o-mini or a comparable small model
  on these patterns. A fine-tuned model typically achieves equivalent quality at 50–70% of
  the token count by eliminating lengthy few-shot examples from the prompt. Estimated cost
  reduction: 30–40% on AI command spend at scale.
- **Tiered rate limits (free vs. paid users):** Free users receive a fixed monthly AI command
  quota (e.g., 50 commands/month). Paid users get unlimited or higher limits. Caps overall
  token burn on the free tier and creates upgrade incentive. At 100K users with a typical
  10% paid conversion, this limits free-tier AI cost exposure to roughly $153/mo while
  preserving full service for paying customers.
- **Edge caching with CDN for static AI responses:** For read-only AI queries (e.g., "what
  does this shape represent?"), cache responses at the CDN edge keyed on board content hash +
  query. Eliminates redundant LLM calls for shared boards viewed by many users simultaneously.
  Most impactful for public/read-only board links at viral scale.
- **Supabase connection pooling and regional replicas:** At 10K+ concurrent connections,
  introduce PgBouncer-style connection pooling and co-locate Supabase replicas in user regions.
  Reduces message latency (which drives retry storms that inflate msg/sec counts) and keeps
  connection counts within plan limits without over-provisioning.
