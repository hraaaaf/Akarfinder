-- PARTNER-COMMERCIAL-ACTIVATION-V1 — canonical roadmap #19C
-- Additive commercial activation, property submission, media-rights and project portfolio foundation.

alter table public.professional_organizations
  add column if not exists activation_status text not null default 'pending'
    check (activation_status in ('pending','onboarding','review','active','paused','rejected')),
  add column if not exists source_authorization_status text not null default 'none'
    check (source_authorization_status in ('none','pending','confirmed','revoked')),
  add column if not exists activation_reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists activation_reviewed_at timestamptz;

comment on column public.professional_organizations.activation_status is
'Commercial/product activation gate. Organization members cannot self-set active.';
comment on column public.professional_organizations.source_authorization_status is
'Written source/publication authorization gate. confirmed is required before partner publication tooling is active.';

alter table public.professional_projects
  add column if not exists description text,
  add column if not exists city text,
  add column if not exists neighborhood text,
  add column if not exists price_from numeric,
  add column if not exists currency text not null default 'MAD',
  add column if not exists project_data jsonb not null default '{}'::jsonb;

create table if not exists public.professional_property_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.professional_organizations(id) on delete cascade,
  property_listing_id bigint references public.property_listings(id) on delete set null,
  schema_version text not null default '1.0',
  property_type text not null,
  transaction_type text not null check (transaction_type in ('sale','rent')),
  current_step integer not null default 1 check (current_step between 1 and 7),
  status text not null default 'draft' check (status in ('draft','in_review','approved','rejected','published','archived')),
  declared_facts jsonb not null default '{}'::jsonb,
  weighted_completeness integer not null default 0 check (weighted_completeness between 0 and 100),
  submitted_by uuid not null references auth.users(id) on delete restrict,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.professional_media_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.professional_organizations(id) on delete cascade,
  submission_id uuid references public.professional_property_submissions(id) on delete cascade,
  project_id uuid references public.professional_projects(id) on delete cascade,
  media_type text not null check (media_type in ('image','video','floor_plan','document')),
  url text not null,
  source_url text,
  rights_status text not null default 'unknown' check (rights_status in ('allowed','partner_only','unknown','forbidden')),
  publication_permission text not null default 'unknown' check (publication_permission in ('allowed','partner_only','forbidden','unknown')),
  attribution text,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'active' check (status in ('active','hidden','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professional_media_asset_owner_check check (
    (submission_id is not null and project_id is null)
    or (submission_id is null and project_id is not null)
  )
);

create index if not exists professional_property_submissions_org_idx
  on public.professional_property_submissions(organization_id, status, updated_at desc);
create index if not exists professional_property_submissions_listing_idx
  on public.professional_property_submissions(property_listing_id)
  where property_listing_id is not null;
create index if not exists professional_media_assets_org_idx
  on public.professional_media_assets(organization_id, status, created_at desc);
create index if not exists professional_media_assets_submission_idx
  on public.professional_media_assets(submission_id)
  where submission_id is not null;
create index if not exists professional_media_assets_project_idx
  on public.professional_media_assets(project_id)
  where project_id is not null;

alter table public.professional_property_submissions enable row level security;
alter table public.professional_media_assets enable row level security;

grant select on public.professional_property_submissions to authenticated;
grant select on public.professional_media_assets to authenticated;

create policy professional_property_submissions_member_select
on public.professional_property_submissions for select
to authenticated
using (
  organization_id in (
    select organization_id from public.professional_memberships
    where user_id = (select auth.uid()) and status = 'active'
  )
);

create policy professional_media_assets_member_select
on public.professional_media_assets for select
to authenticated
using (
  organization_id in (
    select organization_id from public.professional_memberships
    where user_id = (select auth.uid()) and status = 'active'
  )
);

comment on table public.professional_property_submissions is
'Partner-declared property onboarding drafts. Declared facts are never treated as calculated, inferred or verified documentary facts.';
comment on table public.professional_media_assets is
'Partner media metadata with explicit rights/publication permissions. Unknown or forbidden rights must never be promoted to public media.';
