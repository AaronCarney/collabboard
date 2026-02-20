# Observability Setup: LangFuse & LangSmith

CollabBoard ships with optional AI observability via LangFuse and LangSmith. Both trace every AI command — latency, token usage, errors, cost tracking. They are disabled by default and activate only when their respective env vars are configured.

## Part 1: LangFuse Setup

LangFuse is open-source LLM observability.

### Step 1: Create an account

1. Go to **https://cloud.langfuse.com**
2. Sign up (GitHub/Google/email)

### Step 2: Create a project

1. Click **"New Project"**
2. Name it `collabboard`
3. Select the region closest to your Vercel deployment (US East if on `iad1`)

### Step 3: Get your API keys

1. In your project, go to **Settings → API Keys**
2. Click **"Create new API keys"**
3. You'll get three values:
   - **Secret Key** (starts with `sk-lf-...`)
   - **Public Key** (starts with `pk-lf-...`)
   - **Host** (e.g., `https://cloud.langfuse.com`)
4. Save these — the secret key is only shown once

### Step 4: Add to Vercel

1. Go to your Vercel project dashboard → **Settings → Environment Variables**
2. Add:
   - `LANGFUSE_SECRET_KEY` = your secret key
   - `LANGFUSE_PUBLIC_KEY` = your public key
   - `LANGFUSE_HOST` = `https://cloud.langfuse.com`
3. Apply to **Production** (and Preview/Development if you want tracing there too)

### Step 5: Install the package

```bash
cd apps/web
pnpm add langfuse
```

Commit and push.

---

## Part 2: LangSmith Setup

LangSmith is LangChain's tracing/evaluation platform.

### Step 1: Create an account

1. Go to **https://smith.langchain.com**
2. Sign up (GitHub/Google/email)

### Step 2: Create a project

1. Click **"New Project"** in the left sidebar
2. Name it `collabboard`

### Step 3: Get your API key

1. Click your **profile icon → Settings → API Keys**
2. Click **"Create API Key"**
3. Copy the key (starts with `lsv2_...` or similar)
4. Note your project name from step 2

### Step 4: Add to Vercel

1. Go to your Vercel project dashboard → **Settings → Environment Variables**
2. Add:
   - `LANGCHAIN_API_KEY` = your API key
   - `LANGCHAIN_PROJECT` = `collabboard`
   - `LANGCHAIN_TRACING_V2` = `true`
3. Apply to **Production** (and Preview/Development if desired)

### Step 5: Install the package

```bash
cd apps/web
pnpm add langsmith
```

Commit and push.

---

## Part 3: Verify

After both are set up and deployed:

1. Open your deployed CollabBoard
2. Run an AI command on a board (triggers `/api/ai/command`)
3. Check **LangFuse dashboard** — look for a trace named `ai-command:<type>` with token usage and latency
4. Check **LangSmith dashboard** — look for a run with the same data

Both platforms have free tiers sufficient for development and moderate production use.

## Architecture Reference

The observability code lives in:

- `apps/web/src/lib/ai/observability/instrument.ts` — entry point, fans out to providers
- `apps/web/src/lib/ai/observability/langfuse.ts` — LangFuse provider
- `apps/web/src/lib/ai/observability/langsmith.ts` — LangSmith provider

Both use dynamic `import()` wrapped in try/catch so the app works without the packages installed. The `next.config.js` marks them as webpack externals to avoid build failures.
