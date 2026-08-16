import { getSupabaseServerClient } from "../../lib/db/supabase-client";
import { RABAT_PRODUCT_LOCALITY_CANDIDATES } from "../../lib/geo/rabat-locality-registry";
import { resolveRabatLocalityShadow } from "../../lib/geo/rabat-locality-shadow-resolver";
import { extractStrictDetailPrice, isRecognizedDetailUrl } from "./price-detail-enrichment-v2";
import { normalizeSurface } from "./normalizers/normalize-surface";
import { extractDetail } from "./utils/extract";
import { fetchHtml, isAllowedByRobots } from "./utils/fetch-html";
import { getThirdPartyIngestionGuard } from "./utils/motor-purity-guard";
import { safeDelay } from "./utils/safe-delay";

type AuditCandidate = {
  seed_id: string;
  canonical_url: string;
  source_domain: string;
  normalized_intent: string | null;
  normalized_price_mad: number | null;
  normalized_surface_m2: number | null;
  title: string | null;
  snippet: string | null;
  search_text: string | null;
  updated_at: string | null;
};

export const C8_RABAT_DETAIL_AUDIT_SOURCE = "agenz.ma";
export const C8_RABAT_DETAIL_AUDIT_DEFAULT_LOCALITY = "diour-jamaa";
export const C8_RABAT_DETAIL_SOURCE_SCAN_CAP = 1000;

export function inferC8DetailIntent(row: Pick<AuditCandidate, "normalized_intent" | "canonical_url">): "sale" | "rent" | null {
  if (["buy", "sale", "new"].includes(row.normalized_intent ?? "")) return "sale";
  if (["rent", "location"].includes(row.normalized_intent ?? "")) return "rent";
  const url = decodeURIComponent(row.canonical_url).toLowerCase();
  if (/vente|vendre|achat|à_vendre|a_vendre|\/achat\//.test(url)) return "sale";
  if (/location|louer|à_louer|a_louer|\/rent\//.test(url)) return "rent";
  return null;
}

function extractSingleSurfaceFromPageTitle(value: string): number | null {
  const matches = [...value.matchAll(/(\d{1,6}(?:[.,]\d+)?)\s*m(?:²|2)\b/gi)];
  const values = [...new Set(matches.map((match) => normalizeSurface(`${match[1]} m²`)).filter((surface): surface is number => surface != null))];
  if (values.length !== 1) return null;
  const valueM2 = values[0];
  if (valueM2 < 8 || valueM2 > 100_000) return null;
  return valueM2;
}

export function extractStrictAgenzTitleSurface(html: string): number | null {
  const candidates: string[] = [];
  for (const match of html.matchAll(/<meta\b[^>]*(?:property|name)=["'](?:og:title|twitter:title)["'][^>]*content=["']([^"']+)["'][^>]*>/gi)) {
    candidates.push(match[1]);
  }
  for (const match of html.matchAll(/<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:title|twitter:title)["'][^>]*>/gi)) {
    candidates.push(match[1]);
  }
  for (const match of html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)) {
    candidates.push(match[1].replace(/<[^>]+>/g, " "));
  }

  const values = [...new Set(candidates.map(extractSingleSurfaceFromPageTitle).filter((surface): surface is number => surface != null))];
  return values.length === 1 ? values[0] : null;
}

export function extractStrictDetailSurface(html: string): number | null {
  const detail = extractDetail(html);
  const raw = detail.surface_raw?.replace(/\s+/g, " ").trim() ?? "";
  if (raw && detail._confidence.surface === "high" && /m(?:²|2)/i.test(raw) && !/\b(?:ha|hectare?s?)\b/i.test(raw)) {
    if (!/\d+(?:[.,]\d+)?\s*(?:-|–|—|à|a)\s*\d+(?:[.,]\d+)?/i.test(raw)) {
      const value = normalizeSurface(raw);
      if (value != null && value >= 8 && value <= 100_000) return value;
    }
  }

  // Agenz detail pages expose the current listing's surface in page-scoped
  // title metadata. This is materially safer than a whole-body regex because
  // body text can contain similar-listing cards with unrelated surfaces.
  return extractStrictAgenzTitleSurface(html);
}

export function matchesC8CandidateLocality(
  row: Pick<AuditCandidate, "title" | "snippet" | "search_text">,
  localitySlug: string,
): boolean {
  const resolved = resolveRabatLocalityShadow({
    title: row.title,
    snippet: row.snippet,
    searchText: row.search_text,
  });
  return resolved.status === "matched" && resolved.slug === localitySlug && resolved.taxonomyStatus === "candidate";
}

export function c8DetailAuditDedupKey(row: Pick<AuditCandidate, "source_domain" | "canonical_url" | "seed_id">): string {
  if (row.source_domain === C8_RABAT_DETAIL_AUDIT_SOURCE) {
    try {
      const id = new URL(row.canonical_url).pathname.match(/\/([0-9]+)\/?$/)?.[1];
      if (id) return `${row.source_domain}:${id}`;
    } catch {
      // fall through to URL/seed key
    }
  }
  return row.canonical_url || row.seed_id;
}

export function selectC8DetailAuditCandidates(
  rows: AuditCandidate[],
  localitySlug: string,
  limit: number,
): AuditCandidate[] {
  const seen = new Set<string>();
  const selected: AuditCandidate[] = [];

  for (const row of rows) {
    if (row.source_domain !== C8_RABAT_DETAIL_AUDIT_SOURCE) continue;
    if (!isRecognizedDetailUrl(row.source_domain, row.canonical_url)) continue;
    if (!matchesC8CandidateLocality(row, localitySlug)) continue;
    if (row.normalized_price_mad != null && row.normalized_surface_m2 != null) continue;

    const key = c8DetailAuditDedupKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(row);
    if (selected.length >= limit) break;
  }

  return selected;
}

async function main() {
  const guard = getThirdPartyIngestionGuard({ scriptName: "c8-rabat-detail-recovery-audit" });
  if (guard.blocked) throw new Error(guard.message);

  const localitySlug = process.env.C8_RABAT_DETAIL_LOCALITY ?? C8_RABAT_DETAIL_AUDIT_DEFAULT_LOCALITY;
  const allowedSlugs = new Set(RABAT_PRODUCT_LOCALITY_CANDIDATES.map((locality) => locality.slug));
  if (!allowedSlugs.has(localitySlug)) {
    throw new Error(`C8 locality must be an existing candidate slug, got: ${localitySlug}`);
  }

  const limit = Math.max(1, Math.min(Number(process.env.C8_RABAT_DETAIL_LIMIT ?? 20), 50));
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("thin_index_search_documents")
    .select("seed_id,canonical_url,source_domain,normalized_intent,normalized_price_mad,normalized_surface_m2,title,snippet,search_text,updated_at")
    .eq("normalized_city", "Rabat")
    .eq("vertical_classification", "real_estate_likely")
    .eq("document_kind", "LISTING")
    .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
    .eq("source_domain", C8_RABAT_DETAIL_AUDIT_SOURCE)
    .order("updated_at", { ascending: false })
    .limit(C8_RABAT_DETAIL_SOURCE_SCAN_CAP);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as AuditCandidate[];
  if (rows.length >= C8_RABAT_DETAIL_SOURCE_SCAN_CAP) {
    throw new Error(
      `C8 detail audit source scan reached cap ${C8_RABAT_DETAIL_SOURCE_SCAN_CAP}; refusing an incomplete locality audit`,
    );
  }
  const candidates = selectC8DetailAuditCandidates(rows, localitySlug, limit);

  let fetched = 0;
  let robotsSkipped = 0;
  let failed = 0;
  let recoverablePrice = 0;
  let recoverableSurface = 0;
  let recoverableBoth = 0;
  const evidence: Array<{
    seed_id: string;
    recoverable_price_mad: number | null;
    recoverable_surface_m2: number | null;
  }> = [];

  for (const row of candidates) {
    try {
      if (!(await isAllowedByRobots(row.canonical_url))) {
        robotsSkipped += 1;
        continue;
      }
      const intent = inferC8DetailIntent(row);
      const response = await fetchHtml(row.canonical_url, { timeoutMs: 15_000 });
      fetched += 1;

      const price = row.normalized_price_mad == null ? extractStrictDetailPrice(response.html, intent) : null;
      const surface = row.normalized_surface_m2 == null ? extractStrictDetailSurface(response.html) : null;
      if (price != null) recoverablePrice += 1;
      if (surface != null) recoverableSurface += 1;
      if (price != null && surface != null) recoverableBoth += 1;
      if (price != null || surface != null) {
        evidence.push({
          seed_id: row.seed_id,
          recoverable_price_mad: price,
          recoverable_surface_m2: surface,
        });
      }
    } catch (errorValue) {
      failed += 1;
      console.warn(
        `[c8-rabat-detail-audit] ${row.source_domain} ${row.seed_id}: ${errorValue instanceof Error ? errorValue.message : String(errorValue)}`,
      );
    }
    await safeDelay(500, 1200);
  }

  console.log(JSON.stringify({
    mode: "read_only_audit",
    productionWriteCount: 0,
    source: C8_RABAT_DETAIL_AUDIT_SOURCE,
    sourceScanCap: C8_RABAT_DETAIL_SOURCE_SCAN_CAP,
    localitySlug,
    limit,
    queriedRows: rows.length,
    detailCandidates: candidates.length,
    fetched,
    robotsSkipped,
    failed,
    recoverablePrice,
    recoverableSurface,
    recoverableBoth,
    evidence,
  }, null, 2));
}

const entrypoint = process.argv[1]?.replace(/\\/g, "/") ?? "";
if (entrypoint.endsWith("/c8-rabat-detail-recovery-audit.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
