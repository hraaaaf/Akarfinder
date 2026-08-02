-- DATA V2 LOT 8 — Authorized Public Sitemap Acquisition V1
-- Persist already-observed public-sitemap URLs for canonical-link-only sources.

with candidates as (
  select distinct on (v.canonical_url)
    v.source_domain,
    v.canonical_url,
    v.observation_observed_at,
    v.seed_id,
    v.normalized_city,
    v.normalized_property_type,
    v.normalized_intent
  from public.odm_display_policy_shadow_v2 v
  where v.seed_provider='public_sitemap'
    and v.resolved_display_policy='canonical_link_only'
    and nullif(btrim(v.canonical_url),'') is not null
  order by v.canonical_url,v.observation_observed_at desc nulls last
)
insert into public.discovery_candidates(
  id,provider,discovery_query,query_hash,result_rank,source_domain,source_url,canonical_url,
  title,snippet,discovered_at,last_seen_at,discovery_status,compliance_status,
  content_fingerprint,metadata,created_at,updated_at
)
select gen_random_uuid(),
       'public_sitemap',
       'authorized_public_sitemap_backfill_v1:'||c.source_domain,
       md5('authorized_public_sitemap_backfill_v1|'||c.source_domain),
       row_number() over(partition by c.source_domain order by c.canonical_url)::integer,
       c.source_domain,c.canonical_url,c.canonical_url,
       null,null,
       coalesce(c.observation_observed_at,now()),coalesce(c.observation_observed_at,now()),
       'discovered','canonical_link_only',
       md5(c.canonical_url),
       jsonb_build_object(
         'backfill_version','authorized_public_sitemap_acquisition_v1',
         'source_policy','canonical_link_only',
         'detail_fetch',false,
         'content_reuse',false,
         'seed_id',c.seed_id,
         'normalized_city',c.normalized_city,
         'normalized_property_type',c.normalized_property_type,
         'normalized_intent',c.normalized_intent,
         'shadow_only',true,
         'public_activation',false
       ),now(),now()
from candidates c
on conflict do nothing;

create or replace function public.odm_authorized_public_sitemap_acquisition_report_v1()
returns jsonb
language sql
stable
set search_path=''
as $$
with s as (
  select count(*) as persisted_rows,
         count(distinct source_domain) as source_count,
         count(*) filter(where title is not null or snippet is not null) as content_rows,
         count(*) filter(where compliance_status<>'canonical_link_only') as wrong_policy_rows,
         count(*) filter(where metadata#>>'{detail_fetch}'<>'false') as detail_fetch_rows,
         count(*) filter(where metadata#>>'{content_reuse}'<>'false') as content_reuse_rows,
         count(*) filter(where metadata#>>'{shadow_only}'<>'true') as non_shadow_rows,
         count(*) filter(where metadata#>>'{public_activation}'<>'false') as public_activation_rows
  from public.discovery_candidates
  where provider='public_sitemap'
    and metadata#>>'{backfill_version}'='authorized_public_sitemap_acquisition_v1'
), d as (
  select count(*) as duplicate_groups
  from (
    select canonical_url,count(*)
    from public.discovery_candidates
    where provider='public_sitemap'
      and metadata#>>'{backfill_version}'='authorized_public_sitemap_acquisition_v1'
    group by canonical_url having count(*)>1
  ) x
)
select jsonb_build_object(
  'audit_version','authorized_public_sitemap_acquisition_v1',
  'metrics',jsonb_build_object(
    'persisted_rows',s.persisted_rows,
    'source_count',s.source_count,
    'duplicate_groups',d.duplicate_groups
  ),
  'gates',jsonb_build_object(
    'urls_persisted',s.persisted_rows>0,
    'five_sources_present',s.source_count=5,
    'no_content_copied',s.content_rows=0,
    'canonical_link_policy_only',s.wrong_policy_rows=0,
    'no_detail_fetch',s.detail_fetch_rows=0,
    'no_content_reuse',s.content_reuse_rows=0,
    'no_duplicates',d.duplicate_groups=0,
    'all_rows_shadow_only',s.non_shadow_rows=0,
    'public_activation_disabled',s.public_activation_rows=0,
    'publication_remains_disabled',true,
    'ranking_remains_disabled',true
  ),
  'rollback_sql','delete from public.discovery_candidates where provider=''public_sitemap'' and metadata#>>''{backfill_version}''=''authorized_public_sitemap_acquisition_v1'';',
  'shadow_only',true,
  'public_activation',false
) from s cross join d;
$$;

revoke all on function public.odm_authorized_public_sitemap_acquisition_report_v1() from public,anon,authenticated;
grant execute on function public.odm_authorized_public_sitemap_acquisition_report_v1() to service_role;
