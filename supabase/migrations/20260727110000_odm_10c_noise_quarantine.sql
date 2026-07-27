-- ODM-10C1 — deterministic vertical classification and reversible noise quarantine.
-- No rows are deleted. Non-real-estate URLs are removed from public eligibility.

alter table public.thin_index_search_documents
  add column if not exists vertical_classification text,
  add column if not exists vertical_classification_reason text,
  add column if not exists vertical_classification_version text;

create table if not exists public.source_vertical_category_rules (
  source_domain text not null,
  category_slug text not null,
  vertical_classification text not null check (vertical_classification in ('real_estate_likely','non_real_estate')),
  rule_version text not null,
  evidence_summary text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source_domain, category_slug)
);

alter table public.source_vertical_category_rules enable row level security;
revoke all on table public.source_vertical_category_rules from public, anon, authenticated;
grant select, insert, update, delete on table public.source_vertical_category_rules to service_role;

insert into public.source_vertical_category_rules (
  source_domain, category_slug, vertical_classification, rule_version, evidence_summary
) values
  ('avito.ma','appartements','real_estate_likely','odm_10c_v1','Explicit Avito real-estate category.'),
  ('avito.ma','locations_de_vacances','real_estate_likely','odm_10c_v1','Explicit Avito property rental category.'),
  ('avito.ma','terrains_et_fermes','real_estate_likely','odm_10c_v1','Explicit Avito land/farm real-estate category.'),
  ('avito.ma','villas_et_riads','real_estate_likely','odm_10c_v1','Explicit Avito villa/riad real-estate category.'),
  ('avito.ma','local','real_estate_likely','odm_10c_v1','Explicit Avito commercial premises category.'),
  ('avito.ma','bureaux','real_estate_likely','odm_10c_v1','Explicit Avito office real-estate category.'),
  ('avito.ma','autre_immobilier','real_estate_likely','odm_10c_v1','Explicit Avito other-real-estate category.'),
  ('avito.ma','maisons','real_estate_likely','odm_10c_v1','Explicit Avito house real-estate category.'),
  ('avito.ma','colocations','real_estate_likely','odm_10c_v1','Explicit Avito shared-housing category.'),
  ('avito.ma','maisons_et_villas','real_estate_likely','odm_10c_v1','Explicit Avito house/villa category.'),
  ('avito.ma','chambre','real_estate_likely','odm_10c_v1','Explicit Avito room accommodation category.')
on conflict (source_domain, category_slug) do update set
  vertical_classification = excluded.vertical_classification,
  rule_version = excluded.rule_version,
  evidence_summary = excluded.evidence_summary,
  updated_at = now();

with avito_categories as (
  select
    d.seed_id,
    lower(split_part(regexp_replace(d.canonical_url, '^https?://[^/]+/?', ''), '/', 3)) as category_slug
  from public.thin_index_search_documents d
  where d.source_domain = 'avito.ma'
), classified as (
  select
    a.seed_id,
    a.category_slug,
    case when r.category_slug is not null then 'real_estate_likely' else 'non_real_estate' end as vertical_classification
  from avito_categories a
  left join public.source_vertical_category_rules r
    on r.source_domain = 'avito.ma'
   and r.category_slug = a.category_slug
   and r.vertical_classification = 'real_estate_likely'
)
update public.thin_index_search_documents d
set
  vertical_classification = c.vertical_classification,
  vertical_classification_reason = case
    when c.vertical_classification = 'real_estate_likely' then 'source_category_allowlist:' || c.category_slug
    else 'source_category_not_real_estate:' || coalesce(nullif(c.category_slug,''),'missing')
  end,
  vertical_classification_version = 'odm_10c_v1',
  display_eligibility = case
    when c.vertical_classification = 'non_real_estate' then 'excluded_non_real_estate'
    else d.display_eligibility
  end,
  display_eligibility_reason = case
    when c.vertical_classification = 'non_real_estate' then 'vertical_not_real_estate'
    else d.display_eligibility_reason
  end,
  ranking_quality_boost = case
    when c.vertical_classification = 'non_real_estate' then 0
    else d.ranking_quality_boost
  end,
  updated_at = now()
from classified c
where c.seed_id = d.seed_id;

-- Domains dedicated to real estate are classified by domain only. This does not
-- grant new fetch, reuse or display permissions; Source Registry remains authoritative.
update public.thin_index_search_documents d
set
  vertical_classification = 'real_estate_likely',
  vertical_classification_reason = 'dedicated_real_estate_domain',
  vertical_classification_version = 'odm_10c_v1',
  updated_at = now()
where d.source_domain in (
  'mubawab.ma','daragadir.com','agenz.ma','promoimmomarrakech.com',
  'limmobiliersansfrontieres.com','mouldar.com','masaken.ma',
  'soukimmobilier.com','atlasimmobilier.com','aykana.ma','sarouty.ma',
  'barnes-marrakech.com','1immo.ma','kawtarimmobilier.com'
)
and d.vertical_classification is distinct from 'real_estate_likely';

create or replace function public.odm_10c_vertical_noise_report()
returns table (
  source_domain text,
  vertical_classification text,
  document_count bigint,
  publicly_eligible_count bigint
)
language sql
security invoker
set search_path = public
as $$
  select
    d.source_domain,
    coalesce(d.vertical_classification,'unclassified') as vertical_classification,
    count(*)::bigint as document_count,
    count(*) filter (where d.display_eligibility in ('eligible_primary','eligible_secondary'))::bigint as publicly_eligible_count
  from public.thin_index_search_documents d
  group by d.source_domain, coalesce(d.vertical_classification,'unclassified')
  order by d.source_domain, vertical_classification;
$$;

revoke all on function public.odm_10c_vertical_noise_report() from public, anon, authenticated;
grant execute on function public.odm_10c_vertical_noise_report() to service_role;

comment on table public.source_vertical_category_rules is
  'Deterministic source/category vertical rules. Quarantine is reversible and never deletes source evidence.';