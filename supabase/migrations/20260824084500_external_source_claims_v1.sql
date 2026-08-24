-- MASS-INDEX M7-B — external source claim model v1
-- Objective: represent a claim on an indexed external canonical URL without granting content rights.
-- Preconditions: auth.users, source_offer_seeds and professional_organizations exist.
-- Impact: additive table + indexes only; no existing row is modified.
-- Re-run behavior: CREATE TABLE/INDEX IF NOT EXISTS; grants are idempotent.
-- Lock estimate: metadata-only creation of a new empty table; no scan of existing index tables.
-- Rollback: DROP TABLE public.external_source_claims; only safe before real claim rows exist.

create table if not exists public.external_source_claims (
  id uuid primary key default gen_random_uuid(),
  seed_id uuid references public.source_offer_seeds(id) on delete set null,
  canonical_url text not null
    check (canonical_url ~ '^https?://[^[:space:]]+$'),
  source_domain text not null
    check (
      char_length(source_domain) between 1 and 253
      and source_domain = lower(source_domain)
      and position('://' in source_domain) = 0
      and position('/' in source_domain) = 0
    ),
  claimant_user_id uuid not null references auth.users(id) on delete restrict,
  organization_id uuid references public.professional_organizations(id) on delete set null,
  claimant_role text not null
    check (claimant_role in ('owner', 'agency', 'platform')),
  verified_email text,
  email_verified_at timestamptz,
  control_proof_kind text not null
    check (control_proof_kind in ('domain_email', 'dns_txt', 'website_file', 'business_document', 'manual_review')),
  control_proof_ref text not null
    check (char_length(control_proof_ref) between 1 and 1000),
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'rejected', 'revoked')),
  claim_scope text not null default 'external_index_only'
    check (claim_scope = 'external_index_only'),
  content_enrichment_authorized boolean not null default false
    check (content_enrichment_authorized = false),
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  verified_at timestamptz,
  rejected_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_source_claims_verified_state_check check (
    status <> 'verified'
    or (
      reviewed_by is not null
      and reviewed_at is not null
      and verified_at is not null
      and verified_email is not null
      and email_verified_at is not null
      and rejected_at is null
      and revoked_at is null
    )
  ),
  constraint external_source_claims_rejected_state_check check (
    status <> 'rejected'
    or (
      reviewed_by is not null
      and reviewed_at is not null
      and rejected_at is not null
      and verified_at is null
      and revoked_at is null
    )
  ),
  constraint external_source_claims_revoked_state_check check (
    status <> 'revoked'
    or (
      reviewed_by is not null
      and reviewed_at is not null
      and revoked_at is not null
    )
  )
);

create unique index if not exists external_source_claims_open_claim_unique_idx
  on public.external_source_claims(canonical_url, claimant_user_id)
  where status in ('pending', 'verified');

create index if not exists external_source_claims_domain_status_idx
  on public.external_source_claims(source_domain, status, created_at desc);

create index if not exists external_source_claims_org_status_idx
  on public.external_source_claims(organization_id, status, created_at desc)
  where organization_id is not null;

alter table public.external_source_claims enable row level security;

-- Claims may contain identity/control evidence. Direct Data API access is forbidden.
-- Authenticated flows must go through server endpoints after token verification.
revoke all privileges on table public.external_source_claims from PUBLIC, anon, authenticated;
grant select, insert, update, delete on table public.external_source_claims to service_role;

comment on table public.external_source_claims is
  'M7-B claim ledger for indexed external canonical URLs. Verification proves claimant control only; it never grants content reuse or PARTNER_FULL rights.';
comment on column public.external_source_claims.control_proof_ref is
  'Non-secret evidence reference only. Never store credentials, tokens or private document contents here.';
comment on column public.external_source_claims.content_enrichment_authorized is
  'Hard-locked false in M7-B. A verified claim cannot authorize rich-content ingestion or publication.';

-- ROLLBACK (manual, never auto-applied):
-- drop table if exists public.external_source_claims;
