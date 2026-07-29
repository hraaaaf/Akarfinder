-- ODM-ECONOMIC-EVIDENCE-MATERIALIZATION-V1
-- Materializes Typed Economic Candidates V2 as private, versioned Shadow evidence.
-- No property listing, Thin Index, ranking, display-eligibility or SERP field is mutated.

create table if not exists public.odm_economic_candidate_evidence_shadow_v1 (
  candidate_id text primary key,
  parser_version text not null,
  observation_id text not null,
  seed_id uuid not null,
  source_domain text,
  seed_provider text,
  evidence_source text not null,
  field_path text not null,
  observed_at timestamptz,
  economic_type text not null,
  value_mad numeric not null,
  currency text not null check (currency='MAD'),
  raw_fragment text not null,
  normalized_fragment text,
  confidence numeric not null check (confidence between 0 and 1),
  rejection_reason text,
  range_context boolean not null default false,
  publication_eligible boolean not null default false check (publication_eligible=false),
  ranking_eligible boolean not null default false check (ranking_eligible=false),
  materialized_at timestamptz not null default now()
);

create table if not exists public.odm_economic_observation_state_shadow_v1 (
  observation_id text not null,
  parser_version text not null,
  seed_id uuid not null,
  source_domain text,
  seed_provider text,
  normalized_city text,
  normalized_property_type text,
  normalized_intent text,
  observation_source text not null,
  observed_at timestamptz,
  economic_status text not null check (economic_status in ('trusted','ambiguous','rejected','missing','stale','policy_blocked')),
  candidate_count integer not null check (candidate_count>=0),
  principal_candidate_count integer not null check (principal_candidate_count>=0),
  principal_candidate_id text,
  principal_economic_type text,
  principal_value_mad numeric,
  publication_eligible boolean not null default false check (publication_eligible=false),
  ranking_eligible boolean not null default false check (ranking_eligible=false),
  materialized_at timestamptz not null default now(),
  primary key (observation_id,parser_version),
  check ((principal_candidate_id is null and principal_value_mad is null and principal_economic_type is null) or principal_candidate_count=1)
);

create index if not exists odm_economic_candidate_evidence_seed_idx
  on public.odm_economic_candidate_evidence_shadow_v1(seed_id,parser_version);
create index if not exists odm_economic_candidate_evidence_type_idx
  on public.odm_economic_candidate_evidence_shadow_v1(economic_type,parser_version);
create index if not exists odm_economic_observation_state_status_idx
  on public.odm_economic_observation_state_shadow_v1(economic_status,source_domain,parser_version);
create index if not exists odm_economic_observation_state_city_idx
  on public.odm_economic_observation_state_shadow_v1(normalized_city,normalized_intent,parser_version);

alter table public.odm_economic_candidate_evidence_shadow_v1 enable row level security;
alter table public.odm_economic_observation_state_shadow_v1 enable row level security;

create or replace function public.refresh_odm_economic_evidence_materialization_v1()
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_candidate_rows bigint;
  v_state_rows bigint;
begin
  delete from public.odm_economic_candidate_evidence_shadow_v1
  where parser_version='odm_economic_parser_v2';

  delete from public.odm_economic_observation_state_shadow_v1
  where parser_version='odm_economic_parser_v2';

  insert into public.odm_economic_candidate_evidence_shadow_v1 (
    candidate_id,parser_version,observation_id,seed_id,source_domain,seed_provider,
    evidence_source,field_path,observed_at,economic_type,value_mad,currency,
    raw_fragment,normalized_fragment,confidence,rejection_reason,range_context,
    publication_eligible,ranking_eligible,materialized_at
  )
  select
    e->>'candidate_id',
    e->>'parser_version',
    v.observation_id,
    v.seed_id,
    v.source_domain,
    v.seed_provider,
    e->>'evidence_source',
    e->>'field_path',
    nullif(e->>'observed_at','')::timestamptz,
    e->>'economic_type',
    (e->>'value_mad')::numeric,
    e->>'currency',
    e->>'raw_fragment',
    e->>'normalized_fragment',
    (e->>'confidence')::numeric,
    nullif(e->>'rejection_reason',''),
    coalesce((e->>'range_context')::boolean,false),
    false,false,now()
  from public.odm_audit_economic_validation_v2 v
  cross join lateral jsonb_array_elements(v.selected_economic_candidates_v2) e;

  get diagnostics v_candidate_rows = row_count;

  insert into public.odm_economic_observation_state_shadow_v1 (
    observation_id,parser_version,seed_id,source_domain,seed_provider,
    normalized_city,normalized_property_type,normalized_intent,
    observation_source,observed_at,economic_status,candidate_count,
    principal_candidate_count,principal_candidate_id,principal_economic_type,
    principal_value_mad,publication_eligible,ranking_eligible,materialized_at
  )
  select
    v.observation_id,
    'odm_economic_parser_v2',
    v.seed_id,
    v.source_domain,
    v.seed_provider,
    d.normalized_city,
    d.normalized_property_type,
    d.normalized_intent,
    v.observation_source,
    v.observation_observed_at,
    case
      when v.no_bypass_required is not true or v.display_policy is null then 'policy_blocked'
      when v.typed_price_status_v2 in ('unconfirmed_timestamp','archive_unconfirmed') then 'stale'
      when v.typed_price_status_v2='trusted_typed_candidate_v2' then 'trusted'
      when v.typed_price_status_v2='ambiguous' then 'ambiguous'
      when v.typed_price_status_v2='rejected' then 'rejected'
      else 'missing'
    end,
    jsonb_array_length(v.selected_economic_candidates_v2),
    v.principal_candidate_count::integer,
    v.shadow_selected_economic_candidate_v2->>'candidate_id',
    v.shadow_selected_economic_candidate_v2->>'economic_type',
    nullif(v.shadow_selected_economic_candidate_v2->>'value_mad','')::numeric,
    false,false,now()
  from public.odm_audit_economic_validation_v2 v
  join public.thin_index_search_documents d on d.seed_id=v.seed_id;

  get diagnostics v_state_rows = row_count;

  return jsonb_build_object(
    'materialization_version','odm_economic_evidence_materialization_v1',
    'parser_version','odm_economic_parser_v2',
    'candidate_rows',v_candidate_rows,
    'observation_state_rows',v_state_rows,
    'publication_activated',false,
    'ranking_activated',false
  );
end;
$$;

create or replace function public.odm_economic_evidence_materialization_report_v1()
returns jsonb
language sql
stable
set search_path=''
as $$
with states as (
  select * from public.odm_economic_observation_state_shadow_v1
  where parser_version='odm_economic_parser_v2'
), candidates as (
  select * from public.odm_economic_candidate_evidence_shadow_v1
  where parser_version='odm_economic_parser_v2'
), expected as (
  select count(*)::bigint as n from public.odm_audit_economic_validation_v2
)
select jsonb_build_object(
  'audit_version','odm_economic_evidence_materialization_v1',
  'parser_version','odm_economic_parser_v2',
  'observation_states',count(*),
  'candidate_evidence_rows',(select count(*) from candidates),
  'status_counts',jsonb_build_object(
    'trusted',count(*) filter(where economic_status='trusted'),
    'ambiguous',count(*) filter(where economic_status='ambiguous'),
    'rejected',count(*) filter(where economic_status='rejected'),
    'missing',count(*) filter(where economic_status='missing'),
    'stale',count(*) filter(where economic_status='stale'),
    'policy_blocked',count(*) filter(where economic_status='policy_blocked')
  ),
  'gates',jsonb_build_object(
    'full_observation_coverage',count(*)=(select n from expected),
    'unique_observation_version',count(*)=count(distinct observation_id),
    'maximum_one_principal_candidate',count(*) filter(where principal_candidate_count>1 and principal_candidate_id is not null)=0,
    'no_rejected_principal_candidate',count(*) filter(where principal_candidate_id is not null and economic_status<>'trusted')=0,
    'all_candidate_evidence_provenanced',(select count(*) from candidates where observation_id is null or field_path is null or raw_fragment is null or parser_version<>'odm_economic_parser_v2')=0,
    'publication_remains_disabled',count(*) filter(where publication_eligible)=0 and (select count(*) from candidates where publication_eligible)=0,
    'ranking_remains_disabled',count(*) filter(where ranking_eligible)=0 and (select count(*) from candidates where ranking_eligible)=0
  )
)
from states;
$$;

revoke all on public.odm_economic_candidate_evidence_shadow_v1 from public,anon,authenticated;
revoke all on public.odm_economic_observation_state_shadow_v1 from public,anon,authenticated;
revoke all on function public.refresh_odm_economic_evidence_materialization_v1() from public,anon,authenticated;
revoke all on function public.odm_economic_evidence_materialization_report_v1() from public,anon,authenticated;
grant select,insert,update,delete on public.odm_economic_candidate_evidence_shadow_v1 to service_role;
grant select,insert,update,delete on public.odm_economic_observation_state_shadow_v1 to service_role;
grant execute on function public.refresh_odm_economic_evidence_materialization_v1() to service_role;
grant execute on function public.odm_economic_evidence_materialization_report_v1() to service_role;

comment on table public.odm_economic_candidate_evidence_shadow_v1 is 'Private versioned candidate-level economic evidence. Shadow-only and non-publicable.';
comment on table public.odm_economic_observation_state_shadow_v1 is 'Private one-row-per-observation economic state derived from Typed Economic Candidates V2.';
