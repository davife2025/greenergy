# Session 12 — Scheduler

Turns aggregation and payout processing from curl-only manual actions
into something that actually runs on its own.

## What was built

- **Refactored** `carbon-batches.ts` and `payouts.ts` — the actual logic
  moved into `lib/aggregation.ts` (`runAggregation()`) and
  `lib/payout-processing.ts` (`runPayoutProcessing()`). The HTTP routes
  are now thin wrappers around the same functions the scheduler calls —
  one implementation, not duplicated between "manual" and "scheduled."
- **`lib/scheduler.ts`** — `node-cron`-based scheduler. Runs aggregation,
  then payout processing right after (payouts need batches already
  verified). `SCHEDULER_ENABLED=false` disables it entirely (falls back
  to manual `/admin` triggers); `SCHEDULER_CRON` sets the schedule
  (default: daily at 02:00 UTC). Invalid cron expressions are caught at
  startup with a clear error rather than silently doing nothing.
- Wired into `index.ts` — starts right after the server begins listening.

## How to apply

Add `apps/api/src/lib/aggregation.ts`,
`apps/api/src/lib/payout-processing.ts`, `apps/api/src/lib/scheduler.ts`.
Overwrite `apps/api/src/routes/carbon-batches.ts`,
`apps/api/src/routes/payouts.ts`. Merge `apps/api/src/index.ts`,
`apps/api/src/lib/env.ts`, `apps/api/package.json` (adds `node-cron` +
`@types/node-cron`), `apps/api/.env.example`. `pnpm install`.

(As of Session 10, I'm delivering these as part of one consolidated zip
rather than a standalone patch — see the note at the end.)

## Verified this session

- Full `pnpm run type-check` via turbo — clean across all 3 packages
  (needed `@types/node-cron` — `node-cron` doesn't ship its own types).
- **Actually proved the scheduler fires**: booted with
  `SCHEDULER_CRON=* * * * * *` (every second) and watched multiple
  scheduled runs fire in the logs, not just trusted that `node-cron`
  would work.
- Confirmed `SCHEDULER_ENABLED=false` correctly disables it, and that
  omitting the variable entirely defaults to enabled on the real daily
  schedule.
- Confirmed both refactored routes still correctly return 401 without
  the admin secret — the refactor didn't silently drop the auth check.
- **Not tested**: an actual scheduled run completing successfully against
  real data (the sandbox's placeholder Supabase URL means DB calls
  within a scheduled run can't be verified end-to-end) — same standing
  limitation as every DB-touching session since Session 2.

## Known gaps / still open

- No alerting if a scheduled run fails repeatedly — it logs and moves on,
  silently, until someone happens to check the logs.
- No lock/mutex if a run takes longer than the interval between runs —
  not a real risk at daily granularity, but worth knowing if the schedule
  is ever tightened.
- Still no registry submission step (Session 13), no automated test
  suite (Session 14), no notifications (Session 15).

## Delivery note

This zip is the full consolidated repo (Sessions 1–12 merged), not a
patch — same as Session 10 onward. Replace your local folder with this
one rather than hand-merging.
