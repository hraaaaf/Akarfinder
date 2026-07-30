-- ODM-ECONOMIC-MATERIALIZATION-STALE-SUPPRESSION-FIX
-- Principal economic values exist only when the final observation state is trusted.

create or replace function public.odm_economic_state_suppress_untrusted_principal_v1()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if new.economic_status <> 'trusted' then
    new.principal_candidate_id := null;
    new.principal_economic_type := null;
    new.principal_value_mad := null;
  end if;
  return new;
end;
$$;

drop trigger if exists odm_economic_state_suppress_untrusted_principal_v1
  on public.odm_economic_observation_state_shadow_v1;
create trigger odm_economic_state_suppress_untrusted_principal_v1
before insert or update on public.odm_economic_observation_state_shadow_v1
for each row execute function public.odm_economic_state_suppress_untrusted_principal_v1();

update public.odm_economic_observation_state_shadow_v1
set principal_candidate_id=null,
    principal_economic_type=null,
    principal_value_mad=null
where economic_status<>'trusted'
  and (principal_candidate_id is not null or principal_economic_type is not null or principal_value_mad is not null);

alter table public.odm_economic_observation_state_shadow_v1
  drop constraint if exists odm_economic_state_principal_requires_trusted;
alter table public.odm_economic_observation_state_shadow_v1
  add constraint odm_economic_state_principal_requires_trusted
  check (economic_status='trusted' or (principal_candidate_id is null and principal_economic_type is null and principal_value_mad is null));

revoke all on function public.odm_economic_state_suppress_untrusted_principal_v1() from public,anon,authenticated;
comment on function public.odm_economic_state_suppress_untrusted_principal_v1() is 'Fail-closed suppression of principal economic fields for stale, missing, rejected, ambiguous or policy-blocked observations.';
