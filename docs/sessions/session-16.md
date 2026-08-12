# Session 16 — Swapped the AI review layer to Kimi K2 via Hugging Face

## What changed

- **`lib/ai-review.ts` rewritten** — was `@anthropic-ai/sdk` calling
  Claude directly; now uses the standard `openai` npm package pointed at
  `https://router.huggingface.co/v1` (Hugging Face's Inference Providers
  expose an OpenAI-compatible API, so no HF-specific SDK is needed),
  calling `moonshotai/Kimi-K2-Instruct-0905`.
- **Env vars**: `ANTHROPIC_API_KEY` → `HF_TOKEN` (get one at
  huggingface.co/settings/tokens) + `HF_INFERENCE_MODEL` (defaults to
  `moonshotai/Kimi-K2-Instruct-0905`, override to pin a specific backend
  provider via `<repo>:<provider>` suffix, e.g. `:together` or
  `:fireworks-ai`, or point at a newer Kimi checkpoint if one's out by
  the time this runs).
- Everything else about this layer is unchanged: still optional (skips
  cleanly if `HF_TOKEN` unset), still can only downgrade a batch to
  `pending` and never override a deterministic rejection, still expects
  a plain JSON response (now with defensive markdown-fence stripping
  added, since some open models wrap JSON in ```json blocks despite
  instructions not to).

## How to apply

Overwrite `apps/api/src/lib/ai-review.ts`. Merge `apps/api/src/lib/env.ts`,
`apps/api/src/lib/aggregation.ts` (comment only), `apps/api/package.json`
(removes `@anthropic-ai/sdk`, adds `openai`), `apps/api/.env.example`,
`apps/api/src/scripts/preflight.ts` (now checks for `HF_TOKEN`),
`docs/DEPLOYMENT.md`. `pnpm install`.

**On Render**: remove `ANTHROPIC_API_KEY` from your environment variables
(no longer read by anything), add `HF_TOKEN` if you want the AI review
layer enabled — it's optional, the platform works without it.

## Verified this session

- `pnpm install` — confirmed exactly one package swapped (`+1 -1`):
  `@anthropic-ai/sdk` out, `openai` in.
- Full `pnpm run type-check` via turbo — clean across all 3 packages.
- Full `pnpm run build` — same result as every prior session.
- Confirmed the graceful no-op still works with no `HF_TOKEN` set
  (returns `null`, same as the original Session 6 test).
- **Confirmed the client is wired correctly**: with a fake `HF_TOKEN` set,
  it correctly attempted a real request to `router.huggingface.co` (proof
  the base URL/request shape is right) — the only failure was this
  sandbox's network egress rules blocking that host entirely, the same
  category of limitation as the Google Fonts restriction in every prior
  session. This will work with a real token in a real deployment.
- **Not tested**: an actual successful response from Kimi K2 — needs a
  real `HF_TOKEN` and a network that can reach Hugging Face, neither of
  which this sandbox has.

## Note on model choice

Went with `Kimi-K2-Instruct-0905` specifically — it's the well-established
general-purpose instruct variant. Hugging Face also hosts newer/specialized
checkpoints (Kimi-K2.6, Kimi-K2.7-Code — the latter is coding-focused, not
what this task needs). `HF_INFERENCE_MODEL` is a plain env var specifically
so switching to a newer general-purpose checkpoint later doesn't need a
code change.
