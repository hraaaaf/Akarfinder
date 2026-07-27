-- ODM-10C3 — connected public-sitemap delta admission.
-- Only discovery-authorized dedicated real-estate domains may be admitted.
-- The function never fetches the web and never creates rows; it classifies rows
-- already persisted by the guarded connected runner and recomputes backlog proof.

create or replace function public.odm_10c3_finalize_sitemap_delta(p_source_domain text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_authorization text;
  v_lane text;
  v_discovered integer;
  v_admitted integer;
begin
  select authorization_state, discovery_lane
    into v_authorization, v_lane
  from public.odm_10c2_acquisition_backlog
  where source_domain = p_source_domain;

  if v_authorization is distinct from 'discovery_allowed' or v_lane is distinct from 'public_sitemap' then
    raise exception 'source is not authorized for connected public-sitemap discovery: %', p_source_domain;
  end if;

  if p_source_domain not in ('daragadir.com','promoimmomarrakech.com','limmobiliersansfrontieres.com') then
    raise exception 'source outside ODM-10C3 allowlist: %', p_source_domain;
  end if;

  update public.thin_index_search_documents d
  set
    vertical_classification = 'real_estate_likely',
    vertical_classification_reason = 'odm_10c3_dedicated_real_estate_sitemap',
    vertical_classification_version = 'odm_10c3_v1',
    display_eligibility = case
      when d.display_eligibility is null or d.display_eligibility = 'ineligible'
        then 'eligible_secondary'
      else d.display_eligibility
    end,
    display_eligibility_reason = case
      when d.display_eligibility is null or d.display_eligibility = 'ineligible'
        then 'link_only'
      else d.display_eligibility_reason
    end,
    updated_at = now()
  where d.source_domain = p_source_domain
    and d.seed_provider = 'public_sitemap'
    and coalesce(d.metadata->>'acquisition_lot','') = 'ODM-10C3';

  select count(*)::integer
    into v_discovered
  from public.thin_index_search_documents d
  where d.source_domain = p_source_domain
    and d.seed_provider = 'public_sitemap'
    and coalesce(d.metadata->>'acquisition_lot','') = 'ODM-10C3';

  select count(*)::integer
    into v_admitted
  from public.thin_index_search_documents d
  where d.source_domain = p_source_domain
    and d.seed_provider = 'public_sitemap'
    and coalesce(d.metadata->>'acquisition_lot','') = 'ODM-10C3'
    and d.vertical_classification = 'real_estate_likely'
    and d.display_eligibility in ('eligible_primary','eligible_secondary');

  update public.odm_10c2_acquisition_backlog
  set
    discovered_net_new = v_discovered,
    admitted_net_new = v_admitted,
    status = case when v_admitted >= target_net_new then 'complete' else 'running' end,
    updated_at = now()
  where source_domain = p_source_domain;

  return jsonb_build_object(
    'source_domain', p_source_domain,
    'discovered_net_new', v_discovered,
    'admitted_net_new', v_admitted,
    'target_net_new', (select target_net_new from public.odm_10c2_acquisition_backlog where source_domain = p_source_domain)
  );
end;
$$;

revoke all on function public.odm_10c3_finalize_sitemap_delta(text) from public, anon, authenticated;
grant execute on function public.odm_10c3_finalize_sitemap_delta(text) to service_role;

comment on function public.odm_10c3_finalize_sitemap_delta(text) is
  'Fail-closed ODM-10C3 admission: only already-persisted public-sitemap deltas from three discovery-authorized dedicated real-estate domains.';
