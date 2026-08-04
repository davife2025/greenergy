# Deploying Greenenergy

Three services to stand up: **Supabase** (database + auth), **Fly.io**
(the `apps/api` Fastify service), **Vercel** (the `apps/web` Next.js app).
None of this can be done from inside a chat session — it needs your
accounts and credentials. This is the exact sequence to run yourself.

## 1. Supabase

1. Create a project at supabase.com.
2. In the SQL editor, run the migrations **in order**:
   `supabase/schema.sql`, then everything in `supabase/migrations/` by
   filename order (`0002_...`, `0003_...`).
3. Auth → Providers → enable **Phone**, and configure an SMS provider
   (Twilio, MessageBird, etc.) — OTP login won't send without one.
4. Settings → API: copy the **Project URL**, **anon public key**, and
   **service_role key** — you'll need all three below.

## 2. apps/api → Fly.io

```bash
fly auth login
fly launch --dockerfile apps/api/Dockerfile --no-deploy   # from repo root
```

When prompted, decline Fly's Postgres/Redis offers — Supabase is already
the database. Then set secrets (everything from `apps/api/.env.example`):

```bash
fly secrets set \
  SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  ADMIN_JOB_SECRET=$(openssl rand -hex 32) \
  PAYSTACK_SECRET_KEY=... \
  ANTHROPIC_API_KEY=... \
  API_CORS_ORIGIN=https://your-web-domain.vercel.app
```

```bash
fly deploy
```

Confirm it's actually up before moving on:

```bash
curl https://greenenergy-api.fly.dev/health
```

## 3. apps/web → Vercel

1. Import the repo in the Vercel dashboard.
2. **Root Directory**: set to `apps/web` (this is the one Vercel-specific
   monorepo setting that matters — Vercel auto-detects Next.js and the
   pnpm workspace from there).
3. Environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_API_URL=https://greenenergy-api.fly.dev
   ```
4. Deploy.
5. **Go back to Fly and update `API_CORS_ORIGIN`** to the real Vercel URL
   you were just assigned (`fly secrets set API_CORS_ORIGIN=https://...`
   then `fly deploy` again) — the API will reject browser requests from
   the web app otherwise.

## 4. Smoke test the whole thing

- Visit the Vercel URL, log in with a real phone number, confirm the OTP
  arrives.
- Link an account, generate demo data, confirm the chart renders.
- `curl -X POST https://greenenergy-api.fly.dev/admin/carbon-batches/aggregate -H "x-admin-secret: <secret>"`
  and confirm a batch appears.
- Set a payout method, re-run aggregation if needed, then
  `curl -X POST .../admin/payouts/process -H "x-admin-secret: <secret>"`
  — with a Paystack **test** key this won't move real money but should
  return a `sent` result.

## What CI does and doesn't do

`.github/workflows/ci.yml` runs `pnpm install`, `type-check`, and `build`
on every push/PR — it catches broken code before it reaches Fly/Vercel,
but **it doesn't deploy anything**. Fly and Vercel each have their own
optional GitHub integration for auto-deploy on push to `main`; wiring
those up is a dashboard setting on each platform, not something in this
repo.
