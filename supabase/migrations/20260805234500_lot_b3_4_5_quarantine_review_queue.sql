-- LOT B3.4.5 — Quarantine Persistence & Review Queue
-- Append-only snapshots and audit history. No listing/search/publication mutation.

create table if not exists public.partner_feed_row_snapshots (
  id bigint generated always as identity primary key,
  import_row_id bigint not null references public.partner_feed_import_rows(id) on delete cascade,
  import_id uuid not null references public.partner_feed_imports(id) on delete cascade,
  organization_id uuid not null references public.professional_organizations(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  snapshot_version text not null default 'b3.4.5-v1',
  raw_payload jsonb not null default '{}'::jsonb,
  canonical_payload jsonb not null default '{}'::jsonb,
  validation_summary jsonb not null default '{}'::jsonb,
  dedup_decision jsonb not null default '{}'::jsonb,
  property_fingerprint text,
  offer_fingerprint text,
  confidence text check (confidence is null or confidence in ('low','medium','high')),
  publication_eligible boolean not null default false check (publication_eligible = false),
  created_at timestamptz not null default now(),
  unique (import_row_id, version_no)
);

create table if not exists public.partner_feed_review_queue (
  id bigint generated always as identity primary key,
  import_row_id bigint not null references public.partner_feed_import_rows(id) on delete cascade,
  snapshot_id bigint not null references public.partner_feed_row_snapshots(id) on delete restrict,
  organization_id uuid not null references public.professional_organizations(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','in_review','accepted','rejected','merged')),
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  reason_code text not null,
  assigned_to uuid references auth.users(id),
  resolution_note text,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  publication_eligible boolean not null default false check (publication_eligible = false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_row_id, snapshot_id)
);

create table if not exists public.partner_feed_review_events (
  id bigint generated always as identity primary key,
  review_queue_id bigint not null references public.partner_feed_review_queue(id) on delete cascade,
  organization_id uuid not null references public.professional_organizations(id) on delete cascade,
  previous_status text,
  next_status text not null check (next_status in ('pending','in_review','accepted','rejected','merged')),
  actor_user_id uuid references auth.users(id),
  reason text not null,
  evidence jsonb not null default '{}'::jsonb,
  publication_eligible boolean not null default false check (publication_eligible = false),
  created_at timestamptz not null default now()
);

create index if not exists partner_feed_snapshots_row_idx
  on public.partner_feed_row_snapshots(import_row_id, version_no desc);
create index if not exists partner_feed_review_queue_work_idx
  on public.partner_feed_review_queue(organization_id, status, priority, created_at);
create index if not exists partner_feed_review_events_queue_idx
  on public.partner_feed_review_events(review_queue_id, created_at);

alter table public.partner_feed_row_snapshots enable row level security;
alter table public.partner_feed_review_queue enable row level security;
alter table public.partner_feed_review_events enable row level security;

revoke all on table public.partner_feed_row_snapshots from public, anon, authenticated;
revoke all on table public.partner_feed_review_queue from public, anon, authenticated;
revoke all on table public.partner_feed_review_events from public, anon, authenticated;

grant select on table public.partner_feed_row_snapshots to authenticated;
grant select on table public.partner_feed_review_queue to authenticated;
grant select on table public.partner_feed_review_events to authenticated;
grant all on table public.partner_feed_row_snapshots to service_role;
grant all on table public.partner_feed_review_queue to service_role;
grant all on table public.partner_feed_review_events to service_role;
grant usage, select on all sequences in schema public to service_role;

create policy partner_feed_snapshots_member_select on public.partner_feed_row_snapshots
for select to authenticated using (
  organization_id in (
    select organization_id from public.professional_memberships
    where user_id=(select auth.uid()) and status='active'
  )
);

create policy partner_feed_review_queue_member_select on public.partner_feed_review_queue
for select to authenticated using (
  organization_id in (
    select organization_id from public.professional_memberships
    where user_id=(select auth.uid()) and status='active'
  )
);

create policy partner_feed_review_events_member_select on public.partner_feed_review_events
for select to authenticated using (
  organization_id in (
    select organization_id from public.professional_memberships
    where user_id=(select auth.uid()) and status='active'
  )
);

create or replace function public.partner_feed_reject_immutable_mutation()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  raise exception 'append-only partner feed history cannot be updated or deleted';
end;
$$;

revoke all on function public.partner_feed_reject_immutable_mutation() from public, anon, authenticated;
grant execute on function public.partner_feed_reject_immutable_mutation() to service_role;

drop trigger if exists partner_feed_snapshots_append_only on public.partner_feed_row_snapshots;
create trigger partner_feed_snapshots_append_only
before update or delete on public.partner_feed_row_snapshots
for each row execute function public.partner_feed_reject_immutable_mutation();

drop trigger if exists partner_feed_review_events_append_only on public.partner_feed_review_events;
create trigger partner_feed_review_events_append_only
before update or delete on public.partner_feed_review_events
for each row execute function public.partner_feed_reject_immutable_mutation();

create or replace function public.odm_b3_4_5_quarantine_review_queue_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
select jsonb_build_object(
  'audit_version','odm_b3_4_5_quarantine_review_queue_v1',
  'snapshots',(select count(*) from public.partner_feed_row_snapshots),
  'queue_items',(select count(*) from public.partner_feed_review_queue),
  'pending_items',(select count(*) from public.partner_feed_review_queue where status in ('pending','in_review')),
  'review_events',(select count(*) from public.partner_feed_review_events),
  'publication_eligible_snapshots',(select count(*) from public.partner_feed_row_snapshots where publication_eligible),
  'publication_eligible_queue_items',(select count(*) from public.partner_feed_review_queue where publication_eligible),
  'publication_eligible_events',(select count(*) from public.partner_feed_review_events where publication_eligible),
  'fail_closed',(
    (select count(*) from public.partner_feed_row_snapshots where publication_eligible)=0
    and (select count(*) from public.partner_feed_review_queue where publication_eligible)=0
    and (select count(*) from public.partner_feed_review_events where publication_eligible)=0
  )
);
$$;

revoke all on function public.odm_b3_4_5_quarantine_review_queue_report_v1() from public, anon, authenticated;
grant execute on function public.odm_b3_4_5_quarantine_review_queue_report_v1() to service_role;
