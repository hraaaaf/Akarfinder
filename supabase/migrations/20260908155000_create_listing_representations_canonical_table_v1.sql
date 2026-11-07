create table if not exists public.listing_representations (
  id uuid primary key,
  canonical_url text not null unique,
  canonical_source_system text not null,
  canonical_source_record_id text,
  source_systems text[] not null default '{}',
  source_copy_count integer not null default 1,
  source_domain text,
  title text,
  snippet text,
  city text,
  district text,
  property_type text,
  transaction_type text,
  price_mad numeric,
  surface_m2 numeric,
  price_per_m2_mad numeric,
  quality_score numeric,
  reliability_score numeric,
  display_eligibility text,
  freshness_status text,
  updated_at timestamptz,
  materialized_at timestamptz not null default now()
);

alter table public.listing_representations enable row level security;

insert into public.listing_representations (
  id, canonical_url, canonical_source_system, canonical_source_record_id,
  source_systems, source_copy_count, source_domain, title, snippet, city, district,
  property_type, transaction_type, price_mad, surface_m2, price_per_m2_mad,
  quality_score, reliability_score, display_eligibility, freshness_status, updated_at
)
select
  (substr(md5(v.canonical_url),1,8)||'-'||substr(md5(v.canonical_url),9,4)||'-'||substr(md5(v.canonical_url),13,4)||'-'||substr(md5(v.canonical_url),17,4)||'-'||substr(md5(v.canonical_url),21,12))::uuid,
  v.canonical_url, v.canonical_source_system, v.canonical_source_record_id,
  v.source_systems, v.source_copy_count, v.source_domain, v.title, v.snippet, v.city, v.district,
  v.property_type, v.transaction_type, v.price_mad, v.surface_m2, v.price_per_m2_mad,
  v.quality_score, v.reliability_score, v.display_eligibility, v.freshness_status, v.updated_at
from public.listing_representations_canonical_v1 v
on conflict (canonical_url) do update set
  canonical_source_system = excluded.canonical_source_system,
  canonical_source_record_id = excluded.canonical_source_record_id,
  source_systems = excluded.source_systems,
  source_copy_count = excluded.source_copy_count,
  source_domain = excluded.source_domain,
  title = excluded.title,
  snippet = excluded.snippet,
  city = excluded.city,
  district = excluded.district,
  property_type = excluded.property_type,
  transaction_type = excluded.transaction_type,
  price_mad = excluded.price_mad,
  surface_m2 = excluded.surface_m2,
  price_per_m2_mad = excluded.price_per_m2_mad,
  quality_score = excluded.quality_score,
  reliability_score = excluded.reliability_score,
  display_eligibility = excluded.display_eligibility,
  freshness_status = excluded.freshness_status,
  updated_at = excluded.updated_at,
  materialized_at = now();

create index if not exists listing_representations_city_idx on public.listing_representations (city);
create index if not exists listing_representations_district_idx on public.listing_representations (district);
create index if not exists listing_representations_property_type_idx on public.listing_representations (property_type);
create index if not exists listing_representations_transaction_type_idx on public.listing_representations (transaction_type);
create index if not exists listing_representations_price_idx on public.listing_representations (price_mad);
create index if not exists listing_representations_surface_idx on public.listing_representations (surface_m2);
create index if not exists listing_representations_updated_idx on public.listing_representations (updated_at desc, id desc);
create index if not exists listing_representations_city_type_intent_idx on public.listing_representations (city, property_type, transaction_type);
create index if not exists listing_representations_search_vector_idx on public.listing_representations using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(snippet,'') || ' ' || coalesce(city,'') || ' ' || coalesce(district,'') || ' ' || coalesce(property_type,'') || ' ' || coalesce(transaction_type,'')));
