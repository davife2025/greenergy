-- Session 2 — auth profile trigger
-- Automatically creates a public.users row right after someone verifies
-- via phone/email OTP (auth.users insert), so downstream tables
-- (energy_provider_links, payouts) always have a profile to reference.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, phone_number)
  values (new.id, new.email, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
