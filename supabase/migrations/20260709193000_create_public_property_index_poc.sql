create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public_property_index (
  id uuid primary key default gen_random_uuid(),
  source_host text not null,
  source_url text not null unique,
  title text not null,
  short_snippet text,
  inferred_city text,
  inferred_neighborhood text,
  inferred_property_type text,
  inferred_transaction_type text,
  public_price numeric,
  public_surface numeric,
  result_source text not null default 'openserp_async_poc',
  provider_engine text,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  observation_count integer not null default 1,
  fts_vector tsvector generated always as (
    setweight(to_tsvector('french', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(short_snippet, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(inferred_city, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(inferred_neighborhood, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(inferred_property_type, '')), 'C') ||
    setweight(to_tsvector('french', coalesce(inferred_transaction_type, '')), 'C')
  ) stored
);

alter table public_property_index enable row level security;

create index if not exists public_property_index_fts_idx
on public_property_index using gin (fts_vector);

create index if not exists public_property_index_city_trgm_idx
on public_property_index using gin (inferred_city gin_trgm_ops);

create index if not exists public_property_index_neighborhood_trgm_idx
on public_property_index using gin (inferred_neighborhood gin_trgm_ops);

create index if not exists public_property_index_source_host_idx
on public_property_index (source_host);

create index if not exists public_property_index_observed_at_idx
on public_property_index (observed_at desc);

create index if not exists public_property_index_city_type_tx_idx
on public_property_index (
  inferred_city,
  inferred_property_type,
  inferred_transaction_type
);
