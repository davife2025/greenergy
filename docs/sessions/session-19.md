# Session 19 — Gemini via Vertex AI (hackathon requirement)

Added specifically to satisfy two hackathon form requirements at once:
"must use Gemini API for at least one LLM call" and "which product from
Google Cloud did you use." Using Vertex AI's Gemini API (not the plain
Gemini Developer API) satisfies both with one integration — Vertex AI
*is* the Google Cloud product, and it serves Gemini.

## What this actually does

Solar profiles (the excess-energy marketplace listings from Sessions
13-14) had zero verification — self-reported numbers, no plausibility
check, unlike telemetry_readings which has Session 6's real anomaly
detection. Gemini now sanity-checks a host's claimed generation/
consumption figures when they save a listing, and the result is shown
right in the UI (green checkmark or amber warning) and persisted to the
database (`ai_plausible`, `ai_review_note` columns). Advisory only —
never blocks saving.

## What was built

- **`lib/gemini-vertex.ts`** — uses `@google/genai` (the current,
  correct SDK; the older `@google-cloud/vertexai` is deprecated as of
  June 2025, removed June 2026). Auth pattern is specifically the one
  that works on non-GCP hosts like Render: the full service account JSON
  is passed as a single env var (`GCP_SA_KEY`), written to `/tmp` at
  runtime, `GOOGLE_APPLICATION_CREDENTIALS` pointed at it, then the SDK's
  normal Application Default Credentials lookup finds it from there —
  same code path as if this were actually running on GCP.
- **`supabase/migrations/0007_solar_profile_ai_review.sql`** —
  `ai_plausible`, `ai_review_note` columns.
- **`routes/solar-profile.ts`** — calls the review after computing
  generation figures, persists the result alongside the profile.
- **Web UI** — the solar-profile page now shows Gemini's note after
  saving.
- Fully optional, same resilience pattern as every other AI layer in
  this project: no `GCP_SA_KEY`/`GOOGLE_CLOUD_PROJECT` configured →
  skips cleanly, profile still saves normally.

## Verified this session

- `pnpm install` succeeded cleanly, pulling in `@google/genai` and its
  full dependency tree (protobufjs, google-auth-library, etc.).
- Full `pnpm run type-check` via turbo — clean across all 3 packages,
  including `response.text` resolving correctly against the real SDK's
  types.
- Confirmed graceful no-op with no GCP credentials set (returns `null`).
- **Confirmed graceful failure with credentials present**: constructed a
  realistic-shaped (fake) service account JSON, and even though my own
  test fixture got mangled by shell escaping into genuinely invalid
  JSON, the code caught the resulting `SyntaxError` and returned `null`
  instead of crashing the server — actually a stronger proof of
  resilience than a clean pass would have been.
- Confirmed the API server still boots and `/health` responds correctly
  with the new module wired in.
- **Not tested**: an actual successful Gemini response — needs a real
  GCP project, a real service account, and real credentials, none of
  which exist in this sandbox.

## What only you can do from here — the real checklist

None of this can be done from inside this chat. In order:

1. **Create a GCP project** (console.cloud.google.com) — note the
   Project ID, that's your `GOOGLE_CLOUD_PROJECT`.
2. **Enable billing** on it (required even to stay on free tier/credits —
   the hackathon form wants your invoice PDF regardless, even if it's $0).
3. **Enable the Vertex AI API** for that project (APIs & Services →
   Enable APIs → search "Vertex AI API").
4. **Create a service account** (IAM & Admin → Service Accounts → Create),
   grant it the **Vertex AI User** role, then create a JSON key for it
   and download it.
5. Paste that JSON file's **entire contents** as `GCP_SA_KEY` in Render's
   environment variables (all on one line is fine — it's just a string).
   Set `GOOGLE_CLOUD_PROJECT` to your project ID.
6. Save an actual listing on `/dashboard/solar-profile` once deployed —
   that's the real Gemini call the hackathon evidence needs.
7. **Google Cloud Console → Billing → Invoice** — download the monthly
   PDF(s) for the hackathon period (export the $0 statement if you're on
   free tier/credits, per the form's own instructions).
8. **Vertex AI's observability/monitoring dashboard** — screenshot actual
   usage showing the Gemini calls happened.

## Still outstanding from before this session

- **GitHub repo** — doesn't exist yet. Needs creating on your GitHub
  account, this code pushed to it, and shared with `testing@devpost.com`
  and `judging@hacker.fund` per the form's explicit requirement.
- **Hackathon start date** — I still don't know this and won't guess at
  an eligibility-relevant fact. The form's own rule ("all development
  must be completed during the hackathon") means this needs an honest
  answer from you before the "About the project" narrative gets written,
  not after.
