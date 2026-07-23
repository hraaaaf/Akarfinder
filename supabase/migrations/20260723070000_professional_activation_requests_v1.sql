-- AF-AUDIT-P1-078 — Professional Activation Request V1
-- Public Pro interest is captured separately from authenticated/validated organizations.

create table if not exists public.professional_activation_requests (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.buyer_leads(id) on delete cascade,
  requested_type text not null check (requested_type in ('agency','promoter','exhibitor')),
  company_name text not null,
  city text,
  requested_addons jsonb not null default '[]'::jsonb check (jsonb_typeof(requested_addons) = 'array'),
  status text not null default 'received' check (status in ('received','qualified','onboarding','converted','rejected')),
  organization_id uuid references public.professional_organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  converted_at timestamptz,
  constraint professional_activation_conversion_check check (
    (status = 'converted' and organization_id is not null and converted_at is not null)
    or
    (status <> 'converted')
  )
);

create index if not exists professional_activation_requests_status_idx
  on public.professional_activation_requests(status, created_at desc);

alter table public.professional_activation_requests enable row level security;
revoke all on table public.professional_activation_requests from anon, authenticated;
grant select, insert, update, delete on table public.professional_activation_requests to service_role;
