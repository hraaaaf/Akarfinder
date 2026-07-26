begin;

create table if not exists public.property_intelligence_features (
  id uuid primary key default gen_random_uuid(),
  canonical_property_id text not null,
  feature_key text not null,
  feature_value jsonb,
  confidence double precision not null check (confidence >= 0 and confidence <= 1),
  feature_status text not null check (feature_status in ('observed','inferred','unknown','conflicted')),
  method text not null,
  methodology_version text not null,
  evidence jsonb not null default '[]'::jsonb,
  input_snapshot text not null,
  source_observation_ids jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  valid_until timestamptz,
  superseded_at timestamptz,
  publication_eligible boolean not null default false,
  created_at timestamptz not null default now(),
  unique (canonical_property_id, feature_key, methodology_version, input_snapshot)
);

create index if not exists property_intelligence_features_lookup_idx
  on public.property_intelligence_features (canonical_property_id, feature_key, generated_at desc);
create index if not exists property_intelligence_features_public_idx
  on public.property_intelligence_features (feature_key, publication_eligible, confidence)
  where superseded_at is null;

create table if not exists public.property_intelligence_scores (
  id uuid primary key default gen_random_uuid(),
  canonical_property_id text not null,
  score_key text not null check (score_key in ('ACI','AQI','AVI','ALI','AFI','AII')),
  score_value double precision check (score_value is null or (score_value >= 0 and score_value <= 100)),
  confidence double precision not null check (confidence >= 0 and confidence <= 1),
  coverage double precision not null check (coverage >= 0 and coverage <= 1),
  score_status text not null check (score_status in ('blocked','internal','public_candidate','published')),
  blockers jsonb not null default '[]'::jsonb,
  contributions jsonb not null default '[]'::jsonb,
  methodology_version text not null,
  input_snapshot text not null,
  generated_at timestamptz not null default now(),
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (canonical_property_id, score_key, methodology_version, input_snapshot)
);

create index if not exists property_intelligence_scores_lookup_idx
  on public.property_intelligence_scores (canonical_property_id, score_key, generated_at desc);

alter table public.property_intelligence_features enable row level security;
alter table public.property_intelligence_scores enable row level security;

create or replace view public.latest_internal_property_intelligence_features
with (security_invoker = true)
as
select distinct on (canonical_property_id, feature_key)
  canonical_property_id, feature_key, feature_value, confidence, feature_status,
  method, methodology_version, evidence, generated_at, valid_until, publication_eligible
from public.property_intelligence_features
where superseded_at is null
order by canonical_property_id, feature_key, generated_at desc;

create or replace view public.latest_internal_property_intelligence_scores
with (security_invoker = true)
as
select distinct on (canonical_property_id, score_key)
  canonical_property_id, score_key, score_value, confidence, coverage,
  score_status, blockers, contributions, methodology_version, generated_at
from public.property_intelligence_scores
where superseded_at is null
order by canonical_property_id, score_key, generated_at desc;

comment on table public.property_intelligence_features is
  'Versioned, additive Akar Intelligence Layer features. Source observations remain immutable.';
comment on table public.property_intelligence_scores is
  'Explainable property intelligence scores with coverage, confidence and blockers.';

commit;
