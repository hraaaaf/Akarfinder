-- ODM-SHADOW-COMPARISON-TRUTHFULNESS-V1
-- Additive observability only. No public response, ranking, eligibility or Canary change.

alter table public.odm_shadow_divergence_events_v1
  add column if not exists legacy_result_count integer not null default 0,
  add column if not exists legacy_comparable_count integer not null default 0,
  add column if not exists legacy_missing_identity_count integer not null default 0,
  add column if not exists odm_result_count integer not null default 0,
  add column if not exists odm_comparable_count integer not null default 0,
  add column if not exists odm_missing_identity_count integer not null default 0;

comment on column public.odm_shadow_divergence_events_v1.legacy_result_count is 'Raw legacy engine result count before comparison identity extraction.';
comment on column public.odm_shadow_divergence_events_v1.legacy_comparable_count is 'Legacy results with a usable normalized comparison URL.';
comment on column public.odm_shadow_divergence_events_v1.legacy_missing_identity_count is 'Legacy results without usable URL identity.';
comment on column public.odm_shadow_divergence_events_v1.odm_result_count is 'Raw ODM engine result count before comparison identity extraction.';
comment on column public.odm_shadow_divergence_events_v1.odm_comparable_count is 'ODM results with a usable normalized comparison URL.';
comment on column public.odm_shadow_divergence_events_v1.odm_missing_identity_count is 'ODM results without usable URL identity.';
