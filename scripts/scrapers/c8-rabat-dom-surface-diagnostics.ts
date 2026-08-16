import { getSupabaseServerClient } from "../../lib/db/supabase-client";
import { loadHtml } from "./utils/extract";
import { fetchHtml, isAllowedByRobots } from "./utils/fetch-html";
import { getThirdPartyIngestionGuard } from "./utils/motor-purity-guard";
import { safeDelay } from "./utils/safe-delay";
import {
  C8_RABAT_DETAIL_AUDIT_DEFAULT_LOCALITY,
  C8_RABAT_DETAIL_AUDIT_SOURCE,
  C8_RABAT_DETAIL_SOURCE_SCAN_CAP,
  selectC8DetailAuditCandidates,
} from "./c8-rabat-detail-recovery-audit";

type Row = {
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

export type C8DomSurfaceDiagnostic = {
  targetListingId: string | null;
  m2ElementCount: number;
  foreignListingLinkedCount: number;
  unlinkedM2ElementCount: number;
  semanticContainerM2Count: number;
  unlinkedSurfaceCandidates: number[];
  semanticSurfaceCandidates: number[];
};

function listingIdFromUrl(url: string): string | null {
  try {
    return new URL(url).pathname.match(/\/(\d+)\/?$/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function valuesFromText(text: string): number[] {
  const out = new Set<number>();
  for (const match of text.matchAll(/(\d{1,6}(?:[.,]\d+)?)\s*m(?:²|2)(?=$|[^\p{L}\p{N}])/giu)) {
    const value = Number(match[1].replace(",", "."));
    if (Number.isFinite(value) && value >= 8 && value <= 100_000) out.add(value);
  }
  return [...out].sort((a, b) => a - b);
}

export function diagnoseDomSurfaceSignals(html: string, canonicalUrl: string): C8DomSurfaceDiagnostic {
  const $ = loadHtml(html);
  const targetListingId = listingIdFromUrl(canonicalUrl);
  const unlinked = new Set<number>();
  const semantic = new Set<number>();
  let m2ElementCount = 0;
  let foreignListingLinkedCount = 0;
  let unlinkedM2ElementCount = 0;
  let semanticContainerM2Count = 0;

  $("body *").each((_, el) => {
    const node = $(el);
    if (node.children().length > 0) return;
    const text = node.text().replace(/\s+/g, " ").trim();
    const values = valuesFromText(text);
    if (values.length === 0) return;
    m2ElementCount += 1;

    const anchor = node.closest("a[href]");
    let foreignListing = false;
    if (anchor.length) {
      const href = anchor.attr("href") ?? "";
      const id = href.match(/\/(\d+)\/?(?:[?#].*)?$/)?.[1] ?? null;
      foreignListing = Boolean(id && targetListingId && id !== targetListingId);
    }
    if (foreignListing) {
      foreignListingLinkedCount += 1;
      return;
    }

    unlinkedM2ElementCount += 1;
    for (const value of values) unlinked.add(value);

    let semanticHit = false;
    let current = node;
    for (let depth = 0; depth < 5 && current.length; depth += 1) {
      const attrs = `${current.attr("id") ?? ""} ${current.attr("class") ?? ""} ${current.attr("data-testid") ?? ""}`;
      if (/surface|superficie|feature|character|caracter|criteria|detail|property-info|spec/i.test(attrs)) {
        semanticHit = true;
        break;
      }
      current = current.parent();
    }
    if (semanticHit) {
      semanticContainerM2Count += 1;
      for (const value of values) semantic.add(value);
    }
  });

  return {
    targetListingId,
    m2ElementCount,
    foreignListingLinkedCount,
    unlinkedM2ElementCount,
    semanticContainerM2Count,
    unlinkedSurfaceCandidates: [...unlinked].sort((a, b) => a - b),
    semanticSurfaceCandidates: [...semantic].sort((a, b) => a - b),
  };
}

async function main() {
  const guard = getThirdPartyIngestionGuard({ scriptName: "c8-rabat-dom-surface-diagnostics" });
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
  const rows = (data ?? []) as Row[];
  if (rows.length >= C8_RABAT_DETAIL_SOURCE_SCAN_CAP) throw new Error("C8 DOM diagnostics source scan cap reached");
  const candidates = selectC8DetailAuditCandidates(rows, localitySlug, limit);

  const diagnostics: Array<{ seed_id: string; signals: C8DomSurfaceDiagnostic }> = [];
  let fetched = 0;
  let robotsSkipped = 0;
  let failed = 0;
  for (const row of candidates) {
    try {
      if (!(await isAllowedByRobots(row.canonical_url))) { robotsSkipped += 1; continue; }
      const response = await fetchHtml(row.canonical_url, { timeoutMs: 15_000 });
      fetched += 1;
      diagnostics.push({ seed_id: row.seed_id, signals: diagnoseDomSurfaceSignals(response.html, row.canonical_url) });
    } catch (errorValue) {
      failed += 1;
      console.warn(`[c8-dom-surface-diagnostics] ${row.seed_id}: ${errorValue instanceof Error ? errorValue.message : String(errorValue)}`);
    }
    await safeDelay(500, 1200);
  }

  console.log(JSON.stringify({
    mode: "read_only_dom_surface_diagnostics",
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
if (entrypoint.endsWith("/c8-rabat-dom-surface-diagnostics.ts")) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
