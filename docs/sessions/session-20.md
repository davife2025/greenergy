# Session 20 — Hackathon research + listing visibility + landing page rewrite

## Hackathon research findings (Build with Gemini XPRIZE, geminixprize.com)

Pulled the actual official rules rather than guessing. Key findings:

- **Stripe is NOT required.** "Revenue evidence" just needs to exist — a
  Stripe export is one example, "bank statement" is explicitly an
  equally valid alternative. Paystack stays. Do not swap this.
- **Deadline: Aug 17, 2026, 1:00 PM PT** — roughly 24 hours from when
  this session was built. Not a loose "sometime Monday" target.
- **A demo video is required** (<3 min, YouTube/Vimeo/Youku, public) —
  not built yet, needs real time.
- **The actual biggest risk to this submission**: Stage Two's first
  judging criterion requires real revenue from real arms-length
  third-party customers during the hackathon period — not test
  transactions, not friends/family (reported separately, explicitly
  doesn't count). As of this session, no confirmed real transaction has
  happened yet. This matters more than any remaining code work.
- Projects must have been newly created after May 19, 2026 (hackathon
  submission period start) — still need the person's honest confirmation
  this holds, not something to assume.
- GitHub repo requirement confirmed as read originally: public, or
  private and shared with testing@devpost.com and judging@hacker.fund.
  Still doesn't exist.

## Bug fixes

### 1. New listings weren't appearing in search
Root cause: the "list publicly" checkbox on `/dashboard/solar-profile`
defaulted to unchecked, so a saved profile stayed private unless the
host took a separate, easy-to-miss action. Changed the default to
`true` — any saved listing (with real excess capacity) is visible
immediately. The checkbox still exists for anyone who wants to unlist.

### 2. Landing page still told the old (carbon-credit) story
The hero, the visual card, and the "how it works" steps all still
described Session 1-era carbon-credit revenue-share — not the
peer-to-peer excess-energy marketplace that's been the actual focus
since the pivot. Rewrote all three:
- Hero: "You have solar power to spare. Someone nearby needs it."
- Visual: a real marketplace transaction card (₦200, "neighbor 300m
  away," Paystack) instead of a monthly carbon payout.
- Steps: list your excess → someone nearby finds you → get paid
  instantly — matching what the product actually does today.

## How to apply

Overwrite `apps/web/app/page.tsx` and
`apps/web/app/dashboard/solar-profile/page.tsx`.

## Verified this session

- Full `pnpm run type-check` via turbo — clean across all 3 packages.
- Full `pnpm run build` — same result as every prior session (only the
  sandbox font limitation).

## What's actually left, in priority order given ~24 hours

1. Get one real, arms-length paid transaction to happen — the single
   highest-value thing left to do, and the one thing I can't do myself.
2. Create and share the GitHub repo.
3. Record the demo video.
4. Confirm the honest project-start-date answer against the May 19 –
   Aug 17 window.
5. Everything else flagged in Sessions 13-19 (still-unverified live
   integrations, pricing constants) is now explicitly lower priority
   than the four items above.
