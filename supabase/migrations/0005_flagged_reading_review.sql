-- Session 9 — manual review queue for flagged telemetry readings
-- Until now, readings excluded from a batch (Session 4's plausibility
-- bound, Session 6's statistical anomaly check) were just silently left
-- unbatched forever, with no record of why and no way to reconsider them.
-- This makes flagging a real, reviewable state instead of a dead end.

alter table public.telemetry_readings
  add column if not exists flagged boolean not null default false;

alter table public.telemetry_readings
  add column if not exists flag_reason text
    check (flag_reason is null or flag_reason in ('implausible_value', 'statistical_anomaly'));

alter table public.telemetry_readings
  add column if not exists review_status text
    check (review_status is null or review_status in ('pending', 'approved', 'rejected'));

create index if not exists telemetry_readings_flagged_idx
  on public.telemetry_readings (flagged, review_status)
  where flagged = true;
