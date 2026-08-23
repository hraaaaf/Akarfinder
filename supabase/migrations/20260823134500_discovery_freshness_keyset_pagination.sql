-- P0.2 — Replace deep OFFSET pagination for fresh discovery observations with
-- a deterministic (discovered_at DESC, id DESC) cursor used by the public
-- sitemap freshness reconciliation path.

create index if not exists discovery_candidates_fresh_cursor_idx
on public.discovery_candidates (discovered_at desc, id desc)
where discovery_status in ('accepted', 'promoted_to_source_offer');

create or replace function public.load_fresh_discovery_observations_page(
  p_before_discovered_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 1000
)
returns table (
  id uuid,
  canonical_url text,
  source_url text,
  discovered_at timestamptz,
  discovery_status text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    dc.id,
    dc.canonical_url,
    dc.source_url,
    dc.discovered_at,
    dc.discovery_status
  from public.discovery_candidates dc
  where dc.discovery_status in ('accepted', 'promoted_to_source_offer')
    and dc.canonical_url is not null
    and (
      p_before_discovered_at is null
      or (
        p_before_id is not null
        and (dc.discovered_at, dc.id) < (p_before_discovered_at, p_before_id)
      )
    )
  order by dc.discovered_at desc, dc.id desc
  limit least(greatest(coalesce(p_limit, 1000), 1), 5000);
$$;

revoke all on function public.load_fresh_discovery_observations_page(timestamptz, uuid, integer) from public;
revoke all on function public.load_fresh_discovery_observations_page(timestamptz, uuid, integer) from anon;
revoke all on function public.load_fresh_discovery_observations_page(timestamptz, uuid, integer) from authenticated;
grant execute on function public.load_fresh_discovery_observations_page(timestamptz, uuid, integer) to service_role;
