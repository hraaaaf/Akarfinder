-- ODM-10B — governed source registry and prioritization baseline.
-- The registry separates technical crawlability from contractual permission.

create table if not exists public.source_policy_registry (
  source_domain text primary key,
  source_name text not null,
  current_representation_count bigint not null default 0 check (current_representation_count >= 0),
  discovery_policy text not null check (discovery_policy in (
    'public_index_only',
    'public_sitemap_only',
    'public_search_only',
    'partner_feed_only',
    'paused'
  )),
  detail_fetch_policy text not null check (detail_fetch_policy in (
    'allowed_bounded',
    'permission_required',
    'legal_review_required',
    'prohibited',
    'paused'
  )),
  content_reuse_policy text not null check (content_reuse_policy in (
    'authorized',
    'link_and_facts_only',
    'permission_required',
    'prohibited',
    'unknown'
  )),
  display_policy text not null check (display_policy in (
    'partner_content',
    'canonical_link_only',
    'internal_signal_only',
    'blocked'
  )),
  robots_status text not null check (robots_status in (
    'allow_with_restrictions',
    'sitemap_declared',
    'ambiguous',
    'blocked',
    'unverified'
  )),
  terms_status text not null check (terms_status in (
    'reuse_authorized',
    'reuse_restricted',
    'permission_required',
    'not_found',
    'unverified'
  )),
  partnership_required boolean not null default false,
  legal_review_required boolean not null default true,
  no_bypass_required boolean not null default true check (no_bypass_required),
  evidence_urls text[] not null default '{}',
  evidence_summary text not null,
  primary_geography text,
  volume_score smallint not null check (volume_score between 0 and 30),
  diversification_score smallint not null check (diversification_score between 0 and 20),
  structure_score smallint not null check (structure_score between 0 and 20),
  policy_confidence_score smallint not null check (policy_confidence_score between 0 and 20),
  freshness_score smallint not null check (freshness_score between 0 and 10),
  execution_score smallint generated always as (
    volume_score + diversification_score + structure_score + policy_confidence_score + freshness_score
  ) stored,
  recommended_action text not null,
  reviewed_at timestamptz not null,
  next_review_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.source_policy_registry enable row level security;
revoke all on table public.source_policy_registry from anon, authenticated, public;
grant select, insert, update, delete on table public.source_policy_registry to service_role;

insert into public.source_policy_registry (
  source_domain, source_name, current_representation_count,
  discovery_policy, detail_fetch_policy, content_reuse_policy, display_policy,
  robots_status, terms_status, partnership_required, legal_review_required,
  evidence_urls, evidence_summary, primary_geography,
  volume_score, diversification_score, structure_score, policy_confidence_score, freshness_score,
  recommended_action, reviewed_at, next_review_at
) values
  ('mubawab.ma', 'Mubawab Maroc', 10693,
   'public_index_only', 'permission_required', 'prohibited', 'internal_signal_only',
   'allow_with_restrictions', 'reuse_restricted', true, true,
   array['https://www.mubawab.ma/robots.txt','https://www.mubawab.ma/fr/privacy'],
   'Public detail routes may be technically reachable, but the published terms restrict extraction, reuse and creation of a competing database without authorization.',
   'National', 30, 8, 18, 2, 5,
   'Freeze expansion and request a written partnership or data licence. Existing public-index observations remain internal signals only.',
   '2026-07-27T08:30:00Z', '2026-08-10T08:30:00Z'),

  ('avito.ma', 'Avito Maroc', 23925,
   'public_index_only', 'legal_review_required', 'unknown', 'internal_signal_only',
   'allow_with_restrictions', 'unverified', true, true,
   array['https://www.avito.ma/robots.txt'],
   'robots.txt declares a sitemap and blocks several technical routes, but no current written permission for extraction or republication is recorded.',
   'National', 30, 6, 10, 3, 2,
   'Keep Common Crawl/public-index discovery only. Do not activate direct crawling or republication before legal review and written authorization.',
   '2026-07-27T08:30:00Z', '2026-08-10T08:30:00Z'),

  ('daragadir.com', 'Dar Agadir', 6533,
   'public_sitemap_only', 'legal_review_required', 'unknown', 'canonical_link_only',
   'sitemap_declared', 'not_found', true, true,
   array['https://daragadir.com/robots.txt'],
   'A public sitemap is already observed in the seed pipeline. No reliable current reuse authorization or comprehensive terms page is recorded.',
   'Agadir', 24, 13, 16, 5, 4,
   'Contact the publisher for written authorization; meanwhile restrict activity to sitemap discovery, URL facts and canonical outbound links.',
   '2026-07-27T08:30:00Z', '2026-08-10T08:30:00Z'),

  ('promoimmomarrakech.com', 'Promo Immo Marrakech', 3005,
   'public_sitemap_only', 'legal_review_required', 'unknown', 'canonical_link_only',
   'sitemap_declared', 'not_found', true, true,
   array['https://www.promoimmomarrakech.com/','https://www.promoimmomarrakech.com/contact'],
   'The public site exposes structured listing fields and a contact channel, but no explicit licence for automated extraction or reuse has been verified.',
   'Marrakech', 18, 15, 20, 6, 4,
   'Priority partnership outreach: request permission for a bounded feed or sitemap-based ingestion with attribution and freshness rules.',
   '2026-07-27T08:30:00Z', '2026-08-10T08:30:00Z'),

  ('agenz.ma', 'Agenz', 4490,
   'public_index_only', 'legal_review_required', 'unknown', 'internal_signal_only',
   'unverified', 'unverified', true, true,
   array[]::text[],
   'Current corpus comes from public search and Common Crawl. No direct-fetch or republication authorization is recorded.',
   'National', 21, 10, 16, 2, 2,
   'Maintain discovery-only status and open a formal data partnership discussion before any direct acquisition.',
   '2026-07-27T08:30:00Z', '2026-08-10T08:30:00Z'),

  ('limmobiliersansfrontieres.com', 'L’Immobilier Sans Frontières', 1386,
   'public_sitemap_only', 'legal_review_required', 'unknown', 'canonical_link_only',
   'sitemap_declared', 'not_found', true, true,
   array['https://limmobiliersansfrontieres.com/robots.txt'],
   'Public sitemap discovery is present, while contractual reuse terms remain unverified.',
   'Rabat-Salé', 12, 18, 16, 5, 4,
   'High diversification candidate: seek written authorization for a structured feed and attribution before detail ingestion.',
   '2026-07-27T08:30:00Z', '2026-08-10T08:30:00Z'),

  ('atlasimmobilier.com', 'Atlas Immobilier', 788,
   'public_sitemap_only', 'permission_required', 'permission_required', 'canonical_link_only',
   'sitemap_declared', 'permission_required', true, true,
   array['https://atlasimmobilier.com/robots.txt','https://atlasimmobilier.com/mentions-legales/'],
   'The publisher exposes a public properties sitemap, but its legal notice prohibits reproduction or publication of content without prior written permission.',
   'Essaouira', 9, 20, 18, 8, 4,
   'Top permission-outreach candidate because governance, contact details and sitemap structure are clear. No content reuse before written approval.',
   '2026-07-27T08:30:00Z', '2026-08-10T08:30:00Z'),

  ('mouldar.com', 'Moul Dar', 1299,
   'public_index_only', 'legal_review_required', 'unknown', 'internal_signal_only',
   'unverified', 'unverified', true, true,
   array[]::text[],
   'Current representations originate from public indexes; policy and direct-fetch authorization are not verified.',
   'National', 12, 12, 12, 2, 2,
   'Perform legal and robots review before any direct acquisition. Keep current observations as internal market signals.',
   '2026-07-27T08:30:00Z', '2026-08-10T08:30:00Z'),

  ('masaken.ma', 'Masaken', 1210,
   'public_index_only', 'legal_review_required', 'unknown', 'internal_signal_only',
   'unverified', 'unverified', true, true,
   array[]::text[],
   'Current representations originate almost entirely from Common Crawl; direct reuse rights remain unknown.',
   'National', 12, 12, 12, 2, 2,
   'Complete policy review and seek a feed partnership before activation.',
   '2026-07-27T08:30:00Z', '2026-08-10T08:30:00Z'),

  ('aykana.ma', 'Aykana', 628,
   'public_sitemap_only', 'legal_review_required', 'unknown', 'canonical_link_only',
   'sitemap_declared', 'not_found', true, true,
   array['https://aykana.ma/robots.txt'],
   'Public sitemap discovery is present, but explicit automated reuse permission has not been verified.',
   'Casablanca-Rabat', 7, 17, 15, 5, 3,
   'Secondary diversification candidate after written permission or partner feed agreement.',
   '2026-07-27T08:30:00Z', '2026-08-10T08:30:00Z')
on conflict (source_domain) do update set
  source_name = excluded.source_name,
  current_representation_count = excluded.current_representation_count,
  discovery_policy = excluded.discovery_policy,
  detail_fetch_policy = excluded.detail_fetch_policy,
  content_reuse_policy = excluded.content_reuse_policy,
  display_policy = excluded.display_policy,
  robots_status = excluded.robots_status,
  terms_status = excluded.terms_status,
  partnership_required = excluded.partnership_required,
  legal_review_required = excluded.legal_review_required,
  no_bypass_required = true,
  evidence_urls = excluded.evidence_urls,
  evidence_summary = excluded.evidence_summary,
  primary_geography = excluded.primary_geography,
  volume_score = excluded.volume_score,
  diversification_score = excluded.diversification_score,
  structure_score = excluded.structure_score,
  policy_confidence_score = excluded.policy_confidence_score,
  freshness_score = excluded.freshness_score,
  recommended_action = excluded.recommended_action,
  reviewed_at = excluded.reviewed_at,
  next_review_at = excluded.next_review_at,
  updated_at = now();

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
          when detail_fetch_policy = 'allowed_bounded' and content_reuse_policy in ('authorized','link_and_facts_only') then 0
          when detail_fetch_policy in ('permission_required','legal_review_required') then 1
          else 2
        end,
        execution_score desc,
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

comment on table public.source_policy_registry is
  'Canonical no-bypass source registry. Technical crawlability never implies contractual authorization or display rights.';
