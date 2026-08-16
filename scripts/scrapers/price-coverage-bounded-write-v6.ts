import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "../../lib/db/supabase-client";
import { auditStructuredCohortHtml, type CohortRow } from "./price-extraction-v5-structured-cohort-audit";
import { fetchHtml, isAllowedByRobots } from "./utils/fetch-html";
import { getThirdPartyIngestionGuard } from "./utils/motor-purity-guard";
import { safeDelay } from "./utils/safe-delay";

const SOURCES = ["mubawab.ma", "masaken.ma"] as const;
const WRITE_CONFIRMATION = "WRITE_100_RELIABLE_PRICES";

type SnapshotRow = CohortRow & { snapshot_page: number };

export function buildSnapshotRanges(pageSize: number, pages: number) {
  return Array.from({ length: pages }, (_, page) => ({ page, from: page * pageSize, to: page * pageSize + pageSize - 1 }));
}

export function hasExplicitWriteConfirmation(raw: string | undefined) {
  return raw === WRITE_CONFIRMATION;
}

async function captureSnapshot(pageSize: number, pages: number): Promise<SnapshotRow[]> {
  const db = getSupabaseServerClient();
  const snapshot: SnapshotRow[] = [];
  const seen = new Set<string>();

  for (const source of SOURCES) {
    for (const range of buildSnapshotRanges(pageSize, pages)) {
      const { data, error } = await db
        .from("thin_index_search_documents")
        .select("seed_id,canonical_url,source_domain,normalized_intent")
        .eq("document_kind", "LISTING")
        .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
        .eq("source_domain", source)
        .is("normalized_price_mad", null)
        .order("updated_at", { ascending: false })
        .order("seed_id", { ascending: false })
        .range(range.from, range.to);
      if (error) throw new Error(`snapshot read failed for ${source} page=${range.page}: ${error.message}`);
      for (const row of (data ?? []) as CohortRow[]) {
        const key = `${row.source_domain}:${row.seed_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        snapshot.push({ ...row, snapshot_page: range.page });
      }
    }
  }
  return snapshot;
}

async function writeOne(row: SnapshotRow, amount: number) {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("thin_index_search_documents")
    .update({ normalized_price_mad: amount })
    .eq("seed_id", row.seed_id)
    .eq("source_domain", row.source_domain)
    .is("normalized_price_mad", null)
    .select("seed_id");
  if (error) throw new Error(`write failed for ${row.seed_id}: ${error.message}`);
  return data?.length ?? 0;
}

async function main() {
  const guard = getThirdPartyIngestionGuard({ scriptName: "price-coverage-bounded-write-v6" });
  if (guard.blocked) throw new Error(guard.message);

  const write = process.env.PRICE_COVERAGE_V6_WRITE === "true";
  if (write && !hasExplicitWriteConfirmation(process.env.PRICE_COVERAGE_V6_WRITE_CONFIRMATION)) {
    throw new Error("price coverage v6 write blocked: explicit confirmation missing");
  }

  const pageSize = Math.max(20, Math.min(Number(process.env.PRICE_COVERAGE_V6_PAGE_SIZE ?? 120), 200));
  const pages = Math.max(1, Math.min(Number(process.env.PRICE_COVERAGE_V6_PAGES ?? 4), 8));
  const maxWrites = Math.max(1, Math.min(Number(process.env.PRICE_COVERAGE_V6_MAX_WRITES ?? 100), 100));
  const snapshot = await captureSnapshot(pageSize, pages);

  const bySource: Record<string, { candidates: number; fetched: number; identity: number; reliable: number; failed: number; written: number }> = {};
  for (const source of SOURCES) bySource[source] = { candidates: 0, fetched: 0, identity: 0, reliable: 0, failed: 0, written: 0 };
  for (const row of snapshot) bySource[row.source_domain].candidates += 1;

  let reliable = 0;
  let written = 0;
  for (const row of snapshot) {
    if ((write && written >= maxWrites) || (!write && reliable >= maxWrites)) break;
    const stat = bySource[row.source_domain];
    try {
      if (!(await isAllowedByRobots(row.canonical_url))) continue;
      const res = await fetchHtml(row.canonical_url, { timeoutMs: 15_000 });
      stat.fetched += 1;
      const audit = auditStructuredCohortHtml(res.html, row, res.url);
      if (audit.identity) stat.identity += 1;
      if (audit.amount == null) continue;
      stat.reliable += 1;
      reliable += 1;
      if (write) {
        const count = await writeOne(row, audit.amount);
        written += count;
        stat.written += count;
      }
    } catch (error) {
      stat.failed += 1;
      console.warn(`[price-coverage-v6] ${row.source_domain} page=${row.snapshot_page}: ${error instanceof Error ? error.message : String(error)}`);
    }
    await safeDelay(300, 700);
  }

  console.log(JSON.stringify({
    write,
    page_size: pageSize,
    pages,
    max_writes: maxWrites,
    snapshot_candidates: snapshot.length,
    reliable,
    written,
    bySource,
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
