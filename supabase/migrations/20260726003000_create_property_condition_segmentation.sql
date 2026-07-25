-- P0 DATA M3.5 — additive property-condition intelligence.
create table if not exists public.property_condition_observations (
  id uuid primary key default gen_random_uuid(),
  listing_id bigint not null references public.property_listings(id) on delete cascade,
  condition_segment text not null check (condition_segment in ('vefa','new_delivered','recent','renovated_old','good_condition','needs_refresh','needs_renovation','old_unspecified','unknown')),
  confidence numeric not null default 0 check (confidence between 0 and 1),
  evidence jsonb not null default '{}'::jsonb,
  methodology_version text not null,
  input_snapshot_id text not null,
  observed_at timestamptz not null default now(),
  unique(listing_id, methodology_version, input_snapshot_id)
);

alter table public.property_condition_observations enable row level security;
revoke all on public.property_condition_observations from anon, authenticated;
create index if not exists property_condition_listing_idx on public.property_condition_observations(listing_id);
create index if not exists property_condition_segment_idx on public.property_condition_observations(condition_segment, confidence);

alter table public.price_m2_references
  add column if not exists condition_segment text not null default 'all'
  check (condition_segment in ('all','vefa','new_delivered','recent','renovated_old','good_condition','needs_refresh','needs_renovation','old_unspecified','unknown'));

drop view if exists public.latest_price_m2_references;
create view public.latest_price_m2_references with (security_invoker=true) as
select distinct on (geo_entity_id, transaction_type, property_type, furnished_state, condition_segment)
  id, geo_entity_id, transaction_type, property_type, furnished_state, condition_segment,
  reference_period_start, reference_period_end, sample_size, median_price_m2,
  p25_price_m2, p75_price_m2, mean_price_m2, currency, confidence,
  quality_status, methodology_version, input_snapshot_id, calculated_at
from public.price_m2_references
where quality_status in ('provisional','reliable')
order by geo_entity_id, transaction_type, property_type, furnished_state, condition_segment,
  reference_period_end desc, calculated_at desc;

create or replace view public.latest_reliable_condition_price_m2 with (security_invoker=true) as
select * from public.latest_price_m2_references
where quality_status='reliable' and condition_segment <> 'unknown';

revoke all on public.latest_price_m2_references from anon, authenticated;
revoke all on public.latest_reliable_condition_price_m2 from anon, authenticated;

-- ROLLBACK
-- drop view if exists public.latest_reliable_condition_price_m2;
-- alter table public.price_m2_references drop column if exists condition_segment;
-- drop table if exists public.property_condition_observations;