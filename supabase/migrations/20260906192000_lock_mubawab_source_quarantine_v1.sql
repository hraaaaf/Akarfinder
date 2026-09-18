-- P2 canonical hygiene v1.1: prevent quarantined Mubawab aggregate/search URLs from being reactivated.
-- Scope only: listing_sources. No deletion, no property_listings write, no price mutation, no P3 promotion.

create or replace function public.lock_mubawab_source_quarantine_v1()
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

drop trigger if exists trg_lock_mubawab_source_quarantine_v1
on public.listing_sources;

create trigger trg_lock_mubawab_source_quarantine_v1
before insert or update of is_active, canonical_eligible, canonical_hygiene_version
on public.listing_sources
for each row
execute function public.lock_mubawab_source_quarantine_v1();

-- Reconcile any rows reactivated by legacy ingestion between v1 classification and this lock.
update public.listing_sources
set is_active = false
where canonical_hygiene_version = 1
  and canonical_eligible = false
  and is_active = true;
