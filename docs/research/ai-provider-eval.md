# AI Provider Evaluation — Phase 4A

**Date:** 2026-02-19
**Evaluator:** phase1-fix agent (desk research — no API keys available)
**Method:** Published benchmarks, pricing docs, Vercel AI SDK compatibility analysis

---

## 1. Model Requirements (derived from codebase)

| Requirement         | Threshold                                                       | Why                                                                                               |
| ------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Structured output   | Valid JSON matching Zod tool-call schemas                       | `boardObjectSchema` uses `z.discriminatedUnion("type", [...])` — invalid JSON breaks the pipeline |
| Tool calling        | Vercel AI SDK `generateText`/`streamText` with tool definitions | Architecture uses `@ai-sdk/*` provider packages                                                   |
| Latency             | <2s total (<800ms LLM portion)                                  | UX requirement; template bypass handles <1.5s patterns                                            |
| Context window      | 50-100K tokens (500 objects serialized + system prompt + tools) | Full board state passed as context                                                                |
| Cost ceiling        | Viable at 50K calls/month                                       | 10K users x 5 commands/user/month                                                                 |
| Multi-step chaining | 3-5 sequential tool calls                                       | SWOT template = 4-5 creates + positioning                                                         |
| Coordinate accuracy | Valid x/y/width/height numbers, valid colors                    | Hallucinated values break canvas rendering                                                        |

---

## 2. Candidates Evaluated

### 2A. OpenAI GPT-4o-mini (`@ai-sdk/openai`)

| Attribute              | Value                                              |
| ---------------------- | -------------------------------------------------- |
| Input cost             | $0.15 / 1M tokens                                  |
| Output cost            | $0.60 / 1M tokens                                  |
| Context window         | 128K tokens                                        |
| Avg latency (TTFT)     | ~210ms                                             |
| Avg total latency      | ~520ms                                             |
| Structured output      | Native JSON mode + function calling                |
| Tool calling           | Excellent — mature, well-tested with Vercel AI SDK |
| Multi-step reliability | Good — reliable sequential tool execution          |

**Strengths:**

- Cheapest output pricing ($0.60/1M) — at 50K calls/month with ~500 output tokens/call = ~$15/month
- Fastest average latency (~520ms total)
- Most mature tool calling implementation, extensively tested with Vercel AI SDK
- Native structured output mode ensures valid JSON

**Weaknesses:**

- Lower instruction-following accuracy compared to Haiku 4.5 in complex multi-step scenarios
- 128K context fits our needs but is smallest of the three

### 2B. Anthropic Claude Haiku 4.5 (`@ai-sdk/anthropic`)

| Attribute              | Value                                               |
| ---------------------- | --------------------------------------------------- |
| Input cost             | $1.00 / 1M tokens                                   |
| Output cost            | $5.00 / 1M tokens                                   |
| Context window         | 200K tokens                                         |
| Avg latency (TTFT)     | ~280ms                                              |
| Avg total latency      | ~680ms                                              |
| Structured output      | Tool use with JSON output                           |
| Tool calling           | Excellent — parallel/interleaved patterns supported |
| Multi-step reliability | Best — highest agentic workflow reliability         |

**Strengths:**

- Best multi-step/agentic reliability (73.3% SWE-bench, strong tool orchestration)
- Largest context window (200K) — handles large board states easily
- Extended thinking available for complex spatial reasoning
- 90% cost savings with prompt caching (board state context is highly cacheable)
- Parallel tool calling patterns

**Weaknesses:**

- Most expensive base pricing — output at $5/1M = ~$125/month at 50K calls (before caching)
- Slightly higher latency than GPT-4o-mini (~680ms vs ~520ms)
- With prompt caching: effective cost drops significantly (board state prompt is reused per-board)

### 2C. Google Gemini 2.5 Flash (`@ai-sdk/google`)

| Attribute                | Value                                     |
| ------------------------ | ----------------------------------------- |
| Input cost               | $0.30 / 1M tokens                         |
| Output cost              | $2.50 / 1M tokens                         |
| Context window           | 1M tokens                                 |
| Avg latency (throughput) | 200+ tokens/sec                           |
| Structured output        | JSON mode supported                       |
| Tool calling             | Good — supported via Vercel AI SDK        |
| Multi-step reliability   | Good but less proven for agentic patterns |

**Strengths:**

- Largest context window (1M tokens) — massive headroom
- High throughput (200+ tokens/sec)
- Middle-ground pricing ($2.50/1M output = ~$62/month at 50K calls)
- Free tier available for development/testing

**Weaknesses:**

- Less mature tool calling ecosystem compared to OpenAI/Anthropic
- Fewer production case studies for agentic tool-calling workflows
- Vercel AI SDK support is newer, potentially more edge cases

---

## 3. Scoring Matrix

Weights: Latency 30%, Structured Output Accuracy 30%, Cost 20%, Multi-step Reliability 20%

| Criterion (weight)          | GPT-4o-mini             | Claude Haiku 4.5                  | Gemini 2.5 Flash         |
| --------------------------- | ----------------------- | --------------------------------- | ------------------------ |
| **Latency (30%)**           | 9/10 (~520ms)           | 7/10 (~680ms)                     | 8/10 (high throughput)   |
| **Structured output (30%)** | 8/10 (native JSON mode) | 9/10 (best instruction following) | 7/10 (good, less proven) |
| **Cost (20%)**              | 10/10 ($0.60/1M out)    | 5/10 ($5/1M out, 8/10 w/ caching) | 7/10 ($2.50/1M out)      |
| **Multi-step (20%)**        | 7/10 (reliable)         | 9/10 (best agentic)               | 6/10 (less proven)       |
| **Weighted total**          | **8.3**                 | **7.6 (8.2 w/ caching)**          | **7.0**                  |

---

## 4. Cost Projection (50K calls/month)

Assumptions: ~2K input tokens/call (system prompt + board context), ~500 output tokens/call

| Provider         | Input cost | Output cost | Monthly total | With caching                          |
| ---------------- | ---------- | ----------- | ------------- | ------------------------------------- |
| GPT-4o-mini      | $15        | $15         | **$30**       | ~$20                                  |
| Claude Haiku 4.5 | $100       | $125        | **$225**      | ~$50 (90% cache hit on board context) |
| Gemini 2.5 Flash | $30        | $62         | **$92**       | ~$60                                  |

---

## 5. Recommendation

### Winner: GPT-4o-mini (`@ai-sdk/openai`)

**Rationale:**

1. **Cost leadership:** 3-7x cheaper than alternatives at scale. At $30/month for 50K calls, cost is negligible.

2. **Lowest latency:** ~520ms average keeps us well within the <2s total budget (auth + DB fetch + LLM + persist + broadcast = ~800-1100ms total).

3. **Mature tool calling:** Most battle-tested with Vercel AI SDK. Native JSON mode guarantees valid structured output matching our Zod schemas.

4. **Good enough multi-step:** While Haiku 4.5 scores higher on agentic benchmarks, GPT-4o-mini is reliable for our 3-5 tool call chains. Our template bypass handles the most complex patterns (SWOT, Kanban) without LLM anyway (~100ms).

5. **128K context is sufficient:** Our largest board (500 objects) serializes to ~50-100K tokens, fitting within GPT-4o-mini's window.

**Runner-up: Claude Haiku 4.5** — superior agentic reliability and instruction following. Consider switching if GPT-4o-mini's multi-step accuracy proves insufficient in production. Vercel AI SDK makes provider swap trivial (change one import + model ID).

**Risk mitigation:**

- Template bypass for SWOT/Kanban/retro runs in ~100ms without any LLM — covers the most complex multi-step patterns
- Vercel AI SDK provider abstraction means switching providers requires changing ~3 lines of code
- Monitor via LangFuse: if structured output accuracy drops below 90%, evaluate Haiku 4.5

---

## 6. Action Items

1. Set `OPENAI_API_KEY` in `.env.local`
2. Update `architecture.md` stack table: AI row = "OpenAI GPT-4o-mini via Vercel AI SDK"
3. Update `docs/tech-stack.md` AI features row
4. Proceed to Phase 4B implementation with `@ai-sdk/openai` as primary provider
5. Wire LangFuse monitoring (Phase 4C) to track accuracy and cost in production

---

## Sources

- [OpenAI GPT-4o-mini pricing](https://openai.com/api/pricing/)
- [Claude Haiku 4.5 pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Claude Haiku 4.5 capabilities](https://www.anthropic.com/claude/haiku)
- [Vercel AI SDK](https://ai-sdk.dev/docs/introduction)
- [GPT-4o-mini performance analysis](https://artificialanalysis.ai/models/gpt-4o-mini)
- [Claude Haiku 4.5 performance analysis](https://artificialanalysis.ai/models/claude-4-5-haiku)
- [Fast model comparison (GPT-5 mini vs Gemini 3 Flash vs Claude 4.5 Haiku)](https://www.keywordsai.co/blog/fast-model-comparison)
- [LLM benchmarks Feb 2026](https://lmcouncil.ai/benchmarks)
