create or replace function public.owner_listing_publication_sync_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_owner_listing_representation_v1(new.draft_id);
  return new;
end;
$$;

create or replace function public.owner_listing_draft_sync_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.seller_listing_publications where draft_id = new.id) then
    perform public.sync_owner_listing_representation_v1(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists seller_publication_owner_projection_sync on public.seller_listing_publications;
create trigger seller_publication_owner_projection_sync
after insert or update of status, published_at, paused_at, withdrawn_at, last_owner_action_at
on public.seller_listing_publications
for each row execute function public.owner_listing_publication_sync_trigger_v1();

drop trigger if exists seller_draft_owner_projection_sync on public.seller_property_drafts;
create trigger seller_draft_owner_projection_sync
after update of declared_facts, weighted_completeness, required_missing, photo_count, review_status
on public.seller_property_drafts
for each row execute function public.owner_listing_draft_sync_trigger_v1();

revoke all on function public.owner_listing_publication_sync_trigger_v1() from public, anon, authenticated;
revoke all on function public.owner_listing_draft_sync_trigger_v1() from public, anon, authenticated;
