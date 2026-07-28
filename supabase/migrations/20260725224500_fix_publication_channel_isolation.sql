-- M4 hotfix: publication status is global to a batch, while activation is per channel.

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
    set previous_batch_id = case
          when data_publication_channels.current_batch_id = excluded.current_batch_id
            then data_publication_channels.previous_batch_id
          else data_publication_channels.current_batch_id
        end,
        current_batch_id = excluded.current_batch_id,
        version = case
          when data_publication_channels.current_batch_id = excluded.current_batch_id
            then data_publication_channels.version
          else data_publication_channels.version + 1
        end,
        updated_at = now()
  returning previous_batch_id, version into old_batch, new_version;

  if old_batch is not null and old_batch <> p_batch_id
     and not exists (
       select 1 from public.data_publication_channels
       where current_batch_id = old_batch
     ) then
    update public.data_publication_batches
      set status = 'superseded'
      where id = old_batch and status = 'published';
  end if;

  update public.data_publication_batches
    set status = 'published',
        supersedes_batch_id = case when old_batch is not null and old_batch <> p_batch_id then old_batch else supersedes_batch_id end,
        publication_version = greatest(coalesce(publication_version,0), new_version),
        published_at = coalesce(published_at, now())
    where id = p_batch_id;

  return jsonb_build_object('published',true,'batch_id',p_batch_id,'dataset_type',b.batch_type,'audience',p_audience,'version',new_version,'superseded_batch_id',old_batch);
end;
$$;

create or replace function public.rollback_data_batch(p_dataset_type text, p_audience text default 'internal')
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  channel public.data_publication_channels%rowtype;
  rollback_batch uuid;
  removed_batch uuid;
  new_previous uuid;
begin
  select * into channel
  from public.data_publication_channels
  where dataset_type = p_dataset_type and audience = p_audience
  for update;

  if not found or channel.previous_batch_id is null then
    raise exception 'no rollback target for %.%', p_dataset_type, p_audience;
  end if;

  removed_batch := channel.current_batch_id;
  rollback_batch := channel.previous_batch_id;
  select supersedes_batch_id into new_previous
  from public.data_publication_batches where id = rollback_batch;

  update public.data_publication_channels
    set current_batch_id=rollback_batch,
        previous_batch_id=new_previous,
        version=version+1,
        updated_at=now()
    where dataset_type=p_dataset_type and audience=p_audience;

  update public.data_publication_batches
    set status='published', rolled_back_at=null
    where id=rollback_batch;

  if not exists (
    select 1 from public.data_publication_channels where current_batch_id=removed_batch
  ) then
    update public.data_publication_batches
      set status='rolled_back', rolled_back_at=now()
      where id=removed_batch;
  end if;

  return jsonb_build_object('rolled_back',true,'dataset_type',p_dataset_type,'audience',p_audience,'restored_batch_id',rollback_batch,'removed_batch_id',removed_batch);
end;
$$;

revoke all on function public.publish_data_batch(uuid,text) from public, anon, authenticated;
grant execute on function public.publish_data_batch(uuid,text) to service_role;
revoke all on function public.rollback_data_batch(text,text) from public, anon, authenticated;
grant execute on function public.rollback_data_batch(text,text) to service_role;
