import { neonExecutor, type NeonQueryExecutor } from "@/lib/db/neon-client";

export type NeonPublicSearchInput = {
  q?: string;
  city?: string;
  propertyType?: string;
  intent?: string;
  minPrice?: number;
  maxPrice?: number;
  minSurface?: number;
  maxSurface?: number;
  limit: number;
  afterLane?: number | null;
  afterRank?: number | null;
  afterUpdatedAt?: string | null;
  afterRepresentationId?: string | null;
};

export type NeonPublicSearchRow = {
  representation_id: string;
  canonical_url: string;
  source_domain: string;
  seed_provider: string;
  freshness_status: string;
  title: string | null;
  snippet: string | null;
  normalized_city: string | null;
  normalized_property_type: string | null;
  normalized_intent: string | null;
  normalized_price_mad: number | null;
  normalized_surface_m2: number | null;
  price_per_m2_mad: number | null;
  quality_tier: string | null;
  quality_score: number | null;
  display_eligibility: string;
  display_eligibility_reason: string | null;
  ranking_quality_boost: number | null;
  updated_at: string;
  lane_weight: number;
  ranking_score: number;
  total_count: number;
};

function fold(value?: string): string | null {
  if (!value?.trim()) return null;
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeCity(value?: string): string | null {
  const normalized = fold(value);
  const aliases: Record<string, string> = {
    casablanca: "Casablanca",
    casa: "Casablanca",
    rabat: "Rabat",
    marrakech: "Marrakech",
    tanger: "Tanger",
    tangier: "Tanger",
    agadir: "Agadir",
    fes: "Fès",
    meknes: "Meknès",
    kenitra: "Kénitra",
    temara: "Témara",
    sale: "Salé",
    tetouan: "Tétouan",
    oujda: "Oujda",
    "el jadida": "El Jadida",
    jadida: "El Jadida",
    mohammedia: "Mohammedia",
    nador: "Nador",
    essaouira: "Essaouira",
    safi: "Safi",
    settat: "Settat",
    berrechid: "Berrechid",
    khouribga: "Khouribga",
    dakhla: "Dakhla",
    laayoune: "Laâyoune",
    "beni mellal": "Béni Mellal",
  };
  return normalized ? aliases[normalized] ?? null : null;
}

function normalizePropertyType(value?: string): string | null {
  const normalized = fold(value);
  if (!normalized) return null;
  if (["appartement", "apartment", "flat"].includes(normalized)) return "apartment";
  if (normalized === "villa") return "villa";
  if (["maison", "house"].includes(normalized)) return "house";
  if (normalized === "studio") return "studio";
  if (["terrain", "land", "plot"].includes(normalized)) return "land";
  if (["bureau", "office"].includes(normalized)) return "office";
  if (["local commercial", "commercial", "commerce", "shop"].includes(normalized)) return "commercial";
  if (normalized === "riad") return "riad";
  if (["ferme", "farm"].includes(normalized)) return "farm";
  return null;
}

function normalizeIntent(value?: string): string | null {
  const normalized = fold(value);
  if (!normalized) return null;
  if (["sale", "sell", "vente", "vendre", "buy", "acheter"].includes(normalized)) return "sale";
  if (["rent", "rental", "lease", "location", "louer"].includes(normalized)) return "rent";
  if (["new", "neuf", "programme", "project"].includes(normalized)) return "new";
  return null;
}

function bounded(value?: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const SQL = `
with params as (
  select
    nullif(btrim($1::text), '') as q,
    $2::text as canonical_city,
    $3::text as canonical_property_type,
    $4::text as canonical_intent,
    least(greatest($9::integer, 1), 101) as result_limit
),
queries as (
  select p.*, case when p.q is null then null else websearch_to_tsquery('simple', p.q) end as q_ts
  from params p
),
policy_scoped as (
  select
    d.*,
    (
      pol.authorization_status = 'authorized_partner'
      and pol.content_reuse_policy = 'authorized'
      and pol.display_policy = 'partner_content'
      and pol.acquisition_mode in ('authorized_detail_feed', 'partner_feed')
      and pol.machine_gate in ('authorized_detail_feed', 'partner_feed')
      and pol.review_status in ('current', 'due_soon')
      and pol.policy_effective_at is not null
      and pol.policy_effective_at <= now()
      and pol.policy_expires_at is not null
      and pol.policy_expires_at > now()
      and pol.no_bypass_required
    ) as rich_content_allowed,
    (
      pol.authorization_status <> 'prohibited'
      and pol.display_policy = 'canonical_link_only'
      and pol.machine_gate = 'canonical_link_only'
      and pol.ingestion_gate = 'canonical_link_only'
      and pol.display_gate = 'external_tail_link_only'
      and pol.review_status in ('current', 'due_soon')
      and pol.policy_effective_at is not null
      and pol.policy_effective_at <= now()
      and pol.policy_expires_at is not null
      and pol.policy_expires_at > now()
      and pol.no_bypass_required
    ) as external_minimal_allowed,
    to_tsvector(
      'simple',
      concat_ws(
        ' ',
        coalesce(d.canonical_url, ''),
        coalesce(d.source_domain, ''),
        coalesce(d.normalized_city, ''),
        coalesce(d.normalized_property_type, ''),
        coalesce(d.normalized_intent, '')
      )
    ) as minimal_search_vector
  from public.thin_index_search_documents d
  join public.source_policy_registry pol
    on pol.source_domain = d.source_domain
  where d.document_kind = 'LISTING'
    and d.display_eligibility in ('eligible_primary', 'eligible_secondary')
    and d.seed_provider in ('public_sitemap', 'commoncrawl_cdx', 'serper_search')
    and d.freshness_status = 'fresh_confirmed'
    and nullif(btrim(d.canonical_url), '') is not null
),
base as (
  select
    ps.*,
    coalesce((
      select min(e.business_lane)
      from public.listing_sources ls
      join public.professional_listing_ownership po
        on po.property_listing_id = ls.property_listing_id
       and po.status = 'verified'
      join public.search_business_entitlements e
        on e.organization_id = po.organization_id
       and e.active
       and (e.starts_at is null or e.starts_at <= now())
       and (e.ends_at is null or e.ends_at > now())
      where ls.is_active
        and (ls.listing_url = ps.canonical_url or ls.source_url = ps.canonical_url)
    ), 3)::smallint as business_lane,
    0.12::real as freshness_boost,
    (
      (case when ps.normalized_city is not null then 0.015 else 0 end)
      + (case when ps.normalized_property_type is not null then 0.02 else 0 end)
      + (case when ps.normalized_intent is not null then 0.015 else 0 end)
      + (case when ps.rich_content_allowed and ps.normalized_price_mad is not null then 0.06 else 0 end)
      + (case when ps.rich_content_allowed and ps.normalized_surface_m2 is not null then 0.04 else 0 end)
    )::real as completeness_boost
  from policy_scoped ps
  cross join queries q
  where (ps.rich_content_allowed or ps.external_minimal_allowed)
    and (
      q.q_ts is null
      or (ps.rich_content_allowed and ps.search_vector @@ q.q_ts)
      or (ps.external_minimal_allowed and ps.minimal_search_vector @@ q.q_ts)
    )
    and (q.canonical_city is null or ps.normalized_city = q.canonical_city)
    and (q.canonical_property_type is null or ps.normalized_property_type = q.canonical_property_type)
    and (q.canonical_intent is null or ps.normalized_intent = q.canonical_intent)
    and (
      (
        ps.rich_content_allowed
        and ($5::numeric is null or ps.normalized_price_mad >= $5::numeric)
        and ($6::numeric is null or ps.normalized_price_mad <= $6::numeric)
        and ($7::numeric is null or ps.normalized_surface_m2 >= $7::numeric)
        and ($8::numeric is null or ps.normalized_surface_m2 <= $8::numeric)
      )
      or (
        ps.external_minimal_allowed
        and $5::numeric is null
        and $6::numeric is null
        and $7::numeric is null
        and $8::numeric is null
      )
    )
),
exact_dedup as (
  select *
  from (
    select
      b.*,
      row_number() over (
        partition by lower(b.canonical_url)
        order by b.business_lane asc,
                 coalesce(b.quality_score, 0) desc,
                 b.updated_at desc,
                 b.seed_id desc
      ) as url_rank
    from base b
  ) x
  where x.url_rank = 1
),
scored as (
  select
    d.*,
    (
      (case
        when q.q_ts is null then 0::real
        when d.rich_content_allowed then ts_rank_cd(d.search_vector, q.q_ts, 32)
        else ts_rank_cd(d.minimal_search_vector, q.q_ts, 32)
      end)
      + (case when d.rich_content_allowed then coalesce(d.ranking_quality_boost, 0::real) else 0::real end)
      + d.freshness_boost
      + d.completeness_boost
      + case when d.display_eligibility = 'eligible_primary' then 0.04::real else 0::real end
    )::real as base_score,
    row_number() over (
      partition by d.business_lane, d.source_domain
      order by
        (
          (case
            when q.q_ts is null then 0::real
            when d.rich_content_allowed then ts_rank_cd(d.search_vector, q.q_ts, 32)
            else ts_rank_cd(d.minimal_search_vector, q.q_ts, 32)
          end)
          + (case when d.rich_content_allowed then coalesce(d.ranking_quality_boost, 0::real) else 0::real end)
          + d.freshness_boost
          + d.completeness_boost
        ) desc,
        d.updated_at desc,
        d.seed_id desc
    ) as source_position
  from exact_dedup d
  cross join queries q
),
ranked as (
  select
    s.*,
    greatest(
      0::real,
      s.base_score - least(0.12::real, greatest(0, s.source_position - 1)::real * 0.006::real)
    )::real as final_score
  from scored s
),
counted as (
  select r.*, count(*) over () as total_count
  from ranked r
),
page as (
  select c.*
  from counted c
  where $10::smallint is null
     or c.business_lane > $10::smallint
     or (c.business_lane = $10::smallint and $11::real is not null and c.final_score < $11::real)
     or (
       c.business_lane = $10::smallint
       and $11::real is not null
       and c.final_score = $11::real
       and $12::timestamptz is not null
       and c.updated_at < $12::timestamptz
     )
     or (
       c.business_lane = $10::smallint
       and $11::real is not null
       and c.final_score = $11::real
       and $12::timestamptz is not null
       and c.updated_at = $12::timestamptz
       and $13::uuid is not null
       and c.seed_id < $13::uuid
     )
  order by c.business_lane asc, c.final_score desc, c.updated_at desc, c.seed_id desc
  limit (select result_limit from queries)
)
select
  row_page.seed_id as representation_id,
  row_page.canonical_url,
  row_page.source_domain,
  row_page.seed_provider,
  row_page.freshness_status,
  case
    when row_page.rich_content_allowed then row_page.title
    else concat_ws(
      ' · ',
      'Annonce immobilière',
      case row_page.normalized_intent
        when 'rent' then 'Location'
        when 'buy' then 'Vente'
        when 'new' then 'Neuf'
        else null
      end,
      nullif(initcap(replace(coalesce(row_page.normalized_property_type, ''), '_', ' ')), ''),
      nullif(initcap(coalesce(row_page.normalized_city, '')), '')
    )
  end as title,
  case when row_page.rich_content_allowed then row_page.snippet else null::text end as snippet,
  row_page.normalized_city,
  row_page.normalized_property_type,
  row_page.normalized_intent,
  case when row_page.rich_content_allowed then row_page.normalized_price_mad else null::numeric end as normalized_price_mad,
  case when row_page.rich_content_allowed then row_page.normalized_surface_m2 else null::numeric end as normalized_surface_m2,
  case when row_page.rich_content_allowed then row_page.price_per_m2_mad else null::numeric end as price_per_m2_mad,
  case when row_page.rich_content_allowed then row_page.quality_tier else null::text end as quality_tier,
  case when row_page.rich_content_allowed then row_page.quality_score else null::smallint end as quality_score,
  row_page.display_eligibility,
  case when row_page.rich_content_allowed then row_page.display_eligibility_reason else 'external_minimal_index'::text end as display_eligibility_reason,
  case when row_page.rich_content_allowed then row_page.ranking_quality_boost else 0::real end as ranking_quality_boost,
  row_page.updated_at,
  row_page.business_lane as lane_weight,
  row_page.final_score as ranking_score,
  row_page.total_count
from page row_page
`;

export async function queryNeonPublicSearch(
  input: NeonPublicSearchInput,
  executor: NeonQueryExecutor = neonExecutor,
): Promise<NeonPublicSearchRow[]> {
  const rows = await executor.query<NeonPublicSearchRow>(SQL, [
    input.q?.trim() || null,
    normalizeCity(input.city),
    normalizePropertyType(input.propertyType),
    normalizeIntent(input.intent),
    bounded(input.minPrice),
    bounded(input.maxPrice),
    bounded(input.minSurface),
    bounded(input.maxSurface),
    Math.max(1, Math.min(Math.trunc(input.limit), 101)),
    input.afterLane ?? null,
    input.afterRank ?? null,
    input.afterUpdatedAt ?? null,
    input.afterRepresentationId ?? null,
  ]);

  return rows.map((row) => ({
    ...row,
    normalized_price_mad: row.normalized_price_mad == null ? null : asNumber(row.normalized_price_mad),
    normalized_surface_m2: row.normalized_surface_m2 == null ? null : asNumber(row.normalized_surface_m2),
    price_per_m2_mad: row.price_per_m2_mad == null ? null : asNumber(row.price_per_m2_mad),
    quality_score: row.quality_score == null ? null : asNumber(row.quality_score),
    ranking_quality_boost: row.ranking_quality_boost == null ? null : asNumber(row.ranking_quality_boost),
    lane_weight: asNumber(row.lane_weight),
    ranking_score: asNumber(row.ranking_score),
    total_count: asNumber(row.total_count),
  }));
}
