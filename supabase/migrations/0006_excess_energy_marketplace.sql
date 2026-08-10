-- Session 13 — excess energy marketplace
-- A host's solar generation/consumption profile, and the resulting
-- excess capacity they can list. Deliberately a simple daily-average
-- model (not time-series) for a fast, honest MVP — no weather/irradiance
-- calculation, just a user-entered or wattage-estimated daily figure.

create table if not exists public.solar_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade unique,
  panel_watts numeric(10, 2),
  daily_generation_kwh numeric(10, 4) not null check (daily_generation_kwh >= 0),
  daily_consumption_kwh numeric(10, 4) not null check (daily_consumption_kwh >= 0),
  excess_kwh numeric(10, 4) generated always as (
    greatest(daily_generation_kwh - daily_consumption_kwh, 0)
  ) stored,
  location_text text not null,
  price_per_session_ngn numeric(10, 2) not null check (price_per_session_ngn > 0),
  is_listed boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists solar_profiles_listed_idx
  on public.solar_profiles (is_listed)
  where is_listed = true;

-- A seeker's request to access a host's excess energy. Payment is
-- collected upfront (Paystack Initialize Transaction — see Session 14);
-- the host is only paid out after the seeker confirms they actually
-- received the charge, which is the trust mechanism preventing a host
-- from being paid without delivering (or a seeker disputing a real
-- session).
create table if not exists public.energy_requests (
  id uuid primary key default gen_random_uuid(),
  seeker_id uuid not null references public.users (id) on delete cascade,
  host_id uuid not null references public.users (id) on delete cascade,
  solar_profile_id uuid not null references public.solar_profiles (id) on delete restrict,
  amount_ngn numeric(10, 2) not null,
  platform_commission_ngn numeric(10, 2) not null,
  host_payout_ngn numeric(10, 2) not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'confirmed', 'paid_out', 'cancelled', 'disputed')),
  paystack_reference text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  confirmed_at timestamptz
);

create index if not exists energy_requests_seeker_idx on public.energy_requests (seeker_id, created_at desc);
create index if not exists energy_requests_host_idx on public.energy_requests (host_id, created_at desc);

alter table public.solar_profiles enable row level security;
alter table public.energy_requests enable row level security;

create policy "Anyone can view listed solar profiles"
  on public.solar_profiles for select
  using (is_listed = true or auth.uid() = user_id);

create policy "Users can view requests they're party to"
  on public.energy_requests for select
  using (auth.uid() = seeker_id or auth.uid() = host_id);
