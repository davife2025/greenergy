# Session 18 — Magic-link login, no code entry

Removes the second step entirely: enter email, click the link Supabase
sends, you're logged in. No 6-digit code to type.

## What changed

- **`app/login/page.tsx` simplified to one step** — `signInWithOtp({ email,
  options: { emailRedirectTo } })`, then a "check your inbox" message.
  No OTP input field exists anymore.
- **New: `app/auth/callback/route.ts`** — this is the part that actually
  makes the link work. When someone clicks the emailed link, Supabase
  redirects here with a `?code=...` (PKCE flow); this route exchanges it
  for a real session via `supabase.auth.exchangeCodeForSession()` (server
  client, so it sets real cookies) and redirects into the app. Without
  this route, clicking the link would land on a blank/error page — the
  exchange step is not automatic.
- The `?redirect=` param from `/find-energy`'s "log in to request this"
  flow still works — it's threaded through as `redirect_to` on the
  callback URL and honored after the exchange completes.
- A link that's expired or already been used redirects back to `/login`
  with a clear "that link expired, request a new one" message instead of
  a raw error.

## How to apply

Add `apps/web/app/auth/callback/route.ts`. Overwrite
`apps/web/app/login/page.tsx`. No API or database changes this session.

## One thing worth knowing, not a bug

The link only works if clicked in the **same browser** that requested
it — the PKCE verification data is stored in a cookie at request time.
This is standard for every magic-link system (Slack, Notion, etc.), not
specific to this app. It can occasionally misfire if an email client's
security scanner "pre-clicks" links before the real user does — a known
industry-wide caveat, not something worth engineering around here.

## Verified this session

- Full `pnpm run type-check` via turbo — clean across all 3 packages,
  confirming `exchangeCodeForSession` resolved correctly against
  `@supabase/ssr`'s types.
- Full `pnpm run build` — same result as every prior session (only the
  sandbox font limitation); the new Route Handler compiled without
  issue.
- **Not tested**: an actual email round-trip (send → click → land
  logged-in) — needs the real SMTP setup from earlier in this
  conversation to be in place first. This is the thing to test as soon
  as SMTP is confirmed working.

## Still open

- Custom SMTP (Resend or similar) — needed regardless of this change,
  flagged in the prior conversation, not yet confirmed working.
- Site URL / Redirect URLs in Supabase still need to point at the real
  Vercel domain, not localhost — also flagged earlier, same status.
- Everything else from Sessions 13-17 stands.
