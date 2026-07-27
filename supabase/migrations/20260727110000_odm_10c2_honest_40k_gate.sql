-- ODM-10C2 — honest 40K restoration gate and acquisition backlog.
-- This migration does not fabricate or publish listings. It records the real deficit
-- and blocks certification until 40,000 real-estate-eligible representations exist.

create table if not exists public.odm_10c2_acquisition_backlog (
  source_domain text primary key,
  discovery_lane text not null check (discovery_lane in ('public_sitemap','public_index','partner_feed')),
  authorization_state text not null check (authorization_state in ('discovery_allowed','permission_required','authorized')),
  target_net_new integer not null check (target_net_new >= 0),
  discovered_net_new integer not null default 0 check (discovered_net_new >= 0),
  admitted_net_new integer not null default 0 check (admitted_net_new >= 0),
  status text not null default 'planned' check (status in ('planned','running','blocked','complete')),
  evidence text not null,
  updated_at timestamptz not null default now()
);

alter table public.odm_10c2_acquisition_backlog enable row level security;
revoke all on table public.odm_10c2_acquisition_backlog from public, anon, authenticated;
grant select, insert, update, delete on table public.odm_10c2_acquisition_backlog to service_role;

insert into public.odm_10c2_acquisition_backlog (
  source_domain, discovery_lane, authorization_state, target_net_new, evidence
) values
  ('daragadir.com','public_sitemap','discovery_allowed',2000,'Existing public sitemap lane; only new, deduplicated, real-estate URLs may count.'),
  ('promoimmomarrakech.com','public_sitemap','discovery_allowed',1500,'Existing public property sitemap lane; detail reuse remains permission-gated.'),
  ('limmobiliersansfrontieres.com','public_sitemap','discovery_allowed',1000,'Existing public property sitemap lane; canonical-link admission only.'),
  ('atlasimmobilier.com','public_sitemap','permission_required',800,'Public properties sitemap exists; reuse requires written permission.'),
  ('aykana.ma','public_sitemap','permission_required',800,'Public property sitemaps exist; reuse requires written permission.'),
  ('barnes-marrakech.com','public_sitemap','permission_required',540,'Public sitemap exists; admission requires source-specific policy validation.')
on conflict (source_domain) do update set
  discovery_lane = excluded.discovery_lane,
  authorization_state = excluded.authorization_state,
  target_net_new = excluded.target_net_new,
  evidence = excluded.evidence,
  updated_at = now();

create or replace function public.odm_10c2_honest_40k_report()
returns jsonb
language sql
security invoker
set search_path = public
as $$
  with metrics as (
    select
      count(*) filter (
        where vertical_classification = 'real_estate_likely'
          and display_eligibility in ('eligible_primary','eligible_secondary')
      )::integer as public_real_estate,
      count(*) filter (
        where vertical_classification = 'non_real_estate'
          and display_eligibility in ('eligible_primary','eligible_secondary')
      )::integer as leaked_noise,
      count(*) filter (where display_eligibility = 'ineligible')::integer as quarantined
    from public.thin_index_search_documents
  ), backlog as (
    select
      coalesce(sum(target_net_new),0)::integer as planned_target,
      coalesce(sum(discovered_net_new),0)::integer as discovered_net_new,
      coalesce(sum(admitted_net_new),0)::integer as admitted_net_new
    from public.odm_10c2_acquisition_backlog
  )
  select jsonb_build_object(
    'audit_version','odm_10c2_v1',
    'target',40000,
    'public_real_estate',m.public_real_estate,
    'gap_to_40k',greatest(0,40000-m.public_real_estate),
    'leaked_noise',m.leaked_noise,
    'quarantined',m.quarantined,
    'planned_target',b.planned_target,
    'discovered_net_new',b.discovered_net_new,
    'admitted_net_new',b.admitted_net_new,
    'certified',(m.public_real_estate >= 40000 and m.leaked_noise = 0)
  )
  from metrics m cross join backlog b;
$$;

revoke all on function public.odm_10c2_honest_40k_report() from public, anon, authenticated;
grant execute on function public.odm_10c2_honest_40k_report() to service_role;

comment on function public.odm_10c2_honest_40k_report() is
  'Fail-closed certification report: 40K requires real-estate eligibility and zero leaked non-real-estate noise.';
