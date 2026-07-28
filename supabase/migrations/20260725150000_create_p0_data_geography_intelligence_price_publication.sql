-- AKARFINDER P0 DATA M1-M4
-- Objective: create the persistent canonical geography, neighborhood intelligence,
-- price-per-m2 reference and publication foundation without bypassing legacy reads.
-- Preconditions: Supabase/Postgres with pgcrypto available; existing listing tables are untouched.
-- Impact: additive tables, indexes, RLS and read-only published views only.
-- Re-run behavior: idempotent CREATE IF NOT EXISTS and conflict-safe seed inserts.
-- Lock estimate: metadata locks only on newly-created objects; no lock on property_listings.
-- Manual rollback is documented at the end and is never auto-applied.

create extension if not exists pgcrypto;

create table if not exists public.geo_entities (
  id text primary key,
  entity_type text not null check (entity_type in ('city','neighborhood')),
  parent_id text references public.geo_entities(id) on delete restrict,
  slug text not null,
  canonical_name text not null,
  normalized_name text not null,
  validation_status text not null default 'pending_review' check (validation_status in ('validated','pending_review','rejected')),
  seo_eligible boolean not null default false,
  map_eligible boolean not null default false,
  source_version text not null default 'v1',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_type, parent_id, slug)
);

create table if not exists public.geo_aliases (
  id uuid primary key default gen_random_uuid(),
  geo_entity_id text not null references public.geo_entities(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  locale text,
  source text not null default 'registry_v1',
  confidence numeric(5,4) not null default 1 check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  unique(geo_entity_id, normalized_alias)
);

create table if not exists public.geo_resolution_events (
  id uuid primary key default gen_random_uuid(),
  raw_city text,
  raw_neighborhood text,
  resolved_city_id text references public.geo_entities(id) on delete set null,
  resolved_neighborhood_id text references public.geo_entities(id) on delete set null,
  resolution_status text not null check (resolution_status in ('resolved','ambiguous','unresolved')),
  candidates jsonb not null default '[]'::jsonb,
  source_record_type text,
  source_record_id text,
  resolver_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.neighborhood_intelligence_profiles (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id text not null references public.geo_entities(id) on delete restrict,
  profile_version integer not null,
  status text not null default 'draft' check (status in ('draft','reviewed','published','superseded')),
  summary_fr text,
  summary_ar text,
  lifestyle_tags text[] not null default '{}',
  property_type_mix jsonb not null default '{}'::jsonb,
  amenity_signals jsonb not null default '{}'::jsonb,
  mobility_signals jsonb not null default '{}'::jsonb,
  market_signals jsonb not null default '{}'::jsonb,
  evidence_count integer not null default 0 check (evidence_count >= 0),
  confidence numeric(5,4) not null default 0 check (confidence between 0 and 1),
  methodology_version text not null,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  generated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  published_at timestamptz,
  unique(neighborhood_id, profile_version)
);

create table if not exists public.price_m2_references (
  id uuid primary key default gen_random_uuid(),
  geo_entity_id text not null references public.geo_entities(id) on delete restrict,
  transaction_type text not null check (transaction_type in ('sale','rent')),
  property_type text not null,
  furnished_state text not null default 'all',
  reference_period_start date not null,
  reference_period_end date not null,
  sample_size integer not null check (sample_size >= 0),
  median_price_m2 numeric(14,2),
  p25_price_m2 numeric(14,2),
  p75_price_m2 numeric(14,2),
  mean_price_m2 numeric(14,2),
  currency text not null default 'MAD',
  confidence numeric(5,4) not null default 0 check (confidence between 0 and 1),
  quality_status text not null default 'insufficient' check (quality_status in ('insufficient','provisional','reliable')),
  methodology_version text not null,
  input_snapshot_id text not null,
  calculated_at timestamptz not null default now(),
  unique(geo_entity_id, transaction_type, property_type, furnished_state, reference_period_end, methodology_version)
);

create table if not exists public.data_publication_batches (
  id uuid primary key default gen_random_uuid(),
  batch_type text not null check (batch_type in ('geography','neighborhood_intelligence','price_m2','full')),
  status text not null default 'draft' check (status in ('draft','validated','published','failed','rolled_back')),
  input_snapshot_id text not null,
  methodology_versions jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  validation_report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  published_at timestamptz,
  rolled_back_at timestamptz
);

create table if not exists public.data_publication_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.data_publication_batches(id) on delete cascade,
  item_type text not null check (item_type in ('geo_entity','neighborhood_profile','price_m2_reference')),
  item_id text not null,
  previous_item_id text,
  publication_action text not null check (publication_action in ('publish','supersede','withdraw')),
  created_at timestamptz not null default now(),
  unique(batch_id, item_type, item_id)
);

create index if not exists geo_entities_parent_idx on public.geo_entities(parent_id);
create index if not exists geo_entities_normalized_idx on public.geo_entities(entity_type, normalized_name);
create index if not exists geo_aliases_normalized_idx on public.geo_aliases(normalized_alias);
create index if not exists geo_resolution_status_idx on public.geo_resolution_events(resolution_status, created_at desc);
create index if not exists neighborhood_profiles_lookup_idx on public.neighborhood_intelligence_profiles(neighborhood_id, status, profile_version desc);
create index if not exists price_m2_lookup_idx on public.price_m2_references(geo_entity_id, transaction_type, property_type, reference_period_end desc);
create index if not exists publication_batches_status_idx on public.data_publication_batches(status, created_at desc);

alter table public.geo_entities enable row level security;
alter table public.geo_aliases enable row level security;
alter table public.geo_resolution_events enable row level security;
alter table public.neighborhood_intelligence_profiles enable row level security;
alter table public.price_m2_references enable row level security;
alter table public.data_publication_batches enable row level security;
alter table public.data_publication_items enable row level security;

create or replace view public.published_neighborhood_intelligence
with (security_invoker = true) as
select distinct on (p.neighborhood_id)
  p.*, g.slug as neighborhood_slug, g.canonical_name as neighborhood_name, g.parent_id as city_id
from public.neighborhood_intelligence_profiles p
join public.geo_entities g on g.id = p.neighborhood_id
where p.status = 'published' and p.valid_from <= now() and (p.valid_to is null or p.valid_to > now())
order by p.neighborhood_id, p.profile_version desc;

create or replace view public.latest_price_m2_references
with (security_invoker = true) as
select distinct on (r.geo_entity_id, r.transaction_type, r.property_type, r.furnished_state)
  r.*
from public.price_m2_references r
where r.quality_status in ('provisional','reliable')
order by r.geo_entity_id, r.transaction_type, r.property_type, r.furnished_state, r.reference_period_end desc, r.calculated_at desc;

-- ROLLBACK (manual, not auto-applied):
-- drop view if exists public.latest_price_m2_references;
-- drop view if exists public.published_neighborhood_intelligence;
-- drop table if exists public.data_publication_items;
-- drop table if exists public.data_publication_batches;
-- drop table if exists public.price_m2_references;
-- drop table if exists public.neighborhood_intelligence_profiles;
-- drop table if exists public.geo_resolution_events;
-- drop table if exists public.geo_aliases;
-- drop table if exists public.geo_entities;
