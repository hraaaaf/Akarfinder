-- M7-A security hardening: saved_alerts contains consented contact data and is server-only.
-- The legacy P18A policy omitted a TO clause, so PostgreSQL applied it to PUBLIC.
-- Existing default grants then allowed anon/authenticated Data API access.
-- Keep this table service-role only. No application client depends on direct access.

begin;

alter table public.saved_alerts enable row level security;

drop policy if exists "service_role_all" on public.saved_alerts;

revoke all privileges on table public.saved_alerts from PUBLIC, anon, authenticated;
grant select, insert, update, delete on table public.saved_alerts to service_role;

comment on table public.saved_alerts is
  'Server-only saved search alerts containing consented contact data; direct anon/authenticated access is forbidden.';

commit;
