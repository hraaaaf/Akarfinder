import { getSupabaseServerClient } from "../../lib/db/supabase-client";
import {
  C8_RABAT_DETAIL_AUDIT_DEFAULT_LOCALITY,
  C8_RABAT_DETAIL_AUDIT_SOURCE,
  C8_RABAT_DETAIL_SOURCE_SCAN_CAP,
  extractStrictAgenzTitleSurface,
  extractStrictDetailSurface,
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

export type C8SurfaceDiagnostic = {
  strictSurfaceM2: number | null;
  titleSurfaceM2: number | null;
  jsonLdFloorSizePresent: boolean;
  titleM2TokenCount: number;
  documentM2TokenCount: number;
  surfaceWordPresent: boolean;
  areaWordPresent: boolean;
};

function countMatches(value: string, pattern: RegExp): number {
  return [...value.matchAll(pattern)].length;
}

function pageScopedTitles(html: string): string {
  const values: string[] = [];
  for (const match of html.matchAll(/<meta\b[^>]*(?:property|name)=["'](?:og:title|twitter:title)["'][^>]*content=["']([^"']+)["'][^>]*>/gi)) {
    values.push(match[1]);
  }
  for (const match of html.matchAll(/<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:title|twitter:title)["'][^>]*>/gi)) {
    values.push(match[1]);
  }
  for (const match of html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)) {
    values.push(match[1].replace(/<[^>]+>/g, " "));
  }
  return values.join("\n");
}

export function diagnoseC8SurfaceSignals(html: string): C8SurfaceDiagnostic {
  const titles = pageScopedTitles(html);
  return {
    strictSurfaceM2: extractStrictDetailSurface(html),
    titleSurfaceM2: extractStrictAgenzTitleSurface(html),
    jsonLdFloorSizePresent: /["']floorSize["']\s*:/i.test(html),
    titleM2TokenCount: countMatches(titles, /m(?:²|2)(?=$|[^\p{L}\p{N}])/giu),
    documentM2TokenCount: countMatches(html, /m(?:²|2)(?=$|[^\p{L}\p{N}])/giu),
    surfaceWordPresent: /\b(?:surface|superficie)\b/i.test(html),
    areaWordPresent: /\barea\b/i.test(html),
  };
}

async function main() {
  const guard = getThirdPartyIngestionGuard({ scriptName: "c8-rabat-surface-diagnostics" });
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
    throw new Error(`C8 surface diagnostics reached source scan cap ${C8_RABAT_DETAIL_SOURCE_SCAN_CAP}`);
  }

  const candidates = selectC8DetailAuditCandidates(rows, localitySlug, limit);
  const diagnostics: Array<{ seed_id: string; signals: C8SurfaceDiagnostic }> = [];
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
      diagnostics.push({ seed_id: row.seed_id, signals: diagnoseC8SurfaceSignals(response.html) });
    } catch (errorValue) {
      failed += 1;
      console.warn(`[c8-surface-diagnostics] ${row.seed_id}: ${errorValue instanceof Error ? errorValue.message : String(errorValue)}`);
    }
    await safeDelay(500, 1200);
  }

  console.log(JSON.stringify({
    mode: "read_only_surface_diagnostics",
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
if (entrypoint.endsWith("/c8-rabat-surface-diagnostics.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
