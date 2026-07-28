-- M4 hotfix: retain existing allowed batch statuses.

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
  if b.status not in ('validated','published') then
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

  return jsonb_build_object('batch_id',b.id,'batch_type',b.batch_type,'audience',p_audience,'eligible',cardinality(blockers)=0,'blockers',to_jsonb(blockers));
end;
$$;

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
    set previous_batch_id = case when data_publication_channels.current_batch_id=excluded.current_batch_id then data_publication_channels.previous_batch_id else data_publication_channels.current_batch_id end,
        current_batch_id = excluded.current_batch_id,
        version = case when data_publication_channels.current_batch_id=excluded.current_batch_id then data_publication_channels.version else data_publication_channels.version+1 end,
        updated_at = now()
  returning previous_batch_id,version into old_batch,new_version;

  if old_batch is not null and old_batch <> p_batch_id
     and not exists (select 1 from public.data_publication_channels where current_batch_id=old_batch) then
    update public.data_publication_batches set status='validated' where id=old_batch and status='published';
  end if;

  update public.data_publication_batches
  set status='published',
      supersedes_batch_id=case when old_batch is not null and old_batch<>p_batch_id then old_batch else supersedes_batch_id end,
      publication_version=greatest(coalesce(publication_version,0),new_version),
      published_at=coalesce(published_at,now())
  where id=p_batch_id;

  return jsonb_build_object('published',true,'batch_id',p_batch_id,'dataset_type',b.batch_type,'audience',p_audience,'version',new_version,'superseded_batch_id',old_batch);
end;
$$;

revoke all on function public.validate_data_publication_batch(uuid,text) from public,anon,authenticated;
grant execute on function public.validate_data_publication_batch(uuid,text) to service_role;
revoke all on function public.publish_data_batch(uuid,text) from public,anon,authenticated;
grant execute on function public.publish_data_batch(uuid,text) to service_role;
