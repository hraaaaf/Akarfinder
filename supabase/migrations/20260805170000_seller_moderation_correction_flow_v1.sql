alter table public.seller_property_drafts
  add column if not exists review_reasons text[] not null default '{}',
  add column if not exists reviewer_note text,
  add column if not exists seller_correction_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists resubmitted_at timestamptz;

alter table public.seller_property_drafts
  drop constraint if exists seller_property_drafts_review_status_check;

alter table public.seller_property_drafts
  add constraint seller_property_drafts_review_status_check
  check (review_status in (
    'draft',
    'uploading',
    'ready_for_review',
    'needs_changes',
    'resubmitted',
    'approved'
  ));

alter table public.seller_property_drafts
  drop constraint if exists seller_property_drafts_publication_eligible_false;

alter table public.seller_property_drafts
  add constraint seller_property_drafts_publication_eligible_false
  check (publication_eligible = false);

create table if not exists public.seller_property_draft_review_events (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.seller_property_drafts(id) on delete cascade,
  event_type text not null check (event_type in ('changes_requested', 'resubmitted', 'approved')),
  reasons text[] not null default '{}',
  note text,
  created_at timestamptz not null default now()
);

alter table public.seller_property_draft_review_events enable row level security;
revoke all on table public.seller_property_draft_review_events from anon, authenticated;
grant all on table public.seller_property_draft_review_events to service_role;
