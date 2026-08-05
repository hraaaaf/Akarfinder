-- LOT A5.1 — reversible public-search activation canary.
-- Activates exactly 200 canonical-link-only representations: 100 per pilot source.
-- No detail fetch, source content reuse, imagery reuse, or bulk activation.

create table if not exists public.odm_a5_1_activation_canary_snapshot_v1 (
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
  canary_title text not null,
  activated_at timestamptz,
  rolled_back_at timestamptz,
  canary_state text not null default 'prepared' check (canary_state in ('prepared','active','rolled_back')),
  audit_version text not null default 'odm_a5_1_activation_canary_v1'
);

alter table public.odm_a5_1_activation_canary_snapshot_v1 enable row level security;
revoke all on table public.odm_a5_1_activation_canary_snapshot_v1 from public, anon, authenticated;
grant select, insert, update, delete on table public.odm_a5_1_activation_canary_snapshot_v1 to service_role;

create or replace function public.odm_prepare_a5_1_activation_canary_v1()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_rows integer;
  v_dar integer;
  v_promo integer;
begin
  if exists (
    select 1 from public.odm_a5_1_activation_canary_snapshot_v1 where canary_state = 'active'
  ) then
    raise exception 'A5.1 canary already active';
  end if;

  delete from public.odm_a5_1_activation_canary_snapshot_v1
  where canary_state <> 'active';

  insert into public.odm_a5_1_activation_canary_snapshot_v1 (
    seed_id, source_domain, canonical_url,
    original_document_kind, original_document_kind_confidence,
    original_document_kind_reason, original_document_kind_version,
    original_title, original_snippet, original_city, original_property_type,
    original_intent, original_updated_at, original_quality_tier,
    original_quality_score, original_quality_dimensions, original_quality_version,
    original_display_eligibility, original_display_eligibility_reason,
    original_ranking_quality_boost, original_ranking_policy_version,
    canary_title
  )
  with ranked as (
    select
      d.*,
      row_number() over (
        partition by d.source_domain
        order by md5(d.seed_id::text), d.seed_id
      ) as source_row
    from public.thin_index_search_documents d
    join public.odm_a4_activation_readiness_audit_v1 a using (seed_id)
    where a.activation_review_eligible = true
      and d.document_kind = 'AMBIGUOUS'
      and d.source_domain in ('daragadir.com','promoimmomarrakech.com')
      and d.title is null
      and d.snippet is null
      and d.normalized_price_mad is null
      and d.normalized_surface_m2 is null
  )
  select
    seed_id, source_domain, canonical_url,
    document_kind, document_kind_confidence, document_kind_reason, document_kind_version,
    title, snippet, city, property_type, intent, updated_at,
    quality_tier, quality_score, quality_dimensions, quality_version,
    display_eligibility, display_eligibility_reason,
    ranking_quality_boost, ranking_policy_version,
    initcap(replace(normalized_property_type, '_', ' ')) || ' · ' ||
      initcap(replace(normalized_intent, '_', ' ')) || ' · ' ||
      initcap(replace(normalized_city, '_', ' '))
  from ranked
  where source_row <= 100;

  get diagnostics v_rows = row_count;

  select count(*) filter (where source_domain='daragadir.com'),
         count(*) filter (where source_domain='promoimmomarrakech.com')
  into v_dar, v_promo
  from public.odm_a5_1_activation_canary_snapshot_v1;

  if v_rows <> 200 or v_dar <> 100 or v_promo <> 100 then
    raise exception 'A5.1 requires exactly 200 rows split 100/100; got total %, dar %, promo %', v_rows, v_dar, v_promo;
  end if;

  return jsonb_build_object(
    'audit_version','odm_a5_1_activation_canary_v1',
    'prepared_rows',v_rows,
    'daragadir_rows',v_dar,
    'promoimmomarrakech_rows',v_promo,
    'publication_activated',false,
    'reclassification_activated',false
  );
end;
$$;

create or replace function public.odm_activate_a5_1_canary_v1()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_prepared integer;
  v_updated integer;
  v_public_before integer;
  v_public_after integer;
begin
  select count(*) into v_prepared
  from public.odm_a5_1_activation_canary_snapshot_v1
  where canary_state = 'prepared';

  if v_prepared <> 200 then
    raise exception 'A5.1 activation requires exactly 200 prepared rows; got %', v_prepared;
  end if;

  select count(*) into v_public_before
  from public.thin_index_search_documents
  where document_kind='LISTING'
    and vertical_classification='real_estate_likely'
    and display_eligibility in ('eligible_primary','eligible_secondary');

  update public.thin_index_search_documents d
  set
    title = s.canary_title,
    snippet = null,
    city = d.normalized_city,
    property_type = d.normalized_property_type,
    intent = d.normalized_intent,
    document_kind = 'LISTING',
    document_kind_confidence = 'high',
    document_kind_reason = 'A5.1 reversible canonical-link-only canary; no source content reused',
    document_kind_version = 'odm_a5_1_activation_canary_v1',
    updated_at = now()
  from public.odm_a5_1_activation_canary_snapshot_v1 s
  where d.seed_id = s.seed_id
    and s.canary_state = 'prepared'
    and d.document_kind = 'AMBIGUOUS';

  get diagnostics v_updated = row_count;
  if v_updated <> 200 then
    raise exception 'A5.1 activation updated % rows instead of 200', v_updated;
  end if;

  update public.odm_a5_1_activation_canary_snapshot_v1
  set canary_state='active', activated_at=now()
  where canary_state='prepared';

  select count(*) into v_public_after
  from public.thin_index_search_documents
  where document_kind='LISTING'
    and vertical_classification='real_estate_likely'
    and display_eligibility in ('eligible_primary','eligible_secondary');

  if v_public_after - v_public_before <> 200 then
    raise exception 'A5.1 visible depth delta must be 200; before %, after %', v_public_before, v_public_after;
  end if;

  return jsonb_build_object(
    'audit_version','odm_a5_1_activation_canary_v1',
    'activated_rows',v_updated,
    'eligible_public_before',v_public_before,
    'eligible_public_after',v_public_after,
    'eligible_public_delta',v_public_after-v_public_before,
    'rollback_available',true
  );
end;
$$;

create or replace function public.odm_rollback_a5_1_canary_v1()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_active integer;
  v_restored integer;
  v_public_before integer;
  v_public_after integer;
begin
  select count(*) into v_active
  from public.odm_a5_1_activation_canary_snapshot_v1
  where canary_state='active';

  if v_active = 0 then
    return jsonb_build_object(
      'audit_version','odm_a5_1_activation_canary_v1',
      'restored_rows',0,
      'already_inactive',true
    );
  end if;

  if v_active <> 200 then
    raise exception 'A5.1 rollback requires the complete active set; got %', v_active;
  end if;

  select count(*) into v_public_before
  from public.thin_index_search_documents
  where document_kind='LISTING'
    and vertical_classification='real_estate_likely'
    and display_eligibility in ('eligible_primary','eligible_secondary');

  update public.thin_index_search_documents d
  set
    title = s.original_title,
    snippet = s.original_snippet,
    city = s.original_city,
    property_type = s.original_property_type,
    intent = s.original_intent,
    document_kind = s.original_document_kind,
    document_kind_confidence = s.original_document_kind_confidence,
    document_kind_reason = s.original_document_kind_reason,
    document_kind_version = s.original_document_kind_version,
    updated_at = s.original_updated_at
  from public.odm_a5_1_activation_canary_snapshot_v1 s
  where d.seed_id=s.seed_id and s.canary_state='active';

  get diagnostics v_restored = row_count;
  if v_restored <> 200 then
    raise exception 'A5.1 rollback restored % rows instead of 200', v_restored;
  end if;

  update public.odm_a5_1_activation_canary_snapshot_v1
  set canary_state='rolled_back', rolled_back_at=now()
  where canary_state='active';

  select count(*) into v_public_after
  from public.thin_index_search_documents
  where document_kind='LISTING'
    and vertical_classification='real_estate_likely'
    and display_eligibility in ('eligible_primary','eligible_secondary');

  if v_public_before - v_public_after <> 200 then
    raise exception 'A5.1 rollback visible-depth delta must be 200; before %, after %', v_public_before, v_public_after;
  end if;

  return jsonb_build_object(
    'audit_version','odm_a5_1_activation_canary_v1',
    'restored_rows',v_restored,
    'eligible_public_before',v_public_before,
    'eligible_public_after',v_public_after,
    'eligible_public_delta',v_public_after-v_public_before,
    'canary_active',false
  );
end;
$$;

create or replace function public.odm_a5_1_activation_canary_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with canary as (
  select
    count(*)::integer as total,
    count(*) filter (where canary_state='prepared')::integer as prepared,
    count(*) filter (where canary_state='active')::integer as active,
    count(*) filter (where canary_state='rolled_back')::integer as rolled_back,
    count(*) filter (where source_domain='daragadir.com')::integer as daragadir,
    count(*) filter (where source_domain='promoimmomarrakech.com')::integer as promo,
    count(*) filter (where original_title is not null or original_snippet is not null)::integer as source_text_rows
  from public.odm_a5_1_activation_canary_snapshot_v1
), live as (
  select
    count(*) filter (where d.document_kind='LISTING')::integer as canary_listings,
    count(*) filter (where d.document_kind<>'LISTING')::integer as canary_non_listings,
    count(*) filter (where d.snippet is not null)::integer as snippets_exposed,
    count(*) filter (where d.normalized_price_mad is not null or d.normalized_surface_m2 is not null)::integer as price_or_surface_exposed
  from public.odm_a5_1_activation_canary_snapshot_v1 s
  join public.thin_index_search_documents d using(seed_id)
), baseline as (
  select count(*)::integer as eligible_public_listings
  from public.thin_index_search_documents
  where document_kind='LISTING'
    and vertical_classification='real_estate_likely'
    and display_eligibility in ('eligible_primary','eligible_secondary')
)
select jsonb_build_object(
  'audit_version','odm_a5_1_activation_canary_v1',
  'snapshot_rows',canary.total,
  'state',jsonb_build_object('prepared',canary.prepared,'active',canary.active,'rolled_back',canary.rolled_back),
  'sources',jsonb_build_object('daragadir.com',canary.daragadir,'promoimmomarrakech.com',canary.promo),
  'eligible_public_listings',baseline.eligible_public_listings,
  'canary_listings',live.canary_listings,
  'canary_non_listings',live.canary_non_listings,
  'safety',jsonb_build_object(
    'source_text_rows_selected',canary.source_text_rows,
    'snippets_exposed',live.snippets_exposed,
    'price_or_surface_exposed',live.price_or_surface_exposed,
    'detail_fetch_performed',false,
    'content_reuse_performed',false,
    'imagery_reuse_performed',false,
    'batch_size_exactly_200',canary.total=200,
    'balanced_100_per_source',canary.daragadir=100 and canary.promo=100,
    'rollback_available',true
  )
)
from canary cross join live cross join baseline;
$$;

revoke all on function public.odm_prepare_a5_1_activation_canary_v1() from public, anon, authenticated;
revoke all on function public.odm_activate_a5_1_canary_v1() from public, anon, authenticated;
revoke all on function public.odm_rollback_a5_1_canary_v1() from public, anon, authenticated;
revoke all on function public.odm_a5_1_activation_canary_report_v1() from public, anon, authenticated;
grant execute on function public.odm_prepare_a5_1_activation_canary_v1() to service_role;
grant execute on function public.odm_activate_a5_1_canary_v1() to service_role;
grant execute on function public.odm_rollback_a5_1_canary_v1() to service_role;
grant execute on function public.odm_a5_1_activation_canary_report_v1() to service_role;

select public.odm_prepare_a5_1_activation_canary_v1();
