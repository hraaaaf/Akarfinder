-- MOROCCO-NEIGHBORHOOD-INTELLIGENCE-REFERENCE-V2 — #19D0

create table if not exists public.neighborhood_reference_entities (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  city_slug text not null,
  neighborhood text not null,
  neighborhood_slug text not null,
  aliases jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active','merged','deprecated')),
  merged_into_id uuid references public.neighborhood_reference_entities(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(city_slug, neighborhood_slug)
);

create table if not exists public.neighborhood_intelligence_snapshots (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references public.neighborhood_reference_entities(id) on delete cascade,
  schema_version text not null,
  objective_facts jsonb not null default '{}'::jsonb,
  analysis jsonb not null default '{}'::jsonb,
  akar_scores jsonb not null default '{}'::jsonb,
  source_refs jsonb not null default '[]'::jsonb,
  record_confidence text not null default 'unknown' check (record_confidence in ('high','medium','low','unknown')),
  effective_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft','published','superseded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists neighborhood_intelligence_one_published_current_idx
  on public.neighborhood_intelligence_snapshots(neighborhood_id, schema_version)
  where status='published';
create index if not exists neighborhood_reference_city_idx
  on public.neighborhood_reference_entities(city_slug, status);
create index if not exists neighborhood_intelligence_effective_idx
  on public.neighborhood_intelligence_snapshots(neighborhood_id, effective_at desc);

alter table public.neighborhood_reference_entities enable row level security;
alter table public.neighborhood_intelligence_snapshots enable row level security;

grant select on public.neighborhood_reference_entities to anon, authenticated;
grant select on public.neighborhood_intelligence_snapshots to anon, authenticated;

create policy neighborhood_reference_active_public_select
on public.neighborhood_reference_entities for select
to anon, authenticated
using (status = 'active');

create policy neighborhood_intelligence_published_public_select
on public.neighborhood_intelligence_snapshots for select
to anon, authenticated
using (status = 'published');

comment on table public.neighborhood_intelligence_snapshots is
'Versioned neighborhood intelligence. objective_facts, analysis and akar_scores are intentionally separate. Missing evidence must remain null/unknown rather than guessed.';
comment on column public.neighborhood_intelligence_snapshots.akar_scores is
'AkarFinder derived scores only. Every non-null score must carry evidence references, confidence and method version.';
