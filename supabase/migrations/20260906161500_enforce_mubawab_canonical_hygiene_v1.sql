-- P2 canonical hygiene v1: durable, reversible quarantine for Mubawab non-individual URLs.
-- Scope only: listing_sources + thin_index serving eligibility.
-- No property_listings writes, no price mutation, no source deletion, no P3 promotion.

create or replace function public.enforce_mubawab_canonical_hygiene_v1()
returns trigger
language plpgsql
as $$
begin
  if new.source_domain = 'mubawab.ma'
     and exists (
       select 1
       from public.listing_sources ls
       where ls.canonical_hygiene_version = 1
         and ls.canonical_eligible = false
         and (
           ls.listing_url = new.canonical_url
           or ls.source_url = new.canonical_url
         )
     ) then
    new.display_eligibility := 'ineligible';
    new.display_eligibility_reason := 'canonical_source_not_individual_listing';
    new.ranking_quality_boost := 0;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_mubawab_canonical_hygiene_v1
on public.thin_index_search_documents;

create trigger trg_enforce_mubawab_canonical_hygiene_v1
before insert or update of canonical_url, source_domain, display_eligibility, display_eligibility_reason, ranking_quality_boost
on public.thin_index_search_documents
for each row
execute function public.enforce_mubawab_canonical_hygiene_v1();

-- Physical source quarantine. Rows are retained for audit/history.
update public.listing_sources
set is_active = false
where canonical_hygiene_version = 1
  and canonical_eligible = false
  and is_active = true;

-- Existing thin-index rows are retained because downstream audit tables reference them.
-- They are made unservable instead of deleted.
with bad_urls as (
  select distinct coalesce(nullif(btrim(listing_url), ''), nullif(btrim(source_url), '')) as url
  from public.listing_sources
  where canonical_hygiene_version = 1
    and canonical_eligible = false
    and coalesce(nullif(btrim(listing_url), ''), nullif(btrim(source_url), '')) is not null
)
update public.thin_index_search_documents d
set display_eligibility = 'ineligible',
    display_eligibility_reason = 'canonical_source_not_individual_listing',
    ranking_quality_boost = 0,
    updated_at = now()
from bad_urls b
where d.canonical_url = b.url
  and (
    d.display_eligibility is distinct from 'ineligible'
    or d.display_eligibility_reason is distinct from 'canonical_source_not_individual_listing'
    or coalesce(d.ranking_quality_boost, 0) <> 0
  );
