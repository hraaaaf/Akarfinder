-- P0 DATA M4 — controlled publication engine.

alter table public.data_publication_batches
  add column if not exists audience text not null default 'internal',
  add column if not exists supersedes_batch_id uuid references public.data_publication_batches(id),
  add column if not exists rollback_of_batch_id uuid references public.data_publication_batches(id),
  add column if not exists publication_version bigint;

alter table public.data_publication_batches
  drop constraint if exists data_publication_batches_audience_check;
alter table public.data_publication_batches
  add constraint data_publication_batches_audience_check
  check (audience in ('internal','public'));

create table if not exists public.data_publication_channels (
  dataset_type text not null,
  audience text not null,
  current_batch_id uuid references public.data_publication_batches(id),
  previous_batch_id uuid references public.data_publication_batches(id),
  version bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (dataset_type, audience),
  check (audience in ('internal','public'))
);

alter table public.data_publication_channels enable row level security;
revoke all on public.data_publication_channels from anon, authenticated;

create index if not exists publication_batches_supersedes_idx
  on public.data_publication_batches(supersedes_batch_id)
  where supersedes_batch_id is not null;
create index if not exists publication_batches_rollback_idx
  on public.data_publication_batches(rollback_of_batch_id)
  where rollback_of_batch_id is not null;
create index if not exists publication_items_batch_idx
  on public.data_publication_items(batch_id);

create or replace function public.validate_data_publication_batch(p_batch_id uuid, p_audience text default 'internal')
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  b public.data_publication_batches%rowtype;
  blockers text[] := '{}';
  reliable_count integer;
  public_count integer;
begin
  if p_audience not in ('internal','public') then
    raise exception 'invalid audience: %', p_audience;
  end if;

  select * into b from public.data_publication_batches where id = p_batch_id;
  if not found then raise exception 'batch not found'; end if;
  if b.status not in ('validated','published','superseded') then
    blockers := array_append(blockers, 'batch_not_validated');
  end if;
  if coalesce(b.input_snapshot_id, '') = '' then
    blockers := array_append(blockers, 'missing_input_snapshot');
  end if;
  if b.methodology_versions = '{}'::jsonb then
    blockers := array_append(blockers, 'missing_methodology_versions');
  end if;

  if p_audience = 'public' then
    if b.batch_type = 'neighborhood_intelligence' then
      public_count := coalesce((b.validation_report->>'public_profiles')::integer, 0);
      if public_count < 1 then blockers := array_append(blockers, 'no_public_neighborhood_profiles'); end if;
    elsif b.batch_type = 'price_m2' then
      reliable_count := coalesce((b.metrics->>'references_reliable')::integer, 0);
      if reliable_count < 1 then blockers := array_append(blockers, 'no_reliable_price_reference'); end if;
    elsif b.batch_type not in ('geography','neighborhood_intelligence','price_m2') then
      blockers := array_append(blockers, 'unsupported_public_dataset');
    end if;
  end if;

  return jsonb_build_object(
    'batch_id', b.id,
    'batch_type', b.batch_type,
    'audience', p_audience,
    'eligible', cardinality(blockers) = 0,
    'blockers', to_jsonb(blockers)
  );
end;
$$;

revoke all on function public.validate_data_publication_batch(uuid,text) from public, anon, authenticated;
grant execute on function public.validate_data_publication_batch(uuid,text) to service_role;

create or replace function public.publish_data_batch(p_batch_id uuid, p_audience text default 'internal')
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  b public.data_publication_batches%rowtype;
  gate jsonb;
  old_batch uuid;
  new_version bigint;
begin
  gate := public.validate_data_publication_batch(p_batch_id, p_audience);
  if not coalesce((gate->>'eligible')::boolean, false) then
    raise exception 'publication blocked: %', gate->'blockers';
  end if;

  select * into b from public.data_publication_batches where id = p_batch_id for update;

  insert into public.data_publication_channels(dataset_type,audience,current_batch_id,previous_batch_id,version,updated_at)
  values (b.batch_type,p_audience,p_batch_id,null,1,now())
  on conflict (dataset_type,audience) do update
    set previous_batch_id = data_publication_channels.current_batch_id,
        current_batch_id = excluded.current_batch_id,
        version = data_publication_channels.version + 1,
        updated_at = now()
  returning previous_batch_id, version into old_batch, new_version;

  if old_batch is not null and old_batch <> p_batch_id then
    update public.data_publication_batches
      set status = 'superseded'
      where id = old_batch and status = 'published';
  end if;

  update public.data_publication_batches
    set status = 'published',
        audience = p_audience,
        supersedes_batch_id = case when old_batch <> p_batch_id then old_batch else supersedes_batch_id end,
        publication_version = new_version,
        published_at = coalesce(published_at, now())
    where id = p_batch_id;

  return jsonb_build_object('published',true,'batch_id',p_batch_id,'dataset_type',b.batch_type,'audience',p_audience,'version',new_version,'superseded_batch_id',old_batch);
end;
$$;

revoke all on function public.publish_data_batch(uuid,text) from public, anon, authenticated;
grant execute on function public.publish_data_batch(uuid,text) to service_role;

create or replace function public.rollback_data_batch(p_dataset_type text, p_audience text default 'internal')
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  channel public.data_publication_channels%rowtype;
  rollback_batch uuid;
  new_previous uuid;
begin
  select * into channel
  from public.data_publication_channels
  where dataset_type = p_dataset_type and audience = p_audience
  for update;

  if not found or channel.previous_batch_id is null then
    raise exception 'no rollback target for %.%', p_dataset_type, p_audience;
  end if;

  rollback_batch := channel.previous_batch_id;
  select supersedes_batch_id into new_previous
  from public.data_publication_batches where id = rollback_batch;

  update public.data_publication_batches
    set status='rolled_back', rolled_back_at=now()
    where id=channel.current_batch_id;

  update public.data_publication_batches
    set status='published', rolled_back_at=null
    where id=rollback_batch;

  update public.data_publication_channels
    set current_batch_id=rollback_batch,
        previous_batch_id=new_previous,
        version=version+1,
        updated_at=now()
    where dataset_type=p_dataset_type and audience=p_audience;

  return jsonb_build_object('rolled_back',true,'dataset_type',p_dataset_type,'audience',p_audience,'restored_batch_id',rollback_batch,'removed_batch_id',channel.current_batch_id);
end;
$$;

revoke all on function public.rollback_data_batch(text,text) from public, anon, authenticated;
grant execute on function public.rollback_data_batch(text,text) to service_role;

create or replace view public.current_data_publications
with (security_invoker=true)
as
select c.dataset_type,c.audience,c.version,c.updated_at,b.id as batch_id,b.status,b.input_snapshot_id,b.methodology_versions,b.metrics,b.validation_report,b.published_at
from public.data_publication_channels c
join public.data_publication_batches b on b.id=c.current_batch_id;

revoke all on public.current_data_publications from anon, authenticated;
