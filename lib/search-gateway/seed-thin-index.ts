// THIN-INDEX-SEARCH-V3
// Searchable thin-index projection over registry-approved public sitemap/Common
// Crawl/Serper-search URL seeds. PostgreSQL applies canonical filters, explicit
// display eligibility and bounded quality-aware ranking. Node re-applies URL
// publication safety, source balancing and dedupe.

import { createHash } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { getListingUrlPatterns } from "@/lib/openserp-ingestion/domain-registry";
import {
  compareThinIndexEligibility,
  isThinIndexRowDisplayEligible,
  type ThinIndexServingPolicyRow,
} from "./odm-07-serving-policy";
import type { SearchGatewayNormalizedResult, SearchGatewayRouteResponse } from "./search-gateway-types";

export type SeedThinIndexCursor = {
  rank: number;
  updatedAt: string;
  seedId: string;
};

export type SeedThinIndexInput = {
  q?: string;
  city?: string;
  propertyType?: string;
  intent?: string;
  maxResults?: number;
  cursor?: SeedThinIndexCursor | null;
};

type SerperSeedMetadata = {
  title?: string | null;
  snippet?: string | null;
  query?: string | null;
  city?: string | null;
  property_type?: string | null;
  intent?: string | null;
};

type SeedRow = ThinIndexServingPolicyRow & {
  id: string;
  source_domain: string;
  metadata?: { serper_search?: SerperSeedMetadata } | null;
  normalized_city?: string | null;
  normalized_property_type?: string | null;
  normalized_intent?: string | null;
  normalized_price_mad?: number | null;
  normalized_surface_m2?: number | null;
  price_per_m2_mad?: number | null;
  quality_score?: number | null;
  display_eligibility_reason?: string | null;
};

type ThinIndexRpcRow = {
  seed_id: string;
  canonical_url: string;
  source_domain: string;
  seed_provider: string;
  freshness_status: string;
  title: string | null;
  snippet: string | null;
  query_text: string | null;
  city: string | null;
  property_type: string | null;
  intent: string | null;
  normalized_city: string | null;
  normalized_property_type: string | null;
  normalized_intent: string | null;
  normalized_price_mad: number | null;
  normalized_surface_m2: number | null;
  price_per_m2_mad: number | null;
  quality_tier: string | null;
  quality_score: number | null;
  display_eligibility: string | null;
  display_eligibility_reason: string | null;
  ranking_quality_boost: number | null;
  updated_at: string;
  relevance_rank: number;
};

export type SeedThinIndexPage = {
  results: SearchGatewayNormalizedResult[];
  nextCursor: SeedThinIndexCursor | null;
};

const PROPERTY_TOKENS: Record<string, string[]> = {
  apartment: ["appartement", "apartment", "flat"],
  appartement: ["appartement", "apartment", "flat"],
  villa: ["villa"],
  studio: ["studio"],
  house: ["maison", "house"],
  maison: ["maison", "house"],
  land: ["terrain", "land", "plot"],
  terrain: ["terrain", "land", "plot"],
  office: ["bureau", "office"],
  bureau: ["bureau", "office"],
  commercial: ["commercial", "commerce", "local"],
};

const INTENT_TOKENS: Record<string, string[]> = {
  buy: ["vendre", "vente", "acheter", "sale", "sell"],
  sale: ["vendre", "vente", "acheter", "sale", "sell"],
  rent: ["louer", "location", "rent", "rental", "lease"],
  new: ["neuf", "new", "programme", "project", "residence"],
};

function normalize(value: string): string {
  let decoded = value;
  try { decoded = decodeURIComponent(value); } catch { /* keep raw */ }
  return decoded
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value?: string): string[] {
  if (!value?.trim()) return [];
  return normalize(value).split(" ").filter((token) => token.length >= 3);
}

function includesAny(haystack: string, values: string[]): boolean {
  return values.length === 0 || values.some((value) => haystack.includes(normalize(value)));
}

function sourceName(domain: string): string {
  return domain.replace(/^www\./, "");
}

function displayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname}`.slice(0, 120);
  } catch {
    return url.slice(0, 120);
  }
}

function stableId(url: string): string {
  return `seed_${createHash("sha256").update(url).digest("hex").slice(0, 20)}`;
}

function serperMetadata(row: SeedRow): SerperSeedMetadata {
  const value = row.metadata?.serper_search;
  return value && typeof value === "object" ? value : {};
}

function searchableText(row: SeedRow): string {
  const meta = serperMetadata(row);
  return normalize([
    row.canonical_url,
    meta.title ?? "",
    meta.snippet ?? "",
    meta.query ?? "",
    row.normalized_city ?? meta.city ?? "",
    row.normalized_property_type ?? meta.property_type ?? "",
    row.normalized_intent ?? meta.intent ?? "",
  ].join(" "));
}

export function seedMatchesThinIndexSearch(row: SeedRow, input: SeedThinIndexInput): boolean {
  if (!isThinIndexRowDisplayEligible(row)) return false;

  let pathname = "";
  try { pathname = new URL(row.canonical_url).pathname; } catch { return false; }
  const listingPatterns = getListingUrlPatterns(row.source_domain);
  if (listingPatterns.length === 0 || !listingPatterns.some((pattern) => pattern.test(pathname))) return false;

  const text = searchableText(row);
  const cityTokens = tokens(input.city);
  if (cityTokens.length > 0 && !cityTokens.every((token) => text.includes(token))) return false;

  const qTokens = tokens(input.q).filter((token) => !cityTokens.includes(token));
  if (qTokens.length > 0) {
    const matched = qTokens.filter((token) => text.includes(token)).length;
    const required = qTokens.length <= 3 ? qTokens.length : Math.max(1, Math.ceil(qTokens.length * 0.5));
    if (matched < required) return false;
  }

  const propertyTokens = PROPERTY_TOKENS[normalize(input.propertyType ?? "")] ?? [];
  if (propertyTokens.length > 0 && !includesAny(text, propertyTokens)) return false;

  const intentTokens = INTENT_TOKENS[normalize(input.intent ?? "")] ?? [];
  if (intentTokens.length > 0 && !includesAny(text, intentTokens)) return false;

  return true;
}

export function mapSeedToThinIndexResult(row: SeedRow): SearchGatewayNormalizedResult {
  const meta = serperMetadata(row);
  const providerLabel = row.seed_provider === "public_sitemap"
    ? "Index sitemap public"
    : row.seed_provider === "serper_search"
      ? "Résultat web indexé"
      : "Index Common Crawl";
  const confirmed = row.freshness_status === "fresh_confirmed";
  const title = row.seed_provider === "serper_search" && meta.title?.trim()
    ? meta.title.trim().slice(0, 220)
    : `Résultat immobilier indexé — ${sourceName(row.source_domain)}`;
  const snippet = row.seed_provider === "serper_search" && meta.snippet?.trim()
    ? meta.snippet.trim().slice(0, 420)
    : confirmed
      ? "Lien de fiche externe recroisé dans l’index AkarFinder. Prix, disponibilité, photos et contact restent à vérifier sur la source originale."
      : "Lien de fiche détecté dans un index public de la source. Prix, disponibilité, photos et contact restent à vérifier sur le site original.";
  return {
    id: stableId(row.canonical_url),
    title,
    snippet,
    original_url: row.canonical_url,
    display_url: displayUrl(row.canonical_url),
    source_id: `seed:${row.source_domain}`,
    source_name: sourceName(row.source_domain),
    domain: row.source_domain,
    result_origin: row.seed_provider === "public_sitemap"
      ? "public_sitemap"
      : row.seed_provider === "serper_search"
        ? "search_api"
        : "commoncrawl_cdx",
    search_result_display_mode: "thin_indexed_seed",
    source_badge: "external_indexed",
    production_allowed: true,
    can_show_result: true,
    can_show_thumbnail: false,
    can_show_contact: false,
    can_show_gallery: false,
    can_cache_thumbnail: false,
    can_download_thumbnail: false,
    primary_cta: "view_original",
    primary_cta_label: "Voir la source originale",
    result_attribution_label: providerLabel,
    thumbnail_risk_accepted: false,
    normalized_city: row.normalized_city ?? undefined,
    normalized_property_type: row.normalized_property_type ?? undefined,
    normalized_intent: row.normalized_intent ?? undefined,
    normalized_price_mad: row.normalized_price_mad ?? undefined,
    normalized_surface_m2: row.normalized_surface_m2 ?? undefined,
    price_per_m2_mad: row.price_per_m2_mad ?? undefined,
    quality_tier: row.quality_tier ?? undefined,
    quality_score: row.quality_score ?? undefined,
    display_eligibility: row.display_eligibility ?? undefined,
    display_eligibility_reason: row.display_eligibility_reason ?? undefined,
  };
}

function selectBalanced(rows: SeedRow[], maxResults: number): SeedRow[] {
  const ordered = [...rows].sort(compareThinIndexEligibility);
  const byDomain = new Map<string, SeedRow[]>();
  for (const row of ordered) {
    const bucket = byDomain.get(row.source_domain) ?? [];
    bucket.push(row);
    byDomain.set(row.source_domain, bucket);
  }
  const domains = [...byDomain.keys()].sort();
  const selected: SeedRow[] = [];
  for (const eligibility of ["eligible_primary", "eligible_secondary"]) {
    let progressed = true;
    while (selected.length < maxResults && progressed) {
      progressed = false;
      for (const domain of domains) {
        const bucket = byDomain.get(domain);
        const index = bucket?.findIndex((row) => row.display_eligibility === eligibility) ?? -1;
        if (!bucket || index < 0) continue;
        selected.push(bucket.splice(index, 1)[0]);
        progressed = true;
        if (selected.length >= maxResults) break;
      }
    }
  }
  return selected;
}

function rpcRowToSeedRow(row: ThinIndexRpcRow): SeedRow {
  return {
    id: row.seed_id,
    seed_id: row.seed_id,
    canonical_url: row.canonical_url,
    source_domain: row.source_domain,
    seed_provider: row.seed_provider,
    freshness_status: row.freshness_status,
    updated_at: row.updated_at,
    relevance_rank: row.relevance_rank,
    normalized_city: row.normalized_city,
    normalized_property_type: row.normalized_property_type,
    normalized_intent: row.normalized_intent,
    normalized_price_mad: row.normalized_price_mad,
    normalized_surface_m2: row.normalized_surface_m2,
    price_per_m2_mad: row.price_per_m2_mad,
    quality_tier: row.quality_tier,
    quality_score: row.quality_score,
    display_eligibility: row.display_eligibility,
    display_eligibility_reason: row.display_eligibility_reason,
    ranking_quality_boost: row.ranking_quality_boost,
    metadata: row.seed_provider === "serper_search"
      ? {
          serper_search: {
            title: row.title,
            snippet: row.snippet,
            query: row.query_text,
            city: row.city,
            property_type: row.property_type,
            intent: row.intent,
          },
        }
      : null,
  };
}

function candidateLimit(maxResults: number): number {
  return Math.min(500, Math.max(120, maxResults * 4));
}

export async function searchSeedThinIndexPage(input: SeedThinIndexInput): Promise<SeedThinIndexPage> {
  const maxResults = Math.max(1, Math.min(Math.trunc(input.maxResults ?? 100), 100));
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("search_thin_index_v3", {
    p_query: input.q?.trim() || null,
    p_city: input.city?.trim() || null,
    p_property_type: input.propertyType?.trim() || null,
    p_intent: input.intent?.trim() || null,
    p_limit: candidateLimit(maxResults),
    p_after_rank: input.cursor?.rank ?? null,
    p_after_updated_at: input.cursor?.updatedAt ?? null,
    p_after_seed_id: input.cursor?.seedId ?? null,
  });
  if (error) throw new Error(`thin-index v3 RPC failed: ${error.message}`);

  const rpcRows = (data ?? []) as ThinIndexRpcRow[];
  const safeRows = rpcRows
    .map(rpcRowToSeedRow)
    .filter((row) => seedMatchesThinIndexSearch(row, input));
  const preselected = selectBalanced(safeRows, Math.min(maxResults * 2, 200));

  if (preselected.length === 0) {
    const tail = rpcRows.at(-1);
    return {
      results: [],
      nextCursor: tail
        ? { rank: tail.relevance_rank, updatedAt: tail.updated_at, seedId: tail.seed_id }
        : null,
    };
  }

  const urls = preselected.map((row) => row.canonical_url);
  const existing = await supabase.from("listing_sources").select("listing_url").in("listing_url", urls);
  if (existing.error) throw new Error(`seed thin index existing-source lookup failed: ${existing.error.message}`);
  const existingUrls = new Set(
    (existing.data ?? [])
      .map((row: { listing_url: string | null }) => row.listing_url)
      .filter((value): value is string => Boolean(value)),
  );

  const tail = rpcRows.at(-1);
  return {
    results: preselected
      .filter((row) => !existingUrls.has(row.canonical_url))
      .slice(0, maxResults)
      .map(mapSeedToThinIndexResult),
    nextCursor: tail
      ? { rank: tail.relevance_rank, updatedAt: tail.updated_at, seedId: tail.seed_id }
      : null,
  };
}

export async function searchSeedThinIndex(input: SeedThinIndexInput): Promise<SearchGatewayNormalizedResult[]> {
  return (await searchSeedThinIndexPage(input)).results;
}

export async function appendSeedThinIndexResults(
  response: SearchGatewayRouteResponse,
  input: SeedThinIndexInput,
): Promise<SearchGatewayRouteResponse> {
  try {
    const seeds = await searchSeedThinIndex(input);
    if (seeds.length === 0) return response;
    const merged = new Map<string, SearchGatewayNormalizedResult>();
    for (const result of response.results) merged.set(result.original_url, result);
    for (const result of seeds) if (!merged.has(result.original_url)) merged.set(result.original_url, result);
    const results = [...merged.values()].slice(0, 150);
    return { ...response, ok: response.ok || results.length > 0, results, results_count: results.length };
  } catch (error) {
    console.error("[thin-index-search-v3] degraded:", error);
    return response;
  }
}
