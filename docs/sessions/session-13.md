# Session 13 — Excess energy marketplace (Sessions A + B combined)

Built in response to a real pivot: peer-to-peer excess solar energy
access, not grid electricity. No hardware, no interconnection — a
directory + physical-visit model, validated against real precedent
(a UNIDO pilot is running this exact concept in Nigeria; SOLshare proved
it at household scale in Bangladesh).

## The legal question, for the record

I flagged a real regulatory question (Nigeria's Electric Power Sector
Reform Act prohibits electricity trading without a license) before
building this. The decision was made to proceed — off-grid solar sharing
between individuals, not grid electricity — and that's a reasonable
distinction, but I'm not a lawyer and couldn't confirm where the line
actually falls. Recorded here so it isn't lost, not to re-litigate it.

## What was built

**Data model** (`supabase/migrations/0006_excess_energy_marketplace.sql`):
- `solar_profiles` — daily generation (direct entry or estimated from
  panel wattage × 5 assumed peak sun hours), daily consumption, excess
  computed by the database itself (`generated always as`), location text,
  price per session, listed on/off.
- `energy_requests` — a booking: seeker, host, amount, 20% platform
  commission (`MARKETPLACE_COMMISSION_RATE` in `pricing.ts`), status
  flow `pending_payment → paid → confirmed → paid_out`.

**Real payment collection** — this is the part that makes it different
from the carbon-credit model:
- `lib/paystack-client.ts` — shared HTTP client, extracted from Session
  5's `payout-provider.ts` so transfers (outgoing) and transactions
  (incoming) share one implementation.
- `lib/payment-collection.ts` — `initializeTransaction()` (Paystack
  Initialize Transaction — starts a real checkout), `verifyTransaction()`
  (fallback re-check), `verifyPaystackSignature()`.
- **Raw-body capture in `index.ts`** — a custom Fastify content-type
  parser stores the exact raw bytes of every JSON request alongside the
  normal parsed body. This matters because HMAC signature verification
  must hash the exact bytes Paystack sent — re-serializing a parsed
  object can silently change whitespace/key order and break the
  signature. Every other route's `request.body` behaves exactly as
  before.
- `routes/webhooks.ts` — Paystack calls this on payment success. Verifies
  the signature, **re-checks the amount against our own record** (per
  Paystack's own guidance — never trust the webhook payload alone), then
  marks the request paid.
- `routes/energy-requests.ts` — create a request (starts checkout,
  returns the URL to redirect to), list your own requests, and confirm
  receipt — which is the trust gate: **the host is only paid out after
  the seeker confirms**, not the moment payment clears, so a host who
  never shows up can't walk away with money for nothing.

**Web**: `/dashboard/solar-profile` (host sets up their listing),
`/dashboard/find-energy` (search + "Request & pay" → real Paystack
checkout redirect), `/dashboard/my-requests` (both sides track status,
seeker confirms receipt).

## Known compromise, stated plainly

Paystack requires an email; this app only collects phone numbers
(OTP-only auth from Session 2). `energy-requests.ts` falls back to a
synthesized placeholder email. This works for payment processing but
means **no real payment receipt email ever arrives** for users without
one on file. Not solved, just made visible.

## Verified this session

- Full `pnpm run type-check` via turbo — clean across all 3 packages.
- Full `pnpm run build` — same result as every session: `types`/`api`
  succeed, `web` blocked only by the sandbox font restriction.
- **Actually proved the webhook signature verification works** — the
  most important thing to get right, since it gates real money:
  - No signature → 401, ~9ms.
  - Wrong signature → 401, ~5ms.
  - A correctly-HMAC-SHA512-computed signature (using the same
    `PAYSTACK_SECRET_KEY` the server actually loads) → passed
    verification and proceeded into the database lookup. Caught and fixed
    a test-setup mistake along the way (hashed with the wrong key on the
    first attempt) rather than reporting a false pass.
- Confirmed all new routes correctly reject unauthenticated requests.
- **Not tested**: an actual Paystack test-mode transaction completing
  end-to-end (needs a real Paystack test account + this deployed
  somewhere reachable by Paystack's webhook — can't happen from this
  sandbox), and everything DB-dependent against a real Supabase project
  (same standing limitation as every session since Session 2).

## What Session C (next) actually needs to be

Not more code — an actual test transaction with real Paystack test keys,
on a real deployment, confirmed working end-to-end, before this touches
real users or real money.
