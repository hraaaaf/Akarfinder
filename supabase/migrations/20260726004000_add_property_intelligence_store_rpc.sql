begin;

create unique index if not exists property_intelligence_features_one_active_idx
  on public.property_intelligence_features (canonical_property_id, feature_key)
  where superseded_at is null;

create or replace function public.persist_property_intelligence_feature(
  p_canonical_property_id text,
  p_feature_key text,
  p_feature_value jsonb,
  p_confidence double precision,
  p_feature_status text,
  p_method text,
  p_methodology_version text,
  p_evidence jsonb,
  p_input_snapshot text,
  p_source_observation_ids jsonb default '[]'::jsonb,
  p_valid_until timestamptz default null,
  p_publication_eligible boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_publication_eligible boolean;
begin
  if coalesce(trim(p_canonical_property_id), '') = '' then
    raise exception 'canonical_property_id_required';
  end if;
  if coalesce(trim(p_feature_key), '') = '' then
    raise exception 'feature_key_required';
  end if;
  if coalesce(trim(p_methodology_version), '') = '' then
    raise exception 'methodology_version_required';
  end if;
  if coalesce(trim(p_input_snapshot), '') = '' then
    raise exception 'input_snapshot_required';
  end if;
  if p_confidence < 0 or p_confidence > 1 then
    raise exception 'invalid_feature_confidence';
  end if;
  if p_feature_status not in ('observed', 'inferred', 'unknown', 'conflicted') then
    raise exception 'invalid_feature_status';
  end if;

  v_publication_eligible := p_publication_eligible
    and p_feature_status in ('observed', 'inferred')
    and p_feature_value is not null
    and (p_valid_until is null or p_valid_until > now());

  perform pg_advisory_xact_lock(hashtextextended(p_canonical_property_id || ':' || p_feature_key, 0));

  select id into v_id
  from public.property_intelligence_features
  where canonical_property_id = p_canonical_property_id
    and feature_key = p_feature_key
    and methodology_version = p_methodology_version
    and input_snapshot = p_input_snapshot;

  if v_id is not null then
    return v_id;
  end if;

  update public.property_intelligence_features
  set superseded_at = now(), publication_eligible = false
  where canonical_property_id = p_canonical_property_id
    and feature_key = p_feature_key
    and superseded_at is null;

  insert into public.property_intelligence_features (
    canonical_property_id,
    feature_key,
    feature_value,
    confidence,
    feature_status,
    method,
    methodology_version,
    evidence,
    input_snapshot,
    source_observation_ids,
    valid_until,
    publication_eligible
  ) values (
    p_canonical_property_id,
    p_feature_key,
    p_feature_value,
    p_confidence,
    p_feature_status,
    p_method,
    p_methodology_version,
    coalesce(p_evidence, '[]'::jsonb),
    p_input_snapshot,
    coalesce(p_source_observation_ids, '[]'::jsonb),
    p_valid_until,
    v_publication_eligible
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.persist_property_intelligence_feature(
  text, text, jsonb, double precision, text, text, text, jsonb, text, jsonb, timestamptz, boolean
) from public, anon, authenticated;

grant execute on function public.persist_property_intelligence_feature(
  text, text, jsonb, double precision, text, text, text, jsonb, text, jsonb, timestamptz, boolean
) to service_role;

comment on function public.persist_property_intelligence_feature is
  'Atomically persists one immutable feature version, supersedes the prior active version and remains idempotent for the same methodology/input snapshot.';

commit;
