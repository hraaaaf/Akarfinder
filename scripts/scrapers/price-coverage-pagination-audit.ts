import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "../../lib/db/supabase-client";
import { auditStructuredCohortHtml, type CohortRow } from "./price-extraction-v5-structured-cohort-audit";
import { fetchHtml, isAllowedByRobots } from "./utils/fetch-html";
import { getThirdPartyIngestionGuard } from "./utils/motor-purity-guard";
import { safeDelay } from "./utils/safe-delay";

const SOURCES = ["mubawab.ma", "masaken.ma"] as const;

export const MAX_PRICE_PAGINATION_PAGES = 10;

type Source = (typeof SOURCES)[number];

export function buildPageRanges(pageSize: number, pages: number) {
  return Array.from({ length: pages }, (_, page) => ({
    page,
    from: page * pageSize,
    to: page * pageSize + pageSize - 1,
  }));
}

function selectedSources(): Source[] {
  const raw = process.env.PRICE_PAGINATION_SOURCE?.trim();
  if (!raw) return [...SOURCES];
  if (!SOURCES.includes(raw as Source)) throw new Error(`unsupported PRICE_PAGINATION_SOURCE=${raw}`);
  return [raw as Source];
}

function selectedRanges(pageSize: number, pages: number) {
  const ranges = buildPageRanges(pageSize, pages);
  const raw = process.env.PRICE_PAGINATION_PAGE_INDEX?.trim();
  if (!raw) return ranges;
  const page = Number(raw);
  if (!Number.isInteger(page) || page < 0 || page >= pages) {
    throw new Error(`invalid PRICE_PAGINATION_PAGE_INDEX=${raw}; expected 0..${pages - 1}`);
  }
  return [ranges[page]];
}

async function loadPage(source: string, from: number, to: number): Promise<CohortRow[]> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("thin_index_search_documents")
    .select("seed_id,canonical_url,source_domain,normalized_intent")
    .eq("document_kind", "LISTING")
    .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
    .eq("source_domain", source)
    .is("normalized_price_mad", null)
    .order("updated_at", { ascending: false })
    .order("seed_id", { ascending: false })
    .range(from, to);
  if (error) throw new Error(`price pagination read failed for ${source}: ${error.message}`);
  return (data ?? []) as CohortRow[];
}

async function main() {
  const guard = getThirdPartyIngestionGuard({ scriptName: "price-coverage-pagination-audit" });
  if (guard.blocked) throw new Error(guard.message);
  if (process.env.PRICE_PAGINATION_WRITE === "true") throw new Error("pagination audit is strictly read-only");

  const pageSize = Math.max(20, Math.min(Number(process.env.PRICE_PAGINATION_PAGE_SIZE ?? 120), 200));
  const pages = Math.max(1, Math.min(Number(process.env.PRICE_PAGINATION_PAGES ?? 4), MAX_PRICE_PAGINATION_PAGES));
  const ranges = selectedRanges(pageSize, pages);
  const sources = selectedSources();
  const bySource: Record<string, { candidates: number; fetched: number; identity: number; reliable: number; failed: number; pages: Array<{ page: number; candidates: number; reliable: number }> }> = {};

  for (const source of sources) {
    const stat = { candidates: 0, fetched: 0, identity: 0, reliable: 0, failed: 0, pages: [] as Array<{ page: number; candidates: number; reliable: number }> };
    bySource[source] = stat;
    for (const range of ranges) {
      const rows = await loadPage(source, range.from, range.to);
      let reliable = 0;
      stat.candidates += rows.length;
      for (const row of rows) {
        try {
          if (!(await isAllowedByRobots(row.canonical_url))) continue;
          const res = await fetchHtml(row.canonical_url, { timeoutMs: 15_000 });
          stat.fetched += 1;
          const audit = auditStructuredCohortHtml(res.html, row, res.url);
          if (audit.identity) stat.identity += 1;
          if (audit.amount != null) {
            stat.reliable += 1;
            reliable += 1;
          }
        } catch (error) {
          stat.failed += 1;
          console.warn(`[price-pagination] ${source} page=${range.page}: ${error instanceof Error ? error.message : String(error)}`);
        }
        await safeDelay(300, 700);
      }
      stat.pages.push({ page: range.page, candidates: rows.length, reliable });
    }
  }

  const totals = Object.values(bySource).reduce((acc, s) => ({
    candidates: acc.candidates + s.candidates,
    fetched: acc.fetched + s.fetched,
    identity: acc.identity + s.identity,
    reliable: acc.reliable + s.reliable,
    failed: acc.failed + s.failed,
  }), { candidates: 0, fetched: 0, identity: 0, reliable: 0, failed: 0 });

  console.log(JSON.stringify({
    write: false,
    page_size: pageSize,
    pages_requested: pages,
    selected_sources: sources,
    selected_pages: ranges.map((r) => r.page),
    totals,
    bySource,
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
