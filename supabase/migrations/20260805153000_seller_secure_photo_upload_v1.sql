alter table public.seller_property_drafts
  add column if not exists upload_token_hash text,
  add column if not exists photo_count integer not null default 0,
  add column if not exists review_status text not null default 'draft'
    check (review_status in ('draft', 'uploading', 'ready_for_review', 'needs_changes', 'approved'));

alter table public.seller_property_drafts
  drop constraint if exists seller_property_drafts_publication_eligible_false_check;

alter table public.seller_property_drafts
  add constraint seller_property_drafts_publication_eligible_false_check
  check (publication_eligible = false);

create table if not exists public.seller_property_draft_photos (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.seller_property_drafts(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 15728640),
  position integer not null check (position between 0 and 11),
  upload_status text not null default 'pending' check (upload_status in ('pending', 'uploaded', 'rejected')),
  created_at timestamptz not null default now(),
  unique (draft_id, position)
);

alter table public.seller_property_draft_photos enable row level security;
revoke all on table public.seller_property_draft_photos from anon, authenticated;
grant all on table public.seller_property_draft_photos to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'seller-property-drafts',
  'seller-property-drafts',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No anon/authenticated storage policies are created. Uploads use short-lived signed URLs
-- generated server-side after verification of the draft-specific opaque token.
