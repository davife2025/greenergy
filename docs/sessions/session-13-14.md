# Sessions 13-14 — Excess energy marketplace + real payment collection

The pivot: instead of depending on a carbon credit sale that doesn't
exist yet, this is a direct marketplace — a seeker pays a host for
excess solar capacity, in real Naira, through Paystack, today.

## The model, as built

1. **Host** sets up a solar profile: panel wattage (or direct kWh),
   home consumption, a landmark-based location (not their home address —
   a safety default), and a price per charging session. Excess is
   computed automatically (`generation - consumption`, floored at 0).
2. **Seeker** searches by location text, finds a listing, hits
   "Request & pay" — redirected to a real Paystack checkout.
3. Paystack calls our webhook when payment succeeds. We verify the
   signature (HMAC-SHA512, constant-time comparison) and re-check the
   amount against our own record before marking anything paid — never
   trust the webhook payload alone.
4. **The trust gate**: the host is NOT paid the moment payment clears.
   The seeker has to physically go charge their device, then hit
   "Confirm received" in the app. Only then does the real Paystack
   transfer to the host fire (minus our 20% commission).

## Why this is more real than the carbon credit flow

No dependency on a registry or buyer that doesn't exist — the buyer is
just the seeker, right there, paying directly. This is the first flow in
the whole project where real money can actually move end-to-end without
needing anyone else's cooperation.

## What was built

- `supabase/migrations/0006_excess_energy_marketplace.sql` —
  `solar_profiles` (with `excess_kwh` as a Postgres generated column, so
  it's always correct, never stale) and `energy_requests`.
- `lib/paystack-client.ts` — shared HTTP client, extracted so both
  transfers (Session 5) and transactions (this session) use the same
  tested code instead of duplicating it.
- `lib/payment-collection.ts` — `initializeTransaction()`,
  `verifyTransaction()`, `verifyPaystackSignature()`.
- `routes/solar-profile.ts`, `routes/listings.ts`, `routes/energy-requests.ts`,
  `routes/webhooks.ts`.
- `index.ts` — a custom content-type parser that captures the raw request
  body alongside normal JSON parsing, specifically because signature
  verification must hash the exact raw bytes Paystack sent — a
  re-serialized JSON object can silently break the signature.
- Web: `/dashboard/solar-profile` (host setup), `/dashboard/find-energy`
  (search + pay), `/dashboard/my-requests` (both sides of the
  transaction, with the confirm-received button), nav updated.

## Verified this session

- Full `pnpm run type-check` via turbo — clean across all 3 packages.
- Full `pnpm run build` — same result as every prior session.
- Booted the server and hit every new route over HTTP: all correctly
  return 401 without auth.
- **The one that actually matters most**: tested the webhook signature
  verification with a real HMAC — computed a genuinely valid signature
  with `openssl`, confirmed it passes and proceeds to the database call
  (which then hangs on this sandbox's placeholder Supabase URL, expected);
  confirmed a forged signature and a missing signature are both rejected
  in single-digit milliseconds, before any database call. This is the
  single most security-critical piece of this session and it's the one
  I verified most rigorously, not just trusted.
- Found and fixed a real security gap during review: the signature
  comparison was using a plain `===`, which leaks timing information.
  Replaced with `crypto.timingSafeEqual`.

## Known gaps / still open — read this before Monday

- **Paystack requires an email; most users only have a phone number.**
  Current fallback is a synthesized placeholder (`<phone>@users.greenenergy.ng`)
  — payment still works, but no real receipt email ever arrives. Fine for
  a fast launch, worth fixing once there's time.
- **No fraud/abuse protection on listings or requests yet** — anyone
  could spam fake listings or requests. At small scale for Monday this
  is a real but manageable risk; revisit before wider rollout.
- **Solar profile numbers are entirely self-reported**, with no
  verification layer (unlike telemetry_readings, which has Session 6's
  anomaly detection). A host could list excess energy they don't
  actually have.
- **No dispute-resolution flow** — `energy_requests.status` has a
  `'disputed'` value in the schema, but nothing sets it or handles it yet.
  If a seeker pays and a host never shows up, there's currently no
  recourse beyond word of mouth.
- **Still completely unconfirmed against a real Supabase + Paystack
  account** — same standing limitation as every session since Session 2,
  but it matters most right now, because this is the session where real
  money is actually supposed to move.

## The actual next step, not more code

Session 15 (mentioned in the original plan) isn't code — it's plugging
in real Paystack test keys and a real Supabase project, running through
the full flow once as two real accounts (a host and a seeker), and
confirming a real payment actually completes and a real transfer
actually lands. Nothing above should be treated as "done" until that
happens at least once.
