-- MASS-FIRST-1 — Source Policy Public Gate
-- Public Search is governed by the canonical Source Registry. The gate is
-- channel-aware and distinguishes minimal canonical-link exposure from
-- authorized partner content. Quality never grants display permission.

create or replace function public.mass_first_seed_provider_channel_v1(p_seed_provider text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case nullif(btrim(p_seed_provider),'')
    when 'public_sitemap' then 'public_sitemap'
    when 'commoncrawl_cdx' then 'commoncrawl'
    when 'serper_search' then 'public_index'
    else null
  end;
$$;

revoke all on function public.mass_first_seed_provider_channel_v1(text) from public, anon, authenticated;
grant execute on function public.mass_first_seed_provider_channel_v1(text) to service_role;

create or replace function public.mass_first_source_public_mode_v1(
  p_source_domain text,
  p_seed_provider text
)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
with policy as (
  select
    r.*,
    public.mass_first_seed_provider_channel_v1(p_seed_provider) as requested_channel
  from public.source_policy_registry r
  where r.source_domain = lower(nullif(btrim(p_source_domain),''))
), evaluated as (
  select
    p.*,
    (
      p.no_bypass_required
      and nullif(btrim(p.policy_hash),'') is not null
      and p.review_status in ('current','due_soon')
      and p.next_review_at is not null
      and p.next_review_at > now()
      and p.requested_channel is not null
      and p.requested_channel = any(p.allowed_discovery_channels)
      and p.machine_gate is not null
      and p.machine_gate not like 'blocked%'
      and p.ingestion_gate is not null
      and p.ingestion_gate not like 'blocked%'
    ) as common_gate
  from policy p
)
select coalesce((
  select case
    when not e.common_gate then 'blocked'
    when e.display_policy = 'canonical_link_only'
      and e.display_gate = 'external_tail_link_only'
      and e.machine_gate = 'canonical_link_only'
      and e.ingestion_gate = 'canonical_link_only'
      and e.acquisition_mode = 'public_sitemap_canonical_link'
      then 'canonical_link_only'
    when e.display_policy = 'partner_content'
      and e.display_gate is distinct from 'hidden'
      and e.authorization_status = 'authorized_partner'
      and e.content_reuse_policy in ('authorized','link_and_facts_only')
      and e.acquisition_mode in ('authorized_detail_feed','partner_feed')
      and e.machine_gate in ('authorized_detail_feed','partner_feed')
      then 'partner_content'
    else 'blocked'
  end
  from evaluated e
), 'blocked');
$$;

revoke all on function public.mass_first_source_public_mode_v1(text,text) from public, anon, authenticated;
grant execute on function public.mass_first_source_public_mode_v1(text,text) to service_role;

create or replace function public.mass_first_source_public_allowed_v1(
  p_source_domain text,
  p_seed_provider text
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select public.mass_first_source_public_mode_v1(p_source_domain,p_seed_provider) <> 'blocked';
$$;

revoke all on function public.mass_first_source_public_allowed_v1(text,text) from public, anon, authenticated;
grant execute on function public.mass_first_source_public_allowed_v1(text,text) to service_role;

create or replace function public.mass_first_1_source_policy_gate_report_v1()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with observed as (
  select
    d.source_domain,
    d.seed_provider,
    public.mass_first_seed_provider_channel_v1(d.seed_provider) as requested_channel,
    public.mass_first_source_public_mode_v1(d.source_domain,d.seed_provider) as public_mode
  from public.thin_index_search_documents d
  where nullif(btrim(d.source_domain),'') is not null
), totals as (
  select
    count(*)::int as observed_rows,
    count(distinct o.source_domain)::int as observed_sources,
    count(*) filter(where r.source_domain is null)::int as unregistered_rows,
    count(*) filter(where o.requested_channel is null or not (o.requested_channel = any(coalesce(r.allowed_discovery_channels,'{}'::text[]))))::int as channel_mismatch_rows,
    count(*) filter(where r.display_gate='hidden')::int as hidden_rows,
    count(*) filter(where r.authorization_status='prohibited' or r.content_reuse_policy='prohibited')::int as prohibited_rows,
    count(*) filter(where o.public_mode='canonical_link_only')::int as canonical_link_rows,
    count(*) filter(where o.public_mode='partner_content')::int as partner_content_rows,
    count(*) filter(where o.public_mode<>'blocked')::int as publicly_allowed_rows
  from observed o
  left join public.source_policy_registry r using(source_domain)
), leakage as (
  select count(*)::int as public_policy_leak_rows
  from public.thin_index_search_documents d
  where d.display_eligibility in ('eligible_primary','eligible_secondary')
    and not public.mass_first_source_public_allowed_v1(d.source_domain,d.seed_provider)
)
select jsonb_build_object(
  'version','mass_first_source_policy_gate_v2',
  'observed_rows',observed_rows,
  'observed_sources',observed_sources,
  'unregistered_rows',unregistered_rows,
  'channel_mismatch_rows',channel_mismatch_rows,
  'hidden_rows',hidden_rows,
  'prohibited_rows',prohibited_rows,
  'canonical_link_rows',canonical_link_rows,
  'partner_content_rows',partner_content_rows,
  'publicly_allowed_rows',publicly_allowed_rows,
  'pre_reclassification_policy_leak_rows',public_policy_leak_rows,
  'canonical_link_content_reuse_required',false,
  'canonical_link_payload_must_be_redacted',true,
  'fail_closed',true
)
from totals cross join leakage;
$$;

revoke all on function public.mass_first_1_source_policy_gate_report_v1() from public, anon, authenticated;
grant execute on function public.mass_first_1_source_policy_gate_report_v1() to service_role;

comment on function public.mass_first_source_public_mode_v1(text,text) is
  'Fail-closed, channel-aware public mode derived only from canonical Source Registry policy. canonical_link_only permits only a redacted external-tail representation; partner_content requires explicit authorization.';

comment on function public.mass_first_source_public_allowed_v1(text,text) is
  'True only when Source Registry policy and the exact discovery channel permit a public representation. Quality is not consulted.';

select public.mass_first_1_source_policy_gate_report_v1();