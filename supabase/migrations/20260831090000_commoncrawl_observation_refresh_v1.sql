-- COMMONCRAWL-OBSERVATION-REFRESH-V1
-- Refresh authentic CDX observation evidence for existing Common Crawl seeds.
-- This function never promotes freshness, never writes listings, and never fetches source pages.

create or replace function public.odm_jsonb_text_array_union_v1(
  p_left jsonb,
  p_right jsonb
)
returns jsonb
language sql
immutable
set search_path to ''
as $function$
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
  from (
    select distinct value
    from (
      select jsonb_array_elements_text(
        case when jsonb_typeof(p_left) = 'array' then p_left else '[]'::jsonb end
      ) as value
      union all
      select jsonb_array_elements_text(
        case when jsonb_typeof(p_right) = 'array' then p_right else '[]'::jsonb end
      ) as value
    ) values_union
  ) deduped;
$function$;

create or replace function public.odm_upsert_commoncrawl_seed_observations_v1(
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r record;
  v_existing record;
  v_inserted_id uuid;
  v_input_rows integer := 0;
  v_inserted integer := 0;
  v_refreshed integer := 0;
  v_advanced_last integer := 0;
  v_unchanged integer := 0;
  v_provider_conflicts integer := 0;
  v_policy_rejected integer := 0;
  v_invalid integer := 0;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  v_input_rows := jsonb_array_length(p_rows);
  if v_input_rows > 100 then
    raise exception 'Common Crawl observation batch exceeds 100 rows: %', v_input_rows;
  end if;

  for r in
    select *
    from jsonb_to_recordset(p_rows) as x(
      canonical_url text,
      source_domain text,
      seed_provider text,
      first_observed_at timestamptz,
      last_observed_at timestamptz,
      observation_count integer,
      metadata jsonb,
      freshness_status text,
      fresh_last_seen_at timestamptz,
      fresh_channels text[],
      created_at timestamptz,
      updated_at timestamptz
    )
  loop
    if r.canonical_url is null
      or r.source_domain is null
      or r.seed_provider <> 'commoncrawl_cdx'
      or r.first_observed_at is null
      or r.last_observed_at is null
      or r.first_observed_at > r.last_observed_at
      or r.last_observed_at > now() + interval '5 minutes'
      or r.metadata is null
      or r.metadata ->> 'source' <> 'commoncrawl_url_index'
      or r.metadata ->> 'listing_pattern_matched' <> 'true'
      or jsonb_typeof(r.metadata -> 'cdx_indexes_seen') <> 'array'
      or jsonb_array_length(r.metadata -> 'cdx_indexes_seen') = 0
      or not (coalesce(r.metadata -> 'status_codes_observed', '[]'::jsonb) ? '200')
      or not exists (
        select 1
        from jsonb_array_elements_text(
          case
            when jsonb_typeof(r.metadata -> 'mime_observed') = 'array'
              then r.metadata -> 'mime_observed'
            else '[]'::jsonb
          end
        ) mime(value)
        where mime.value ilike 'text/html%'
      )
      or lower(regexp_replace(split_part(split_part(r.canonical_url, '://', 2), '/', 1), '^www\.', ''))
         <> lower(regexp_replace(r.source_domain, '^www\.', ''))
    then
      v_invalid := v_invalid + 1;
      continue;
    end if;

    if not exists (
      select 1
      from public.source_policy_registry p
      where p.source_domain = r.source_domain
        and p.no_bypass_required is true
        and nullif(btrim(p.policy_hash), '') is not null
        and 'commoncrawl' = any(p.allowed_discovery_channels)
        and p.review_status in ('current', 'due_soon')
        and p.next_review_at is not null
        and p.next_review_at > now()
        and p.policy_effective_at is not null
        and p.policy_effective_at <= now()
        and p.policy_expires_at is not null
        and p.policy_expires_at > now()
        and p.authorization_status = 'unverified'
        and p.acquisition_mode = 'public_index_internal_only'
        and p.discovery_policy = 'public_index_only'
        and p.display_policy = 'canonical_link_only'
        and p.machine_gate = 'canonical_link_only'
        and p.ingestion_gate = 'canonical_link_only'
        and p.display_gate = 'external_tail_link_only'
    ) then
      v_policy_rejected := v_policy_rejected + 1;
      continue;
    end if;

    v_inserted_id := null;
    insert into public.source_offer_seeds (
      canonical_url,
      source_domain,
      seed_provider,
      first_observed_at,
      last_observed_at,
      observation_count,
      metadata,
      freshness_status,
      fresh_last_seen_at,
      fresh_channels,
      created_at,
      updated_at
    ) values (
      r.canonical_url,
      r.source_domain,
      'commoncrawl_cdx',
      r.first_observed_at,
      r.last_observed_at,
      greatest(1, coalesce(r.observation_count, 1)),
      r.metadata,
      'seed_only',
      null,
      '{}'::text[],
      now(),
      now()
    )
    on conflict (canonical_url) do nothing
    returning id into v_inserted_id;

    if v_inserted_id is not null then
      v_inserted := v_inserted + 1;
      continue;
    end if;

    select
      s.id,
      s.seed_provider,
      s.first_observed_at,
      s.last_observed_at,
      s.observation_count,
      s.metadata
    into v_existing
    from public.source_offer_seeds s
    where s.canonical_url = r.canonical_url
    for update;

    if v_existing.seed_provider <> 'commoncrawl_cdx' then
      v_provider_conflicts := v_provider_conflicts + 1;
      continue;
    end if;

    if r.first_observed_at >= v_existing.first_observed_at
       and r.last_observed_at <= v_existing.last_observed_at
    then
      v_unchanged := v_unchanged + 1;
      continue;
    end if;

    update public.source_offer_seeds s
    set
      first_observed_at = least(s.first_observed_at, r.first_observed_at),
      last_observed_at = greatest(s.last_observed_at, r.last_observed_at),
      observation_count = greatest(coalesce(s.observation_count, 1), greatest(1, coalesce(r.observation_count, 1))),
      metadata = coalesce(s.metadata, '{}'::jsonb) || jsonb_build_object(
        'cdx_indexes_seen', public.odm_jsonb_text_array_union_v1(
          s.metadata -> 'cdx_indexes_seen',
          r.metadata -> 'cdx_indexes_seen'
        ),
        'status_codes_observed', public.odm_jsonb_text_array_union_v1(
          s.metadata -> 'status_codes_observed',
          r.metadata -> 'status_codes_observed'
        ),
        'mime_observed', public.odm_jsonb_text_array_union_v1(
          s.metadata -> 'mime_observed',
          r.metadata -> 'mime_observed'
        ),
        'listing_pattern_matched', true,
        'source', 'commoncrawl_url_index'
      ),
      updated_at = now()
    where s.id = v_existing.id;

    v_refreshed := v_refreshed + 1;
    if r.last_observed_at > v_existing.last_observed_at then
      v_advanced_last := v_advanced_last + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'input_rows', v_input_rows,
    'inserted_rows', v_inserted,
    'refreshed_rows', v_refreshed,
    'advanced_last_observed_rows', v_advanced_last,
    'unchanged_rows', v_unchanged,
    'provider_conflict_rows', v_provider_conflicts,
    'policy_rejected_rows', v_policy_rejected,
    'invalid_rows', v_invalid,
    'freshness_promotions', 0,
    'detail_fetches', 0
  );
end;
$function$;

revoke all on function public.odm_jsonb_text_array_union_v1(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.odm_upsert_commoncrawl_seed_observations_v1(jsonb) from public, anon, authenticated;
grant execute on function public.odm_upsert_commoncrawl_seed_observations_v1(jsonb) to service_role;
