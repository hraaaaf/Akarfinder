import { getSupabaseServerClient } from "../../lib/db/supabase-client";
import { extractStrictDetailPrice, isRecognizedDetailUrl } from "./price-detail-enrichment-v2";
import { fetchHtml, isAllowedByRobots } from "./utils/fetch-html";
import { getThirdPartyIngestionGuard } from "./utils/motor-purity-guard";
import { safeDelay } from "./utils/safe-delay";

type Seo5cCandidate = {
  seed_id: string;
  canonical_url: string;
  source_domain: string;
  normalized_city: string | null;
  normalized_intent: string | null;
  normalized_price_mad: number | null;
  normalized_surface_m2: number | null;
  updated_at: string | null;
};

export const SEO5C_AGENZ_SOURCE = "agenz.ma";
export const SEO5C_CITY = "Casablanca";
export const SEO5C_INTENT = "sale";
export const SEO5C_SOURCE_SCAN_CAP = 1000;
export const SEO5C_MAX_DETAIL_LIMIT = 48;

export function seo5cAgenzDedupKey(row: Pick<Seo5cCandidate, "canonical_url" | "seed_id">): string {
  try {
    const id = new URL(row.canonical_url).pathname.match(/\/([0-9]+)\/?$/)?.[1];
    if (id) return `${SEO5C_AGENZ_SOURCE}:${id}`;
  } catch {
    // Fall through to canonical URL / seed id.
  }
  return row.canonical_url || row.seed_id;
}

export function isSeo5cCasablancaAgenzCandidate(row: Seo5cCandidate): boolean {
  if (row.source_domain !== SEO5C_AGENZ_SOURCE) return false;
  if (row.normalized_city !== SEO5C_CITY) return false;
  if (row.normalized_intent !== SEO5C_INTENT) return false;
  if (row.normalized_price_mad != null) return false;
  if (row.normalized_surface_m2 == null || !Number.isFinite(row.normalized_surface_m2) || row.normalized_surface_m2 <= 0) return false;
  if (!isRecognizedDetailUrl(row.source_domain, row.canonical_url)) return false;
  try {
    const url = new URL(row.canonical_url);
    const pathname = url.pathname.toLowerCase();
    if (url.hostname !== SEO5C_AGENZ_SOURCE) return false;
    if (!pathname.includes("/immo-casablanca/")) return false;
    if (!pathname.includes("/vente-")) return false;
  } catch {
    return false;
  }
  return true;
}

export function selectSeo5cCasablancaAgenzCandidates(rows: Seo5cCandidate[], limit: number): Seo5cCandidate[] {
  const boundedLimit = Math.max(1, Math.min(limit, SEO5C_MAX_DETAIL_LIMIT));
  const seen = new Set<string>();
  const selected: Seo5cCandidate[] = [];

  for (const row of rows) {
    if (!isSeo5cCasablancaAgenzCandidate(row)) continue;
    const key = seo5cAgenzDedupKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(row);
    if (selected.length >= boundedLimit) break;
  }

  return selected;
}

async function main() {
  const guard = getThirdPartyIngestionGuard({ scriptName: "seo5c-casablanca-agenz-price-audit" });
  if (guard.blocked) throw new Error(guard.message);

  const rawLimit = Number(process.env.SEO5C_AGENZ_PRICE_LIMIT ?? SEO5C_MAX_DETAIL_LIMIT);
  if (!Number.isFinite(rawLimit)) throw new Error("SEO5C_AGENZ_PRICE_LIMIT must be finite");
  const limit = Math.max(1, Math.min(Math.trunc(rawLimit), SEO5C_MAX_DETAIL_LIMIT));

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("thin_index_search_documents")
    .select("seed_id,canonical_url,source_domain,normalized_city,normalized_intent,normalized_price_mad,normalized_surface_m2,updated_at")
    .eq("normalized_city", SEO5C_CITY)
    .eq("normalized_intent", SEO5C_INTENT)
    .eq("vertical_classification", "real_estate_likely")
    .eq("document_kind", "LISTING")
    .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
    .eq("source_domain", SEO5C_AGENZ_SOURCE)
    .is("normalized_price_mad", null)
    .not("normalized_surface_m2", "is", null)
    .order("updated_at", { ascending: false })
    .limit(SEO5C_SOURCE_SCAN_CAP);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Seo5cCandidate[];
  if (rows.length >= SEO5C_SOURCE_SCAN_CAP) {
    throw new Error(`SEO5C Agenz source scan reached cap ${SEO5C_SOURCE_SCAN_CAP}; refusing incomplete audit`);
  }

  const candidates = selectSeo5cCasablancaAgenzCandidates(rows, limit);
  let fetched = 0;
  let robotsSkipped = 0;
  let failed = 0;
  let recoverablePrice = 0;
  const evidence: Array<{
    seed_id: string;
    canonical_url: string;
    persisted_surface_m2: number;
    recoverable_price_mad: number;
    derived_price_per_m2_mad: number;
  }> = [];

  for (const row of candidates) {
    try {
      if (!(await isAllowedByRobots(row.canonical_url))) {
        robotsSkipped += 1;
        continue;
      }
      const response = await fetchHtml(row.canonical_url, { timeoutMs: 15_000 });
      fetched += 1;
      const price = extractStrictDetailPrice(response.html, "sale");
      const surface = row.normalized_surface_m2;
      if (price != null && surface != null && Number.isFinite(surface) && surface > 0) {
        recoverablePrice += 1;
        evidence.push({
          seed_id: row.seed_id,
          canonical_url: row.canonical_url,
          persisted_surface_m2: surface,
          recoverable_price_mad: price,
          derived_price_per_m2_mad: Math.round((price / surface) * 100) / 100,
        });
      }
    } catch (errorValue) {
      failed += 1;
      console.warn(
        `[seo5c-casablanca-agenz-price-audit] ${row.seed_id}: ${errorValue instanceof Error ? errorValue.message : String(errorValue)}`,
      );
    }
    await safeDelay(500, 1200);
  }

  console.log(JSON.stringify({
    mode: "read_only_audit",
    productionWriteCount: 0,
    source: SEO5C_AGENZ_SOURCE,
    city: SEO5C_CITY,
    intent: SEO5C_INTENT,
    sourceScanCap: SEO5C_SOURCE_SCAN_CAP,
    limit,
    queriedRows: rows.length,
    detailCandidates: candidates.length,
    fetched,
    robotsSkipped,
    failed,
    recoverablePrice,
    evidence,
  }, null, 2));
}

const entrypoint = process.argv[1]?.replace(/\\/g, "/") ?? "";
if (entrypoint.endsWith("/seo5c-casablanca-agenz-price-audit.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
