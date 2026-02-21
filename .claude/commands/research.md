# /research — Technology Research Command

**Usage:** `/research <question or decision to make>`

**Example:** `/research Which WebSocket solution should we use for real-time cursor sync: Cloudflare Durable Objects, Supabase Realtime, or Pusher?`

---

## Process

When invoked, follow these 5 steps in order:

### Step 1: State the Question

Restate the research question in one sentence. Identify: (a) what decision needs to be made, (b) what constraints apply (cost, latency, scalability, DX, existing stack).

### Step 2: Identify Options

List 2–4 realistic options. For each, note: technology name, maturity, community size, pricing model, and any known gotchas for LLM-assisted development.

### Step 3: Filter for LLM-Agent Compatibility

Rate each option on LLM-agent friendliness:

- **SDK quality:** Is the TypeScript SDK well-typed? Can Zod schemas be written for its types?
- **Documentation freshness:** Is it in LLM training data or does it need Context7/docs injection?
- **Error messages:** Are errors actionable? (LLM agents rely on error messages for self-correction)
- **Complexity:** Would an LLM agent be able to debug issues without human intervention?

### Step 4: Apply Project Constraints

Check each option against:

- Already-decided stack (check `docs/tech-stack.md`)
- Performance budgets (check `docs/architecture.md`)
- Cost constraints
- WSL2 / local dev compatibility

### Step 5: Make a Single Recommendation

Pick one. Hedging ("either X or Y works") is not acceptable. State: option chosen, why it wins, and the decisive factor.

---

## Output Format

```
## Research: <Question>

### Options Evaluated
1. **<Option A>** — <one-line summary>
2. **<Option B>** — <one-line summary>
3. **<Option C>** — <one-line summary>

### Recommendation
**Use <Option X>** because <decisive reason>.

Key benefits for this project:
- <benefit 1>
- <benefit 2>
- <benefit 3>

### Rejected Options
- **<Option A>:** <reason rejected in one sentence>
- **<Option B>:** <reason rejected in one sentence>

### Action Items
- [ ] <First concrete step to adopt the recommendation>
- [ ] <Second step>
- [ ] Update `docs/tech-stack.md` with decision and rationale
```

Save the output to `docs/research/<topic>.md` for future reference.
