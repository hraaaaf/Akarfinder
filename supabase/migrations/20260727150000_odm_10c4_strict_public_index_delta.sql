-- ODM-10C4 — strict public-index delta governance.
-- Common Crawl URL-index discoveries from approved real-estate domains remain
-- internal signals until source-specific display authorization changes.

create table if not exists public.odm_10c4_public_index_runs (
  run_key text primary key,
  cdx_indexes text[] not null,
  source_domains text[] not null,
  qualified_urls integer not null check (qualified_urls >= 0),
  net_new_urls integer not null check (net_new_urls >= 0),
  admitted_public_urls integer not null default 0 check (admitted_public_urls >= 0),
  artifact_sha256 text,
  executed_at timestamptz not null default now()
);

alter table public.odm_10c4_public_index_runs enable row level security;
revoke all on table public.odm_10c4_public_index_runs from public, anon, authenticated;
grant select, insert, update on table public.odm_10c4_public_index_runs to service_role;

create or replace function public.odm_10c4_finalize_public_index_delta(
  p_run_key text,
  p_cdx_indexes text[],
  p_source_domains text[],
  p_qualified_urls integer,
  p_net_new_urls integer,
  p_artifact_sha256 text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_allowed constant text[] := array[
    'agenz.ma','sarouty.ma','1immo.ma','mouldar.com','soukimmobilier.com','masaken.ma'
  ];
  v_domain text;
  v_public integer;
begin
  if p_run_key is null or btrim(p_run_key) = '' then
    raise exception 'ODM-10C4 run key required';
  end if;
  if p_qualified_urls < 0 or p_net_new_urls < 0 or p_net_new_urls > p_qualified_urls then
    raise exception 'invalid ODM-10C4 counters';
  end if;

  foreach v_domain in array p_source_domains loop
    if not (v_domain = any(v_allowed)) then
      raise exception 'source outside ODM-10C4 allowlist: %', v_domain;
    end if;
    if not exists (
      select 1 from public.source_policy_registry r
      where r.source_domain = v_domain
        and r.discovery_policy = 'public_index_only'
        and r.display_policy = 'internal_signal_only'
        and r.no_bypass_required = true
    ) then
      raise exception 'source policy does not permit ODM-10C4 internal discovery: %', v_domain;
    end if;
  end loop;

  update public.thin_index_search_documents d
  set
    vertical_classification = 'real_estate_likely',
    vertical_classification_reason = 'odm_10c4_strict_real_estate_public_index',
    vertical_classification_version = 'odm_10c4_v1',
    display_eligibility = 'ineligible',
    display_eligibility_reason = 'source_policy_internal_signal_only',
    ranking_quality_boost = 0,
    updated_at = now()
  where d.source_domain = any(p_source_domains)
    and d.seed_provider = 'commoncrawl_cdx'
    and coalesce(d.metadata->>'acquisition_lot','') = 'ODM-10C4';

  select count(*)::integer into v_public
  from public.thin_index_search_documents d
  where d.source_domain = any(p_source_domains)
    and d.seed_provider = 'commoncrawl_cdx'
    and coalesce(d.metadata->>'acquisition_lot','') = 'ODM-10C4'
    and d.display_eligibility in ('eligible_primary','eligible_secondary');

  if v_public <> 0 then
    raise exception 'ODM-10C4 public admission leak: %', v_public;
  end if;

  insert into public.odm_10c4_public_index_runs (
    run_key, cdx_indexes, source_domains, qualified_urls, net_new_urls,
    admitted_public_urls, artifact_sha256
  ) values (
    p_run_key, p_cdx_indexes, p_source_domains, p_qualified_urls, p_net_new_urls,
    0, p_artifact_sha256
  )
  on conflict (run_key) do update set
    cdx_indexes = excluded.cdx_indexes,
    source_domains = excluded.source_domains,
    qualified_urls = excluded.qualified_urls,
    net_new_urls = excluded.net_new_urls,
    admitted_public_urls = 0,
    artifact_sha256 = excluded.artifact_sha256,
    executed_at = now();

  return jsonb_build_object(
    'run_key', p_run_key,
    'qualified_urls', p_qualified_urls,
    'net_new_urls', p_net_new_urls,
    'admitted_public_urls', 0,
    'policy', 'internal_signal_only'
  );
end;
$$;

revoke all on function public.odm_10c4_finalize_public_index_delta(text,text[],text[],integer,integer,text) from public, anon, authenticated;
grant execute on function public.odm_10c4_finalize_public_index_delta(text,text[],text[],integer,integer,text) to service_role;
