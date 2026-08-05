-- Align B1 migration history with the compact production-certified runtime.

drop function if exists public.odm_refresh_b1_source_freshness_engine_v1(timestamptz);

create or replace view public.source_freshness_evaluation_v1 with (security_invoker=true) as
select r.source_domain,r.policy_version,r.policy_hash,
  least(coalesce(r.policy_expires_at,r.next_review_at),coalesce(r.evidence_observed_at,r.reviewed_at)+make_interval(days=>r.max_revalidation_interval_days)) freshness_deadline_at,
  case
    when r.policy_hash is null or cardinality(r.allowed_discovery_channels)=0 or r.no_bypass_required=false then 'blocked_unverified'
    when least(coalesce(r.policy_expires_at,r.next_review_at),coalesce(r.evidence_observed_at,r.reviewed_at)+make_interval(days=>r.max_revalidation_interval_days))<now() then 'overdue'
    when least(coalesce(r.policy_expires_at,r.next_review_at),coalesce(r.evidence_observed_at,r.reviewed_at)+make_interval(days=>r.max_revalidation_interval_days))<=now()+interval '3 days' then 'due_soon'
    else 'current' end freshness_state,
  least(100,(case when r.content_reuse_policy in ('prohibited','permission_required') then 25 else 10 end+
    case when r.legal_review_required then 20 else 0 end+case when r.partnership_required then 15 else 0 end+
    case when r.robots_status='unverified' then 15 else 0 end+case when r.terms_status in ('unverified','not_found') then 15 else 0 end+
    case when r.policy_confidence_score<=2 then 10 else 0 end))::smallint risk_priority,
  r.machine_gate base_machine_gate,
  case
    when r.policy_hash is null or cardinality(r.allowed_discovery_channels)=0 or r.no_bypass_required=false then 'blocked_unverified'
    when least(coalesce(r.policy_expires_at,r.next_review_at),coalesce(r.evidence_observed_at,r.reviewed_at)+make_interval(days=>r.max_revalidation_interval_days))<now() then 'blocked_review_overdue'
    else r.machine_gate end effective_machine_gate
from public.source_policy_registry r;

revoke all on public.source_freshness_evaluation_v1 from public,anon,authenticated;
grant select on public.source_freshness_evaluation_v1 to service_role;

create or replace function public.odm_refresh_b1_source_freshness_engine_v1()
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_events integer; v_total integer;
begin
  insert into public.source_freshness_transition_events(source_domain,previous_state,next_state,previous_effective_gate,next_effective_gate,evaluated_at,freshness_deadline_at,reason,policy_hash)
  select e.source_domain,s.freshness_state,e.freshness_state,s.effective_machine_gate,e.effective_machine_gate,now(),e.freshness_deadline_at,
    case when e.freshness_state='overdue' then 'Source freshness expired; review required.' when e.freshness_state='due_soon' then 'Source review due within three days.' when e.freshness_state='blocked_unverified' then 'Source governance evidence incomplete.' else 'Source freshness certified.' end,e.policy_hash
  from public.source_freshness_evaluation_v1 e left join public.source_freshness_state s using(source_domain)
  where s.source_domain is null or s.freshness_state is distinct from e.freshness_state or s.effective_machine_gate is distinct from e.effective_machine_gate or s.policy_hash is distinct from e.policy_hash;
  get diagnostics v_events=row_count;

  insert into public.source_freshness_state(source_domain,policy_version,policy_hash,evaluated_at,freshness_deadline_at,days_until_deadline,freshness_state,risk_priority,base_machine_gate,effective_machine_gate,revalidation_required,reason)
  select e.source_domain,e.policy_version,e.policy_hash,now(),e.freshness_deadline_at,floor(extract(epoch from (e.freshness_deadline_at-now()))/86400)::integer,e.freshness_state,e.risk_priority,e.base_machine_gate,e.effective_machine_gate,e.freshness_state<>'current',
    case when e.freshness_state='overdue' then 'Source policy or evidence expired; acquisition blocked pending review.' when e.freshness_state='due_soon' then 'Source review is due within three days.' when e.freshness_state='blocked_unverified' then 'Source governance evidence incomplete; source blocked.' else 'Source policy and evidence remain within the certified freshness window.' end
  from public.source_freshness_evaluation_v1 e
  on conflict(source_domain) do update set policy_version=excluded.policy_version,policy_hash=excluded.policy_hash,evaluated_at=excluded.evaluated_at,freshness_deadline_at=excluded.freshness_deadline_at,days_until_deadline=excluded.days_until_deadline,freshness_state=excluded.freshness_state,risk_priority=excluded.risk_priority,base_machine_gate=excluded.base_machine_gate,effective_machine_gate=excluded.effective_machine_gate,revalidation_required=excluded.revalidation_required,reason=excluded.reason,publication_eligible=false,updated_at=now();

  select count(*) into v_total from public.source_freshness_state;
  if v_total<>(select count(*) from public.source_policy_registry) then raise exception 'B1 coverage mismatch'; end if;
  return jsonb_build_object('sources',v_total,'transition_events_written',v_events,'fail_closed',not exists(select 1 from public.source_freshness_state where freshness_state in ('overdue','blocked_unverified') and effective_machine_gate not like 'blocked%'));
end;$$;

revoke all on function public.odm_refresh_b1_source_freshness_engine_v1() from public,anon,authenticated;
grant execute on function public.odm_refresh_b1_source_freshness_engine_v1() to service_role;

select public.odm_refresh_b1_source_freshness_engine_v1();
