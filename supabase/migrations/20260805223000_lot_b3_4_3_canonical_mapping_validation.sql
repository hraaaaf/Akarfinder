-- LOT B3.4.3 — Canonical Mapping & Validation.
-- Partner rows reuse Property Schema V1 and remain fail-closed in quarantine.

create or replace function public.odm_b3_4_3_canonical_mapping_report_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
select jsonb_build_object(
  'audit_version','odm_b3_4_3_canonical_mapping_v1',
  'imports',(select count(*) from public.partner_feed_imports),
  'rows',(select count(*) from public.partner_feed_import_rows),
  'mapped_rows',(select count(*) from public.partner_feed_import_rows where canonical_payload is not null),
  'invalid_rows',(select count(*) from public.partner_feed_import_rows where row_status='invalid'),
  'warning_rows',(select count(*) from public.partner_feed_import_rows where row_status='warning'),
  'valid_rows',(select count(*) from public.partner_feed_import_rows where row_status='valid'),
  'property_schema_v1_rows',(
    select count(*) from public.partner_feed_import_rows
    where canonical_payload->>'schema_version'='1.0'
  ),
  'parallel_schema_rows',(
    select count(*) from public.partner_feed_import_rows
    where canonical_payload is not null
      and coalesce(canonical_payload->>'schema_version','') <> '1.0'
  ),
  'publication_eligible_imports',(select count(*) from public.partner_feed_imports where publication_eligible),
  'publication_eligible_rows',(select count(*) from public.partner_feed_import_rows where publication_eligible),
  'fail_closed',(
    (select count(*) from public.partner_feed_imports where publication_eligible)=0
    and (select count(*) from public.partner_feed_import_rows where publication_eligible)=0
    and (select count(*) from public.partner_feed_import_rows where canonical_payload is not null and coalesce(canonical_payload->>'schema_version','') <> '1.0')=0
  )
);
$$;

revoke all on function public.odm_b3_4_3_canonical_mapping_report_v1() from public,anon,authenticated;
grant execute on function public.odm_b3_4_3_canonical_mapping_report_v1() to service_role;
