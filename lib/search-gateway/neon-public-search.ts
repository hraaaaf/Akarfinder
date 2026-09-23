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
  if (["sale", "sell", "vente", "vendre", "buy", "acheter", "achat"].includes(normalized)) return "sale";
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