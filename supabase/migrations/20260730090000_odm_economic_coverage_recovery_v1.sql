-- ODM-ECONOMIC-COVERAGE-RECOVERY-V1
-- Recover additional Shadow-only economic evidence from already persisted normalization proof.
-- No public price, Thin Index, ranking, display eligibility or SERP mutation.

create table if not exists public.odm_economic_recovery_candidate_shadow_v1 (
  recovery_id text primary key,
  seed_id uuid not null,
  observation_id text not null,
  source_domain text,
  normalized_city text,
  normalized_property_type text,
  normalized_intent text,
  recovered_value_mad numeric not null check (recovered_value_mad between 100 and 1000000000),
  recovered_economic_type text not null check (recovered_economic_type in ('sale_total','rent_monthly')),
  evidence_source text not null,
  evidence_observed_at timestamptz not null,
  normalization_version text not null,
  normalization_status text,
  normalization_evidence jsonb not null,
  recovery_status text not null check (recovery_status in ('eligible_shadow','blocked_ambiguous','blocked_rejected','blocked_stale','blocked_missing_proof','blocked_intent')),
  rejection_reason text,
  publication_eligible boolean not null default false check (publication_eligible=false),
  ranking_eligible boolean not null default false check (ranking_eligible=false),
  recovered_at timestamptz not null default now()
);

alter table public.odm_economic_recovery_candidate_shadow_v1 enable row level security;
create index if not exists odm_economic_recovery_status_idx on public.odm_economic_recovery_candidate_shadow_v1(recovery_status,source_domain);
create index if not exists odm_economic_recovery_city_idx on public.odm_economic_recovery_candidate_shadow_v1(normalized_city,normalized_intent);

create or replace function public.refresh_odm_economic_coverage_recovery_v1()
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare v_rows bigint;
begin
  delete from public.odm_economic_recovery_candidate_shadow_v1;

  insert into public.odm_economic_recovery_candidate_shadow_v1 (
    recovery_id,seed_id,observation_id,source_domain,normalized_city,normalized_property_type,normalized_intent,
    recovered_value_mad,recovered_economic_type,evidence_source,evidence_observed_at,normalization_version,
    normalization_status,normalization_evidence,recovery_status,rejection_reason,publication_eligible,ranking_eligible,recovered_at
  )
  select
    md5(s.observation_id||':economic-recovery-v1:'||d.normalized_price_mad::text),
    s.seed_id,s.observation_id,s.source_domain,s.normalized_city,s.normalized_property_type,s.normalized_intent,
    d.normalized_price_mad,
    case when s.normalized_intent='rent' then 'rent_monthly' else 'sale_total' end,
    coalesce(d.normalization_evidence->>'price_source',d.normalization_evidence->>'method','persisted_normalization_evidence'),
    coalesce(nullif(d.normalization_evidence->>'observed_at','')::timestamptz,d.updated_at),
    d.normalization_version, d.normalization_status, d.normalization_evidence,
    case
      when s.economic_status='ambiguous' then 'blocked_ambiguous'
      when s.economic_status='rejected' then 'blocked_rejected'
      when s.economic_status='stale' then 'blocked_stale'
      when s.normalized_intent not in ('sale','rent') then 'blocked_intent'
      when d.normalization_evidence is null or d.normalization_version is null then 'blocked_missing_proof'
      else 'eligible_shadow'
    end,
    case
      when s.economic_status='ambiguous' then 'typed_v2_ambiguous'
      when s.economic_status='rejected' then 'typed_v2_rejected'
      when s.economic_status='stale' then 'freshness_not_confirmed'
      when s.normalized_intent not in ('sale','rent') then 'transaction_intent_unconfirmed'
      when d.normalization_evidence is null or d.normalization_version is null then 'normalization_proof_missing'
      else null
    end,
    false,false,now()
  from public.odm_economic_observation_state_shadow_v1 s
  join public.thin_index_search_documents d on d.seed_id=s.seed_id
  where s.parser_version='odm_economic_parser_v2'
    and s.economic_status<>'trusted'
    and d.normalized_price_mad is not null
    and d.normalized_price_mad between 100 and 1000000000
    and coalesce(nullif(d.normalization_evidence->>'observed_at','')::timestamptz,d.updated_at) is not null;

  get diagnostics v_rows=row_count;
  return jsonb_build_object('recovery_version','odm_economic_coverage_recovery_v1','candidate_rows',v_rows,'publication_activated',false,'ranking_activated',false);
end;
$$;

create or replace function public.odm_economic_coverage_recovery_report_v1()
returns jsonb
language sql
stable
set search_path=''
as $$
select jsonb_build_object(
  'audit_version','odm_economic_coverage_recovery_v1',
  'candidate_rows',count(*),
  'eligible_shadow',count(*) filter(where recovery_status='eligible_shadow'),
  'blocked_counts',jsonb_build_object(
    'ambiguous',count(*) filter(where recovery_status='blocked_ambiguous'),
    'rejected',count(*) filter(where recovery_status='blocked_rejected'),
    'stale',count(*) filter(where recovery_status='blocked_stale'),
    'missing_proof',count(*) filter(where recovery_status='blocked_missing_proof'),
    'intent',count(*) filter(where recovery_status='blocked_intent')
  ),
  'gates',jsonb_build_object(
    'all_rows_provenanced',count(*) filter(where observation_id is null or evidence_source is null or evidence_observed_at is null or normalization_version is null or normalization_evidence is null)=0,
    'only_missing_v2_can_be_eligible',count(*) filter(where recovery_status='eligible_shadow' and exists(select 1 from public.odm_economic_observation_state_shadow_v1 s where s.observation_id=odm_economic_recovery_candidate_shadow_v1.observation_id and s.parser_version='odm_economic_parser_v2' and s.economic_status<>'missing'))=0,
    'no_ambiguous_or_rejected_recovery',count(*) filter(where recovery_status='eligible_shadow' and rejection_reason is not null)=0,
    'publication_remains_disabled',count(*) filter(where publication_eligible)=0,
    'ranking_remains_disabled',count(*) filter(where ranking_eligible)=0
  )
)
from public.odm_economic_recovery_candidate_shadow_v1;
$$;

revoke all on public.odm_economic_recovery_candidate_shadow_v1 from public,anon,authenticated;
revoke all on function public.refresh_odm_economic_coverage_recovery_v1() from public,anon,authenticated;
revoke all on function public.odm_economic_coverage_recovery_report_v1() from public,anon,authenticated;
grant select,insert,update,delete on public.odm_economic_recovery_candidate_shadow_v1 to service_role;
grant execute on function public.refresh_odm_economic_coverage_recovery_v1() to service_role;
grant execute on function public.odm_economic_coverage_recovery_report_v1() to service_role;

comment on table public.odm_economic_recovery_candidate_shadow_v1 is 'Shadow-only economic recovery candidates from persisted normalization evidence. Never public or ranking eligible.';