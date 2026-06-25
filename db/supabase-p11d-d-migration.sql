-- P11D-D: Lead CRM columns
-- Adds CRM tracking fields to buyer_leads.
-- The internal_notes column already exists in the original migration.
-- This migration adds last_contacted_at and next_follow_up_at, and extended indexes.
-- Apply with: Supabase Dashboard → SQL Editor → paste → Run
-- OR: SUPABASE_ACCESS_TOKEN=sbp_... npm run apply:leads-migration (if script supports this file)

alter table public.buyer_leads
  add column if not exists internal_notes text,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists next_follow_up_at timestamptz;

-- Extend status constraint to include P11D-D values
-- (existing constraint only covers new/contacted/qualified/archived)
alter table public.buyer_leads
  drop constraint if exists buyer_leads_status_check;

alter table public.buyer_leads
  add constraint buyer_leads_status_check
    check (status in ('new', 'contacted', 'qualified', 'visit_confirmed', 'reschedule_requested', 'archived'));

create index if not exists buyer_leads_status_idx on public.buyer_leads(status);
create index if not exists buyer_leads_next_follow_up_idx on public.buyer_leads(next_follow_up_at) where next_follow_up_at is not null;
create index if not exists buyer_leads_updated_at_idx on public.buyer_leads(updated_at desc);
