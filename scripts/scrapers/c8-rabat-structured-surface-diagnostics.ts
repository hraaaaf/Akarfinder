import { getSupabaseServerClient } from "../../lib/db/supabase-client";
import {
  C8_RABAT_DETAIL_AUDIT_DEFAULT_LOCALITY,
  C8_RABAT_DETAIL_AUDIT_SOURCE,
  C8_RABAT_DETAIL_SOURCE_SCAN_CAP,
  selectC8DetailAuditCandidates,
} from "./c8-rabat-detail-recovery-audit";
import { fetchHtml, isAllowedByRobots } from "./utils/fetch-html";
import { getThirdPartyIngestionGuard } from "./utils/motor-purity-guard";
import { safeDelay } from "./utils/safe-delay";

type DiagnosticRow = {
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

export type C8StructuredSurfaceDiagnostic = {
  targetListingId: string | null;
  jsonScriptCount: number;
  parseableJsonScriptCount: number;
  targetIdObjectCount: number;
  targetIdSurfaceCandidates: number[];
  allSurfaceKeyCandidates: number[];
};

const IDENTIFIER_KEY = /^(?:id|_id|listingId|listing_id|propertyId|property_id|adId|ad_id)$/i;
const SURFACE_KEY = /(?:surface|superficie|floor.?size|living.?area|land.?area|lot.?area|usable.?area|built.?area|^area$)/i;

function normalizeCandidate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 8 && value <= 100_000 ? value : null;
  }
  if (typeof value !== "string") return null;
  const compact = value.trim().replace(/\s+/g, "").replace(",", ".");
  const match = compact.match(/^(\d{1,6}(?:\.\d+)?)(?:m(?:²|2))?$/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed >= 8 && parsed <= 100_000 ? parsed : null;
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function extractJsonPayloads(html: string): string[] {
  const payloads: string[] = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = match[1] ?? "";
    const body = (match[2] ?? "").trim();
    if (!body) continue;
    const isStructured = /type=["']application\/(?:ld\+)?json["']/i.test(attrs) || /id=["']__NEXT_DATA__["']/i.test(attrs);
    if (isStructured) payloads.push(body);
  }
  return payloads;
}

function objectHasTargetId(value: Record<string, unknown>, targetId: string): boolean {
  return Object.entries(value).some(([key, candidate]) => {
    if (!IDENTIFIER_KEY.test(key)) return false;
    return String(candidate) === targetId;
  });
}

function collectSurfaceCandidates(value: unknown, output: number[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectSurfaceCandidates(item, output);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, candidate] of Object.entries(value as Record<string, unknown>)) {
    if (SURFACE_KEY.test(key)) {
      const normalized = normalizeCandidate(candidate);
      if (normalized != null) output.push(normalized);
      if (candidate && typeof candidate === "object") collectSurfaceCandidates(candidate, output);
    } else if (candidate && typeof candidate === "object") {
      collectSurfaceCandidates(candidate, output);
    }
  }
}

function walkForTargetObjects(value: unknown, targetId: string, targetObjects: Record<string, unknown>[]): void {
  if (Array.isArray(value)) {
    for (const item of value) walkForTargetObjects(item, targetId, targetObjects);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (objectHasTargetId(record, targetId)) targetObjects.push(record);
  for (const candidate of Object.values(record)) {
    if (candidate && typeof candidate === "object") walkForTargetObjects(candidate, targetId, targetObjects);
  }
}

export function diagnoseStructuredSurface(html: string, canonicalUrl: string): C8StructuredSurfaceDiagnostic {
  const targetListingId = (() => {
    try {
      return new URL(canonicalUrl).pathname.match(/\/([0-9]+)\/?$/)?.[1] ?? null;
    } catch {
      return null;
    }
  })();

  const payloads = extractJsonPayloads(html);
  const parsed: unknown[] = [];
  for (const payload of payloads) {
    try {
      parsed.push(JSON.parse(payload));
    } catch {
      // malformed structured payload is diagnostic-only and fail-closed
    }
  }

  const allCandidates: number[] = [];
  for (const value of parsed) collectSurfaceCandidates(value, allCandidates);

  const targetObjects: Record<string, unknown>[] = [];
  if (targetListingId) {
    for (const value of parsed) walkForTargetObjects(value, targetListingId, targetObjects);
  }
  const targetCandidates: number[] = [];
  for (const object of targetObjects) collectSurfaceCandidates(object, targetCandidates);

  return {
    targetListingId,
    jsonScriptCount: payloads.length,
    parseableJsonScriptCount: parsed.length,
    targetIdObjectCount: targetObjects.length,
    targetIdSurfaceCandidates: uniqueSorted(targetCandidates),
    allSurfaceKeyCandidates: uniqueSorted(allCandidates),
  };
}

async function main() {
  const guard = getThirdPartyIngestionGuard({ scriptName: "c8-rabat-structured-surface-diagnostics" });
  if (guard.blocked) throw new Error(guard.message);

  const localitySlug = process.env.C8_RABAT_DETAIL_LOCALITY ?? C8_RABAT_DETAIL_AUDIT_DEFAULT_LOCALITY;
  const limit = Math.max(1, Math.min(Number(process.env.C8_RABAT_DETAIL_LIMIT ?? 9), 9));
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

  const rows = (data ?? []) as DiagnosticRow[];
  if (rows.length >= C8_RABAT_DETAIL_SOURCE_SCAN_CAP) {
    throw new Error(`C8 structured surface diagnostics reached source scan cap ${C8_RABAT_DETAIL_SOURCE_SCAN_CAP}`);
  }

  const candidates = selectC8DetailAuditCandidates(rows, localitySlug, limit);
  const diagnostics: Array<{ seed_id: string; signals: C8StructuredSurfaceDiagnostic }> = [];
  let fetched = 0;
  let robotsSkipped = 0;
  let failed = 0;

  for (const row of candidates) {
    try {
      if (!(await isAllowedByRobots(row.canonical_url))) {
        robotsSkipped += 1;
        continue;
      }
      const response = await fetchHtml(row.canonical_url, { timeoutMs: 15_000 });
      fetched += 1;
      diagnostics.push({ seed_id: row.seed_id, signals: diagnoseStructuredSurface(response.html, row.canonical_url) });
    } catch (errorValue) {
      failed += 1;
      console.warn(`[c8-structured-surface-diagnostics] ${row.seed_id}: ${errorValue instanceof Error ? errorValue.message : String(errorValue)}`);
    }
    await safeDelay(500, 1200);
  }

  console.log(JSON.stringify({
    mode: "read_only_structured_surface_diagnostics",
    productionWriteCount: 0,
    rawHtmlPersisted: false,
    source: C8_RABAT_DETAIL_AUDIT_SOURCE,
    localitySlug,
    limit,
    queriedRows: rows.length,
    detailCandidates: candidates.length,
    fetched,
    robotsSkipped,
    failed,
    diagnostics,
  }, null, 2));
}

const entrypoint = process.argv[1]?.replace(/\\/g, "/") ?? "";
if (entrypoint.endsWith("/c8-rabat-structured-surface-diagnostics.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
