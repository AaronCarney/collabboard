# Next Session Prompt

Copy-paste everything below the line into a new Claude Code session from the collabboard directory.

---

Write `docs/submission-guide.md` — a single document I follow start-to-finish to complete and submit CollabBoard. Every step I need to take must be in this document with precise, copy-pasteable instructions. No ambiguity, no "refer to X doc" — inline everything.

Human tasks are currently scattered across multiple files and I shouldn't have to jump between them. Consolidate everything into one ordered guide.

Read these source files to understand what's done and what remains:

- `docs/project_collaborative_whiteboard.md` — the assignment spec with submission requirements table and grading criteria. Every deliverable listed there must map to a step in the guide.
- `docs/plans/completion-plan.md` — work items and human-only section at the bottom.
- `docs/guides/observability-setup.md` — LangFuse and LangSmith setup. Both are confirmed going in. Inline the account creation, key retrieval, and env var steps directly into the guide (don't link out to the separate doc).
- `docs/social-post-draft.md` — inline both drafts (X and LinkedIn) into the guide so I can copy-paste directly.
- `docs/ai-development-log.md` — I need to review this and add personal voice. Include specific callouts for what to personalize (e.g., "rewrite the Overview paragraph in your own words", "add a personal anecdote to Key Learnings").
- `docs/research/ai-provider-eval.md` — summarize the three model options with the recommendation so I can decide without reading the full eval.
- `apps/web/src/lib/ai/command-router.ts:84` — if the model changes, include the exact code diff.
- `README.md` — check if the deployed URL is present. If not, include the exact edit.

What's already done (do not repeat):

- All feature code complete, 445 tests passing, verification gate green
- Auto-deploying from `main` via Vercel (project: `collabboard-web`)
- Clerk, Supabase, OpenAI, Upstash keys all configured in `.env.local` and Vercel
- Graded docs written: AI dev log, cost analysis, social post draft, pre-search

Guide format requirements:

1. Numbered steps in execution order. Decisions first, then setup, then content, then verification.
2. Every step is self-contained. Include exact URLs, exact env var names, exact values or where to find them. I should never need to open another file.
3. Include the social post text inline — both X and LinkedIn versions, ready to copy-paste and personalize.
4. Include a demo video script — the assignment requires 3-5 minutes showing real-time collab, AI commands, and architecture. Write a shot-by-shot outline with suggested talking points and timing.
5. End with a final verification checklist — map every line from the submission requirements table in the assignment spec to a "done / not done" checkbox.
6. For any Claude-automatable steps (install packages, update code, commit), write them as `Run in Claude Code: [exact prompt]` so I can delegate without context-setting.

Do NOT implement any code changes — this is a documentation task only. Write the guide, then commit and push it.
