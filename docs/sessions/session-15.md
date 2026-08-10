# Session 15 — Preflight check

Not a product feature. Every real blocker hit so far in this project has
been environment/tooling (npm vs pnpm, macOS permission errors, a
missing dependency) rather than a code bug — so the highest-leverage
thing to build right now is something that catches those in one run
instead of another cryptic mid-`pnpm dev` crash.

## What was built

- **`apps/api/src/scripts/preflight.ts`** — `pnpm preflight` (from
  `apps/api`). Checks, in order:
  1. pnpm is actually being used (not npm/yarn — the exact class of bug
     that caused the `@supabase/ssr` failure earlier)
  2. Node version ≥ 20
  3. Every required env var is present (reports ALL missing ones in one
     run, not just the first — deliberately doesn't import `lib/env.ts`,
     which throws on the first missing var)
  4. **Actually calls Supabase** — a real HTTP request, not just "is the
     URL set". Distinguishes "can't reach it at all" from "reached it but
     the schema isn't applied yet" from "works."
  5. **Actually calls Paystack** — hits a real, harmless endpoint to
     confirm the secret key is genuinely valid, and tells you plainly
     whether it's a test key (safe) or a live key (real money will move).

## Verified this session

- Type-checks clean.
- **Ran it three times against deliberately different broken
  environments** and confirmed each one reports correctly:
  - Fake Supabase URL + fake Paystack key → both correctly fail with
    specific, actionable messages (caught a real bug during this: Paystack
    returned 403 for the invalid key, not 401 as I'd assumed — fixed to
    handle both).
  - All required vars missing → reports all 4 missing vars at once, and
    correctly skips the dependent connectivity checks instead of failing
    them with a confusing secondary error.
  - (Not yet run against a fully correct environment, since none exists
    yet in this sandbox — that's exactly the point of this script: it's
    what you run first once you have real credentials.)

## How to use it

```bash
cd apps/api
cp .env.example .env   # fill in real values
pnpm preflight
```

Fix everything it flags. Once it says "Everything checks out," that's
the actual green light for `pnpm dev` — not before.
