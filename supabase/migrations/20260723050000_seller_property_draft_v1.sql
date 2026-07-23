-- AF-AUDIT-P1-049 — Seller Structured Draft V1
-- A seller contact lead and the declared property dataset are separate objects.
-- This table is internal/service-role only and is NEVER a publication bypass.

create table if not exists public.seller_property_drafts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.buyer_leads(id) on delete cascade,
  schema_version text not null default '1.0' check (schema_version = '1.0'),
  source_kind text not null default 'seller_declared' check (source_kind = 'seller_declared'),
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'archived')),
  declared_facts jsonb not null default '{}'::jsonb check (jsonb_typeof(declared_facts) = 'object'),
  weighted_completeness integer not null default 0 check (weighted_completeness between 0 and 100),
  required_missing jsonb not null default '[]'::jsonb check (jsonb_typeof(required_missing) = 'array'),
  publication_eligible boolean not null default false check (publication_eligible = false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seller_property_drafts_created_idx
  on public.seller_property_drafts(created_at desc);

alter table public.seller_property_drafts enable row level security;

-- Explicitly keep seller submissions outside browser/Data-API user access.
revoke all on table public.seller_property_drafts from anon, authenticated;
grant select, insert, update, delete on table public.seller_property_drafts to service_role;
