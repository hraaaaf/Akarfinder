-- Backfill every representation through ODM-10D, then remove legacy tier values.
select public.odm_10d_recompute_quality('odm-10d-migration-v1');

alter table public.thin_index_search_documents
  drop constraint if exists thin_index_quality_tier_check;
alter table public.thin_index_search_documents
  add constraint thin_index_quality_tier_check
  check (quality_tier in ('A','B','C','D','E','REJECTED','UNSCORED'));
