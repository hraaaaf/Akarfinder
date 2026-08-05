create or replace function public.odm_b3_4_4_dedup_change_detection_report_v1()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'audit_version', 'odm_b3_4_4_dedup_change_detection_v1',
    'imports', 0,
    'rows', 0,
    'new_property', 0,
    'new_offer', 0,
    'update_offer', 0,
    'duplicate', 0,
    'manual_review', 0,
    'publication_eligible_rows', 0,
    'automatic_merge_rows', 0,
    'fail_closed', true
  );
$$;
revoke all on function public.odm_b3_4_4_dedup_change_detection_report_v1() from public, anon, authenticated;
grant execute on function public.odm_b3_4_4_dedup_change_detection_report_v1() to service_role;
