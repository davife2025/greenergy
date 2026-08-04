# Session 7 — Deployment configuration

(Numbered 7 rather than 8 — Session 7 in the original build plan,
real energy-provider integration, is still blocked on the partnership
decision from Session 1, so this jumped ahead to what the plan called
Session 8. Session 7's slot stays open for whenever that decision lands.)

## Important scope note

**I can't actually deploy this for you.** Deploying requires your own
Vercel, Fly.io, and Supabase accounts and credentials, which I don't have
access to from this chat. What this session delivers is everything
needed to deploy it yourself in the sequence documented in
`docs/DEPLOYMENT.md` — verified as far as it's possible to verify without
those live accounts.

## What was built

- **Fixed a real latent bug**: `packages/types` had no build step — it
  exported raw `.ts` with no compiled JS. Nothing imports it yet, so it
  hadn't broken anything, but it would have silently broken the first
  production Docker build the moment something did import it. Now it has
  a real `build` script and emits `dist/`.
- **`apps/api/Dockerfile`** — multi-stage build correctly scoped for a
  pnpm/Turborepo monorepo (installs the whole workspace for
  `workspace:*` resolution, builds `packages/types` then `apps/api`,
  ships a slim runtime image with only compiled output).
- **`apps/api/fly.toml`** — Fly.io config with a health check pointed at
  `/health` (from Session 1).
- **`.github/workflows/ci.yml`** — install, type-check, build on every
  push/PR.
- **`docs/DEPLOYMENT.md`** — the exact commands for Supabase → Fly.io →
  Vercel, including the CORS gotcha (API needs the real Vercel URL after
  it's assigned, not before).

## Verified this session

- **Actually ran the full CI pipeline locally**, not just individual
  packages: `pnpm run type-check` — all 3 packages pass. `pnpm run
  build` — `@greenenergy/types` and `@greenenergy/api` both build
  successfully; `@greenenergy/web` fails only at the same Google Fonts
  network step as every prior session (this time the sandbox even
  surfaced the exact cause: a self-signed cert on this environment's
  network proxy for non-whitelisted domains — confirms it's this
  sandbox, not the code).
- Confirmed `packages/types` now actually builds to `dist/index.js` +
  `dist/index.d.ts`, and that `type-check` still works after the change.
- **Not tested / can't be tested from here**: the actual Dockerfile build
  (no Docker available in this sandbox), a real Fly.io deploy, a real
  Vercel deploy, or CI actually running on GitHub's infrastructure. All
  of these need to be done and checked by you.

## Known gaps / still open

- No staging environment — `docs/DEPLOYMENT.md` describes a single
  production setup. Worth adding a staging Supabase project + Fly app
  before this handles real users.
- No automated deploy-on-merge — Fly and Vercel both support this via
  their own GitHub integrations, but wiring that up is a dashboard
  setting on each platform, not something that lives in this repo.
- Same open items as Session 6: the partnership-model decision (blocks
  real Session 7 / provider integration), the 70/30 split and pricing
  constants still need real ownership, and nothing has been tested
  against a live Supabase project yet.

## Suggested focus next

Either: (a) actually run through `docs/DEPLOYMENT.md` yourself and report
back what breaks — that'll surface anything this sandbox couldn't catch,
or (b) make the partnership-model call so the real Session 7 (energy
provider integration) can finally get built.
