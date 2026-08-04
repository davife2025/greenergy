# Greenenergy

A platform that aggregates verified clean-energy usage data from individuals (initially via energy-provider partnerships), turns it into carbon-credit-eligible batches, and shares the resulting carbon revenue back with users via mobile money — alongside a lightweight energy-insights subscription layer.

## Monorepo structure

```
greenenergy/
├── apps/
│   ├── web/        Next.js app (marketing site + user dashboard)
│   └── api/        Fastify + TypeScript API service
├── packages/
│   └── types/      Shared TypeScript types used by both apps
├── supabase/
│   └── schema.sql  Core database schema (Postgres, via Supabase)
├── turbo.json       Turborepo pipeline config
└── pnpm-workspace.yaml
```

## Getting started

```bash
pnpm install
cp .env.example .env      # fill in Supabase + provider keys
pnpm dev                  # runs apps/web and apps/api together
```

- `apps/web` runs on http://localhost:3000
- `apps/api` runs on http://localhost:4000

## Database

`supabase/schema.sql` contains the initial schema. Apply it via the Supabase SQL editor, or the Supabase CLI:

```bash
supabase db push
```

## Build sessions

This project is being built incrementally across chat sessions:

- **Session 1 (this one):** core infrastructure — monorepo scaffold, base Next.js + Fastify apps, shared types package, initial Supabase schema. Delivered as a full zip.
- **Session 2+:** feature work — auth, energy-account linking, telemetry ingestion, carbon aggregation logic, payout flow, dashboard UI. Delivered as changed/new files only, to be merged into the Session 1 base.

Each session's handoff notes (what changed, what to do next) will be added to `/docs/sessions/`.
