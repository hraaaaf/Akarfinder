-- P0 DATA — Active recrawl lease enforcement.
-- Any attempt recorded after lease expiry aborts the surrounding transaction.

create or replace function public.enforce_active_recrawl_lease()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_schedule public.source_offer_recrawl_schedule;
begin
  select * into v_schedule
  from public.source_offer_recrawl_schedule
  where source_offer_id = new.source_offer_id
  for update;

  if not found then
    raise exception 'recrawl schedule is missing';
  end if;

  if v_schedule.lease_token is distinct from new.lease_token
     or v_schedule.leased_by is distinct from btrim(new.worker_id) then
    raise exception 'recrawl claim is missing or expired';
  end if;

  if v_schedule.lease_until is null or v_schedule.lease_until <= new.completed_at then
    raise exception 'recrawl lease expired';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_active_recrawl_lease() from public, anon, authenticated;
grant execute on function public.enforce_active_recrawl_lease() to service_role;

drop trigger if exists source_offer_recrawl_attempts_active_lease_guard
  on public.source_offer_recrawl_attempts;
create trigger source_offer_recrawl_attempts_active_lease_guard
before insert on public.source_offer_recrawl_attempts
for each row execute function public.enforce_active_recrawl_lease();

comment on function public.enforce_active_recrawl_lease() is
  'Fail-closed guard: recrawl attempts require a matching worker/token and a lease valid beyond completed_at.';
