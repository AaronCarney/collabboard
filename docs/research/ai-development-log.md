# AI Development Log — CollabBoard

## Overview

CollabBoard is a real-time collaborative whiteboard built with Next.js 14, Clerk auth,
Supabase (Postgres + Realtime), Canvas 2D rendering, and GPT-4o-mini AI commands via the
Vercel AI SDK. The project was built entirely with Claude Code using a two-tier agent team:
Opus as lead orchestrator, Sonnet workers for specialist implementation tasks, and Haiku for
mechanical tasks such as documentation and verification runs.

**Project scale:** 46 commits, 107 TypeScript/TSX source files, 42 test files, 445 tests total.
Development spanned 7 phases from monorepo scaffold to production-ready polish.

## Tools & Agents Used

| Tool                 | Role              | Usage                                                                                   |
| -------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| Claude Code (Opus)   | Lead orchestrator | Architecture decisions, multi-agent coordination, complex cross-cutting implementations |
| Claude Code (Sonnet) | Worker agents     | Component implementation, test writing, bug fixes, feature work                         |
| Claude Code (Haiku)  | Mechanical tasks  | Documentation generation, verification runs, commit messages                            |
| GitHub MCP           | Code operations   | PR management, code search across files, commit history                                 |
| Supabase MCP         | Database ops      | Schema inspection, RLS policy authoring and debugging                                   |
| context7 MCP         | Docs lookup       | Vercel AI SDK, Next.js 14, Supabase Realtime API references                             |

## MCP Server Usage

- **github** — PR creation, issue management, searching code patterns across the monorepo,
  retrieving file contents without round-tripping through the shell
- **supabase** — Live database schema inspection during RLS policy design, verifying
  migrations applied correctly, debugging row-level security failures in development
- **context7** — Library documentation lookup for Vercel AI SDK streaming conventions,
  Supabase Realtime channel lifecycle, Clerk server-side auth helpers. Eliminated most
  hallucinated API calls that would otherwise surface only at runtime.

Only 2-3 MCP servers were kept active at any time to preserve context window budget.
Servers were rotated by task: database-heavy phases activated Supabase MCP; AI integration
phases activated context7 for SDK docs.

## Prompt Patterns That Worked

### TDD-First Prompting

Every implementation prompt began with: "Write failing tests first, then implement to make
them pass." This was enforced as a hard rule in CLAUDE.md, not a suggestion.

The impact was measurable: tests were written before any implementation file existed,
which forced agents to think in terms of contracts and interfaces rather than jumping
straight to code. When a test file existed first, implementation scope was automatically
bounded — agents could not add extra surface area without a corresponding test failing.
Regressions across phases were caught immediately by the existing suite rather than
accumulating into integration debt.

Concretely, the Canvas phase (Phase 2) produced approximately 150 tests covering object
types, renderers, spatial indexing, and transform math. Because these existed before any
renderer was written, the real-time layer (Phase 3) could integrate canvas state without
breaking any drawing behavior. The test suite acted as a specification that agents in later
phases could consult without needing to re-read earlier implementation files.

### File Ownership in Multi-Agent Sessions

Each specialist agent was given exclusive file glob ownership at spawn time. For example,
during Phase 6 (Polish), the keyboard-shortcuts agent owned `apps/web/src/hooks/useShortcuts*`
and `apps/web/src/components/KeyboardShortcutsDialog*`; the property-panel agent owned
`apps/web/src/components/PropertyPanel*`. No globs overlapped.

The result was zero merge conflicts across the entire project. Without file ownership, two
agents writing to the same component file at the same time is guaranteed to produce
conflicts that require human resolution. With ownership enforced at spawn time, agents
worked fully in parallel without coordination overhead.

The trade-off is that glob planning adds 5-10 minutes of orchestrator time at the start of
each multi-agent session. For sessions longer than 30 minutes this is always worth it.

### Specification-Driven Features

Features estimated at more than one hour of implementation time received a spec file in
`docs/specs/<name>.md` with explicit acceptance criteria before any code was written. The
AI command router (Phase 4) and the sharing system (Phase 5) both followed this pattern.

Writing acceptance criteria first prevented scope creep in both directions: agents could
not add unrequested features (gold-plating), and they could not omit required behaviors and
call the task done. When an agent's output was reviewed against the spec checklist, gaps
were immediately obvious rather than discovered in QA.

The share-links spec, for instance, called out token validation, expiry handling, view vs.
edit permission enforcement, and URL generation as separate acceptance criteria. The
implementing agent addressed each one explicitly. Without the spec, token validation and
expiry were the two items most likely to be treated as optional by an agent under implicit
time pressure.

## Code Generation Metrics

| Phase                 | Files Generated | Tests Generated | Manual Edits Required |
| --------------------- | --------------- | --------------- | --------------------- |
| Phase 1: Foundation   | ~20             | ~20             | Low (auth wiring)     |
| Phase 2: Canvas       | ~30             | ~150            | Low (renderer math)   |
| Phase 3: Real-time    | ~10             | ~20             | Medium (dual-client)  |
| Phase 4: AI           | ~15             | ~40             | Medium (route auth)   |
| Phase 5: Sharing      | ~10             | ~15             | Low                   |
| Phase 6: Polish       | ~20             | ~80             | Low                   |
| Phase 7: Final Polish | ~2              | 0               | High (wiring + lint)  |

Manual edits were concentrated in two areas: integration wiring (connecting UI components
to API routes that existed independently) and ESLint compliance fixes that agents
consistently missed. Phase 7 was almost entirely human-directed cleanup rather than new
generation.

## Strengths Observed

**Test coverage from day one.** Enforcing TDD as a hard rule in CLAUDE.md rather than a
suggestion meant that coverage was high before any phase was declared complete. The 445
tests across 42 files represent genuine behavioral coverage, not post-hoc tests written to
satisfy a coverage metric. Regressions from one phase to the next were caught
automatically.

**Real-time architecture correct on first attempt.** The dual-client pattern — an
authenticated Supabase client for database writes and an anonymous broadcast client for
presence and cursor sync — was designed in the Phase 3 spec and implemented without
requiring architectural revision. This is atypical; real-time systems usually require
at least one fundamental redesign. The context7 MCP providing accurate Supabase Realtime
documentation is the most likely reason the first attempt was structurally sound.

**Parallel agent execution scaled cleanly.** Running 3-5 Sonnet workers concurrently with
file ownership enforced consistently produced correct parallel output. The orchestrator's
coordination overhead (writing task manifests, reading agent verdicts) was manageable
within Opus's context budget for sessions up to 2 hours.

**Template commands bypass LLM entirely.** The AI command system supports named templates
(SWOT analysis, Kanban board, retrospective, etc.) that expand into pre-defined object
layouts without hitting the GPT-4o-mini API. This design decision — made in the Phase 4
spec — eliminates latency, cost, and hallucination risk for the common case where the
user wants a known layout. The GPT-4o-mini path is reserved for free-form natural language
commands where template matching fails.

**Monorepo structure held across all phases.** The initial scaffold decision (Turborepo,
three packages: `web`, `realtime`, `ui`) remained valid from Phase 1 through Phase 7
without restructuring. Agents respected the package boundaries consistently.

## Limitations Encountered

**ESLint rule compliance was consistently poor across agents.** Sonnet workers repeatedly
missed four rules despite CLAUDE.md listing them explicitly:

1. Explicit return types on all exported functions
2. No non-null assertions (`!`) — use type guards or nullish coalescing instead
3. No void arrow returns — use braces
4. Vitest imports must be explicit (not relying on globals)

The pattern was consistent enough that these rules were added as a dedicated section in
CollabBoard's CLAUDE.md. Even then, agents acknowledged the rules at the start of a task
and violated them mid-file. The root cause appears to be that ESLint rules are low-salience
to agents when they are focused on functional correctness — the rules feel like style
preferences rather than build-breaking errors.

**lint-staged runs project-wide, not just staged files.** The lint-staged configuration
runs ESLint on all TypeScript files in the project whenever any file is staged. Agents
frequently passed their local file's lint check and then failed pre-commit because an
unrelated file they had touched earlier in the session still had violations. This caused
unexpected commit failures that agents attributed to their current changes rather than
the actual source.

**Integration wiring gaps between independently correct components.** The most significant
example: the AI command bar UI and the `/api/ai/command` route both existed and were
individually correct, but `handleAiSubmit` in the command bar was a no-op stub. The UI
and API were built by different agents in different sessions with file ownership preventing
overlap — neither agent's scope included the wiring between them. This class of gap is
predictable in multi-agent development and requires an explicit integration task or an
orchestrator review pass before any phase is marked complete.

**Agent context degradation after 4+ tasks.** Agents that ran for more than 3 tasks within
a single session produced progressively lower quality output: missed edge cases, ignored
CLAUDE.md rules they had correctly followed earlier, and occasionally produced code that
contradicted earlier decisions in the same session. The fix is enforced agent rotation —
shut down after 2-3 tasks, spawn a fresh agent with a clean context summary — but this
requires the orchestrator to track task counts actively.

**Haiku was too weak for non-trivial verification.** Assigning verification runs (typecheck,
lint, test) to Haiku worked correctly as a mechanical executor, but when verification
failed, Haiku's diagnosis of the failure was often incorrect or incomplete. Verification
runs that produced failures needed to be escalated to Sonnet for root cause analysis.

## Key Learnings

**Agent context limits are a hard constraint, not a soft guideline.** The 2-3 task limit
per agent is not conservative — it reflects a real degradation curve. An agent that
correctly follows CLAUDE.md rules on task 1 will miss them on task 4. Enforcing rotation
is an orchestrator responsibility that must be built into the session plan, not treated as
a contingency.

**File ownership is necessary but not sufficient.** Ownership prevents conflicts but does
not prevent integration gaps. Every multi-agent session needs an explicit integration
review task at the end, owned by the orchestrator or a dedicated integration agent, that
verifies all independently built components are wired together.

**TDD prevents compounding technical debt across phases.** Each phase in CollabBoard built
on the previous phase's output. Without a test suite, regressions introduced in Phase 3
would not surface until Phase 5 or 6, at which point the blast radius is large and the
fix requires understanding multiple phases of context. With TDD enforced, regressions were
caught within the same session that introduced them.

**MCP servers eliminate a category of hallucination.** context7 providing accurate
Supabase Realtime and Vercel AI SDK documentation eliminated most API hallucinations in
Phases 3 and 4. Without it, agents default to plausible-but-wrong API shapes that compile
but fail at runtime. The 15-minute cost of rotating MCPs is substantially less than the
cost of debugging hallucinated API usage.

**Pre-commit hooks are the last reliable defense.** Hooks running `pnpm lint && pnpm test`
before every commit caught failures that agents missed and that code review would have
had to catch manually. The hooks were the reason Phase 7 cleanup was bounded — every
commit that landed was verified. Hooks should be installed on day one, not added as a
polish step.

**Specs prevent scope creep in both directions.** Without a spec, agents tend to
under-implement (omitting edge cases they were not explicitly asked about) or over-implement
(adding features that seem adjacent and useful). A spec with explicit acceptance criteria
bounds the implementation surface exactly. The cost is 20-30 minutes of spec writing; the
benefit is predictable output and a checklist for review.
