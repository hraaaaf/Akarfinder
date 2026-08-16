import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "../../lib/db/supabase-client";
import { auditStructuredCohortHtml, type CohortRow } from "./price-extraction-v5-structured-cohort-audit";
import { fetchHtml, isAllowedByRobots } from "./utils/fetch-html";
import { getThirdPartyIngestionGuard } from "./utils/motor-purity-guard";
import { safeDelay } from "./utils/safe-delay";

const SOURCE = "masaken.ma";
const WRITE_CONFIRMATION = "WRITE_100_MASAKEN_RELIABLE_PRICES";

type SnapshotRow = CohortRow & { snapshot_page: number };

export function buildSnapshotRanges(pageSize: number, pages: number) {
  return Array.from({ length: pages }, (_, page) => ({ page, from: page * pageSize, to: page * pageSize + pageSize - 1 }));
}

export function hasExplicitMasakenWriteConfirmation(raw: string | undefined) {
  return raw === WRITE_CONFIRMATION;
}

async function captureSnapshot(pageSize: number, pages: number): Promise<SnapshotRow[]> {
  const db = getSupabaseServerClient();
  const snapshot: SnapshotRow[] = [];
  const seen = new Set<string>();

  for (const range of buildSnapshotRanges(pageSize, pages)) {
    const { data, error } = await db
      .from("thin_index_search_documents")
      .select("seed_id,canonical_url,source_domain,normalized_intent")
      .eq("document_kind", "LISTING")
      .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
      .eq("source_domain", SOURCE)
      .is("normalized_price_mad", null)
      .order("updated_at", { ascending: false })
      .order("seed_id", { ascending: false })
      .range(range.from, range.to);
    if (error) throw new Error(`snapshot read failed for ${SOURCE} page=${range.page}: ${error.message}`);
    for (const row of (data ?? []) as CohortRow[]) {
      const key = `${row.source_domain}:${row.seed_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      snapshot.push({ ...row, snapshot_page: range.page });
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
    .eq("source_domain", SOURCE)
    .is("normalized_price_mad", null)
    .select("seed_id");
  if (error) throw new Error(`write failed for ${row.seed_id}: ${error.message}`);
  return data?.length ?? 0;
}

async function main() {
  const guard = getThirdPartyIngestionGuard({ scriptName: "price-coverage-masaken-bounded-write-v8" });
  if (guard.blocked) throw new Error(guard.message);

  const write = process.env.PRICE_COVERAGE_V8_WRITE === "true";
  if (write && !hasExplicitMasakenWriteConfirmation(process.env.PRICE_COVERAGE_V8_WRITE_CONFIRMATION)) {
    throw new Error("price coverage v8 write blocked: explicit Masaken confirmation missing");
  }

  const pageSize = Math.max(20, Math.min(Number(process.env.PRICE_COVERAGE_V8_PAGE_SIZE ?? 120), 200));
  const pages = Math.max(1, Math.min(Number(process.env.PRICE_COVERAGE_V8_PAGES ?? 5), 5));
  const maxWrites = Math.max(1, Math.min(Number(process.env.PRICE_COVERAGE_V8_MAX_WRITES ?? 100), 100));
  const snapshot = await captureSnapshot(pageSize, pages);

  const stats = { candidates: snapshot.length, fetched: 0, identity: 0, reliable: 0, failed: 0, written: 0 };

  for (const row of snapshot) {
    if ((write && stats.written >= maxWrites) || (!write && stats.reliable >= maxWrites)) break;
    try {
      if (!(await isAllowedByRobots(row.canonical_url))) continue;
      const res = await fetchHtml(row.canonical_url, { timeoutMs: 15_000 });
      stats.fetched += 1;
      const audit = auditStructuredCohortHtml(res.html, row, res.url);
      if (audit.identity) stats.identity += 1;
      if (audit.amount == null) continue;
      stats.reliable += 1;
      if (write) {
        const count = await writeOne(row, audit.amount);
        stats.written += count;
      }
    } catch (error) {
      stats.failed += 1;
      console.warn(`[price-coverage-v8] ${SOURCE} page=${row.snapshot_page}: ${error instanceof Error ? error.message : String(error)}`);
    }
    await safeDelay(300, 700);
  }

  console.log(JSON.stringify({
    source: SOURCE,
    write,
    page_size: pageSize,
    pages,
    max_writes: maxWrites,
    ...stats,
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
