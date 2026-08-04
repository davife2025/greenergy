# Session 6 — AI verification / fraud-detection layer

## What was built

- **`lib/anomaly-detection.ts`** — `detectStatisticalAnomalies()`, a
  per-link (per-meter) z-score check. Flags any reading more than 2.5
  standard deviations from that *same link's own* historical mean.
  Deliberately per-link rather than across all pooled users — a 3 kWh/day
  system and a 0.5 kWh/day system are both normal, just different
  households. What's actually suspicious is one meter suddenly jumping
  far outside its own history.
- **`lib/ai-review.ts`** — `reviewBatch()`, an optional layer that sends
  aggregate batch statistics (reading count, flagged count, total kWh —
  no per-user data) to Claude and gets back a verdict + one-sentence
  summary. This can only add caution (downgrade a batch to `pending`),
  never override a deterministic rejection. Skipped entirely if
  `ANTHROPIC_API_KEY` isn't set — confirmed it falls back to `null`
  cleanly rather than erroring.
- **`carbon-batches.ts` aggregation route rewritten** to run both layers:
  Session 4's flat plausibility bound, this session's per-link
  statistical check, and the optional AI review — in that order, each
  layer only able to add caution, not remove it.
- **`supabase/migrations/0003_carbon_batch_review_notes.sql`** — adds
  `review_notes` to `carbon_batches` to store the AI layer's summary.

## How to apply this patch

1. Add the new files: `apps/api/src/lib/anomaly-detection.ts`,
   `apps/api/src/lib/ai-review.ts`,
   `supabase/migrations/0003_carbon_batch_review_notes.sql`.
2. Overwrite `apps/api/src/routes/carbon-batches.ts`.
3. Merge `apps/api/src/lib/env.ts`, `apps/api/package.json` (adds
   `@anthropic-ai/sdk`), `apps/api/.env.example`,
   `packages/types/src/index.ts` (adds `reviewNotes` to `CarbonBatch`).
4. Run the new migration.
5. Optionally set `ANTHROPIC_API_KEY` in `apps/api/.env` to enable the AI
   review layer — leave it unset and everything still works with the
   deterministic checks alone.
6. `pnpm install`, `pnpm dev`.

## Verified this session

- `tsc --noEmit` on all three packages — clean.
- **Anomaly detection smoke-tested with an injected fraud case**: 7 normal
  readings around 1.3–1.6 kWh plus one injected 9.8 kWh spike — correctly
  flagged only the spike, left the rest clean.
- Confirmed `reviewBatch()` returns `null` (clean no-op) when
  `ANTHROPIC_API_KEY` is unset, rather than erroring.
- Server boots cleanly with both new modules wired into the aggregation
  route.
- **Not tested**: the AI review layer against a real Anthropic API key
  (no key available in this environment — same honesty caveat as
  Session 5's untested Paystack calls). The JSON-parsing of Claude's
  response is defensive (falls back to `null` on parse failure) but
  hasn't been exercised against a real response.

## Known gaps / still open

- The per-link anomaly check requires ≥4 historical readings to say
  anything — brand-new links get a free pass until they build up history.
  Worth deciding if that's acceptable or if new links need a different
  (e.g. lower, fixed) bound initially.
- Anomaly detection runs one Supabase query per distinct link in the
  pool — fine at demo scale, will need batching once link counts grow.
- No retry/appeals flow for readings that get flagged and excluded —
  same gap noted in Session 4, still open.
- Still no real energy-provider integration (Session 7, blocked on the
  Session 1 partnership-model decision) or production deploy (Session 8).

## Suggested focus for Session 7 (once unblocked) or Session 8

Either resolve the partnership-model decision and build the real
M-KOPA/Sun King/BBOXX integration, or — if that's still not ready to
decide — jump to Session 8 (deploy) so there's a live, shareable demo
running on synthetic data while the partnership conversations continue
in parallel.
