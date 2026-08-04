-- Greenenergy — core schema (Session 1)
-- Apply via the Supabase SQL editor or `supabase db push`.

create extension if not exists "pgcrypto";

-- ── Users ─────────────────────────────────────────────────
-- Mirrors auth.users (Supabase Auth) with app-specific fields.

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  phone_number text unique,
  mobile_money_provider text check (mobile_money_provider in ('opay', 'palmpay', 'moniepoint', 'mpesa')),
  mobile_money_identifier text,
  created_at timestamptz not null default now()
);

-- ── Energy provider links ────────────────────────────────
-- A user connects an existing PAYG solar / smart-meter provider account.
-- No hardware is owned by Greenenergy — this is a data partnership link.

create table if not exists public.energy_provider_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  provider text not null check (provider in ('m_kopa', 'sun_king', 'bboxx', 'manual')),
  external_account_id text not null,
  status text not null default 'active' check (status in ('active', 'revoked', 'error')),
  linked_at timestamptz not null default now(),
  unique (provider, external_account_id)
);

-- ── Telemetry readings ────────────────────────────────────
-- Raw usage/generation data pulled from a linked provider.

create table if not exists public.telemetry_readings (
  id uuid primary key default gen_random_uuid(),
  energy_provider_link_id uuid not null references public.energy_provider_links (id) on delete cascade,
  kwh numeric(10, 4) not null check (kwh >= 0),
  reading_start timestamptz not null,
  reading_end timestamptz not null,
  ingested_at timestamptz not null default now(),
  check (reading_end > reading_start)
);

create index if not exists telemetry_readings_link_idx
  on public.telemetry_readings (energy_provider_link_id, reading_start);

-- ── Carbon batches ────────────────────────────────────────
-- Pooled, verified telemetry packaged for sale on a carbon registry.

create table if not exists public.carbon_batches (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'submitted', 'sold', 'rejected')),
  total_kwh numeric(12, 4) not null default 0,
  estimated_tons_co2e numeric(10, 4) not null default 0,
  registry_submission_id text,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

-- Join table: which telemetry readings were rolled into which batch.

create table if not exists public.carbon_batch_readings (
  carbon_batch_id uuid not null references public.carbon_batches (id) on delete cascade,
  telemetry_reading_id uuid not null references public.telemetry_readings (id) on delete cascade,
  primary key (carbon_batch_id, telemetry_reading_id)
);

-- ── Payouts ───────────────────────────────────────────────
-- A user's revenue share from a sold carbon batch, paid via mobile money.

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  carbon_batch_id uuid not null references public.carbon_batches (id) on delete restrict,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'NGN',
  mobile_money_reference text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists payouts_user_idx on public.payouts (user_id, created_at desc);

-- ── Row-level security ────────────────────────────────────
-- Users can only read their own data. All writes go through apps/api
-- using the service role key, which bypasses RLS by design.

alter table public.users enable row level security;
alter table public.energy_provider_links enable row level security;
alter table public.payouts enable row level security;

create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can view their own energy links"
  on public.energy_provider_links for select
  using (auth.uid() = user_id);

create policy "Users can view their own payouts"
  on public.payouts for select
  using (auth.uid() = user_id);
