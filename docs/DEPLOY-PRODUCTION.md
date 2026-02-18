# CollabBoard Production Deployment Guide

Domain: `collabboard.aaroncarney.me`
Registrar: Hostinger
Host: Vercel
Auth: Clerk
Database: Supabase

---

## Prerequisites

- Hostinger account with DNS access for `aaroncarney.me`
- Vercel account with `collabboard-web` project
- Clerk account (currently using dev instance `valued-albacore-88`)
- Supabase project (stays the same)

---

## Phase 1: Clerk Production Instance

Do this first because Clerk generates DNS records you'll add alongside the Vercel ones.

### 1.1 Create the production instance

1. Go to https://dashboard.clerk.com
2. In the top-left sidebar, click the instance selector (it says "Development")
3. Click **"Create production instance"**
4. It will ask for your **Application domain** — enter: `collabboard.aaroncarney.me`
5. Choose **"Clone from development"** — this copies your auth settings (email/password, etc.)
6. You are now in the production instance context

### 1.2 Configure paths

1. Go to **Configure > Paths**
2. For each component, choose **"page on application domain"** (not Account Portal)
3. Set:
   - **SignIn:** `https://collabboard.aaroncarney.me/sign-in`
   - **SignUp:** `https://collabboard.aaroncarney.me/sign-up`
   - **Signing Out:** `https://collabboard.aaroncarney.me/sign-in`
4. If there are after-auth redirect settings:
   - **After sign-in:** `https://collabboard.aaroncarney.me/dashboard`
   - **After sign-up:** `https://collabboard.aaroncarney.me/dashboard`
5. Save

> Paths do NOT copy from development. You must set them again.
> Clerk requires full URLs on your domain, not just paths.

### 1.3 Note the DNS records

1. Go to **Configure > Domains**
2. Clerk already knows your domain from step 1.1. It displays a **DNS Configuration** section showing 5 records to verify.
3. **Keep this tab open** — you'll add these records in Phase 2.

The records Clerk shows are:

| #   | Purpose          | Type         | Name                   | Target                        |
| --- | ---------------- | ------------ | ---------------------- | ----------------------------- |
| 1   | Frontend API     | CNAME        | `clerk.collabboard`    | `frontend-api.clerk.services` |
| 2   | Account Portal   | CNAME        | `accounts.collabboard` | `accounts.clerk.services`     |
| 3-5 | Email (DKIM/SPF) | CNAME or TXT | (scroll down to see)   | (from Clerk dashboard)        |

> Scroll down on the Domains page to see all 5 records. Copy the exact values.

### 1.4 Copy your production API keys

1. Go to **Configure > API Keys**
2. Copy:
   - **Publishable key** — starts with `pk_live_`
   - **Secret key** — starts with `sk_live_` <!-- noqa: secret -->
3. Save these somewhere secure. You'll add them to Vercel in Phase 4.

### 1.5 Re-configure OAuth providers (if applicable)

SSO connections do NOT copy credentials from development. You should see GitHub listed but it needs your own OAuth credentials. We'll also add Google.

#### 1.5a — GitHub OAuth

**Create the GitHub OAuth App:**

1. Go to https://github.com/settings/developers
2. Click **OAuth Apps** > **New OAuth App**
3. Fill in:
   - **Application name:** `CollabBoard`
   - **Homepage URL:** `https://collabboard.aaroncarney.me`
   - **Authorization callback URL:** `https://clerk.collabboard.aaroncarney.me/v1/oauth_callback`
4. Click **Register application**
5. Copy the **Client ID**
6. Click **Generate a new client secret** and copy it immediately (you can't see it again)

**Enter credentials in Clerk:**

1. In Clerk, go to **Configure > SSO connections**
2. Click on the **GitHub** connection
3. Toggle on **"Use custom credentials"** if not already on
4. Enter the **Client ID** and **Client Secret**
5. Save

#### 1.5b — Google OAuth

**Create the Google OAuth App:**

1. Go to https://console.cloud.google.com/apis/credentials
2. Create a project if you don't have one (name it `CollabBoard`)
3. Click **Create Credentials** > **OAuth client ID**
4. If prompted, configure the **OAuth consent screen** first:
   - User type: **External**
   - App name: `CollabBoard`
   - User support email: your email
   - Authorized domains: `aaroncarney.me`
   - Developer contact email: your email
   - Save and continue through Scopes (defaults are fine) and Test users
5. Back at Create Credentials > OAuth client ID:
   - Application type: **Web application**
   - Name: `CollabBoard`
   - **Authorized JavaScript origins:** `https://collabboard.aaroncarney.me`
   - **Authorized redirect URIs:** `https://clerk.collabboard.aaroncarney.me/v1/oauth_callback`
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

**Publish the OAuth app (required for production):**

1. Go to **OAuth consent screen** in Google Cloud Console
2. Click **Publish App** to move from "Testing" to "In production"
3. If Google asks for verification, you can proceed — basic scopes (email/profile) usually don't require full review

> If you skip this, only 100 test users can sign in with Google.

**Enter credentials in Clerk:**

1. In Clerk, go to **Configure > SSO connections**
2. Click **Add connection** > **For all users** > **Google**
3. Toggle on **"Enable for sign-up and sign-in"**
4. Toggle on **"Use custom credentials"**
5. Enter the **Client ID** and **Client Secret**
6. Save

#### 1.5c — Discord (optional, easy to add)

If you want Discord login:

**Create a Discord OAuth App:**

1. Go to https://discord.com/developers/applications
2. Click **New Application**, name it `CollabBoard`
3. Go to **OAuth2** in the sidebar
4. Copy the **Client ID**
5. Click **Reset Secret** and copy the **Client Secret**
6. Under **Redirects**, add: `https://clerk.collabboard.aaroncarney.me/v1/oauth_callback`
7. Save

**Enter credentials in Clerk:**

1. In Clerk, **Add connection** > **For all users** > **Discord**
2. Toggle on **"Enable for sign-up and sign-in"** and **"Use custom credentials"**
3. Enter the **Client ID** and **Client Secret**
4. Save

---

## Phase 2: Hostinger DNS Configuration

You'll add records for both Vercel (hosting) and Clerk (auth) in one session.

### 2.1 Open the DNS editor

1. Go to https://hpanel.hostinger.com
2. In the left sidebar, click **Domains** > **Domain Portfolio**
3. Click **Manage** next to `aaroncarney.me`
4. Click **DNS / Nameservers** in the sidebar
5. Click **DNS Records**

> Your domain must be using Hostinger's nameservers for this to work. If you moved nameservers elsewhere, manage DNS at that provider instead.

### 2.2 Add the Vercel CNAME record

This points `collabboard.aaroncarney.me` to your Vercel deployment.

| Field  | Value                   |
| ------ | ----------------------- |
| Type   | CNAME                   |
| Name   | `collabboard`           |
| Target | `cname.vercel-dns.com`  |
| TTL    | 14400 (default is fine) |

Click **Add Record**.

### 2.3 Add Clerk DNS records

Add all 5 records from the Clerk Domains page (Phase 1.3):

**Record 1 — Frontend API**
| Field | Value |
|-------|-------|
| Type | CNAME |
| Name | `clerk.collabboard` |
| Target | `frontend-api.clerk.services` |
| TTL | 14400 |

**Record 2 — Account Portal**
| Field | Value |
|-------|-------|
| Type | CNAME |
| Name | `accounts.collabboard` |
| Target | `accounts.clerk.services` |
| TTL | 14400 |

**Records 3-5 — Email (DKIM/SPF)**
Scroll down on the same Clerk **Configure > Domains** page, below the Frontend API and Account Portal sections. The remaining 3 records are listed there. They are likely CNAME records for DKIM signing. Copy each Name and Target value exactly into Hostinger.

> In Hostinger, only enter the subdomain part for the Name field. For example, if Clerk says the name is `clk._domainkey.collabboard.aaroncarney.me`, enter just `clk._domainkey.collabboard` — Hostinger appends `.aaroncarney.me` automatically.

### 2.4 Wait for propagation

- Usually takes **5-30 minutes**, can take up to 24 hours
- Check propagation at https://dnschecker.org:
  - Search `collabboard.aaroncarney.me` type CNAME — should show `cname.vercel-dns.com`
  - Search `clerk.collabboard.aaroncarney.me` type CNAME — should show `frontend-api.clerk.services`

### 2.5 Validate in Clerk

1. Return to the Clerk Dashboard > **Configure > Domains**
2. Clerk auto-checks or has a **Validate** button — click it
3. Wait for all 5 records to show green checkmarks
4. Once validated, Clerk provisions SSL certificates for its subdomains

> If validation fails, double-check that you didn't include the full domain in the Name field. `clerk.collabboard` is correct, `clerk.collabboard.aaroncarney.me` is wrong (Hostinger appends it).

---

## Phase 3: Vercel Domain Setup

### 3.1 Add the domain in Vercel

1. Go to https://vercel.com/dashboard
2. Click on your **collabboard-web** project
3. Go to **Settings** > **Domains**
4. Type `collabboard.aaroncarney.me` and click **Add**
5. Vercel checks DNS. Since you added the CNAME in Phase 2.2, it should verify quickly.
6. Wait for the green **"Valid Configuration"** status
7. Vercel automatically provisions an SSL certificate via Let's Encrypt

### 3.2 Verify in browser

Open https://collabboard.aaroncarney.me — the page should load (auth will still fail until Phase 4, but you should see HTML, not a DNS error).

---

## Phase 4: Update Environment Variables

### 4.1 Update Vercel env vars

1. Go to your Vercel project > **Settings** > **Environment Variables**
2. **Update** these variables. Scope each to **Production** environment:

| Variable                            | New Value                            |
| ----------------------------------- | ------------------------------------ | --------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` (from Phase 1.4)       |
| `CLERK_SECRET_KEY`                  | `sk_live_...` (from Phase 1.4)       | <!-- noqa: secret --> |
| `NEXT_PUBLIC_APP_URL`               | `https://collabboard.aaroncarney.me` |

3. **Verify** these variables exist (no changes needed):

| Variable                        | Value                                      |
| ------------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in`                                 |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up`                                 |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://tykzscnjfrrgvdibnlek.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (existing value)                           |
| `SUPABASE_SERVICE_ROLE_KEY`     | (existing value)                           |

4. Optional: keep the dev keys scoped to **Preview** and **Development** environments so preview deploys still work with the Clerk dev instance. <!-- noqa: secret -->

### 4.2 Redeploy

1. In Vercel, go to the **Deployments** tab
2. Find the latest deployment, click the **...** menu, and select **Redeploy**
3. Wait for the build to complete

> You MUST redeploy after changing `NEXT_PUBLIC_*` variables — they are baked into the JS bundle at build time. Changing them in the dashboard without redeploying has no effect.

---

## Phase 5: Verify Everything Works

### 5.1 Test the auth flow

1. Open https://collabboard.aaroncarney.me in an **incognito window**
2. You should be redirected to `/sign-in` and see the Clerk sign-in widget
3. Create a new account (production has separate users from development)
4. You should be redirected to `/dashboard`
5. Create a board and verify the canvas loads

### 5.2 Test multiplayer

1. Open the same board URL in two browser windows (or one incognito)
2. Verify:
   - Both users appear in the presence bar
   - Moving cursor in one window shows the cursor in the other
   - Creating/moving objects syncs between windows

### 5.3 Check for errors

- Open browser DevTools (F12) > Console — should be clean
- Check Vercel > project > **Logs** for any server-side errors

---

## Troubleshooting

### Blank page after deploy

- Check browser console (F12) for JS errors
- Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_live_` (not `pk_test_`)
- Make sure you redeployed AFTER setting the env vars

### Clerk sign-in widget doesn't appear

- Check that all 5 Clerk DNS records are validated (green checkmarks in Clerk dashboard)
- Check that SSL certificates were deployed in Clerk dashboard
- Verify the publishable key matches the production instance (not development)

### "dev-browser-missing" in response headers

- You're still using `pk_test_` keys. Switch to `pk_live_` production keys and redeploy.

### Domain shows Vercel 404

- Make sure the domain is added in Vercel project Settings > Domains with green status
- Make sure the CNAME record points to `cname.vercel-dns.com`
- Check DNS propagation at https://dnschecker.org

### Clerk redirect loop

- Verify paths are configured in Clerk production dashboard (Phase 1.2)
- Make sure all three paths use full URLs (`https://collabboard.aaroncarney.me/...`)
- Verify `NEXT_PUBLIC_CLERK_SIGN_IN_URL` is `/sign-in` in Vercel env vars

### Supabase queries return empty

- Supabase config doesn't change between dev and prod — same project, same keys
- Check RLS policies on `boards` and `board_objects` tables in Supabase dashboard
- Verify the Supabase env vars exist in Vercel for the Production environment

### DNS records not validating

- Propagation can take up to 24 hours (usually much faster)
- In Hostinger, enter only the subdomain part for Name (e.g., `clerk.collabboard` not the full domain)
- Check https://dnschecker.org to see if the record has propagated globally
- Hostinger has a DNS History feature if you need to roll back

---

## Reference: All DNS Records on Hostinger for aaroncarney.me

| #   | Type      | Name                   | Target/Value                  | Purpose                  |
| --- | --------- | ---------------------- | ----------------------------- | ------------------------ |
| 1   | CNAME     | `collabboard`          | `cname.vercel-dns.com`        | Vercel hosting           |
| 2   | CNAME     | `clerk.collabboard`    | `frontend-api.clerk.services` | Clerk Frontend API       |
| 3   | CNAME     | `accounts.collabboard` | `accounts.clerk.services`     | Clerk Account Portal     |
| 4   | CNAME     | (from Clerk)           | (from Clerk)                  | Clerk DKIM #1            |
| 5   | CNAME     | (from Clerk)           | (from Clerk)                  | Clerk DKIM #2            |
| 6   | TXT/CNAME | (from Clerk)           | (from Clerk)                  | Clerk email verification |

## Reference: All Vercel Environment Variables

| Variable                            | Value                                      | Scope      |
| ----------------------------------- | ------------------------------------------ | ---------- | --------------------- |
| `NEXT_PUBLIC_APP_URL`               | `https://collabboard.aaroncarney.me`       | Production |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...`                              | Production |
| `CLERK_SECRET_KEY`                  | `sk_live_...`                              | Production | <!-- noqa: secret --> |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`     | `/sign-in`                                 | All        |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`     | `/sign-up`                                 | All        |
| `NEXT_PUBLIC_SUPABASE_URL`          | `https://tykzscnjfrrgvdibnlek.supabase.co` | All        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | (existing value)                           | All        |
| `SUPABASE_SERVICE_ROLE_KEY`         | (existing value)                           | All        |
