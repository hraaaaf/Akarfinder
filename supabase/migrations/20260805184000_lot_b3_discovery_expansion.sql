-- LOT B3 — Discovery Expansion.
-- Materializes a fail-closed, read-only expansion audit from already persisted discovery observations.
-- Candidates that cannot be admitted now are preserved in a deferred reserve lane, never discarded.

create table if not exists public.odm_b3_discovery_expansion_audit_v1 (
  source_domain text not null,
  canonical_url text not null,
  provider text not null,
  discovery_channel text not null,
  last_seen_at timestamptz not null,
  policy_hash text,
  freshness_state text,
  effective_machine_gate text,
  decision text not null,
  decision_reason text not null,
  reserve_lane text not null default 'none',
  reserve_priority smallint not null default 100,
  seed_admission_eligible boolean not null default false,
  publication_eligible boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (source_domain, canonical_url)
);

alter table public.odm_b3_discovery_expansion_audit_v1
  add column if not exists reserve_lane text not null default 'none',
  add column if not exists reserve_priority smallint not null default 100;

truncate table public.odm_b3_discovery_expansion_audit_v1;

insert into public.odm_b3_discovery_expansion_audit_v1 (
  source_domain, canonical_url, provider, discovery_channel, last_seen_at,
  policy_hash, freshness_state, effective_machine_gate,
  decision, decision_reason, reserve_lane, reserve_priority
)
with ranked as (
  select
    lower(c.source_domain) as source_domain,
    coalesce(c.canonical_url,c.source_url) as canonical_url,
    c.provider,
    case
      when c.provider='public_sitemap' then 'public_sitemap'
      when c.provider in ('openserp','serper_mass_harvest') then 'public_index'
      else 'unsupported'
    end as discovery_channel,
    c.last_seen_at,
    row_number() over (
      partition by lower(c.source_domain),coalesce(c.canonical_url,c.source_url)
      order by
        case c.provider when 'public_sitemap' then 1 when 'openserp' then 2 when 'serper_mass_harvest' then 3 else 9 end,
        c.last_seen_at desc
    ) as rn
  from public.discovery_candidates c
  where coalesce(c.canonical_url,c.source_url) ~ '^https?://'
), evaluated as (
  select
    r.*,
    p.policy_hash,
    p.allowed_discovery_channels,
    f.freshness_state,
    f.effective_machine_gate,
    (p.source_domain is not null) as registered,
    (s.canonical_url is not null) as already_seeded
  from ranked r
  left join public.source_policy_registry p on p.source_domain=r.source_domain
  left join public.source_freshness_state f on f.source_domain=r.source_domain
  left join public.source_offer_seeds s on s.canonical_url=r.canonical_url
  where r.rn=1
)
select
  source_domain,canonical_url,provider,discovery_channel,last_seen_at,
  policy_hash,freshness_state,effective_machine_gate,
  case
    when not registered then 'reserve_unregistered_source'
    when already_seeded then 'already_seeded'
    when freshness_state not in ('current','due_soon') or freshness_state is null then 'reserve_freshness'
    when not (discovery_channel = any(allowed_discovery_channels)) then 'reserve_channel'
    when effective_machine_gate='canonical_link_only' then 'qualified_canonical_link'
    when effective_machine_gate='internal_signal_only' then 'qualified_internal_signal'
    else 'reserve_gate'
  end,
  case
    when not registered then 'Preserved for Source Registry review; no current source policy.'
    when already_seeded then 'Canonical URL already exists in source_offer_seeds.'
    when freshness_state not in ('current','due_soon') or freshness_state is null then 'Preserved until source freshness is recertified.'
    when not (discovery_channel = any(allowed_discovery_channels)) then 'Preserved until this discovery channel is authorized or corroborated through an allowed channel.'
    when effective_machine_gate='canonical_link_only' then 'Net-new URL observed through an allowed channel on a fresh canonical-link source.'
    when effective_machine_gate='internal_signal_only' then 'Net-new URL observed through an allowed channel on a fresh internal-signal source.'
    else 'Preserved until the effective machine gate permits expansion.'
  end,
  case
    when not registered then 'policy_review_backlog'
    when already_seeded then 'none'
    when freshness_state not in ('current','due_soon') or freshness_state is null then 'freshness_revalidation_backlog'
    when not (discovery_channel = any(allowed_discovery_channels)) then 'channel_corroboration_backlog'
    when effective_machine_gate in ('canonical_link_only','internal_signal_only') then 'none'
    else 'policy_gate_backlog'
  end,
  case
    when already_seeded then 0
    when freshness_state not in ('current','due_soon') or freshness_state is null then 10
    when registered and not (discovery_channel = any(allowed_discovery_channels)) then 20
    when not registered then 30
    when effective_machine_gate not in ('canonical_link_only','internal_signal_only') then 40
    else 0
  end::smallint
from evaluated;

alter table public.odm_b3_discovery_expansion_audit_v1 enable row level security;
revoke all on table public.odm_b3_discovery_expansion_audit_v1 from public,anon,authenticated;
grant select,insert,update,delete on table public.odm_b3_discovery_expansion_audit_v1 to service_role;

create or replace function public.odm_b3_discovery_expansion_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
with totals as (
  select
    count(*)::int total_unique_urls,
    count(*) filter(where decision='qualified_canonical_link')::int qualified_canonical_link,
    count(*) filter(where decision='qualified_internal_signal')::int qualified_internal_signal,
    count(*) filter(where decision='reserve_channel')::int reserve_channel,
    count(*) filter(where decision='reserve_freshness')::int reserve_freshness,
    count(*) filter(where decision='reserve_gate')::int reserve_gate,
    count(*) filter(where decision='already_seeded')::int already_seeded,
    count(*) filter(where decision='reserve_unregistered_source')::int reserve_unregistered_source,
    count(*) filter(where decision like 'reserve_%')::int reserve_total,
    count(*) filter(where seed_admission_eligible)::int seed_admission_eligible,
    count(*) filter(where publication_eligible)::int publication_eligible,
    count(*) filter(where decision like 'qualified_%' and (policy_hash is null or freshness_state not in ('current','due_soon')))::int invalid_qualified,
    count(*) filter(where decision like 'qualified_%' and discovery_channel='unsupported')::int unsupported_qualified
  from public.odm_b3_discovery_expansion_audit_v1
)
select jsonb_build_object(
  'audit_version','odm_b3_discovery_expansion_v1',
  'total_unique_urls',total_unique_urls,
  'qualified_net_new',qualified_canonical_link+qualified_internal_signal,
  'qualified_canonical_link',qualified_canonical_link,
  'qualified_internal_signal',qualified_internal_signal,
  'deferred_reserve',jsonb_build_object(
    'total',reserve_total,
    'channel',reserve_channel,
    'freshness',reserve_freshness,
    'gate',reserve_gate,
    'unregistered_source',reserve_unregistered_source
  ),
  'already_seeded',already_seeded,
  'seed_admission_eligible',seed_admission_eligible,
  'publication_eligible',publication_eligible,
  'integrity',jsonb_build_object(
    'invalid_qualified',invalid_qualified,
    'unsupported_qualified',unsupported_qualified
  ),
  'fail_closed',seed_admission_eligible=0 and publication_eligible=0 and invalid_qualified=0 and unsupported_qualified=0
)
from totals;
$$;

revoke all on function public.odm_b3_discovery_expansion_report_v1() from public,anon,authenticated;
grant execute on function public.odm_b3_discovery_expansion_report_v1() to service_role;

select public.odm_b3_discovery_expansion_report_v1();
