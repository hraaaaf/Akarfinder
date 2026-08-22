-- Harden raw listing storage without touching listing data or Data Mass pipelines.
-- Public search remains available through the curated search_public_representations_v2 RPC
-- and the server-side application API.

revoke all privileges on table public.property_listings from anon, authenticated;
revoke all privileges on table public.listing_sources from anon, authenticated;

drop policy if exists service_role_all on public.property_listings;
create policy service_role_all
on public.property_listings
for all
to service_role
using (true)
with check (true);

drop policy if exists service_role_all on public.listing_sources;
create policy service_role_all
on public.listing_sources
for all
to service_role
using (true)
with check (true);
