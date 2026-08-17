-- Adds the Gemini (Vertex AI) plausibility review to solar_profiles —
-- the only verification layer this table has ever had.

alter table public.solar_profiles
  add column if not exists ai_plausible boolean;

alter table public.solar_profiles
  add column if not exists ai_review_note text;
