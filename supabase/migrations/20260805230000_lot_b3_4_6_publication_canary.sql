-- LOT B3.4.6 — Publication Canary
-- Creates controlled, reversible publication batches without publishing listings.

create table if not exists public.partner_feed_publication_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.professional_organizations(id) on delete cascade,
  feed_source_id uuid not null references public.partner_feed_sources(id) on delete restrict,
  import_id uuid not null references public.partner_feed_imports(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','ready','executing','completed','rollback_requested','rolled_back','failed','cancelled')),
  canary_limit integer not null default 50 check (canary_limit between 1 and 500),
  approved_item_count integer not null default 0 check (approved_item_count >= 0),
  published_item_count integer not null default 0 check (published_item_count >= 0),
  rolled_back_item_count integer not null default 0 check (rolled_back_item_count >= 0),
  rights_attested boolean not null default false,
  source_active_confirmed boolean not null default false,
  review_complete boolean not null default false,
  dedup_complete boolean not null default false,
  dry_run_completed boolean not null default false,
  publication_eligible boolean not null default false,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  executed_at timestamptz,
  rollback_completed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_feed_publication_batch_gate check (
    publication_eligible = false or (
      rights_attested and source_active_confirmed and review_complete and dedup_complete and dry_run_completed
      and approved_by is not null and approved_at is not null and status in ('ready','executing','completed','rollback_requested','rolled_back')
    )
  )
);

create table if not exists public.partner_feed_publication_batch_items (
  id bigint generated always as identity primary key,
  batch_id uuid not null references public.partner_feed_publication_batches(id) on delete cascade,
  organization_id uuid not null references public.professional_organizations(id) on delete cascade,
  snapshot_id bigint not null references public.partner_feed_row_snapshots(id) on delete restrict,
  review_queue_id bigint not null references public.partner_feed_review_queue(id) on delete restrict,
  action text not null check (action in ('create_property','create_offer','update_offer')),
  status text not null default 'pending' check (status in ('pending','eligible','executed','rolled_back','failed','skipped')),
  target_property_id uuid,
  target_offer_id uuid,
  rollback_payload jsonb not null default '{}'::jsonb,
  publication_eligible boolean not null default false,
  executed_at timestamptz,
  rolled_back_at timestamptz,
  created_at timestamptz not null default now(),
  unique (batch_id, snapshot_id),
  constraint partner_feed_publication_item_gate check (
    publication_eligible = false or status in ('eligible','executed','rolled_back')
  )
);

create table if not exists public.partner_feed_publication_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.professional_organizations(id) on delete cascade,
  batch_id uuid not null references public.partner_feed_publication_batches(id) on delete cascade,
  item_id bigint references public.partner_feed_publication_batch_items(id) on delete cascade,
  event_type text not null check (event_type in ('batch_created','batch_ready','dry_run_completed','execution_started','item_executed','execution_completed','rollback_requested','item_rolled_back','rollback_completed','failed','cancelled')),
  actor_user_id uuid references auth.users(id),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  publication_eligible boolean not null default false
);

create index if not exists partner_feed_publication_batches_org_idx on public.partner_feed_publication_batches(organization_id,status,created_at desc);
create index if not exists partner_feed_publication_items_batch_idx on public.partner_feed_publication_batch_items(batch_id,status);
create index if not exists partner_feed_publication_events_batch_idx on public.partner_feed_publication_events(batch_id,created_at desc);

alter table public.partner_feed_publication_batches enable row level security;
alter table public.partner_feed_publication_batch_items enable row level security;
alter table public.partner_feed_publication_events enable row level security;

revoke all on table public.partner_feed_publication_batches from public,anon,authenticated;
revoke all on table public.partner_feed_publication_batch_items from public,anon,authenticated;
revoke all on table public.partner_feed_publication_events from public,anon,authenticated;

grant select on table public.partner_feed_publication_batches to authenticated;
grant select on table public.partner_feed_publication_batch_items to authenticated;
grant select on table public.partner_feed_publication_events to authenticated;
grant all on table public.partner_feed_publication_batches to service_role;
grant all on table public.partner_feed_publication_batch_items to service_role;
grant all on table public.partner_feed_publication_events to service_role;
grant usage,select on all sequences in schema public to service_role;

create policy partner_feed_publication_batches_member_select on public.partner_feed_publication_batches
for select to authenticated using (
  organization_id in (
    select organization_id from public.professional_memberships
    where user_id=(select auth.uid()) and status='active'
  )
);
create policy partner_feed_publication_items_member_select on public.partner_feed_publication_batch_items
for select to authenticated using (
  organization_id in (
    select organization_id from public.professional_memberships
    where user_id=(select auth.uid()) and status='active'
  )
);
create policy partner_feed_publication_events_member_select on public.partner_feed_publication_events
for select to authenticated using (
  organization_id in (
    select organization_id from public.professional_memberships
    where user_id=(select auth.uid()) and status='active'
  )
);

create or replace function public.odm_b3_4_6_publication_canary_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
select jsonb_build_object(
  'audit_version','odm_b3_4_6_publication_canary_v1',
  'batches',(select count(*) from public.partner_feed_publication_batches),
  'items',(select count(*) from public.partner_feed_publication_batch_items),
  'events',(select count(*) from public.partner_feed_publication_events),
  'eligible_batches',(select count(*) from public.partner_feed_publication_batches where publication_eligible),
  'eligible_items',(select count(*) from public.partner_feed_publication_batch_items where publication_eligible),
  'executed_items',(select count(*) from public.partner_feed_publication_batch_items where status='executed'),
  'rolled_back_items',(select count(*) from public.partner_feed_publication_batch_items where status='rolled_back'),
  'fail_closed',(
    (select count(*) from public.partner_feed_publication_batches where publication_eligible)=0
    and (select count(*) from public.partner_feed_publication_batch_items where publication_eligible)=0
    and (select count(*) from public.partner_feed_publication_batch_items where status='executed')=0
  )
);
$$;

revoke all on function public.odm_b3_4_6_publication_canary_report_v1() from public,anon,authenticated;
grant execute on function public.odm_b3_4_6_publication_canary_report_v1() to service_role;
