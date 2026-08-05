-- Session 8 — self-serve usage reporting
-- Individuals report their own usage directly rather than the platform
-- depending on a PAYG-company partnership that was never secured
-- (see docs/sessions/session-08.md for the reasoning).

-- Distinguish where a reading came from.
alter table public.telemetry_readings
  add column if not exists source text not null default 'synthetic'
    check (source in ('synthetic', 'self_reported', 'partner_api'));

alter table public.telemetry_readings
  add column if not exists evidence_url text;

-- Storage bucket for optional photo evidence (meter photo, PAYG app
-- screenshot/receipt) backing a self-reported reading. Private by
-- default — access goes through signed URLs, not a public bucket.
insert into storage.buckets (id, name, public)
values ('usage-evidence', 'usage-evidence', false)
on conflict (id) do nothing;

-- Users can only upload/read files under a path prefixed with their own
-- user id (enforced by apps/web uploading to `${userId}/...`).
create policy "Users can upload their own evidence"
  on storage.objects for insert
  with check (
    bucket_id = 'usage-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view their own evidence"
  on storage.objects for select
  using (
    bucket_id = 'usage-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
