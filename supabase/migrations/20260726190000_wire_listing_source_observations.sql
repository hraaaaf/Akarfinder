-- Wire factual source-offer snapshots into the append-only observation stream.
-- The trigger records only first insertions or changes to tracked source fields.

-- The original index ignored price, surface and availability changes. Replace it
-- with an idempotency key that still deduplicates retries while preserving real
-- same-hour changes.
drop index if exists public.source_offer_observations_idempotency_idx;

create unique index source_offer_observations_idempotency_idx
  on public.source_offer_observations (
    source_offer_id,
    observed_at_bucket,
    coalesce(content_fingerprint, ''),
    coalesce(displayed_price, -1),
    coalesce(surface_m2, -1),
    coalesce(source_status, ''),
    coalesce(availability_claim, '')
  );

create or replace function public.capture_listing_source_observation()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  listing_surface numeric;
  listing_title text;
  effective_status text;
begin
  if tg_op = 'UPDATE' and
     new.content_fingerprint is not distinct from old.content_fingerprint and
     new.displayed_price is not distinct from old.displayed_price and
     new.price_currency is not distinct from old.price_currency and
     new.is_active is not distinct from old.is_active then
    return new;
  end if;

  select p.surface_m2, p.title
    into listing_surface, listing_title
  from public.property_listings p
  where p.id = new.property_listing_id;

  effective_status := case when new.is_active then 'active' else 'inactive' end;

  insert into public.source_offer_observations (
    source_offer_id,
    observed_at,
    displayed_price,
    currency,
    surface_m2,
    title_fingerprint,
    content_fingerprint,
    source_status,
    availability_claim,
    observation_origin,
    ingestion_run_id
  ) values (
    new.id,
    coalesce(new.last_seen_at, now()),
    new.displayed_price,
    new.price_currency,
    listing_surface,
    md5(coalesce(listing_title, '')),
    new.content_fingerprint,
    effective_status,
    null,
    'listing_source_trigger_v1',
    new.ingestion_run_id
  )
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.capture_listing_source_observation() from public, anon, authenticated;
grant execute on function public.capture_listing_source_observation() to service_role;

drop trigger if exists listing_sources_capture_observation on public.listing_sources;
create trigger listing_sources_capture_observation
after insert or update of content_fingerprint, displayed_price, price_currency, is_active
on public.listing_sources
for each row
execute function public.capture_listing_source_observation();

comment on function public.capture_listing_source_observation() is
  'Captures factual listing_sources snapshots into source_offer_observations; no history is reconstructed.';
