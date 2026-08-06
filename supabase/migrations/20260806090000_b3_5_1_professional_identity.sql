-- B3.5.1 — Canonical professional identity
-- Migration responsibility only: transactional activation conversion and active-owner invariants.

create or replace function public.professional_organization_has_active_owner(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.professional_memberships
    where organization_id = p_organization_id
      and role = 'owner'
      and status = 'active'
  );
$$;

revoke all on function public.professional_organization_has_active_owner(uuid) from public, anon, authenticated;
grant execute on function public.professional_organization_has_active_owner(uuid) to service_role;

-- Repair legacy organizations before enforcing the invariant. The creator is the
-- only canonical identity available in the existing schema, so it becomes owner
-- only when the organization currently has no active owner.
insert into public.professional_memberships (
  organization_id,
  user_id,
  role,
  status,
  created_at,
  updated_at
)
select
  organization.id,
  organization.created_by,
  'owner',
  'active',
  now(),
  now()
from public.professional_organizations organization
where not public.professional_organization_has_active_owner(organization.id)
on conflict (organization_id, user_id)
do update set
  role = 'owner',
  status = 'active',
  updated_at = now();

create or replace function public.enforce_professional_organization_active_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_organization_id uuid;
  v_validation_status text;
begin
  v_organization_id := case
    when tg_table_name = 'professional_organizations' then coalesce(new.id, old.id)
    else coalesce(new.organization_id, old.organization_id)
  end;

  select validation_status
  into v_validation_status
  from public.professional_organizations
  where id = v_organization_id;

  if v_validation_status = 'validated'
     and not public.professional_organization_has_active_owner(v_organization_id) then
    raise exception 'PROFESSIONAL_ORGANIZATION_ACTIVE_OWNER_REQUIRED'
      using errcode = '23514';
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function public.enforce_professional_organization_active_owner() from public, anon, authenticated;

-- Deferred triggers permit organization + owner creation in one transaction while
-- rejecting a committed validated organization without an active owner.
drop trigger if exists professional_organization_active_owner_guard
  on public.professional_organizations;
create constraint trigger professional_organization_active_owner_guard
after insert or update of validation_status
on public.professional_organizations
deferrable initially deferred
for each row
execute function public.enforce_professional_organization_active_owner();

drop trigger if exists professional_membership_active_owner_guard
  on public.professional_memberships;
create constraint trigger professional_membership_active_owner_guard
after insert or update or delete
on public.professional_memberships
deferrable initially deferred
for each row
execute function public.enforce_professional_organization_active_owner();

create or replace function public.convert_professional_activation_request(
  p_activation_request_id uuid,
  p_owner_user_id uuid,
  p_slug text,
  p_legal_name text default null,
  p_display_name text default null
)
returns table (
  activation_request_id uuid,
  organization_id uuid,
  membership_id uuid,
  converted_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.professional_activation_requests%rowtype;
  v_organization_id uuid;
  v_membership_id uuid;
  v_converted_at timestamptz := now();
  v_slug text := lower(trim(p_slug));
  v_legal_name text;
  v_display_name text;
begin
  if p_owner_user_id is null then
    raise exception 'PROFESSIONAL_OWNER_USER_REQUIRED' using errcode = '22023';
  end if;

  if v_slug = '' or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'PROFESSIONAL_ORGANIZATION_SLUG_INVALID' using errcode = '22023';
  end if;

  select *
  into v_request
  from public.professional_activation_requests
  where id = p_activation_request_id
  for update;

  if not found then
    raise exception 'PROFESSIONAL_ACTIVATION_REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_request.status = 'converted' then
    raise exception 'PROFESSIONAL_ACTIVATION_ALREADY_CONVERTED' using errcode = '23505';
  end if;

  if v_request.status not in ('qualified', 'onboarding') then
    raise exception 'PROFESSIONAL_ACTIVATION_NOT_QUALIFIED' using errcode = '23514';
  end if;

  if v_request.requested_type not in ('agency', 'promoter') then
    raise exception 'PROFESSIONAL_ACTIVATION_TYPE_UNSUPPORTED' using errcode = '23514';
  end if;

  if not exists (select 1 from auth.users where id = p_owner_user_id) then
    raise exception 'PROFESSIONAL_OWNER_USER_NOT_FOUND' using errcode = '23503';
  end if;

  v_legal_name := coalesce(nullif(trim(p_legal_name), ''), v_request.company_name);
  v_display_name := coalesce(nullif(trim(p_display_name), ''), v_request.company_name);

  insert into public.professional_organizations (
    organization_type,
    slug,
    legal_name,
    display_name,
    city,
    validation_status,
    commercial_tier,
    public_visibility,
    created_by,
    created_at,
    updated_at
  ) values (
    v_request.requested_type,
    v_slug,
    v_legal_name,
    v_display_name,
    v_request.city,
    'pending',
    'none',
    'draft',
    p_owner_user_id,
    v_converted_at,
    v_converted_at
  )
  returning id into v_organization_id;

  insert into public.professional_memberships (
    organization_id,
    user_id,
    role,
    status,
    created_at,
    updated_at
  ) values (
    v_organization_id,
    p_owner_user_id,
    'owner',
    'active',
    v_converted_at,
    v_converted_at
  )
  returning id into v_membership_id;

  update public.professional_activation_requests
  set
    status = 'converted',
    organization_id = v_organization_id,
    converted_at = v_converted_at,
    updated_at = v_converted_at
  where id = v_request.id;

  return query
  select
    v_request.id,
    v_organization_id,
    v_membership_id,
    v_converted_at;
end;
$$;

revoke all on function public.convert_professional_activation_request(uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.convert_professional_activation_request(uuid, uuid, text, text, text)
  to service_role;

comment on function public.convert_professional_activation_request(uuid, uuid, text, text, text) is
'B3.5.1 canonical transaction: qualified activation request -> pending organization + active owner membership + converted request.';
comment on function public.professional_organization_has_active_owner(uuid) is
'Canonical active-owner invariant used by Professional Workspace identity resolution.';
