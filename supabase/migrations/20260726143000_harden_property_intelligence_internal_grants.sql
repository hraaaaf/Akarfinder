begin;

revoke all on table public.property_intelligence_features from public, anon, authenticated;
revoke all on table public.property_intelligence_scores from public, anon, authenticated;
revoke all on table public.latest_internal_property_intelligence_features from public, anon, authenticated;
revoke all on table public.latest_internal_property_intelligence_scores from public, anon, authenticated;

grant select, insert, update on table public.property_intelligence_features to service_role;
grant select, insert, update on table public.property_intelligence_scores to service_role;
grant select on table public.latest_internal_property_intelligence_features to service_role;
grant select on table public.latest_internal_property_intelligence_scores to service_role;

commit;
