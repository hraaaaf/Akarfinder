-- AKARFINDER DATA ENGINE / P1 — Mubawab Freshness Engine V1
-- Additive, idempotent schema for explainable per-listing freshness scoring.

alter table public.mubawab_listing_corpus_v1
  add column if not exists freshness_status text not null default 'uncertain',
  add column if not exists freshness_reasons jsonb not null default '[]'::jsonb,
  add column if not exists freshness_policy_version text,
  add column if not exists freshness_scored_at timestamptz;

alter table public.mubawab_listing_corpus_v1
  drop constraint if exists mubawab_listing_corpus_v1_freshness_status_check;

alter table public.mubawab_listing_corpus_v1
  add constraint mubawab_listing_corpus_v1_freshness_status_check
  check (freshness_status in ('fresh_confirmed','likely_active','uncertain','stale','archive'));

create index if not exists idx_mubawab_listing_corpus_v1_freshness_status
  on public.mubawab_listing_corpus_v1 (freshness_status);

create index if not exists idx_mubawab_listing_corpus_v1_freshness_score
  on public.mubawab_listing_corpus_v1 (freshness_score desc);

-- ROLLBACK (manual):
-- drop index if exists idx_mubawab_listing_corpus_v1_freshness_score;
-- drop index if exists idx_mubawab_listing_corpus_v1_freshness_status;
-- alter table public.mubawab_listing_corpus_v1 drop constraint if exists mubawab_listing_corpus_v1_freshness_status_check;
-- alter table public.mubawab_listing_corpus_v1
--   drop column if exists freshness_status,
--   drop column if exists freshness_reasons,
--   drop column if exists freshness_policy_version,
--   drop column if exists freshness_scored_at;
