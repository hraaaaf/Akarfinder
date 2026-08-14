-- SEARCH PRICE EXTRACTION V2 SAFETY
-- DarAgadir short-stay prices cannot be represented safely until the public model
-- carries an explicit price cadence (/day, /night, etc.). Fail closed by removing
-- normalized_price_mad for those rows. This does not delete the listing or source URL.

create or replace function public.guard_daragadir_short_stay_price_without_cadence()
returns trigger
language plpgsql
as $function$
begin
  if new.document_kind = 'LISTING'
     and new.source_domain = 'daragadir.com'
     and new.normalized_price_mad is not null
     and (
       lower(new.canonical_url) like '%location-de-vacances%'
       or lower(new.canonical_url) like '%par-jour%'
       or lower(new.canonical_url) like '%journalier%'
       or lower(new.canonical_url) like '%quotidien%'
       or lower(new.canonical_url) like '%nuit%'
     ) then
    new.normalized_price_mad := null;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_guard_daragadir_short_stay_price_without_cadence
  on public.thin_index_search_documents;

create trigger trg_guard_daragadir_short_stay_price_without_cadence
before insert or update of normalized_price_mad, canonical_url, source_domain, document_kind
on public.thin_index_search_documents
for each row
execute function public.guard_daragadir_short_stay_price_without_cadence();

update public.thin_index_search_documents
set normalized_price_mad = null
where document_kind = 'LISTING'
  and source_domain = 'daragadir.com'
  and normalized_price_mad is not null
  and (
    lower(canonical_url) like '%location-de-vacances%'
    or lower(canonical_url) like '%par-jour%'
    or lower(canonical_url) like '%journalier%'
    or lower(canonical_url) like '%quotidien%'
    or lower(canonical_url) like '%nuit%'
  );
