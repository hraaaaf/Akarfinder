-- LOT B3.4.1 — Direct Feed Gateway: contract and quarantine foundation.
-- No parser, no listing mutation, no publication.

create table if not exists public.partner_feed_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.professional_organizations(id) on delete cascade,
  name text not null,
  source_kind text not null default 'manual_upload' check (source_kind in ('manual_upload','scheduled_url','api','sftp','google_sheet')),
  status text not null default 'draft' check (status in ('draft','active','paused','revoked')),
  schema_version text not null default 'akarfeed-v1',
  ownership_attested boolean not null default false,
  rights_attested boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.partner_feed_imports (
  id uuid primary key default gen_random_uuid(),
  feed_source_id uuid not null references public.partner_feed_sources(id) on delete cascade,
  organization_id uuid not null references public.professional_organizations(id) on delete cascade,
  status text not null default 'uploaded' check (status in ('uploaded','parsing','quarantined','validated','rejected','approved','published','rolled_back')),
  original_filename text not null,
  storage_bucket text not null default 'partner-feed-quarantine',
  storage_path text not null,
  mime_type text,
  byte_size bigint not null check (byte_size >= 0 and byte_size <= 20971520),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  row_count integer,
  uploaded_by uuid not null references auth.users(id),
  uploaded_at timestamptz not null default now(),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  published_at timestamptz,
  rollback_completed_at timestamptz,
  rejection_reason text,
  publication_eligible boolean not null default false,
  unique (organization_id, sha256)
);

create table if not exists public.partner_feed_import_rows (
  id bigint generated always as identity primary key,
  import_id uuid not null references public.partner_feed_imports(id) on delete cascade,
  organization_id uuid not null references public.professional_organizations(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  raw_payload jsonb not null default '{}'::jsonb,
  row_status text not null default 'quarantined' check (row_status in ('quarantined','valid','warning','invalid','approved','published','rolled_back')),
  validation_summary jsonb not null default '{}'::jsonb,
  canonical_payload jsonb,
  publication_eligible boolean not null default false,
  created_at timestamptz not null default now(),
  unique (import_id, row_number)
);

create table if not exists public.partner_feed_audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.professional_organizations(id) on delete cascade,
  feed_source_id uuid references public.partner_feed_sources(id) on delete cascade,
  import_id uuid references public.partner_feed_imports(id) on delete cascade,
  event_type text not null,
  previous_status text,
  next_status text,
  actor_user_id uuid references auth.users(id),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists partner_feed_sources_org_idx on public.partner_feed_sources(organization_id,status);
create index if not exists partner_feed_imports_org_idx on public.partner_feed_imports(organization_id,status,uploaded_at desc);
create index if not exists partner_feed_rows_import_idx on public.partner_feed_import_rows(import_id,row_status);
create index if not exists partner_feed_events_import_idx on public.partner_feed_audit_events(import_id,created_at desc);

alter table public.partner_feed_sources enable row level security;
alter table public.partner_feed_imports enable row level security;
alter table public.partner_feed_import_rows enable row level security;
alter table public.partner_feed_audit_events enable row level security;

revoke all on table public.partner_feed_sources from public,anon;
revoke all on table public.partner_feed_imports from public,anon;
revoke all on table public.partner_feed_import_rows from public,anon;
revoke all on table public.partner_feed_audit_events from public,anon;

grant select,insert,update on table public.partner_feed_sources to authenticated;
grant select,insert,update on table public.partner_feed_imports to authenticated;
grant select on table public.partner_feed_import_rows to authenticated;
grant select on table public.partner_feed_audit_events to authenticated;
grant all on table public.partner_feed_sources to service_role;
grant all on table public.partner_feed_imports to service_role;
grant all on table public.partner_feed_import_rows to service_role;
grant all on table public.partner_feed_audit_events to service_role;
grant usage,select on all sequences in schema public to service_role;

create policy partner_feed_sources_member_select on public.partner_feed_sources
for select to authenticated using (
  organization_id in (
    select organization_id from public.professional_memberships
    where user_id=(select auth.uid()) and status='active'
  )
);
create policy partner_feed_sources_admin_insert on public.partner_feed_sources
for insert to authenticated with check (
  created_by=(select auth.uid()) and organization_id in (
    select organization_id from public.professional_memberships
    where user_id=(select auth.uid()) and status='active' and role in ('owner','admin')
  )
);
create policy partner_feed_sources_admin_update on public.partner_feed_sources
for update to authenticated using (
  organization_id in (
    select organization_id from public.professional_memberships
    where user_id=(select auth.uid()) and status='active' and role in ('owner','admin')
  )
) with check (
  organization_id in (
    select organization_id from public.professional_memberships
    where user_id=(select auth.uid()) and status='active' and role in ('owner','admin')
  )
);

create policy partner_feed_imports_member_select on public.partner_feed_imports
for select to authenticated using (
  organization_id in (
    select organization_id from public.professional_memberships
    where user_id=(select auth.uid()) and status='active'
  )
);
create policy partner_feed_imports_member_insert on public.partner_feed_imports
for insert to authenticated with check (
  uploaded_by=(select auth.uid()) and publication_eligible=false and status='uploaded' and organization_id in (
    select organization_id from public.professional_memberships
    where user_id=(select auth.uid()) and status='active'
  )
);
create policy partner_feed_imports_admin_update on public.partner_feed_imports
for update to authenticated using (
  organization_id in (
    select organization_id from public.professional_memberships
    where user_id=(select auth.uid()) and status='active' and role in ('owner','admin')
  )
) with check (
  publication_eligible=false and status in ('uploaded','parsing','quarantined','validated','rejected','approved','rolled_back') and organization_id in (
    select organization_id from public.professional_memberships
    where user_id=(select auth.uid()) and status='active' and role in ('owner','admin')
  )
);

create policy partner_feed_rows_member_select on public.partner_feed_import_rows
for select to authenticated using (
  organization_id in (
    select organization_id from public.professional_memberships
    where user_id=(select auth.uid()) and status='active'
  )
);
create policy partner_feed_events_member_select on public.partner_feed_audit_events
for select to authenticated using (
  organization_id in (
    select organization_id from public.professional_memberships
    where user_id=(select auth.uid()) and status='active'
  )
);

create or replace function public.odm_b3_4_1_feed_quarantine_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
select jsonb_build_object(
  'audit_version','odm_b3_4_1_feed_quarantine_v1',
  'feed_sources',(select count(*) from public.partner_feed_sources),
  'imports',(select count(*) from public.partner_feed_imports),
  'quarantined_rows',(select count(*) from public.partner_feed_import_rows where row_status='quarantined'),
  'publication_eligible_imports',(select count(*) from public.partner_feed_imports where publication_eligible),
  'publication_eligible_rows',(select count(*) from public.partner_feed_import_rows where publication_eligible),
  'publicly_accessible_tables',0,
  'fail_closed',(
    (select count(*) from public.partner_feed_imports where publication_eligible)=0
    and (select count(*) from public.partner_feed_import_rows where publication_eligible)=0
  )
);
$$;

revoke all on function public.odm_b3_4_1_feed_quarantine_report_v1() from public,anon,authenticated;
grant execute on function public.odm_b3_4_1_feed_quarantine_report_v1() to service_role;
