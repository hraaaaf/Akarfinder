-- ODM-10D transition from legacy 0–10/Q0–Q3 quality contract.
alter table public.thin_index_search_documents
  drop constraint if exists thin_index_quality_score_check;
alter table public.thin_index_search_documents
  add constraint thin_index_quality_score_check
  check (quality_score between 0 and 100);

alter table public.thin_index_search_documents
  drop constraint if exists thin_index_quality_tier_check;
alter table public.thin_index_search_documents
  add constraint thin_index_quality_tier_check
  check (quality_tier in (
    'A','B','C','D','E','REJECTED','UNSCORED',
    'Q0_link_only','Q1_contextual','Q2_comparable','Q3_intelligence_ready'
  ));
