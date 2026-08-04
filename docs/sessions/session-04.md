# Session 4 — Carbon batch aggregation logic

## What was built

- **`apps/api/src/lib/carbon.ts`** — the emissions math:
  - `NIGERIA_GRID_EMISSION_FACTOR_KG_PER_KWH = 0.4035` (403.5 gCO2/kWh),
    sourced from IEA's Emissions Factors 2025 dataset (2024 provisional
    generation data), cross-checked against the Climate Transparency
    Report's 402 gCO2/kWh figure for Nigeria. **This is a static constant
    and should be revisited periodically** — grid mix shifts, and ideally
    this becomes a live lookup rather than a hardcoded number once a
    source for that exists.
  - `estimateTonsCo2e(totalKwh)` — converts pooled kWh into tons CO2e.
  - `isPlausibleReading(kwh)` — rule-based sanity check (0–15 kWh/day)
    ahead of Session 6's real ML-based fraud/anomaly detection.
- **`POST /admin/carbon-batches/aggregate`** — pools every telemetry
  reading not yet assigned to a batch, splits them into
  plausible/implausible, creates a `carbon_batches` row (status
  `verified` if everything passed the sanity check, otherwise `pending`),
  and links the included readings via `carbon_batch_readings`.
- **`GET /admin/carbon-batches`** — lists all batches.
- **Admin-secret auth** (`lib/admin-auth.ts`) — these endpoints act across
  *all* users' data, so they're protected by a shared secret
  (`ADMIN_JOB_SECRET` header `x-admin-secret`) rather than a user JWT.
  Meant to be called by a cron job/internal trigger — never from
  `apps/web`.

## How to apply this patch

1. Add the new files: `apps/api/src/lib/carbon.ts`,
   `apps/api/src/lib/admin-auth.ts`, `apps/api/src/routes/carbon-batches.ts`.
2. Merge `apps/api/src/index.ts`, `apps/api/src/lib/env.ts`,
   `apps/api/.env.example`, and root `.env.example` — all just add the
   `ADMIN_JOB_SECRET` variable and route registration.
3. Set `ADMIN_JOB_SECRET` in your `apps/api/.env` to a long random string
   (`openssl rand -hex 32`).
4. `pnpm dev`, then manually trigger an aggregation once you have seeded
   demo telemetry (Session 3):
   ```bash
   curl -X POST http://localhost:4000/admin/carbon-batches/aggregate \
     -H "x-admin-secret: <your secret>"
   ```

## Verified this session

- `tsc --noEmit` on `apps/api` — clean.
- Smoke-tested `estimateTonsCo2e` / `isPlausibleReading` directly — math
  checks out (1000 kWh → 0.4035 tCO2e).
- Booted the actual Fastify server with dummy env vars and hit it over
  HTTP: `/health` → 200, `/admin/carbon-batches/aggregate` without the
  correct secret → 401 as expected.
- **Not tested**: the actual aggregation query logic against a real
  Supabase database with real rows (still no live project connected —
  same open item as Sessions 2 and 3). This is the biggest risk in this
  session's code and should be the first thing checked once a project
  exists.

## Known gaps / still open

- Excluded (implausible) readings are left permanently unbatched — there's
  no retry/review flow for them yet.
- The anti-join (finding "unbatched" readings) is done by pulling all rows
  client-side and filtering in memory. Fine at demo scale, will need a
  real SQL query (or Postgres function) once reading volume grows.
- No scheduling yet — aggregation is triggered manually via curl. A real
  cron (Supabase Edge Function on a schedule, or a hosted cron hitting
  this endpoint) is needed before this is "live."
- Still no payout logic connecting a `verified`/`sold` batch back to
  individual users' earnings — that's Session 5.

## Suggested focus for Session 5

Payout flow: once a batch is `verified` (and, eventually, `sold`), split
its value across the users whose telemetry contributed to it, create
`payouts` rows, and integrate a real mobile money provider (Flutterwave
vs. Paystack — still your call).
