-- P2 canonical hygiene v1: make listing-source quarantine durable against reactivation.
-- Scope only: listing_sources. No property_listings writes, no price mutation, no deletion, no P3 promotion.

create or replace function public.enforce_mubawab_listing_source_quarantine_v1()
returns trigger
language plpgsql
as $$
begin
  if new.canonical_hygiene_version = 1
     and new.canonical_eligible = false then
    new.is_active := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_mubawab_listing_source_quarantine_v1
on public.listing_sources;

create trigger trg_enforce_mubawab_listing_source_quarantine_v1
before insert or update of canonical_hygiene_version, canonical_eligible, is_active
on public.listing_sources
for each row
execute function public.enforce_mubawab_listing_source_quarantine_v1();

update public.listing_sources
set is_active = false
where canonical_hygiene_version = 1
  and canonical_eligible = false
  and is_active = true;
