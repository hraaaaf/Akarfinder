-- P0 DATA — Transactional Recrawl Activation V1
-- Atomically persists one factual observation, derives reproducible events,
-- appends a lifecycle signal, records the recrawl attempt and releases/reschedules
-- the active lease. Internal-only: publication_eligible remains false.

create or replace function public.commit_transactional_recrawl_observation_v1(
  p_attempt_key text,
  p_source_offer_id bigint,
  p_source_key text,
  p_worker_id text,
  p_lease_token uuid,
  p_started_at timestamptz,
  p_completed_at timestamptz,
  p_http_status integer,
  p_observed_at timestamptz,
  p_displayed_price numeric,
  p_currency text,
  p_surface_m2 numeric,
  p_title_fingerprint text,
  p_content_fingerprint text,
  p_source_status text,
  p_availability_claim text,
  p_observation_origin text,
  p_ingestion_run_id uuid,
  p_city text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_schedule public.source_offer_recrawl_schedule;
  v_previous public.source_offer_observations;
  v_current public.source_offer_observations;
  v_attempt public.source_offer_recrawl_attempts;
  v_events jsonb := '[]'::jsonb;
  v_event_key text;
  v_event public.observation_ledger_events;
  v_lifecycle_state text := 'active';
  v_freshness_score integer := 100;
  v_recrawl_priority integer := 60;
  v_next_recrawl_at timestamptz;
  v_evaluation_key text;
  v_signal_id uuid;
  v_changed boolean := false;
  v_observation_count bigint;
begin
  if nullif(btrim(p_attempt_key), '') is null then raise exception 'attempt_key is required'; end if;
  if p_source_offer_id is null or p_source_offer_id <= 0 then raise exception 'invalid source_offer_id'; end if;
  if nullif(btrim(p_source_key), '') is null then raise exception 'source_key is required'; end if;
  if nullif(btrim(p_worker_id), '') is null then raise exception 'worker_id is required'; end if;
  if p_lease_token is null then raise exception 'lease_token is required'; end if;
  if p_completed_at < p_started_at then raise exception 'completed_at precedes started_at'; end if;
  if p_observed_at is null then raise exception 'observed_at is required'; end if;
  if p_source_status not in ('active','inactive','removed','unavailable') then raise exception 'invalid source_status'; end if;
  if nullif(btrim(p_content_fingerprint), '') is null then raise exception 'content_fingerprint is required'; end if;

  select * into v_schedule
  from public.source_offer_recrawl_schedule
  where source_offer_id = p_source_offer_id
  for update;

  if not found then raise exception 'recrawl schedule is missing'; end if;
  if v_schedule.lease_token is distinct from p_lease_token or v_schedule.leased_by is distinct from btrim(p_worker_id) then
    raise exception 'recrawl claim is missing or expired';
  end if;
  if v_schedule.source_key is distinct from btrim(p_source_key) then raise exception 'source_key mismatch'; end if;

  select * into v_previous
  from public.source_offer_observations
  where source_offer_id = p_source_offer_id
  order by observed_at desc, created_at desc, id desc
  limit 1;

  insert into public.source_offer_observations (
    source_offer_id, observed_at, displayed_price, currency, surface_m2,
    title_fingerprint, content_fingerprint, source_status, availability_claim,
    observation_origin, ingestion_run_id
  ) values (
    p_source_offer_id, p_observed_at, p_displayed_price, nullif(btrim(p_currency), ''), p_surface_m2,
    nullif(btrim(p_title_fingerprint), ''), p_content_fingerprint, p_source_status,
    nullif(btrim(p_availability_claim), ''), coalesce(nullif(btrim(p_observation_origin), ''), 'transactional_recrawl_v1'),
    p_ingestion_run_id
  )
  on conflict do nothing
  returning * into v_current;

  if v_current.id is null then
    select * into v_current
    from public.source_offer_observations
    where source_offer_id = p_source_offer_id
      and observed_at_bucket = date_trunc('hour', p_observed_at)
      and coalesce(content_fingerprint, '') = coalesce(p_content_fingerprint, '')
      and coalesce(displayed_price, -1) = coalesce(p_displayed_price, -1)
      and coalesce(surface_m2, -1) = coalesce(p_surface_m2, -1)
      and coalesce(source_status, '') = coalesce(p_source_status, '')
      and coalesce(availability_claim, '') = coalesce(p_availability_claim, '')
    order by created_at desc
    limit 1;
  end if;

  if v_current.id is null then raise exception 'observation persistence failed'; end if;

  if v_previous.id is null then
    v_event_key := encode(digest(p_source_offer_id::text || ':first:' || v_current.id::text, 'sha256'), 'hex');
    select public.persist_observation_ledger_event(
      v_event_key, p_source_offer_id, 'first_observed', p_observed_at, null, v_current.id,
      null, jsonb_build_object('status', p_source_status), p_metadata,
      encode(digest(v_current.id::text || ':first_observed', 'sha256'), 'hex'), 'observation_ledger_v1'
    ) into v_event;
    v_events := v_events || jsonb_build_array(v_event.event_key);
    v_lifecycle_state := 'newly_observed';
    v_recrawl_priority := 75;
  else
    if v_previous.displayed_price is distinct from p_displayed_price then
      v_changed := true;
      if v_previous.displayed_price is null and p_displayed_price is not null then
        v_event_key := encode(digest(p_source_offer_id::text || ':price_disclosed:' || v_current.id::text, 'sha256'), 'hex');
        select public.persist_observation_ledger_event(v_event_key,p_source_offer_id,'price_disclosed',p_observed_at,v_previous.id,v_current.id,
          jsonb_build_object('price',v_previous.displayed_price),jsonb_build_object('price',p_displayed_price),p_metadata,
          encode(digest(v_previous.id::text || ':' || v_current.id::text || ':price_disclosed','sha256'),'hex'),'observation_ledger_v1') into v_event;
      elsif v_previous.displayed_price is not null and p_displayed_price is null then
        v_event_key := encode(digest(p_source_offer_id::text || ':price_removed:' || v_current.id::text, 'sha256'), 'hex');
        select public.persist_observation_ledger_event(v_event_key,p_source_offer_id,'price_removed',p_observed_at,v_previous.id,v_current.id,
          jsonb_build_object('price',v_previous.displayed_price),jsonb_build_object('price',p_displayed_price),p_metadata,
          encode(digest(v_previous.id::text || ':' || v_current.id::text || ':price_removed','sha256'),'hex'),'observation_ledger_v1') into v_event;
      elsif p_displayed_price < v_previous.displayed_price then
        v_event_key := encode(digest(p_source_offer_id::text || ':price_decreased:' || v_current.id::text, 'sha256'), 'hex');
        select public.persist_observation_ledger_event(v_event_key,p_source_offer_id,'price_decreased',p_observed_at,v_previous.id,v_current.id,
          jsonb_build_object('price',v_previous.displayed_price),jsonb_build_object('price',p_displayed_price),p_metadata,
          encode(digest(v_previous.id::text || ':' || v_current.id::text || ':price_decreased','sha256'),'hex'),'observation_ledger_v1') into v_event;
      else
        v_event_key := encode(digest(p_source_offer_id::text || ':price_increased:' || v_current.id::text, 'sha256'), 'hex');
        select public.persist_observation_ledger_event(v_event_key,p_source_offer_id,'price_increased',p_observed_at,v_previous.id,v_current.id,
          jsonb_build_object('price',v_previous.displayed_price),jsonb_build_object('price',p_displayed_price),p_metadata,
          encode(digest(v_previous.id::text || ':' || v_current.id::text || ':price_increased','sha256'),'hex'),'observation_ledger_v1') into v_event;
      end if;
      v_events := v_events || jsonb_build_array(v_event.event_key);
      v_lifecycle_state := 'price_changed';
      v_recrawl_priority := 95;
    end if;

    if v_previous.surface_m2 is distinct from p_surface_m2 then
      v_changed := true;
      v_event_key := encode(digest(p_source_offer_id::text || ':surface_changed:' || v_current.id::text, 'sha256'), 'hex');
      select public.persist_observation_ledger_event(v_event_key,p_source_offer_id,'surface_changed',p_observed_at,v_previous.id,v_current.id,
        jsonb_build_object('surface_m2',v_previous.surface_m2),jsonb_build_object('surface_m2',p_surface_m2),p_metadata,
        encode(digest(v_previous.id::text || ':' || v_current.id::text || ':surface_changed','sha256'),'hex'),'observation_ledger_v1') into v_event;
      v_events := v_events || jsonb_build_array(v_event.event_key);
      if v_lifecycle_state = 'active' then v_lifecycle_state := 'content_changed'; end if;
      v_recrawl_priority := greatest(v_recrawl_priority, 85);
    end if;

    if v_previous.content_fingerprint is distinct from p_content_fingerprint then
      v_changed := true;
      v_event_key := encode(digest(p_source_offer_id::text || ':content_changed:' || v_current.id::text, 'sha256'), 'hex');
      select public.persist_observation_ledger_event(v_event_key,p_source_offer_id,'content_changed',p_observed_at,v_previous.id,v_current.id,
        jsonb_build_object('content_fingerprint',v_previous.content_fingerprint),jsonb_build_object('content_fingerprint',p_content_fingerprint),p_metadata,
        encode(digest(v_previous.id::text || ':' || v_current.id::text || ':content_changed','sha256'),'hex'),'observation_ledger_v1') into v_event;
      v_events := v_events || jsonb_build_array(v_event.event_key);
      if v_lifecycle_state = 'active' then v_lifecycle_state := 'content_changed'; end if;
      v_recrawl_priority := greatest(v_recrawl_priority, 85);
    end if;

    if v_previous.source_status is distinct from p_source_status or v_previous.availability_claim is distinct from p_availability_claim then
      v_changed := true;
      if p_source_status in ('removed','inactive') then
        v_event_key := encode(digest(p_source_offer_id::text || ':withdrawn:' || v_current.id::text, 'sha256'), 'hex');
        select public.persist_observation_ledger_event(v_event_key,p_source_offer_id,'withdrawn',p_observed_at,v_previous.id,v_current.id,
          jsonb_build_object('status',v_previous.source_status,'availability',v_previous.availability_claim),
          jsonb_build_object('status',p_source_status,'availability',p_availability_claim),p_metadata,
          encode(digest(v_previous.id::text || ':' || v_current.id::text || ':withdrawn','sha256'),'hex'),'observation_ledger_v1') into v_event;
        v_lifecycle_state := 'withdrawn';
        v_recrawl_priority := 40;
      elsif v_previous.source_status in ('removed','inactive','unavailable') and p_source_status = 'active' then
        v_event_key := encode(digest(p_source_offer_id::text || ':reactivated:' || v_current.id::text, 'sha256'), 'hex');
        select public.persist_observation_ledger_event(v_event_key,p_source_offer_id,'reactivated',p_observed_at,v_previous.id,v_current.id,
          jsonb_build_object('status',v_previous.source_status,'availability',v_previous.availability_claim),
          jsonb_build_object('status',p_source_status,'availability',p_availability_claim),p_metadata,
          encode(digest(v_previous.id::text || ':' || v_current.id::text || ':reactivated','sha256'),'hex'),'observation_ledger_v1') into v_event;
        v_lifecycle_state := 'reactivated';
        v_recrawl_priority := 95;
      else
        v_event_key := encode(digest(p_source_offer_id::text || ':availability_changed:' || v_current.id::text, 'sha256'), 'hex');
        select public.persist_observation_ledger_event(v_event_key,p_source_offer_id,'availability_changed',p_observed_at,v_previous.id,v_current.id,
          jsonb_build_object('status',v_previous.source_status,'availability',v_previous.availability_claim),
          jsonb_build_object('status',p_source_status,'availability',p_availability_claim),p_metadata,
          encode(digest(v_previous.id::text || ':' || v_current.id::text || ':availability_changed','sha256'),'hex'),'observation_ledger_v1') into v_event;
        if v_lifecycle_state = 'active' then v_lifecycle_state := 'recently_updated'; end if;
        v_recrawl_priority := greatest(v_recrawl_priority, 80);
      end if;
      v_events := v_events || jsonb_build_array(v_event.event_key);
    end if;

    if not v_changed then
      v_lifecycle_state := case when p_source_status = 'active' then 'active' else 'unknown' end;
      v_recrawl_priority := 45;
    end if;
  end if;

  v_freshness_score := greatest(0, least(100, 100 - floor(extract(epoch from (p_completed_at - p_observed_at)) / 86400.0 * 4)::integer));
  v_next_recrawl_at := p_completed_at + case
    when v_lifecycle_state in ('price_changed','reactivated') then interval '12 hours'
    when v_lifecycle_state in ('content_changed','recently_updated','newly_observed') then interval '1 day'
    when v_lifecycle_state = 'withdrawn' then interval '14 days'
    else interval '7 days'
  end;

  select count(*) into v_observation_count
  from public.source_offer_observations
  where source_offer_id = p_source_offer_id;

  v_evaluation_key := encode(digest(p_source_offer_id::text || ':' || v_current.id::text || ':transactional_recrawl_v1', 'sha256'), 'hex');
  select public.persist_source_offer_lifecycle_signal(
    p_source_offer_id, v_evaluation_key, p_completed_at, p_observed_at,
    v_freshness_score,
    case when v_freshness_score >= 85 then 'fresh' when v_freshness_score >= 65 then 'recent' when v_freshness_score >= 40 then 'aging' else 'stale' end,
    v_lifecycle_state,
    case when v_lifecycle_state = 'withdrawn' then 20 else 90 end,
    case when jsonb_array_length(v_events) > 0 then 80 else 20 end,
    v_observation_count::numeric,
    case when p_http_status = 200 then 95 else 70 end,
    v_next_recrawl_at,
    v_recrawl_priority,
    v_events,
    '[]'::jsonb,
    'transactional_recrawl_v1'
  ) into v_signal_id;

  select public.record_recrawl_attempt(
    p_attempt_key, p_source_offer_id, p_source_key, p_worker_id, p_lease_token,
    p_started_at, p_completed_at, 'success', p_http_status, true, 'complete',
    'transactional_observation_committed', v_next_recrawl_at, 'allowed', 0,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'observation_id', v_current.id,
      'lifecycle_signal_id', v_signal_id,
      'event_keys', v_events,
      'city', nullif(btrim(p_city), '')
    )
  ) into v_attempt;

  return jsonb_build_object(
    'observation_id', v_current.id,
    'observation_inserted', v_current.created_at >= transaction_timestamp(),
    'event_keys', v_events,
    'lifecycle_signal_id', v_signal_id,
    'lifecycle_state', v_lifecycle_state,
    'freshness_score', v_freshness_score,
    'next_recrawl_at', v_next_recrawl_at,
    'attempt_id', v_attempt.id,
    'publication_eligible', false
  );
end;
$$;

revoke all on function public.commit_transactional_recrawl_observation_v1(
  text,bigint,text,text,uuid,timestamptz,timestamptz,integer,timestamptz,numeric,text,numeric,text,text,text,text,text,uuid,text,jsonb
) from public, anon, authenticated;

grant execute on function public.commit_transactional_recrawl_observation_v1(
  text,bigint,text,text,uuid,timestamptz,timestamptz,integer,timestamptz,numeric,text,numeric,text,text,text,text,text,uuid,text,jsonb
) to service_role;

comment on function public.commit_transactional_recrawl_observation_v1(
  text,bigint,text,text,uuid,timestamptz,timestamptz,integer,timestamptz,numeric,text,numeric,text,text,text,text,text,uuid,text,jsonb
) is 'Atomic internal recrawl commit: observation, ledger events, lifecycle signal, attempt and reschedule. No publication.';
