// THIN-INDEX-SEED-SEARCH-V1
// Searchable thin-index projection over registry-approved public sitemap/Common
// Crawl URL seeds. A seed is NEVER promoted to a structured listing here: this
// module only returns a source-visible external link with no invented price,
// photo, contact, availability, or internal detail page.

import { createHash } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { getListingUrlPatterns } from "@/lib/openserp-ingestion/domain-registry";
import type { SearchGatewayNormalizedResult, SearchGatewayRouteResponse } from "./search-gateway-types";

export type SeedThinIndexInput = {
  q?: string;
  city?: string;
  propertyType?: string;
  intent?: string;
  maxResults?: number;
};

type SeedRow = {
  id: string;
  canonical_url: string;
  source_domain: string;
  seed_provider: "public_sitemap" | "commoncrawl_cdx" | string;
  freshness_status: string;
  updated_at: string;
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

export function seedMatchesThinIndexSearch(row: SeedRow, input: SeedThinIndexInput): boolean {
  if (row.seed_provider !== "public_sitemap" && row.seed_provider !== "commoncrawl_cdx") return false;
  if (row.freshness_status !== "seed_only" && row.freshness_status !== "fresh_confirmed") return false;

  let pathname = "";
  try { pathname = new URL(row.canonical_url).pathname; } catch { return false; }
  const listingPatterns = getListingUrlPatterns(row.source_domain);
  if (listingPatterns.length === 0 || !listingPatterns.some((pattern) => pattern.test(pathname))) return false;

  const text = normalize(row.canonical_url);
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
  const providerLabel = row.seed_provider === "public_sitemap" ? "Index sitemap public" : "Index Common Crawl";
  const confirmed = row.freshness_status === "fresh_confirmed";
  return {
    id: stableId(row.canonical_url),
    title: `Résultat immobilier indexé — ${sourceName(row.source_domain)}`,
    snippet: confirmed
      ? "Lien de fiche externe recroisé dans l’index AkarFinder. Prix, disponibilité, photos et contact restent à vérifier sur la source originale."
      : "Lien de fiche détecté dans un index public de la source. Prix, disponibilité, photos et contact restent à vérifier sur le site original.",
    original_url: row.canonical_url,
    display_url: displayUrl(row.canonical_url),
    source_id: `seed:${row.source_domain}`,
    source_name: sourceName(row.source_domain),
    domain: row.source_domain,
    result_origin: row.seed_provider === "public_sitemap" ? "public_sitemap" : "commoncrawl_cdx",
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
  };
}

function probeToken(input: SeedThinIndexInput): string | null {
  const cityCandidates = tokens(input.city).filter((token) => token.length >= 4).sort((a, b) => b.length - a.length);
  if (cityCandidates[0]) return cityCandidates[0];
  const queryCandidates = tokens(input.q).filter((token) => token.length >= 4).sort((a, b) => b.length - a.length);
  return queryCandidates[0] ?? null;
}

function selectBalanced(rows: SeedRow[], maxResults: number): SeedRow[] {
  const byDomain = new Map<string, SeedRow[]>();
  for (const row of rows) {
    const bucket = byDomain.get(row.source_domain) ?? [];
    bucket.push(row);
    byDomain.set(row.source_domain, bucket);
  }
  const domains = [...byDomain.keys()].sort();
  const selected: SeedRow[] = [];
  let progressed = true;
  while (selected.length < maxResults && progressed) {
    progressed = false;
    for (const domain of domains) {
      const next = byDomain.get(domain)?.shift();
      if (!next) continue;
      selected.push(next);
      progressed = true;
      if (selected.length >= maxResults) break;
    }
  }
  return selected;
}

export async function searchSeedThinIndex(input: SeedThinIndexInput): Promise<SearchGatewayNormalizedResult[]> {
  const maxResults = Math.max(1, Math.min(Math.trunc(input.maxResults ?? 100), 100));
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("source_offer_seeds")
    .select("id,canonical_url,source_domain,seed_provider,freshness_status,updated_at")
    .in("freshness_status", ["seed_only", "fresh_confirmed"])
    .in("seed_provider", ["public_sitemap", "commoncrawl_cdx"])
    .order("freshness_status", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(1500);

  const probe = probeToken(input);
  if (probe) query = query.ilike("canonical_url", `%${probe.replace(/[%_,]/g, "")}%`);

  const response = await query;
  if (response.error) throw new Error(`seed thin index read failed: ${response.error.message}`);
  const rows = (response.data ?? []) as SeedRow[];
  const matching = rows.filter((row) => seedMatchesThinIndexSearch(row, input));
  const preselected = selectBalanced(matching, Math.min(maxResults * 2, 200));
  if (preselected.length === 0) return [];

  const urls = preselected.map((row) => row.canonical_url);
  const existing = await supabase.from("listing_sources").select("listing_url").in("listing_url", urls);
  if (existing.error) throw new Error(`seed thin index existing-source lookup failed: ${existing.error.message}`);
  const existingUrls = new Set((existing.data ?? []).map((row: { listing_url: string | null }) => row.listing_url).filter(Boolean));

  return preselected
    .filter((row) => !existingUrls.has(row.canonical_url))
    .slice(0, maxResults)
    .map(mapSeedToThinIndexResult);
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
    console.error("[seed-thin-index] degraded:", error);
    return response;
  }
}
