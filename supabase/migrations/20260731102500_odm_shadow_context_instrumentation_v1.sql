alter table public.odm_shadow_divergence_events_v1
  add column if not exists context_city text,
  add column if not exists context_property_type text,
  add column if not exists context_transaction_type text,
  add column if not exists context_has_text_query boolean not null default false,
  add column if not exists context_has_price_filter boolean not null default false,
  add column if not exists context_has_surface_filter boolean not null default false,
  add column if not exists context_limit integer,
  add column if not exists context_offset integer,
  add column if not exists context_is_paginated boolean not null default false;

create index if not exists odm_shadow_context_city_created_idx
  on public.odm_shadow_divergence_events_v1 (context_city, created_at desc);

create index if not exists odm_shadow_context_dimensions_created_idx
  on public.odm_shadow_divergence_events_v1
  (context_property_type, context_transaction_type, created_at desc);

create or replace view public.odm_shadow_context_report_v1
with (security_invoker = true)
as
select
  coalesce(nullif(context_city, ''), '__all__') as city,
  coalesce(nullif(context_property_type, ''), '__all__') as property_type,
  coalesce(nullif(context_transaction_type, ''), '__all__') as transaction_type,
  context_has_text_query as has_text_query,
  context_has_price_filter as has_price_filter,
  context_has_surface_filter as has_surface_filter,
  context_is_paginated as is_paginated,
  count(*)::bigint as event_count,
  count(*) filter (where legacy_result_count > 0)::bigint as events_with_legacy,
  count(*) filter (where odm_result_count > 0)::bigint as events_with_odm,
  count(*) filter (where canonical_overlap_count > 0)::bigint as events_with_overlap,
  avg(canonical_overlap_rate)::double precision as avg_overlap_rate,
  avg(rank_overlap_at_10)::double precision as avg_rank_overlap_at_10,
  sum(trusted_price_comparisons)::bigint as price_comparisons,
  sum(trusted_price_divergences)::bigint as price_divergences,
  sum(trusted_surface_comparisons)::bigint as surface_comparisons,
  sum(trusted_surface_divergences)::bigint as surface_divergences,
  min(created_at) as first_event_at,
  max(created_at) as last_event_at
from public.odm_shadow_divergence_events_v1
where created_at >= now() - interval '14 days'
group by 1,2,3,4,5,6,7;

revoke all on public.odm_shadow_context_report_v1 from public, anon, authenticated;
grant select on public.odm_shadow_context_report_v1 to service_role;
