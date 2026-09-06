-- AKARFINDER DATA ENGINE P2 — price non-regression guard
-- Goal: a weaker OpenSERP observation with no price must never erase a known price.
-- Scope is deliberately narrow: only rows whose incoming field_confidence/provider
-- identifies OpenSERP, or listing_sources already marked persisted_openserp.

create or replace function public.preserve_known_property_price_from_openserp_null()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.price_mad is null
     and old.price_mad is not null
     and coalesce(new.field_confidence ->> 'provider', '') = 'openserp' then
    new.price_mad := old.price_mad;
  end if;
  return new;
end;
$$;

drop trigger if exists property_listings_preserve_openserp_price on public.property_listings;
create trigger property_listings_preserve_openserp_price
before update of price_mad, field_confidence on public.property_listings
for each row
execute function public.preserve_known_property_price_from_openserp_null();

create or replace function public.preserve_known_source_price_from_openserp_null()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.displayed_price is null
     and old.displayed_price is not null
     and coalesce(new.origin_type, old.origin_type, '') = 'persisted_openserp' then
    new.displayed_price := old.displayed_price;
    new.price_currency := coalesce(new.price_currency, old.price_currency);
    new.price_period := coalesce(new.price_period, old.price_period);
    new.price_status := coalesce(nullif(new.price_status, 'unavailable'), old.price_status, 'valid');
  end if;
  return new;
end;
$$;

drop trigger if exists listing_sources_preserve_openserp_price on public.listing_sources;
create trigger listing_sources_preserve_openserp_price
before update of displayed_price, price_currency, price_period, price_status, origin_type on public.listing_sources
for each row
execute function public.preserve_known_source_price_from_openserp_null();
