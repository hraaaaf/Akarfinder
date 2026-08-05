-- UX-P2-SELLER-PUBLICATION-MANAGEMENT-4
-- Seller-controlled publication remains separate from moderation and indexing.

create table if not exists public.seller_listing_publications (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null unique references public.seller_property_drafts(id) on delete cascade,
  status text not null default 'unpublished' check (status in ('unpublished','live','paused','withdrawn')),
  published_at timestamptz,
  paused_at timestamptz,
  withdrawn_at timestamptz,
  last_owner_action_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'live' and published_at is not null) or status <> 'live')
);

create table if not exists public.seller_listing_publication_events (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.seller_listing_publications(id) on delete cascade,
  event_type text not null check (event_type in ('published','paused','resumed','withdrawn')),
  created_at timestamptz not null default now()
);

alter table public.seller_listing_publications enable row level security;
alter table public.seller_listing_publication_events enable row level security;
revoke all on table public.seller_listing_publications from anon, authenticated;
revoke all on table public.seller_listing_publication_events from anon, authenticated;
grant all on table public.seller_listing_publications to service_role;
grant all on table public.seller_listing_publication_events to service_role;

create or replace function public.seller_publication_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_status text;
begin
  select review_status into draft_status from public.seller_property_drafts where id = new.draft_id;
  if new.status = 'live' and draft_status <> 'approved' then
    raise exception 'Seller draft must be approved before publication';
  end if;
  return new;
end;
$$;

drop trigger if exists seller_publication_guard_trigger on public.seller_listing_publications;
create trigger seller_publication_guard_trigger
before insert or update on public.seller_listing_publications
for each row execute function public.seller_publication_guard();
