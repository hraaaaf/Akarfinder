-- ODM-10B follow-up: contractual risk must dominate volume in priority ordering.

create or replace function public.odm_10b_source_priority_report(p_limit integer default 10)
returns table (
  priority_rank bigint,
  source_domain text,
  current_representation_count bigint,
  execution_score smallint,
  discovery_policy text,
  detail_fetch_policy text,
  content_reuse_policy text,
  display_policy text,
  partnership_required boolean,
  recommended_action text
)
language sql
security invoker
set search_path = public
as $$
  select
    row_number() over (
      order by
        case
          when detail_fetch_policy = 'allowed_bounded'
            and content_reuse_policy in ('authorized','link_and_facts_only') then 0
          when display_policy = 'canonical_link_only'
            and content_reuse_policy in ('permission_required','unknown') then 1
          when display_policy = 'internal_signal_only'
            and content_reuse_policy = 'unknown' then 2
          when content_reuse_policy = 'prohibited' then 3
          else 4
        end,
        execution_score desc,
        diversification_score desc,
        current_representation_count desc,
        source_domain
    ) as priority_rank,
    source_domain,
    current_representation_count,
    execution_score,
    discovery_policy,
    detail_fetch_policy,
    content_reuse_policy,
    display_policy,
    partnership_required,
    recommended_action
  from public.source_policy_registry
  order by priority_rank
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

revoke all on function public.odm_10b_source_priority_report(integer) from public, anon, authenticated;
grant execute on function public.odm_10b_source_priority_report(integer) to service_role;
