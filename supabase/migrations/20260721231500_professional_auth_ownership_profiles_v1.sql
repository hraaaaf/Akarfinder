-- PROFESSIONAL-AUTH-OWNERSHIP-PROFILES-V1
-- Mission #19B. Multi-tenant professional foundation with explicit ownership.

create extension if not exists pgcrypto;

create table if not exists public.professional_organizations (
  id uuid primary key default gen_random_uuid(),
  organization_type text not null check (organization_type in ('agency', 'promoter')),
  slug text not null unique,
  legal_name text not null,
  display_name text not null,
  description text,
  logo_url text,
  website_url text,
  city text,
  public_email text,
  public_phone text,
  validation_status text not null default 'pending' check (validation_status in ('pending', 'validated', 'suspended', 'rejected')),
  commercial_tier text not null default 'none' check (commercial_tier in ('none', 'partner', 'gold', 'premium')),
  public_visibility text not null default 'draft' check (public_visibility in ('draft', 'public', 'hidden')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.professional_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.professional_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'analyst', 'lead_manager', 'viewer')),
  status text not null default 'active' check (status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.professional_listing_ownership (
  id uuid primary key default gen_random_uuid(),
  property_listing_id bigint not null references public.property_listings(id) on delete cascade,
  organization_id uuid not null references public.professional_organizations(id) on delete cascade,
  status text not null default 'claimed' check (status in ('claimed', 'verified', 'revoked')),
  claimed_by uuid not null references auth.users(id) on delete restrict,
  verified_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz not null default now(),
  verified_at timestamptz,
  revoked_at timestamptz,
  unique (property_listing_id, organization_id)
);

create table if not exists public.professional_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.professional_organizations(id) on delete cascade,
  slug text not null unique,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  public_visibility text not null default 'draft' check (public_visibility in ('draft', 'public', 'hidden')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Explicit lead routing. No lead becomes visible to a professional organization
-- merely because its city/source/listing looks similar; assignment is deliberate.
create table if not exists public.professional_lead_assignments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null,
  organization_id uuid not null references public.professional_organizations(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (lead_id, organization_id)
);

-- Add the legacy buyer_leads FK only when that table exists in the environment.
do $$
begin
  if to_regclass('public.buyer_leads') is not null
     and not exists (
       select 1 from pg_constraint where conname = 'professional_lead_assignments_lead_fk'
     ) then
    alter table public.professional_lead_assignments
      add constraint professional_lead_assignments_lead_fk
      foreign key (lead_id) references public.buyer_leads(id) on delete cascade;
  end if;
end $$;

create index if not exists professional_memberships_user_idx on public.professional_memberships(user_id, status);
create index if not exists professional_memberships_org_idx on public.professional_memberships(organization_id, status);
create index if not exists professional_listing_ownership_org_idx on public.professional_listing_ownership(organization_id, status);
create index if not exists professional_listing_ownership_listing_idx on public.professional_listing_ownership(property_listing_id, status);
create index if not exists professional_projects_org_idx on public.professional_projects(organization_id, status);
create index if not exists professional_organizations_public_idx on public.professional_organizations(public_visibility, validation_status, slug);
create index if not exists professional_lead_assignments_org_idx on public.professional_lead_assignments(organization_id, assigned_at desc);
create index if not exists professional_lead_assignments_lead_idx on public.professional_lead_assignments(lead_id);

alter table public.professional_organizations enable row level security;
alter table public.professional_memberships enable row level security;
alter table public.professional_listing_ownership enable row level security;
alter table public.professional_projects enable row level security;
alter table public.professional_lead_assignments enable row level security;

-- Direct Data API access is intentionally read-minimal. Mutations go through
-- authenticated server endpoints with explicit membership/permission checks.
grant select on public.professional_organizations to anon, authenticated;
grant select on public.professional_memberships to authenticated;
grant select on public.professional_listing_ownership to authenticated;
grant select on public.professional_projects to anon, authenticated;
grant select on public.professional_lead_assignments to authenticated;

create policy professional_org_public_select
on public.professional_organizations for select
to anon, authenticated
using (public_visibility = 'public' and validation_status = 'validated');

create policy professional_org_member_select
on public.professional_organizations for select
to authenticated
using (
  id in (
    select organization_id
    from public.professional_memberships
    where user_id = (select auth.uid()) and status = 'active'
  )
);

-- Membership rows are private to the authenticated user on the direct Data API.
-- Member administration goes through server endpoints with members.manage.
create policy professional_membership_self_select
on public.professional_memberships for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy professional_listing_ownership_member_select
on public.professional_listing_ownership for select
to authenticated
using (
  organization_id in (
    select organization_id
    from public.professional_memberships
    where user_id = (select auth.uid()) and status = 'active'
  )
);

create policy professional_projects_public_select
on public.professional_projects for select
to anon, authenticated
using (public_visibility = 'public' and status = 'published');

create policy professional_projects_member_select
on public.professional_projects for select
to authenticated
using (
  organization_id in (
    select organization_id
    from public.professional_memberships
    where user_id = (select auth.uid()) and status = 'active'
  )
);

create policy professional_lead_assignments_member_select
on public.professional_lead_assignments for select
to authenticated
using (
  organization_id in (
    select organization_id
    from public.professional_memberships
    where user_id = (select auth.uid()) and status = 'active'
  )
);

comment on column public.professional_organizations.commercial_tier is
'Business/display tier only. Must never be used as a search relevance or personalized fit boost.';
comment on column public.professional_listing_ownership.status is
'claimed is not verified. Only verified ownership may be represented as confirmed organization ownership on public surfaces.';
comment on table public.professional_lead_assignments is
'Explicit tenant routing for private leads. Similarity or commercial tier never implies lead access.';
