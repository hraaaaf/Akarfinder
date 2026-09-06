-- P2 canonical hygiene v1.1: prevent quarantined Mubawab sources from reactivating.
-- Scope: listing_sources only. No property_listings writes, no price mutation, no deletion, no P3 promotion.

create or replace function public.enforce_mubawab_listing_source_quarantine_v1()
returns trigger
language plpgsql
as $$
declare
  u text := lower(coalesce(nullif(btrim(new.listing_url), ''), nullif(btrim(new.source_url), ''), ''));
begin
  -- Once a source has been classified as non-individual by canonical hygiene v1,
  -- preserve that classification across later ingestion upserts and keep it inactive.
  if tg_op = 'UPDATE'
     and old.canonical_hygiene_version = 1
     and old.canonical_eligible = false then
    new.canonical_hygiene_version := 1;
    new.canonical_eligible := false;
    new.canonical_kind := coalesce(old.canonical_kind, new.canonical_kind);
    new.canonical_classified_at := coalesce(old.canonical_classified_at, new.canonical_classified_at, now());
    new.is_active := false;
    return new;
  end if;

  -- Pre-classified rows can never be activated.
  if new.canonical_hygiene_version = 1
     and new.canonical_eligible = false then
    new.is_active := false;
    return new;
  end if;

  -- Guard newly inserted/updated known non-individual Mubawab URL families as well,
  -- so ingestion cannot create a fresh active search/category/shard source between audits.
  if u ~ '^https?://(www\.)?mubawab\.ma/' then
    if u ~ '^https?://(www\.)?mubawab\.ma/(?:[a-z]{2}/)?is/' then
      new.canonical_kind := 'is_search';
      new.canonical_eligible := false;
      new.canonical_hygiene_version := 1;
      new.canonical_classified_at := now();
      new.is_active := false;
    elsif u ~ '^https?://(www\.)?mubawab\.ma/(?:[a-z]{2}/)?(?:cc|ct|cd|sd)/' then
      new.canonical_kind := 'safe_shard';
      new.canonical_eligible := false;
      new.canonical_hygiene_version := 1;
      new.canonical_classified_at := now();
      new.is_active := false;
    elsif u ~ '^https?://(www\.)?mubawab\.ma/(?:[a-z]{2}/)?(?:st|t|di|tw|scrp)/' then
      new.canonical_kind := 'legacy_search_surface';
      new.canonical_eligible := false;
      new.canonical_hygiene_version := 1;
      new.canonical_classified_at := now();
      new.is_active := false;
    elsif u ~ '^https?://(www\.)?mubawab\.ma/(?:[a-z]{2}/)?p/' then
      new.canonical_kind := 'project_page';
      new.canonical_eligible := false;
      new.canonical_hygiene_version := 1;
      new.canonical_classified_at := now();
      new.is_active := false;
    elsif u ~ '^https?://(www\.)?mubawab\.ma/(?:[a-z]{2}/)?b/' then
      new.canonical_kind := 'other_nonindividual';
      new.canonical_eligible := false;
      new.canonical_hygiene_version := 1;
      new.canonical_classified_at := now();
      new.is_active := false;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_mubawab_listing_source_quarantine_v1
on public.listing_sources;

create trigger trg_enforce_mubawab_listing_source_quarantine_v1
before insert or update of listing_url, source_url, is_active, canonical_kind, canonical_eligible, canonical_hygiene_version, canonical_classified_at
on public.listing_sources
for each row
execute function public.enforce_mubawab_listing_source_quarantine_v1();

-- Repair any drift that happened before this trigger existed.
update public.listing_sources
set is_active = false
where canonical_hygiene_version = 1
  and canonical_eligible = false
  and is_active = true;
