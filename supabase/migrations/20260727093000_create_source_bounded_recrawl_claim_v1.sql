-- P0 DATA — Autonomous Recrawl Micro-Batch V1
-- Claims at most three due jobs for one explicit source. Internal service-role only.

create or replace function public.claim_due_recrawl_jobs_for_source_v1(
  p_worker_id text,
  p_source_key text,
  p_limit integer,
  p_now timestamptz default now(),
  p_lease_minutes integer default 15
)
returns setof public.source_offer_recrawl_schedule
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if nullif(btrim(p_worker_id), '') is null then raise exception 'worker_id is required'; end if;
  if p_source_key <> 'mubawab' then raise exception 'source not allowed for autonomous microbatch'; end if;
  if p_limit < 1 or p_limit > 3 then raise exception 'microbatch limit must be between 1 and 3'; end if;
  if p_lease_minutes < 1 or p_lease_minutes > 30 then raise exception 'lease_minutes must be between 1 and 30'; end if;

  return query
  with due as (
    select s.source_offer_id
    from public.source_offer_recrawl_schedule s
    where s.source_key = p_source_key
      and s.policy_state = 'allowed'
      and s.publication_eligible = false
      and s.next_recrawl_at <= p_now
      and (s.lease_until is null or s.lease_until <= p_now)
    order by s.priority desc, s.next_recrawl_at asc, s.source_offer_id asc
    for update skip locked
    limit p_limit
  )
  update public.source_offer_recrawl_schedule s
  set lease_token = gen_random_uuid(),
      leased_by = btrim(p_worker_id),
      lease_until = p_now + make_interval(mins => p_lease_minutes),
      updated_at = p_now
  from due
  where s.source_offer_id = due.source_offer_id
  returning s.*;
end;
$$;

revoke all on function public.claim_due_recrawl_jobs_for_source_v1(text,text,integer,timestamptz,integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_recrawl_jobs_for_source_v1(text,text,integer,timestamptz,integer)
  to service_role;

comment on function public.claim_due_recrawl_jobs_for_source_v1(text,text,integer,timestamptz,integer)
  is 'Claims at most three due Mubawab jobs for the internal autonomous microbatch. No publication.';
