# Session 2 — Auth + account linking (stub)

## What was built

- **Phone-first auth** via Supabase OTP (`/login`) — send code, verify code,
  redirect to `/dashboard`. No passwords, since mobile money identity is
  phone-tied anyway.
- **Session handling** for the Next.js App Router using `@supabase/ssr`:
  `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (Server
  Components), `middleware.ts` (refreshes the session cookie on every
  request).
- **Auto-created profile row** — `supabase/migrations/0002_auth_profile_trigger.sql`
  adds a Postgres trigger so a `public.users` row is created automatically
  the moment someone verifies via OTP (`auth.users` insert).
- **Dashboard** (`/dashboard`, server component) — redirects to `/login` if
  no session; otherwise shows the user's phone number and their linked
  energy accounts (read directly from Supabase via the user's own session,
  respecting RLS).
- **Manual account-linking flow** (`/dashboard/link-account`) — a form
  posting to a new `apps/api` route. This is explicitly a stub: real
  provider integration is Session 7 and still blocked on the partnership
  decision.
- **apps/api auth** — `lib/auth.ts` is a Fastify `preHandler` hook that
  validates the `Authorization: Bearer <token>` header against Supabase
  Auth and attaches `request.userId`. `routes/energy-links.ts` (GET/POST
  `/energy-links`) is the first protected route, using the service role
  key to write (bypassing RLS, per the Session 1 design).

## How to apply this patch to your Session 1 base

1. Copy every file under `apps/`, `supabase/`, and `docs/` in this patch
   into the matching path in your local repo, overwriting where they
   already exist.
2. Merge `apps/web/package.json` — only the `@supabase/ssr` dependency was
   added.
3. Merge `apps/api/src/index.ts` — only the `energyLinksRoutes` import and
   registration were added.
4. Run the new migration: `supabase/migrations/0002_auth_profile_trigger.sql`
   (SQL editor, or `supabase db push` if you're using the CLI/migrations
   workflow from here on).
5. In your Supabase project, enable **Phone** as an auth provider (Auth →
   Providers) and configure an SMS provider (Twilio, MessageBird, etc.) —
   OTP won't send without one configured.
6. `pnpm install` to pick up the new dependency, then `pnpm dev`.

## Verified this session

- `pnpm install`, `tsc --noEmit` on both `apps/web` and `apps/api` — clean.
- `next build` compiles successfully through webpack; only fails in this
  sandbox at the Google Fonts fetch step (network-restricted sandbox, not
  a code issue — confirmed working in Session 1 already).

## Known gaps / still open

- No Supabase project has actually been created/tested against yet — the
  `/health/db` and OTP flow are unverified against a real project. Worth
  doing that before Session 3.
- No logout button/flow yet.
- No validation that a phone number is Nigerian/expected format — anyone
  can currently sign up with any phone number.
- Business decision from Session 1 still open: PAYG partnership model vs.
  self-linking vs. hybrid (blocks Session 7 only).

## Suggested focus for Session 3

Synthetic telemetry generator + a real usage chart on the dashboard, per
the build plan — gives the product visual substance before tackling
aggregation logic.
