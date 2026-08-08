-- P0.1 — Mass Index Source Registry Operational Gate
-- Future Common Crawl seed writes are fail-closed against the canonical
-- production Source Registry. Existing historical rows are not rewritten by
-- this migration; the report exposes any legacy source/channel mismatch.

create or replace function public.p0_1_enforce_mass_index_seed_policy()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_policy public.source_policy_registry%rowtype;
begin
  -- A Common Crawl seed cannot escape this guard by changing provider/domain
  -- after insert. Identity is immutable once either side of an UPDATE is CC.
  if tg_op = 'UPDATE'
     and (old.seed_provider = 'commoncrawl_cdx' or new.seed_provider = 'commoncrawl_cdx')
     and (
       new.seed_provider is distinct from old.seed_provider
       or new.source_domain is distinct from old.source_domain
     ) then
    raise exception 'P0.1 blocked Common Crawl seed: source/provider identity is immutable';
  end if;

  if new.seed_provider <> 'commoncrawl_cdx' then
    return new;
  end if;

  if new.source_domain is null
     or btrim(new.source_domain) = ''
     or new.source_domain <> lower(btrim(new.source_domain)) then
    raise exception 'P0.1 blocked Common Crawl seed: invalid source_domain %', new.source_domain;
  end if;

  select *
    into v_policy
  from public.source_policy_registry
  where source_domain = new.source_domain;

  if not found then
    raise exception 'P0.1 blocked Common Crawl seed: source % is not registered', new.source_domain;
  end if;

  if v_policy.no_bypass_required is distinct from true then
    raise exception 'P0.1 blocked Common Crawl seed: no-bypass invariant invalid for %', new.source_domain;
  end if;

  if nullif(btrim(v_policy.policy_hash), '') is null then
    raise exception 'P0.1 blocked Common Crawl seed: missing policy hash for %', new.source_domain;
  end if;

  if v_policy.review_status not in ('current', 'due_soon')
     or v_policy.next_review_at is null
     or v_policy.next_review_at <= now() then
    raise exception 'P0.1 blocked Common Crawl seed: policy review is not current for %', new.source_domain;
  end if;

  if not ('commoncrawl' = any(v_policy.allowed_discovery_channels)) then
    raise exception 'P0.1 blocked Common Crawl seed: channel commoncrawl is not allowed for %', new.source_domain;
  end if;

  if v_policy.acquisition_mode = 'blocked' then
    raise exception 'P0.1 blocked Common Crawl seed: acquisition is blocked for %', new.source_domain;
  end if;

  if v_policy.machine_gate is null or v_policy.machine_gate like 'blocked%' then
    raise exception 'P0.1 blocked Common Crawl seed: machine gate blocks %', new.source_domain;
  end if;

  if v_policy.ingestion_gate is null or v_policy.ingestion_gate like 'blocked%' then
    raise exception 'P0.1 blocked Common Crawl seed: ingestion gate blocks %', new.source_domain;
  end if;

  -- Common Crawl CDX is historical URL-index metadata only. At INSERT time it
  -- may create only seed_only state. Later exact live corroboration may update
  -- freshness through the separate freshness pipeline; this trigger does not
  -- fire on freshness-only updates.
  if tg_op = 'INSERT' and (
       new.freshness_status <> 'seed_only'
       or new.fresh_last_seen_at is not null
       or cardinality(new.fresh_channels) <> 0
     ) then
    raise exception 'P0.1 blocked Common Crawl seed: seed-only freshness invariant violated for %', new.source_domain;
  end if;

  return new;
end;
$$;

revoke all on function public.p0_1_enforce_mass_index_seed_policy() from public, anon, authenticated;
grant execute on function public.p0_1_enforce_mass_index_seed_policy() to service_role;

drop trigger if exists p0_1_mass_index_seed_policy_guard on public.source_offer_seeds;
create trigger p0_1_mass_index_seed_policy_guard
before insert or update of source_domain, seed_provider
on public.source_offer_seeds
for each row
execute function public.p0_1_enforce_mass_index_seed_policy();

create or replace function public.p0_1_mass_index_source_registry_report()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with commoncrawl_registry as (
  select
    count(*) filter (
      where 'commoncrawl' = any(allowed_discovery_channels)
        and no_bypass_required
        and nullif(btrim(policy_hash), '') is not null
        and review_status in ('current', 'due_soon')
        and next_review_at > now()
        and acquisition_mode <> 'blocked'
        and machine_gate not like 'blocked%'
        and ingestion_gate not like 'blocked%'
    )::int as currently_allowed_sources,
    count(*) filter (where 'commoncrawl' = any(allowed_discovery_channels))::int as channel_declared_sources
  from public.source_policy_registry
), historical as (
  select
    count(*)::int as total_commoncrawl_seeds,
    count(*) filter (
      where r.source_domain is null
         or not ('commoncrawl' = any(r.allowed_discovery_channels))
         or r.no_bypass_required is distinct from true
         or nullif(btrim(r.policy_hash), '') is null
         or r.review_status not in ('current', 'due_soon')
         or r.next_review_at is null
         or r.next_review_at <= now()
         or r.acquisition_mode = 'blocked'
         or r.machine_gate is null
         or r.machine_gate like 'blocked%'
         or r.ingestion_gate is null
         or r.ingestion_gate like 'blocked%'
    )::int as historical_policy_mismatch,
    count(*) filter (
      where s.freshness_status = 'seed_only'
        and (
          r.source_domain is null
          or not ('commoncrawl' = any(r.allowed_discovery_channels))
          or r.no_bypass_required is distinct from true
          or nullif(btrim(r.policy_hash), '') is null
          or r.review_status not in ('current', 'due_soon')
          or r.next_review_at is null
          or r.next_review_at <= now()
          or r.acquisition_mode = 'blocked'
          or r.machine_gate is null
          or r.machine_gate like 'blocked%'
          or r.ingestion_gate is null
          or r.ingestion_gate like 'blocked%'
        )
    )::int as historical_seed_only_policy_mismatch
  from public.source_offer_seeds s
  left join public.source_policy_registry r on r.source_domain = s.source_domain
  where s.seed_provider = 'commoncrawl_cdx'
)
select jsonb_build_object(
  'gate_version', 'p0_1_mass_index_source_registry_v1',
  'discovery_channel', 'commoncrawl',
  'currently_allowed_sources', commoncrawl_registry.currently_allowed_sources,
  'channel_declared_sources', commoncrawl_registry.channel_declared_sources,
  'total_commoncrawl_seeds', historical.total_commoncrawl_seeds,
  'historical_policy_mismatch', historical.historical_policy_mismatch,
  'historical_seed_only_policy_mismatch', historical.historical_seed_only_policy_mismatch,
  'future_writes_fail_closed', true,
  'historical_rows_mutated', false
)
from commoncrawl_registry cross join historical;
$$;

revoke all on function public.p0_1_mass_index_source_registry_report() from public, anon, authenticated;
grant execute on function public.p0_1_mass_index_source_registry_report() to service_role;

select public.p0_1_mass_index_source_registry_report();

-- Rollback (manual, intentionally non-destructive):
-- drop trigger if exists p0_1_mass_index_seed_policy_guard on public.source_offer_seeds;
-- drop function if exists public.p0_1_enforce_mass_index_seed_policy();
-- drop function if exists public.p0_1_mass_index_source_registry_report();
