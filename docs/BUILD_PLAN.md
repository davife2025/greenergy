# Greenenergy — Build Plan

How the build is broken into sessions. Each session after Session 1 ships
only **new/changed files** (with a short patch note on where each file goes
in your Session 1 base) — not a full re-zip of the whole repo.

| # | Session | Delivers | Depends on |
|---|---|---|---|
| 1 | **Core infrastructure** ✅ done | Turborepo scaffold, `apps/web` (Next.js landing page), `apps/api` (Fastify + health checks), `packages/types`, `supabase/schema.sql` | — |
| 2 | **Auth + account linking (stub)** | Supabase Auth sign-up/login (phone-first, since mobile money is phone-tied), user profile creation, a manual/mock "energy provider link" flow so the product has a real user + linked-account object to work with | Session 1 |
| 3 | **Synthetic telemetry + dashboard shell** | A generator that fakes realistic kWh readings for linked accounts, plus a basic user dashboard (`apps/web`) showing usage over time — gives you something to click through and react to before we build real partner integrations | Session 2 |
| 4 | **Carbon batch aggregation logic** | The job that pools telemetry across users into `carbon_batches`, estimates tons CO2e, and moves batches through pending → verified status | Session 3 |
| 5 | **Payout flow** | Mobile money payout integration (Flutterwave or Paystack — needs your decision), `payouts` records created from sold batches, payout history in the dashboard | Session 4 |
| 6 | **AI verification / fraud-detection layer** | Anomaly detection on telemetry before a batch is marked "verified" — starts as rule-based checks, upgradeable to a real ML/Vertex AI pass later | Session 4 |
| 7 | **Real energy-provider integration** | Replace the manual/mock link from Session 2 with a real M-KOPA/Sun King/BBOXX (or whichever partner is signed) API integration | **Business decision needed** — see below |
| 8 | **Polish + deploy** | CI, error states, mobile responsiveness pass, deploy `apps/web` (Vercel) + `apps/api` (Fly/Render) + Supabase production project | Sessions 2–6 |

## Decisions this plan is currently blocked on

- **Session 5** — which mobile money payout provider (Flutterwave vs Paystack vs direct telco API)?
- **Session 7** — partner-integration model (B2B2C through PAYG companies, vs. individuals self-linking any account, vs. hybrid) — this was left unresolved earlier and doesn't block Sessions 2–4 since those use synthetic/manual data, but it does block Session 7.

Everything through Session 6 can proceed using synthetic/manual data without that decision being made yet — so it's not an immediate blocker, just something to resolve before Session 7.
