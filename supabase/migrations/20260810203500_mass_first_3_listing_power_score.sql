-- MASS-FIRST-3 — Listing Power Score
-- Deterministic 0..100 information-power score. It is intentionally independent
-- from legal/public eligibility and never grants display permission.

alter table public.thin_index_search_documents
  add column if not exists listing_power_score smallint,
  add column if not exists listing_power_breakdown jsonb,
  add column if not exists listing_power_version text;

create or replace function public.mass_first_listing_power_breakdown_v1(
  p_title text,
  p_snippet text,
  p_city text,
  p_property_type text,
  p_intent text,
  p_price numeric,
  p_surface numeric,
  p_quality_score integer,
  p_freshness_status text
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'price',case when p_price is not null and p_price > 0 then 12 else 0 end,
    'surface',case when p_surface is not null and p_surface > 0 then 10 else 0 end,
    'city',case when nullif(btrim(p_city),'') is not null then 10 else 0 end,
    'property_type',case when nullif(btrim(p_property_type),'') is not null then 10 else 0 end,
    'intent',case when nullif(btrim(p_intent),'') is not null then 8 else 0 end,
    'title',case when nullif(btrim(p_title),'') is not null then 5 else 0 end,
    'snippet',case when nullif(btrim(p_snippet),'') is not null then 5 else 0 end,
    'quality',round(20.0 * least(100,greatest(0,coalesce(p_quality_score,0))) / 100.0)::int,
    'freshness',case p_freshness_status when 'fresh_confirmed' then 20 when 'seed_only' then 8 else 0 end
  );
$$;

create or replace function public.mass_first_listing_power_score_v1(
  p_title text,
  p_snippet text,
  p_city text,
  p_property_type text,
  p_intent text,
  p_price numeric,
  p_surface numeric,
  p_quality_score integer,
  p_freshness_status text
)
returns smallint
language sql
immutable
set search_path = ''
as $$
  with b as (
    select public.mass_first_listing_power_breakdown_v1(
      p_title,p_snippet,p_city,p_property_type,p_intent,p_price,p_surface,p_quality_score,p_freshness_status
    ) value
  )
  select least(100,greatest(0,
    coalesce((value->>'price')::int,0)
    + coalesce((value->>'surface')::int,0)
    + coalesce((value->>'city')::int,0)
    + coalesce((value->>'property_type')::int,0)
    + coalesce((value->>'intent')::int,0)
    + coalesce((value->>'title')::int,0)
    + coalesce((value->>'snippet')::int,0)
    + coalesce((value->>'quality')::int,0)
    + coalesce((value->>'freshness')::int,0)
  ))::smallint from b;
$$;

create or replace function public.mass_first_set_listing_power_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.listing_power_breakdown := public.mass_first_listing_power_breakdown_v1(
    new.title,new.snippet,new.normalized_city,new.normalized_property_type,new.normalized_intent,
    new.normalized_price_mad,new.normalized_surface_m2,new.quality_score,new.freshness_status
  );
  new.listing_power_score := public.mass_first_listing_power_score_v1(
    new.title,new.snippet,new.normalized_city,new.normalized_property_type,new.normalized_intent,
    new.normalized_price_mad,new.normalized_surface_m2,new.quality_score,new.freshness_status
  );
  new.listing_power_version := 'listing-power-v1';
  return new;
end;
$$;

drop trigger if exists zzz_thin_index_listing_power_write on public.thin_index_search_documents;
create trigger zzz_thin_index_listing_power_write
before insert or update of
  title,snippet,normalized_city,normalized_property_type,normalized_intent,
  normalized_price_mad,normalized_surface_m2,quality_score,freshness_status
on public.thin_index_search_documents
for each row execute function public.mass_first_set_listing_power_v1();

alter table public.thin_index_search_documents
  drop constraint if exists thin_index_listing_power_score_check;
alter table public.thin_index_search_documents
  add constraint thin_index_listing_power_score_check check (
    listing_power_score is null or listing_power_score between 0 and 100
  );

create index if not exists thin_index_listing_power_rank_idx
  on public.thin_index_search_documents (listing_power_score desc, updated_at desc)
  where display_eligibility in ('eligible_primary','eligible_secondary');

create or replace function public.mass_first_3_listing_power_report_v1()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
select jsonb_build_object(
  'version','listing-power-v1',
  'rows',count(*),
  'scored_rows',count(*) filter(where listing_power_score is not null),
  'unscored_rows',count(*) filter(where listing_power_score is null),
  'min_score',min(listing_power_score),
  'max_score',max(listing_power_score),
  'avg_score',round(avg(listing_power_score),2),
  'eligibility_dependency',false
)
from public.thin_index_search_documents;
$$;

revoke all on function public.mass_first_3_listing_power_report_v1() from public,anon,authenticated;
grant execute on function public.mass_first_3_listing_power_report_v1() to service_role;

select public.mass_first_3_listing_power_report_v1();