-- AKARFINDER-INCIDENT-INGESTION-P0 — atomic discovery_candidates persistence.
-- Goal: remove the PostgREST 1,000-row lookup ceiling and the SELECT -> INSERT/UPDATE race
-- from OpenSERP discovery writes while preserving the existing selective update semantics.
-- Preconditions: discovery_candidates_idempotency_idx remains the partial unique index on
-- (provider, query_hash, canonical_url) WHERE canonical_url IS NOT NULL.
-- Impact: additive service-role RPC only; no rows are modified by this migration itself.
-- Re-run behavior: CREATE OR REPLACE is idempotent for the same function signature.
-- Rollback: drop only this RPC; the existing table/index remain unchanged.

begin;

create or replace function public.upsert_discovery_candidates_batch(p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_affected integer := 0;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'discovery_candidates_batch_must_be_json_array';
  end if;

  if jsonb_array_length(p_rows) = 0 then
    return 0;
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_rows) as input_row(canonical_url text)
    where nullif(btrim(input_row.canonical_url), '') is null
  ) then
    raise exception 'discovery_candidates_batch_requires_canonical_url';
  end if;

  insert into public.discovery_candidates (
    provider,
    discovery_query,
    query_hash,
    result_rank,
    source_domain,
    source_url,
    canonical_url,
    title,
    snippet,
    discovered_at,
    last_seen_at,
    discovery_status,
    content_fingerprint,
    metadata
  )
  select
    input_row.provider,
    input_row.discovery_query,
    input_row.query_hash,
    input_row.result_rank,
    input_row.source_domain,
    input_row.source_url,
    input_row.canonical_url,
    input_row.title,
    input_row.snippet,
    input_row.discovered_at,
    input_row.last_seen_at,
    input_row.discovery_status,
    input_row.content_fingerprint,
    input_row.metadata
  from jsonb_to_recordset(p_rows) as input_row(
    provider text,
    discovery_query text,
    query_hash text,
    result_rank integer,
    source_domain text,
    source_url text,
    canonical_url text,
    title text,
    snippet text,
    discovered_at timestamptz,
    last_seen_at timestamptz,
    discovery_status text,
    content_fingerprint text,
    metadata jsonb
  )
  on conflict (provider, query_hash, canonical_url)
  where canonical_url is not null
  do update set
    last_seen_at = excluded.last_seen_at,
    discovery_status = excluded.discovery_status,
    result_rank = excluded.result_rank,
    title = excluded.title,
    snippet = excluded.snippet,
    metadata = excluded.metadata;

  get diagnostics v_affected = row_count;
  return v_affected;
end;
$$;

revoke all on function public.upsert_discovery_candidates_batch(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_discovery_candidates_batch(jsonb) to service_role;

comment on function public.upsert_discovery_candidates_batch(jsonb) is
  'Atomically inserts or selectively refreshes discovery_candidates using the partial idempotency index; avoids PostgREST lookup row limits and SELECT/write races.';

commit;

-- ROLLBACK (manual, not auto-applied):
-- drop function if exists public.upsert_discovery_candidates_batch(jsonb);
