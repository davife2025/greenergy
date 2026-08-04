-- Session 6 — AI review layer
-- Stores the optional AI-generated review note for a carbon batch,
-- alongside its deterministic verification status.

alter table public.carbon_batches
  add column if not exists review_notes text;
