-- LOT A5.4 — final activation of the remaining A3/A4 recovery inventory.
-- Exact target: 5,057 rows (4,066 DarAgadir + 991 Promo Immo Marrakech).

create table if not exists public.odm_a5_4_final_recovery_snapshot_v1 (
  seed_id uuid primary key,
  source_domain text not null check (source_domain in ('daragadir.com','promoimmomarrakech.com')),
  canonical_url text not null unique,
  original_document_kind text not null,
  original_document_kind_confidence text,
  original_document_kind_reason text,
  original_document_kind_version text,
  original_title text,
  original_snippet text,
  original_city text,
  original_property_type text,
  original_intent text,
  original_updated_at timestamptz,
  original_quality_tier text,
  original_quality_score smallint,
  original_quality_dimensions jsonb,
  original_quality_version text,
  original_display_eligibility text,
  original_display_eligibility_reason text,
  original_ranking_quality_boost real,
  original_ranking_policy_version text,
  recovery_title text not null,
  activated_at timestamptz,
  rolled_back_at timestamptz,
  batch_state text not null default 'prepared' check (batch_state in ('prepared','active','rolled_back')),
  audit_version text not null default 'odm_a5_4_final_recovery_15540_v1'
);

alter table public.odm_a5_4_final_recovery_snapshot_v1 enable row level security;
revoke all on table public.odm_a5_4_final_recovery_snapshot_v1 from public,anon,authenticated;
grant select,insert,update,delete on table public.odm_a5_4_final_recovery_snapshot_v1 to service_role;

create or replace function public.odm_prepare_a5_4_final_recovery_15540_v1()
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_rows int; v_dar int; v_promo int; v_prior int;
begin
  select
    (select count(*) from public.odm_a5_1_activation_canary_snapshot_v1 where canary_state='active') +
    (select count(*) from public.odm_a5_2_progressive_snapshot_v1 where batch_state='active') +
    (select count(*) from public.odm_a5_3_progressive_snapshot_v1 where batch_state='active')
  into v_prior;
  if v_prior<>3000 then raise exception 'A5.4 requires exactly 3,000 prior active rows; got %',v_prior; end if;
  if exists(select 1 from public.odm_a5_4_final_recovery_snapshot_v1 where batch_state='active') then
    raise exception 'A5.4 batch already active';
  end if;
  delete from public.odm_a5_4_final_recovery_snapshot_v1 where batch_state<>'active';

  insert into public.odm_a5_4_final_recovery_snapshot_v1(
    seed_id,source_domain,canonical_url,
    original_document_kind,original_document_kind_confidence,original_document_kind_reason,original_document_kind_version,
    original_title,original_snippet,original_city,original_property_type,original_intent,original_updated_at,
    original_quality_tier,original_quality_score,original_quality_dimensions,original_quality_version,
    original_display_eligibility,original_display_eligibility_reason,original_ranking_quality_boost,original_ranking_policy_version,
    recovery_title
  )
  select d.seed_id,d.source_domain,d.canonical_url,
    d.document_kind,d.document_kind_confidence,d.document_kind_reason,d.document_kind_version,
    d.title,d.snippet,d.city,d.property_type,d.intent,d.updated_at,
    d.quality_tier,d.quality_score,d.quality_dimensions,d.quality_version,
    d.display_eligibility,d.display_eligibility_reason,d.ranking_quality_boost,d.ranking_policy_version,
    initcap(replace(d.normalized_property_type,'_',' '))||' · '||initcap(replace(d.normalized_intent,'_',' '))||' · '||initcap(replace(d.normalized_city,'_',' '))
  from public.thin_index_search_documents d
  join public.odm_a4_activation_readiness_audit_v1 a using(seed_id)
  where a.activation_review_eligible=true
    and d.document_kind='AMBIGUOUS'
    and d.title is null and d.snippet is null
    and d.normalized_price_mad is null and d.normalized_surface_m2 is null
    and not exists(select 1 from public.odm_a5_1_activation_canary_snapshot_v1 x where x.seed_id=d.seed_id)
    and not exists(select 1 from public.odm_a5_2_progressive_snapshot_v1 x where x.seed_id=d.seed_id)
    and not exists(select 1 from public.odm_a5_3_progressive_snapshot_v1 x where x.seed_id=d.seed_id)
  order by d.source_domain,md5(d.seed_id::text),d.seed_id;

  get diagnostics v_rows=row_count;
  select count(*) filter(where source_domain='daragadir.com'),count(*) filter(where source_domain='promoimmomarrakech.com')
    into v_dar,v_promo from public.odm_a5_4_final_recovery_snapshot_v1;
  if v_rows<>5057 or v_dar<>4066 or v_promo<>991 then
    raise exception 'A5.4 exact remainder required: total 5057, dar 4066, promo 991; got %, %, %',v_rows,v_dar,v_promo;
  end if;
  return jsonb_build_object('prepared_rows',v_rows,'daragadir_rows',v_dar,'promo_rows',v_promo,'target_public_depth',15540);
end;$$;

create or replace function public.odm_activate_a5_4_final_recovery_15540_v1()
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_prepared int; v_updated int; v_before int; v_after int;
begin
  select count(*) into v_prepared from public.odm_a5_4_final_recovery_snapshot_v1 where batch_state='prepared';
  if v_prepared<>5057 then raise exception 'A5.4 requires 5,057 prepared rows; got %',v_prepared; end if;
  select count(*) into v_before from public.thin_index_search_documents
   where document_kind='LISTING' and vertical_classification='real_estate_likely' and display_eligibility in ('eligible_primary','eligible_secondary');
  if v_before<>10483 then raise exception 'A5.4 expected public baseline 10,483; got %',v_before; end if;

  update public.thin_index_search_documents d set
    title=s.recovery_title,snippet=null,city=d.normalized_city,property_type=d.normalized_property_type,intent=d.normalized_intent,
    document_kind='LISTING',document_kind_confidence='HIGH',
    document_kind_reason='A5.4 canonical-link-only recovery; no source content reused',
    document_kind_version='odm_a5_4_final_recovery_15540_v1',updated_at=now()
  from public.odm_a5_4_final_recovery_snapshot_v1 s
  where d.seed_id=s.seed_id and s.batch_state='prepared' and d.document_kind='AMBIGUOUS';
  get diagnostics v_updated=row_count;
  if v_updated<>5057 then raise exception 'A5.4 updated % rows instead of 5,057',v_updated; end if;
  update public.odm_a5_4_final_recovery_snapshot_v1 set batch_state='active',activated_at=now() where batch_state='prepared';
  select count(*) into v_after from public.thin_index_search_documents
   where document_kind='LISTING' and vertical_classification='real_estate_likely' and display_eligibility in ('eligible_primary','eligible_secondary');
  if v_after<>15540 or v_after-v_before<>5057 then raise exception 'A5.4 target mismatch: before %, after %',v_before,v_after; end if;
  return jsonb_build_object('activated_rows',v_updated,'eligible_public_before',v_before,'eligible_public_after',v_after,'delta',v_after-v_before,'rollback_available',true);
end;$$;

create or replace function public.odm_rollback_a5_4_final_recovery_15540_v1()
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_active int; v_restored int; v_before int; v_after int;
begin
  select count(*) into v_active from public.odm_a5_4_final_recovery_snapshot_v1 where batch_state='active';
  if v_active=0 then return jsonb_build_object('restored_rows',0,'already_inactive',true); end if;
  if v_active<>5057 then raise exception 'A5.4 rollback requires complete 5,057-row set; got %',v_active; end if;
  select count(*) into v_before from public.thin_index_search_documents
   where document_kind='LISTING' and vertical_classification='real_estate_likely' and display_eligibility in ('eligible_primary','eligible_secondary');
  update public.thin_index_search_documents d set
    title=s.original_title,snippet=s.original_snippet,city=s.original_city,property_type=s.original_property_type,intent=s.original_intent,
    document_kind=s.original_document_kind,document_kind_confidence=s.original_document_kind_confidence,
    document_kind_reason=s.original_document_kind_reason,document_kind_version=s.original_document_kind_version,
    updated_at=s.original_updated_at
  from public.odm_a5_4_final_recovery_snapshot_v1 s
  where d.seed_id=s.seed_id and s.batch_state='active';
  get diagnostics v_restored=row_count;
  if v_restored<>5057 then raise exception 'A5.4 rollback restored % rows instead of 5,057',v_restored; end if;
  update public.odm_a5_4_final_recovery_snapshot_v1 set batch_state='rolled_back',rolled_back_at=now() where batch_state='active';
  select count(*) into v_after from public.thin_index_search_documents
   where document_kind='LISTING' and vertical_classification='real_estate_likely' and display_eligibility in ('eligible_primary','eligible_secondary');
  if v_after<>10483 or v_before-v_after<>5057 then raise exception 'A5.4 rollback mismatch: before %, after %',v_before,v_after; end if;
  return jsonb_build_object('restored_rows',v_restored,'eligible_public_before',v_before,'eligible_public_after',v_after,'delta',v_after-v_before);
end;$$;

create or replace function public.odm_a5_4_final_recovery_report_v1()
returns jsonb language sql stable security invoker set search_path='' as $$
with s as (
 select count(*)::int total,count(*) filter(where batch_state='prepared')::int prepared,
 count(*) filter(where batch_state='active')::int active,count(*) filter(where batch_state='rolled_back')::int rolled_back,
 count(*) filter(where source_domain='daragadir.com')::int dar,count(*) filter(where source_domain='promoimmomarrakech.com')::int promo
 from public.odm_a5_4_final_recovery_snapshot_v1
),live as (
 select count(*) filter(where d.document_kind='LISTING')::int listings,
 count(*) filter(where d.snippet is not null)::int snippets,
 count(*) filter(where d.normalized_price_mad is not null or d.normalized_surface_m2 is not null)::int price_surface
 from public.odm_a5_4_final_recovery_snapshot_v1 s join public.thin_index_search_documents d using(seed_id)
),baseline as (
 select count(*)::int eligible_public from public.thin_index_search_documents
 where document_kind='LISTING' and vertical_classification='real_estate_likely' and display_eligibility in ('eligible_primary','eligible_secondary')
)
select jsonb_build_object('audit_version','odm_a5_4_final_recovery_15540_v1','snapshot_rows',s.total,
 'state',jsonb_build_object('prepared',s.prepared,'active',s.active,'rolled_back',s.rolled_back),
 'sources',jsonb_build_object('daragadir.com',s.dar,'promoimmomarrakech.com',s.promo),
 'eligible_public_listings',baseline.eligible_public,'a5_4_listings',live.listings,
 'safety',jsonb_build_object('snippets_exposed',live.snippets,'price_or_surface_exposed',live.price_surface,
 'detail_fetch_performed',false,'content_reuse_performed',false,'imagery_reuse_performed',false,
 'batch_size_exactly_5057',s.total=5057,'exact_source_remainder',s.dar=4066 and s.promo=991,'rollback_available',true),
 'recovery_lane_complete',s.active=5057 and baseline.eligible_public=15540)
from s cross join live cross join baseline;$$;

revoke all on function public.odm_prepare_a5_4_final_recovery_15540_v1() from public,anon,authenticated;
revoke all on function public.odm_activate_a5_4_final_recovery_15540_v1() from public,anon,authenticated;
revoke all on function public.odm_rollback_a5_4_final_recovery_15540_v1() from public,anon,authenticated;
revoke all on function public.odm_a5_4_final_recovery_report_v1() from public,anon,authenticated;
grant execute on function public.odm_prepare_a5_4_final_recovery_15540_v1() to service_role;
grant execute on function public.odm_activate_a5_4_final_recovery_15540_v1() to service_role;
grant execute on function public.odm_rollback_a5_4_final_recovery_15540_v1() to service_role;
grant execute on function public.odm_a5_4_final_recovery_report_v1() to service_role;

select public.odm_prepare_a5_4_final_recovery_15540_v1();
