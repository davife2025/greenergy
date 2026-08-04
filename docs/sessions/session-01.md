# Session 1 — Core infrastructure

## What was built

- Turborepo + pnpm workspace (`apps/*`, `packages/*`)
- `apps/web`: Next.js 14 (App Router) + Tailwind, brand tokens wired in
  (`brand.green`, `brand.charcoal`, `brand.gray`, `brand.amber`). Landing
  page with hero, mobile-money payout receipt visual, and a 3-step "how it
  works" section.
- `apps/api`: Fastify + TypeScript service. Env validation (zod), a
  server-side Supabase client (service role key), and `/health` +
  `/health/db` routes.
- `packages/types`: shared TypeScript types for `User`, `EnergyProviderLink`,
  `TelemetryReading`, `CarbonBatch`, `Payout` — mirrors the Supabase schema
  so both apps stay in sync.
- `supabase/schema.sql`: initial tables — `users`, `energy_provider_links`,
  `telemetry_readings`, `carbon_batches`, `carbon_batch_readings`, `payouts`
  — with row-level security so users can only read their own rows. All
  writes are expected to go through `apps/api` using the service role key.

## How to run it

```bash
pnpm install
cp .env.example .env        # root — for reference
cp apps/api/.env.example apps/api/.env
# fill in SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in apps/api/.env
# fill in NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local

pnpm dev
```

Apply `supabase/schema.sql` in the Supabase SQL editor before hitting
`/health/db` — it will fail until the `users` table exists.

## Known gaps / not yet decided

- **Auth flow** — Supabase Auth is assumed (table references `auth.users`)
  but the actual sign-up/login UI and phone-number verification flow
  (important for a mobile-money-first product) isn't built yet.
- **Energy provider integration** — no real M-KOPA/Sun King/BBOXX API
  client exists yet. `energy_provider_links.provider` is scaffolded as an
  enum; the actual partnership/API integration is still commercially
  unresolved (see open business-logic questions below).
- **Carbon batch aggregation logic** — the job that rolls telemetry into
  `carbon_batches` doesn't exist yet. This is core product logic for
  Session 2+.
- **Mobile money payout integration** — no Flutterwave/Paystack (or similar)
  client wired up yet; `payouts.mobile_money_reference` is a placeholder
  column.
- **AI verification/fraud-detection layer** — discussed conceptually
  (Vertex AI for MRV/fraud checks) but not implemented.

## Suggested focus for Session 2

Pick one vertical slice and build it end-to-end rather than spreading
across all of them: e.g. auth + energy-link stub + a fake telemetry
generator, so the dashboard has real (if synthetic) data to render against.
