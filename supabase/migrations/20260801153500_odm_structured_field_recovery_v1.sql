-- ODM STRUCTURED FIELD RECOVERY V1
-- Deterministic Shadow-only recovery of missing property type and intent.
-- Existing normalized values are never overwritten. Ambiguous evidence fails closed.

create table if not exists public.odm_structured_field_recovery_shadow_v1 (
  seed_id uuid primary key references public.thin_index_search_documents(seed_id) on delete cascade,
  source_domain text,
  existing_property_type text,
  existing_intent text,
  recovered_property_type text,
  recovered_intent text,
  property_type_status text not null check (property_type_status in ('existing','recovered_single','ambiguous','missing')),
  intent_status text not null check (intent_status in ('existing','recovered_single','ambiguous','missing')),
  property_type_match_count integer not null check (property_type_match_count >= 0),
  intent_match_count integer not null check (intent_match_count >= 0),
  evidence jsonb not null default '{}'::jsonb,
  recovery_version text not null default 'odm_structured_field_recovery_v1',
  publication_eligible boolean not null default false check (publication_eligible = false),
  ranking_eligible boolean not null default false check (ranking_eligible = false),
  recovered_at timestamptz not null default now()
);

alter table public.odm_structured_field_recovery_shadow_v1 enable row level security;
revoke all on public.odm_structured_field_recovery_shadow_v1 from public, anon, authenticated;
grant select, insert, update, delete on public.odm_structured_field_recovery_shadow_v1 to service_role;

truncate table public.odm_structured_field_recovery_shadow_v1;

with source_rows as materialized (
  select
    d.seed_id,
    d.source_domain,
    d.normalized_property_type,
    d.normalized_intent,
    lower(public.unaccent(concat_ws(' ', d.title, d.snippet, d.query_text, d.canonical_url))) as evidence_text
  from public.thin_index_search_documents d
  where d.normalized_property_type is null or d.normalized_intent is null
), classified as materialized (
  select
    s.*,
    array_remove(array[
      case when s.evidence_text ~ '(^|[^a-z])(appartement|apartment|flat)([^a-z]|$)' then 'apartment' end,
      case when s.evidence_text ~ '(^|[^a-z])(villa)([^a-z]|$)' then 'villa' end,
      case when s.evidence_text ~ '(^|[^a-z])(maison|house)([^a-z]|$)' then 'house' end,
      case when s.evidence_text ~ '(^|[^a-z])(studio)([^a-z]|$)' then 'studio' end,
      case when s.evidence_text ~ '(^|[^a-z])(terrain|land|plot)([^a-z]|$)' then 'land' end,
      case when s.evidence_text ~ '(^|[^a-z])(bureau|office)([^a-z]|$)' then 'office' end,
      case when s.evidence_text ~ '(^|[^a-z])(local commercial|commerce|commercial|shop)([^a-z]|$)' then 'commercial' end,
      case when s.evidence_text ~ '(^|[^a-z])(riad)([^a-z]|$)' then 'riad' end,
      case when s.evidence_text ~ '(^|[^a-z])(ferme|farm)([^a-z]|$)' then 'farm' end
    ], null) as type_matches,
    array_remove(array[
      case when s.evidence_text ~ '(^|[^a-z])(vente|vendre|a vendre|sale|sell)([^a-z]|$)' then 'sale' end,
      case when s.evidence_text ~ '(^|[^a-z])(location|louer|a louer|rent|rental|lease)([^a-z]|$)' then 'rent' end,
      case when s.evidence_text ~ '(^|[^a-z])(programme neuf|immobilier neuf|new project|new development)([^a-z]|$)' then 'new' end
    ], null) as intent_matches
  from source_rows s
)
insert into public.odm_structured_field_recovery_shadow_v1 (
  seed_id, source_domain, existing_property_type, existing_intent,
  recovered_property_type, recovered_intent,
  property_type_status, intent_status,
  property_type_match_count, intent_match_count, evidence
)
select
  c.seed_id,
  c.source_domain,
  c.normalized_property_type,
  c.normalized_intent,
  case when c.normalized_property_type is null and cardinality(c.type_matches)=1 then c.type_matches[1] end,
  case when c.normalized_intent is null and cardinality(c.intent_matches)=1 then c.intent_matches[1] end,
  case
    when c.normalized_property_type is not null then 'existing'
    when cardinality(c.type_matches)=1 then 'recovered_single'
    when cardinality(c.type_matches)>1 then 'ambiguous'
    else 'missing'
  end,
  case
    when c.normalized_intent is not null then 'existing'
    when cardinality(c.intent_matches)=1 then 'recovered_single'
    when cardinality(c.intent_matches)>1 then 'ambiguous'
    else 'missing'
  end,
  cardinality(c.type_matches),
  cardinality(c.intent_matches),
  jsonb_strip_nulls(jsonb_build_object(
    'property_type_matches', to_jsonb(c.type_matches),
    'intent_matches', to_jsonb(c.intent_matches),
    'evidence_source', 'title_snippet_query_url',
    'method', 'single_unambiguous_lexical_match'
  ))
from classified c;

create or replace function public.odm_structured_field_recovery_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
select jsonb_build_object(
  'audit_version','odm_structured_field_recovery_v1',
  'generated_at',now(),
  'totals',jsonb_build_object(
    'evaluated_rows',count(*),
    'type_recovered',count(*) filter(where property_type_status='recovered_single'),
    'intent_recovered',count(*) filter(where intent_status='recovered_single'),
    'type_ambiguous',count(*) filter(where property_type_status='ambiguous'),
    'intent_ambiguous',count(*) filter(where intent_status='ambiguous'),
    'fully_recovered',count(*) filter(where coalesce(existing_property_type,recovered_property_type) is not null and coalesce(existing_intent,recovered_intent) is not null)
  ),
  'by_source',coalesce((
    select jsonb_agg(jsonb_build_object(
      'source_domain',source_domain,
      'rows',rows,
      'type_recovered',type_recovered,
      'intent_recovered',intent_recovered
    ) order by rows desc)
    from (
      select source_domain,count(*) rows,
        count(*) filter(where property_type_status='recovered_single') type_recovered,
        count(*) filter(where intent_status='recovered_single') intent_recovered
      from public.odm_structured_field_recovery_shadow_v1
      group by source_domain
      order by count(*) desc
      limit 20
    ) s
  ),'[]'::jsonb),
  'gates',jsonb_build_object(
    'no_existing_type_overwritten',count(*) filter(where existing_property_type is not null and recovered_property_type is not null)=0,
    'no_existing_intent_overwritten',count(*) filter(where existing_intent is not null and recovered_intent is not null)=0,
    'no_ambiguous_type_recovered',count(*) filter(where property_type_status='ambiguous' and recovered_property_type is not null)=0,
    'no_ambiguous_intent_recovered',count(*) filter(where intent_status='ambiguous' and recovered_intent is not null)=0,
    'publication_remains_disabled',count(*) filter(where publication_eligible)=0,
    'ranking_remains_disabled',count(*) filter(where ranking_eligible)=0,
    'shadow_only',true
  )
) from public.odm_structured_field_recovery_shadow_v1;
$$;

revoke all on function public.odm_structured_field_recovery_report_v1() from public, anon, authenticated;
grant execute on function public.odm_structured_field_recovery_report_v1() to service_role;

comment on table public.odm_structured_field_recovery_shadow_v1 is 'Shadow-only deterministic candidates for missing property type and intent. Ambiguous evidence is retained but never recovered.';
comment on function public.odm_structured_field_recovery_report_v1() is 'Connected report for deterministic structured-field recovery candidates; never activates ranking or publication.';
