-- LOT A5.2 — progressive activation to 1,000 public canonical-link-only representations.
-- Adds exactly 800 rows to the 200-row A5.1 canary, split 400/400 by source.

create table if not exists public.odm_a5_2_progressive_snapshot_v1 (
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
  canary_title text not null,
  activated_at timestamptz,
  rolled_back_at timestamptz,
  batch_state text not null default 'prepared' check (batch_state in ('prepared','active','rolled_back')),
  audit_version text not null default 'odm_a5_2_progressive_1000_v1'
);

alter table public.odm_a5_2_progressive_snapshot_v1 enable row level security;
revoke all on table public.odm_a5_2_progressive_snapshot_v1 from public, anon, authenticated;
grant select, insert, update, delete on table public.odm_a5_2_progressive_snapshot_v1 to service_role;

create or replace function public.odm_prepare_a5_2_progressive_1000_v1()
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_rows integer;
  v_dar integer;
  v_promo integer;
  v_a5_1_active integer;
begin
  select count(*) into v_a5_1_active
  from public.odm_a5_1_activation_canary_snapshot_v1
  where canary_state='active';
  if v_a5_1_active <> 200 then
    raise exception 'A5.2 requires exactly 200 active A5.1 rows; got %', v_a5_1_active;
  end if;

  if exists (select 1 from public.odm_a5_2_progressive_snapshot_v1 where batch_state='active') then
    raise exception 'A5.2 batch already active';
  end if;

  delete from public.odm_a5_2_progressive_snapshot_v1 where batch_state <> 'active';

  insert into public.odm_a5_2_progressive_snapshot_v1 (
    seed_id,source_domain,canonical_url,
    original_document_kind,original_document_kind_confidence,
    original_document_kind_reason,original_document_kind_version,
    original_title,original_snippet,original_city,original_property_type,
    original_intent,original_updated_at,canary_title
  )
  with ranked as (
    select d.*,
      row_number() over (partition by d.source_domain order by md5(d.seed_id::text),d.seed_id) as source_row
    from public.thin_index_search_documents d
    join public.odm_a4_activation_readiness_audit_v1 a using(seed_id)
    where a.activation_review_eligible=true
      and d.document_kind='AMBIGUOUS'
      and d.source_domain in ('daragadir.com','promoimmomarrakech.com')
      and d.title is null and d.snippet is null
      and d.normalized_price_mad is null and d.normalized_surface_m2 is null
      and not exists (
        select 1 from public.odm_a5_1_activation_canary_snapshot_v1 c where c.seed_id=d.seed_id
      )
  )
  select seed_id,source_domain,canonical_url,
    document_kind,document_kind_confidence,document_kind_reason,document_kind_version,
    title,snippet,city,property_type,intent,updated_at,
    initcap(replace(normalized_property_type,'_',' ')) || ' · ' ||
    initcap(replace(normalized_intent,'_',' ')) || ' · ' ||
    initcap(replace(normalized_city,'_',' '))
  from ranked where source_row <= 400;

  get diagnostics v_rows=row_count;
  select count(*) filter(where source_domain='daragadir.com'),
         count(*) filter(where source_domain='promoimmomarrakech.com')
  into v_dar,v_promo
  from public.odm_a5_2_progressive_snapshot_v1;

  if v_rows<>800 or v_dar<>400 or v_promo<>400 then
    raise exception 'A5.2 requires 800 rows split 400/400; got total %, dar %, promo %',v_rows,v_dar,v_promo;
  end if;

  return jsonb_build_object('prepared_rows',v_rows,'daragadir_rows',v_dar,'promo_rows',v_promo,'target_total_active',1000);
end;
$$;

create or replace function public.odm_activate_a5_2_progressive_1000_v1()
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_prepared integer;
  v_updated integer;
  v_before integer;
  v_after integer;
begin
  select count(*) into v_prepared from public.odm_a5_2_progressive_snapshot_v1 where batch_state='prepared';
  if v_prepared<>800 then raise exception 'A5.2 requires exactly 800 prepared rows; got %',v_prepared; end if;

  select count(*) into v_before from public.thin_index_search_documents
  where document_kind='LISTING' and vertical_classification='real_estate_likely'
    and display_eligibility in ('eligible_primary','eligible_secondary');

  update public.thin_index_search_documents d
  set title=s.canary_title,
      snippet=null,
      city=d.normalized_city,
      property_type=d.normalized_property_type,
      intent=d.normalized_intent,
      document_kind='LISTING',
      document_kind_confidence='HIGH',
      document_kind_reason='A5.2 progressive canonical-link-only activation; no source content reused',
      document_kind_version='odm_a5_2_progressive_1000_v1',
      updated_at=now()
  from public.odm_a5_2_progressive_snapshot_v1 s
  where d.seed_id=s.seed_id and s.batch_state='prepared' and d.document_kind='AMBIGUOUS';

  get diagnostics v_updated=row_count;
  if v_updated<>800 then raise exception 'A5.2 updated % rows instead of 800',v_updated; end if;

  update public.odm_a5_2_progressive_snapshot_v1
  set batch_state='active',activated_at=now() where batch_state='prepared';

  select count(*) into v_after from public.thin_index_search_documents
  where document_kind='LISTING' and vertical_classification='real_estate_likely'
    and display_eligibility in ('eligible_primary','eligible_secondary');

  if v_after-v_before<>800 then raise exception 'A5.2 public delta must be 800; before %, after %',v_before,v_after; end if;

  return jsonb_build_object('activated_rows',v_updated,'eligible_public_before',v_before,'eligible_public_after',v_after,'delta',v_after-v_before,'rollback_available',true);
end;
$$;

create or replace function public.odm_rollback_a5_2_progressive_1000_v1()
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_active integer;
  v_restored integer;
  v_before integer;
  v_after integer;
begin
  select count(*) into v_active from public.odm_a5_2_progressive_snapshot_v1 where batch_state='active';
  if v_active=0 then return jsonb_build_object('restored_rows',0,'already_inactive',true); end if;
  if v_active<>800 then raise exception 'A5.2 rollback requires complete 800-row set; got %',v_active; end if;

  select count(*) into v_before from public.thin_index_search_documents
  where document_kind='LISTING' and vertical_classification='real_estate_likely'
    and display_eligibility in ('eligible_primary','eligible_secondary');

  update public.thin_index_search_documents d
  set title=s.original_title,
      snippet=s.original_snippet,
      city=s.original_city,
      property_type=s.original_property_type,
      intent=s.original_intent,
      document_kind=s.original_document_kind,
      document_kind_confidence=s.original_document_kind_confidence,
      document_kind_reason=s.original_document_kind_reason,
      document_kind_version=s.original_document_kind_version,
      updated_at=s.original_updated_at
  from public.odm_a5_2_progressive_snapshot_v1 s
  where d.seed_id=s.seed_id and s.batch_state='active';

  get diagnostics v_restored=row_count;
  if v_restored<>800 then raise exception 'A5.2 rollback restored % rows instead of 800',v_restored; end if;

  update public.odm_a5_2_progressive_snapshot_v1
  set batch_state='rolled_back',rolled_back_at=now() where batch_state='active';

  select count(*) into v_after from public.thin_index_search_documents
  where document_kind='LISTING' and vertical_classification='real_estate_likely'
    and display_eligibility in ('eligible_primary','eligible_secondary');

  if v_before-v_after<>800 then raise exception 'A5.2 rollback delta must be -800; before %, after %',v_before,v_after; end if;

  return jsonb_build_object('restored_rows',v_restored,'eligible_public_before',v_before,'eligible_public_after',v_after,'delta',v_after-v_before);
end;
$$;

create or replace function public.odm_a5_2_progressive_1000_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
with s as (
  select count(*)::int total,
    count(*) filter(where batch_state='prepared')::int prepared,
    count(*) filter(where batch_state='active')::int active,
    count(*) filter(where batch_state='rolled_back')::int rolled_back,
    count(*) filter(where source_domain='daragadir.com')::int dar,
    count(*) filter(where source_domain='promoimmomarrakech.com')::int promo
  from public.odm_a5_2_progressive_snapshot_v1
), live as (
  select count(*) filter(where d.document_kind='LISTING')::int listings,
    count(*) filter(where d.snippet is not null)::int snippets,
    count(*) filter(where d.normalized_price_mad is not null or d.normalized_surface_m2 is not null)::int price_surface
  from public.odm_a5_2_progressive_snapshot_v1 s
  join public.thin_index_search_documents d using(seed_id)
), baseline as (
  select count(*)::int eligible_public from public.thin_index_search_documents
  where document_kind='LISTING' and vertical_classification='real_estate_likely'
    and display_eligibility in ('eligible_primary','eligible_secondary')
)
select jsonb_build_object(
  'audit_version','odm_a5_2_progressive_1000_v1',
  'snapshot_rows',s.total,
  'state',jsonb_build_object('prepared',s.prepared,'active',s.active,'rolled_back',s.rolled_back),
  'sources',jsonb_build_object('daragadir.com',s.dar,'promoimmomarrakech.com',s.promo),
  'eligible_public_listings',baseline.eligible_public,
  'a5_2_listings',live.listings,
  'safety',jsonb_build_object('snippets_exposed',live.snippets,'price_or_surface_exposed',live.price_surface,'detail_fetch_performed',false,'content_reuse_performed',false,'imagery_reuse_performed',false,'batch_size_exactly_800',s.total=800,'balanced_400_per_source',s.dar=400 and s.promo=400,'rollback_available',true)
)
from s cross join live cross join baseline;
$$;

revoke all on function public.odm_prepare_a5_2_progressive_1000_v1() from public,anon,authenticated;
revoke all on function public.odm_activate_a5_2_progressive_1000_v1() from public,anon,authenticated;
revoke all on function public.odm_rollback_a5_2_progressive_1000_v1() from public,anon,authenticated;
revoke all on function public.odm_a5_2_progressive_1000_report_v1() from public,anon,authenticated;
grant execute on function public.odm_prepare_a5_2_progressive_1000_v1() to service_role;
grant execute on function public.odm_activate_a5_2_progressive_1000_v1() to service_role;
grant execute on function public.odm_rollback_a5_2_progressive_1000_v1() to service_role;
grant execute on function public.odm_a5_2_progressive_1000_report_v1() to service_role;

select public.odm_prepare_a5_2_progressive_1000_v1();
