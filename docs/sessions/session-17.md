# Session 17 — Email login + public marketplace browsing

Two related UX changes, both from direct feedback after trying to log in.

## What changed

### 1. Login: phone OTP → email OTP
`app/login/page.tsx` rewritten — same 2-step passwordless pattern (send
code, verify code), now over email instead of SMS. Uses
`supabase.auth.signInWithOtp({ email })` /
`supabase.auth.verifyOtp({ email, token, type: "email" })` instead of
the phone equivalents.

**This also fixes yesterday's "Unsupported phone provider" blocker** —
Supabase can send OTP emails out of the box, with no Twilio/SMS provider
setup required. Phone numbers are still collected, just later and for a
different purpose: the payout-method step (mobile money needs a phone
number to send money to) — that was already a separate field from login
identity, so this didn't need a schema change.

Dashboard header now shows `user.email` instead of `user.phone`.

### 2. Marketplace browsing is now public
Previously `/dashboard/find-energy` required login just to *look* at
listings. Moved to a public route, `/find-energy`, with its own
lightweight header (not the dashboard nav). The API's `GET /listings`
now uses a new `optionalAuth` hook (`lib/auth.ts`) instead of
`requireAuth` — it attaches `request.userId` if a valid token happens to
be present (so a logged-in user's own listing is excluded from their own
search results) but never rejects an anonymous request.

**What's still gated behind real login**, unchanged: `POST
/energy-requests` (paying), `/solar-profile` (managing your own
listing), `/dashboard/*` generally. The `/find-energy` page's
"Request & pay" button checks login state client-side and redirects to
`/login?redirect=/find-energy` instead of attempting the request if
you're not logged in — you never see a raw 401 error.

## How to apply

Overwrite `apps/web/app/login/page.tsx`, `apps/web/app/dashboard/page.tsx`
(email instead of phone), `apps/api/src/routes/listings.ts`,
`apps/web/app/dashboard/layout.tsx` (nav link), `apps/web/app/page.tsx`
(new "Browse energy near you" link). Add
`apps/web/app/find-energy/page.tsx` (new public route). Delete the old
`apps/web/app/dashboard/find-energy/` directory if you're patching by
hand rather than replacing the whole repo. Merge `apps/api/src/lib/auth.ts`
(adds `optionalAuth`, `requireAuth` unchanged).

## Verified this session

- Full `pnpm run type-check` via turbo — clean across all 3 packages.
  Caught a real Next.js requirement during this: `useSearchParams()` in
  the login page needs a `<Suspense>` boundary or the build fails —
  fixed by splitting into a wrapped child component.
- Full `pnpm run build` — same result as every prior session (only the
  sandbox font limitation).
- **Booted the server and confirmed via request logs, not just status
  codes**: `/listings` (no auth header) passed straight through with no
  rejection and reached the database call — proof it's genuinely public.
  `/energy-requests` and `/solar-profile` both correctly rejected in
  under 1.2ms, before any database call — proof the auth-gated routes
  are still properly protected and the change didn't loosen anything it
  shouldn't have.

## Known gaps / still open

- Existing Session-2-era test accounts (if any were created via phone
  OTP before this change) won't have an email on file — not a concern
  pre-launch, but worth knowing if any test data exists already.
- No "log in with either phone or email" flexibility — this is an either/or
  swap, not an addition. If phone login is wanted back later (e.g. for
  users without reliable email access), that's a bigger design decision,
  not a quick patch.
- Everything else flagged in Sessions 13-16 (unconfirmed against real
  Supabase/Paystack/HF, pricing constants, no dispute flow) still stands.
