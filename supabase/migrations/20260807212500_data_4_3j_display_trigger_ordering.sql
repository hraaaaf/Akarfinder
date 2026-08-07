-- DATA-4.3J — Display Trigger Ordering Fix
--
-- PostgreSQL executes triggers with the same timing/event in name order.
-- The historical `thin_index_display_policy_write` trigger ran before the
-- quality/purity triggers on thin_index_search_documents. On a freshness
-- transition, display eligibility could therefore be calculated from the old
-- quality tier and remain stale after later BEFORE triggers recalculated tier.
--
-- This migration changes trigger ordering only. It does NOT backfill existing
-- rows and does NOT modify any display/publication policy function.

begin;

lock table public.thin_index_search_documents in share row exclusive mode;

drop trigger if exists thin_index_display_policy_write on public.thin_index_search_documents;
drop trigger if exists zzz_thin_index_display_policy_write on public.thin_index_search_documents;

create trigger zzz_thin_index_display_policy_write
before insert or update of canonical_url, seed_provider, freshness_status, quality_tier, quality_score
on public.thin_index_search_documents
for each row
execute function public.odm06_set_display_policy();

commit;
