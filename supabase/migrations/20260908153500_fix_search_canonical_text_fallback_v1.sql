create or replace function public.search_canonical_representations_v1(
  p_query text default null,
  p_city text default null,
  p_district text default null,
  p_property_type text default null,
  p_intent text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_min_surface numeric default null,
  p_max_surface numeric default null,
  p_limit integer default 50,
  p_after_lane smallint default null,
  p_after_rank real default null,
  p_after_updated_at timestamptz default null,
  p_after_representation_id uuid default null
)
returns table(
  representation_id uuid, canonical_url text, source_domain text, seed_provider text,
  freshness_status text, title text, snippet text, normalized_city text,
  normalized_property_type text, normalized_intent text, normalized_price_mad numeric,
  normalized_surface_m2 numeric, price_per_m2_mad numeric, quality_tier text,
  quality_score smallint, display_eligibility text, display_eligibility_reason text,
  ranking_quality_boost real, updated_at timestamptz, lane_weight smallint,
  ranking_score real, total_count bigint
)
language sql stable security invoker set search_path = ''
as $function$
with normalized as (
  select v.*,
    lower(public.unaccent(concat_ws(' ', v.title, v.snippet, v.city, v.district, v.property_type, v.transaction_type, v.canonical_url))) as haystack,
    case
      when lower(btrim(coalesce(p_intent,''))) in ('buy','sale','sell','acheter','achat','vente','vendre') then 'sale'
      when lower(btrim(coalesce(p_intent,''))) in ('rent','rental','louer','location') then 'rent'
      when lower(btrim(coalesce(p_intent,''))) in ('new','neuf') then 'new'
      else lower(btrim(coalesce(p_intent,'')))
    end as wanted_intent,
    case
      when lower(btrim(coalesce(p_property_type,''))) in ('appartement','apartment','appart') then 'apartment'
      when lower(btrim(coalesce(p_property_type,''))) = 'villa' then 'villa'
      when lower(btrim(coalesce(p_property_type,''))) in ('maison','house') then 'house'
      when lower(btrim(coalesce(p_property_type,''))) in ('terrain','land') then 'land'
      when lower(btrim(coalesce(p_property_type,''))) = 'riad' then 'riad'
      when lower(btrim(coalesce(p_property_type,''))) = 'studio' then 'studio'
      when lower(btrim(coalesce(p_property_type,''))) in ('bureau','office') then 'office'
      when lower(btrim(coalesce(p_property_type,''))) in ('commerce','commercial','local commercial') then 'commercial'
      else lower(btrim(coalesce(p_property_type,'')))
    end as wanted_type
  from public.listing_representations_canonical_v1 v
),
filtered as (
  select
    (substr(md5(n.canonical_url),1,8)||'-'||substr(md5(n.canonical_url),9,4)||'-'||substr(md5(n.canonical_url),13,4)||'-'||substr(md5(n.canonical_url),17,4)||'-'||substr(md5(n.canonical_url),21,12))::uuid as representation_id,
    n.*,
    case when n.title is not null and n.city is not null and n.price_mad is not null and n.surface_m2 is not null then 0
         when n.city is not null and (n.price_mad is not null or n.surface_m2 is not null) then 1 else 2 end::smallint as computed_lane_weight,
    (coalesce(n.quality_score,0)::real + coalesce(n.reliability_score,0)::real*0.5
      + case when n.title is not null then 8 else 0 end + case when n.city is not null then 6 else 0 end
      + case when n.district is not null then 4 else 0 end + case when n.price_mad is not null then 5 else 0 end
      + case when n.surface_m2 is not null then 5 else 0 end)::real as computed_ranking_score
  from normalized n
  where (nullif(btrim(p_city),'') is null or lower(public.unaccent(n.city)) = lower(public.unaccent(btrim(p_city))))
    and (nullif(btrim(p_district),'') is null or lower(public.unaccent(n.district)) = lower(public.unaccent(btrim(p_district))))
    and (p_min_price is null or n.price_mad >= p_min_price)
    and (p_max_price is null or n.price_mad <= p_max_price)
    and (p_min_surface is null or n.surface_m2 >= p_min_surface)
    and (p_max_surface is null or n.surface_m2 <= p_max_surface)
    and (
      nullif(btrim(p_property_type),'') is null
      or lower(coalesce(n.property_type,'')) = n.wanted_type
      or lower(public.unaccent(coalesce(n.property_type,''))) = lower(public.unaccent(btrim(p_property_type)))
      or (n.property_type is null and (
        (n.wanted_type='apartment' and n.haystack ~ '(appartement|apartment|appart)')
        or (n.wanted_type='villa' and n.haystack ~ 'villa')
        or (n.wanted_type='house' and n.haystack ~ '(maison|house)')
        or (n.wanted_type='land' and n.haystack ~ '(terrain|land)')
        or (n.wanted_type='riad' and n.haystack ~ 'riad')
        or (n.wanted_type='studio' and n.haystack ~ 'studio')
        or (n.wanted_type='office' and n.haystack ~ '(bureau|office)')
        or (n.wanted_type='commercial' and n.haystack ~ '(commerce|commercial|local commercial)')
      ))
    )
    and (
      nullif(btrim(p_intent),'') is null
      or lower(coalesce(n.transaction_type,'')) = n.wanted_intent
      or (n.wanted_intent='sale' and lower(coalesce(n.transaction_type,'')) in ('buy','sale','vente','achat'))
      or (n.wanted_intent='rent' and lower(coalesce(n.transaction_type,'')) in ('rent','location'))
      or (n.wanted_intent='new' and lower(coalesce(n.transaction_type,'')) in ('new','neuf'))
      or (n.transaction_type is null and (
        (n.wanted_intent='sale' and n.haystack ~ '(vendre|vente|a vendre|à vendre|for sale)')
        or (n.wanted_intent='rent' and n.haystack ~ '(louer|location|a louer|à louer|for rent)')
        or (n.wanted_intent='new' and n.haystack ~ '(neuf|new)')
      ))
    )
    and (nullif(btrim(p_query),'') is null or not exists (
      select 1 from unnest(regexp_split_to_array(lower(public.unaccent(btrim(p_query))), '[^a-z0-9]+')) q(tok)
      where length(q.tok)>=2 and n.haystack not like '%'||q.tok||'%'
    ))
), counted as (
  select f.*, count(*) over() as full_total_count from filtered f
), after_cursor as (
  select c.* from counted c where p_after_lane is null
    or c.computed_lane_weight > p_after_lane
    or (c.computed_lane_weight=p_after_lane and c.computed_ranking_score < coalesce(p_after_rank,c.computed_ranking_score))
    or (c.computed_lane_weight=p_after_lane and c.computed_ranking_score=p_after_rank and c.updated_at < p_after_updated_at)
    or (c.computed_lane_weight=p_after_lane and c.computed_ranking_score=p_after_rank and c.updated_at=p_after_updated_at and c.representation_id < p_after_representation_id)
), page as (
  select * from after_cursor order by computed_lane_weight asc, computed_ranking_score desc, updated_at desc nulls last, representation_id desc
  limit least(greatest(coalesce(p_limit,50),1),101)
)
select p.representation_id,p.canonical_url,p.source_domain,p.canonical_source_system,p.freshness_status,p.title,p.snippet,
  p.city,p.property_type,p.transaction_type,p.price_mad,p.surface_m2,p.price_per_m2_mad,null::text,
  case when p.quality_score is null then null else least(greatest(round(p.quality_score)::integer,0),100)::smallint end,
  coalesce(p.display_eligibility,'eligible_secondary'),'canonical_union_v1'::text,p.computed_ranking_score,p.updated_at,
  p.computed_lane_weight,p.computed_ranking_score,p.full_total_count from page p;
$function$;
