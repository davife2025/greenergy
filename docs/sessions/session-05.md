# Session 5 — Payout flow

## Decisions made (since you kept saying "continue")

- **Paystack** over Flutterwave: better-documented API for Nigerian
  developers, and this pilot is Nigeria-only so Flutterwave's pan-African
  breadth isn't worth much yet. Built behind a small provider interface
  (`lib/payout-provider.ts`) so swapping later isn't a rewrite.
- **Carbon credit price: $33/ton**, **USD→NGN: 1360** (~August 2026
  mid-market rate), **70% revenue share to users** — all three are
  business assumptions, not facts, and are isolated in
  `apps/api/src/lib/pricing.ts` with comments explaining why. The 70/30
  split especially is a real decision you should own, not something
  that should stay as a code default without sign-off.
- Nigerian mobile money wallets (OPay, PalmPay, Moniepoint) are NUBAN
  accounts under the hood — Paystack's standard bank-transfer recipient
  type handles them directly, no special "mobile money" API needed
  (that Paystack feature is Ghana/Kenya-only). Bank codes:
  OPay `999992`, PalmPay `999991`, Moniepoint `50515` — cross-checked
  against three independent sources this session, but re-verify against
  Paystack's List Banks endpoint before going live in case they change.

## What was built

- **`lib/pricing.ts`** — `batchValueNgn()`, `PAYOUT_USER_SHARE`.
- **`lib/payout-provider.ts`** — Paystack integration:
  `createTransferRecipient()`, `initiateTransfer()`.
- **`POST /admin/payouts/process`** — for every `verified` carbon batch:
  splits its NGN value across contributing users proportional to their
  kWh share, creates a `payouts` row for each (always — even if we can't
  send it yet, so nothing is silently dropped), attempts a real Paystack
  transfer if the user has a payout method on file, and moves the batch
  to `sold`.
- **`GET /me`, `PATCH /me/payout-method`** — users need somewhere to
  actually tell us which wallet to pay, which didn't exist before this
  session.
- **`/dashboard/payout-method`** — the web form for that.
- **Dashboard update** — an "add a payout method" prompt if none is set,
  plus an Earnings section showing total paid and payout history.

## How to apply this patch

1. Add the new files listed above.
2. Merge `apps/api/src/lib/env.ts`, `apps/api/src/index.ts`,
   `apps/api/.env.example`, and root `.env.example` (all additive).
3. Overwrite `apps/web/app/dashboard/page.tsx`.
4. Set `PAYSTACK_SECRET_KEY` in `apps/api/.env` (use your **test** key
   while developing — Paystack test transfers always return success
   without moving real money).
5. `pnpm dev`, then: log in → link an account → generate demo usage →
   set a payout method → trigger aggregation (Session 4's endpoint) →
   trigger `POST /admin/payouts/process`.

## Verified this session

- `tsc --noEmit` on both apps — clean.
- Pricing math smoke-tested directly: 1.5 tons → ₦67,320 batch value →
  ₦47,124 user pool at 70%.
- Booted the real server and hit every new route over HTTP — all
  correctly return 401 without proper auth/admin-secret.
- **Not tested**: an actual Paystack transfer, or the full aggregation →
  payout pipeline against a real Supabase database with real rows. This
  is the biggest untested surface in the project so far and should be
  the first thing you do once a real Supabase + Paystack test account
  exist.

## Known gaps / still open

- No user "name" field exists yet — the Paystack recipient name falls
  back to the phone number. Fine functionally, worth adding a real name
  field before this feels like a finished product.
- Aggregation (Session 4) and payout processing (this session) are both
  manually triggered via curl. Neither has a scheduler yet.
- The 70/30 split, $33/ton price, and 1360 NGN/USD rate are all static
  and need real ownership/updating — see "Decisions made" above.
- Still no AI-based fraud/anomaly detection (Session 6) or real
  energy-provider integration (Session 7, still blocked on the
  partnership-model decision from Session 1).

## Suggested focus for Session 6

AI verification layer — replace/augment the rule-based `isPlausibleReading`
check from Session 4 with real anomaly detection before a batch is marked
`verified`, per the original Vertex AI direction discussed early on.
