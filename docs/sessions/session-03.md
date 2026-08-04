# Session 3 — Synthetic telemetry + dashboard chart

## What was built

- **`apps/api/src/lib/telemetry-generator.ts`** — generates 30 days of
  realistic daily kWh readings (small random noise + occasional "cloudy
  day" dips) for a given energy provider link. Pure stand-in for real
  telemetry until Session 7.
- **`POST /telemetry/seed`** — seeds synthetic readings for all of the
  authenticated user's active energy links.
- **`GET /telemetry/summary`** — returns daily kWh totals across the
  user's links, for charting.
- **`UsageChart`** (`apps/web/components/UsageChart.tsx`) — a recharts line
  chart in brand green, with an empty state for users with no data yet.
- **`SeedDemoDataButton`** — client component that calls `/telemetry/seed`
  and refreshes the page.
- **Dashboard update** — now fetches `/telemetry/summary` server-side
  (using the session's access token) and renders the chart, with the
  "Generate demo usage data" button shown once at least one account is
  linked.

## How to apply this patch

1. Copy `apps/api/src/lib/telemetry-generator.ts`,
   `apps/api/src/routes/telemetry.ts`,
   `apps/web/components/UsageChart.tsx`, and
   `apps/web/components/SeedDemoDataButton.tsx` into your repo (all new
   files).
2. Merge `apps/api/src/index.ts` — only the `telemetryRoutes` import and
   registration were added.
3. Merge `apps/web/package.json` — only the `recharts` dependency was
   added.
4. Overwrite `apps/web/app/dashboard/page.tsx` with the version in this
   patch (it now fetches and renders usage data).
5. `pnpm install`, then `pnpm dev`.
6. Log in, link an account, click "Generate demo usage data" — the chart
   should populate.

## Verified this session

- `pnpm install`, `tsc --noEmit` on both apps — clean.
- `next build` compiles through webpack; fails only at the same sandbox
  Google-Fonts-network step as prior sessions (not a code issue).

## Known gaps / still open

- Telemetry readings can currently be seeded multiple times, creating
  duplicate rows for the same day — fine for a demo, but Session 4's
  aggregation logic should dedupe or this should get a unique constraint
  before real data arrives.
- No real Supabase project has been tested against yet (same note as
  Session 2) — still worth doing before Session 4.
- `/telemetry/summary` re-fetches and re-aggregates all readings on every
  dashboard load with no caching — fine at demo scale, will need
  revisiting once real users exist.

## Suggested focus for Session 4

Carbon batch aggregation: a job/route that pools `telemetry_readings`
across users into `carbon_batches`, estimates `estimated_tons_co2e` (needs
a grid emissions-factor assumption — worth deciding Nigeria's factor or
where that number comes from), and moves batches from `pending` toward
`verified`.
