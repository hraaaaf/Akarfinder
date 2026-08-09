-- RANKING-QUALITY-1 follow-up hardening.
-- PostgreSQL UPDATE OF triggers fire from the original SET target list; they do
-- not fire merely because an earlier BEFORE trigger changed quality_tier/score.
-- Mirror every input watched by trg_odm_10d_quality so the final display policy
-- recomputes after the quality trigger has derived its new values.

drop trigger if exists zzz_thin_index_display_policy_write
  on public.thin_index_search_documents;

create trigger zzz_thin_index_display_policy_write
before insert or update of
  vertical_classification,
  canonical_url,
  source_domain,
  seed_provider,
  freshness_status,
  title,
  snippet,
  normalized_city,
  normalized_property_type,
  normalized_intent,
  normalized_price_mad,
  normalized_surface_m2,
  normalized_price_m2,
  recovery_confidence,
  normalization_status,
  quality_tier,
  quality_score,
  document_kind,
  document_kind_version
on public.thin_index_search_documents
for each row
execute function public.odm06_set_display_policy();
