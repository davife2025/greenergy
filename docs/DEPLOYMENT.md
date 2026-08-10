# Deploying Greenenergy

Three services to stand up: **Supabase** (database + auth), **Fly.io**
(the `apps/api` Fastify service), **Vercel** (the `apps/web` Next.js app).
None of this can be done from inside a chat session — it needs your
accounts and credentials. This is the exact sequence to run yourself.

## 0. Before anything else — run the preflight check

```bash
cd apps/api
pnpm preflight
```

This checks you're using pnpm (not npm/yarn — a real bug hit earlier in
this project), your Node version, every required env var is actually
set, and — critically — **actually tests the connection** to Supabase
and validates the Paystack key against Paystack's real API, rather than
just checking the variables exist. Fix everything it flags before going
further; every step below assumes this passes first.

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

## 4. Configure the Paystack webhook (required for the marketplace)

Paystack dashboard → Settings → API Keys & Webhooks → set the webhook URL
to:

```
https://greenenergy-api.fly.dev/webhooks/paystack
```

Without this, payments complete on Paystack's side but the app never
finds out — `energy_requests` rows get stuck at `pending_payment`
forever. Not optional for the excess-energy marketplace (Session 13) to
work at all.

## 5. Smoke test the whole thing

- Visit the Vercel URL, log in with a real phone number, confirm the OTP
  arrives.
- Link an account, generate demo data, confirm the chart renders.
- `curl -X POST https://greenenergy-api.fly.dev/admin/carbon-batches/aggregate -H "x-admin-secret: <secret>"`
  and confirm a batch appears.
- Set a payout method, re-run aggregation if needed, then
  `curl -X POST .../admin/payouts/process -H "x-admin-secret: <secret>"`
  — with a Paystack **test** key this won't move real money but should
  return a `sent` result.
- **Marketplace**: set up a solar profile and list it, search for it from
  a second account, request & pay with a Paystack test card, confirm the
  webhook fires (check Fly logs), then confirm receipt and check the
  host's payout status.

## What CI does and doesn't do

`.github/workflows/ci.yml` runs `pnpm install`, `type-check`, and `build`
on every push/PR — it catches broken code before it reaches Fly/Vercel,
but **it doesn't deploy anything**. Fly and Vercel each have their own
optional GitHub integration for auto-deploy on push to `main`; wiring
those up is a dashboard setting on each platform, not something in this
repo.
