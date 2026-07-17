// AKARFINDER-MARKET-INDEX-READ-ACTIVATION-1 — shadow read comparator.
// Read-only: runs the SAME query twice, once against the legacy path
// (MARKET_INDEX_READ_ENABLED unset/false) and once against the Market Index
// + fallback path (MARKET_INDEX_READ_ENABLED=true), and diffs the results.
// Never writes to any table. Refuses to run without one of the three modes.
//
// Usage:
//   npx tsx scripts/market-index/run-market-index-shadow-read.ts --local
//   npx tsx scripts/market-index/run-market-index-shadow-read.ts --preview
//   npx tsx scripts/market-index/run-market-index-shadow-read.ts --production-readonly

import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DbListingsQuery, DbListingsResult } from "../../lib/listings/db-listings";

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=\s]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
}

const MODE_FLAGS = ["--local", "--preview", "--production-readonly"] as const;
type Mode = (typeof MODE_FLAGS)[number];

function getMode(): Mode {
  const found = MODE_FLAGS.filter((f) => process.argv.includes(f));
  if (found.length !== 1) {
    console.error(
      `[shadow-read] Refused: exactly one mode required (${MODE_FLAGS.join(" | ")}). ` +
        `Received: ${found.length === 0 ? "none" : found.join(", ")}`,
    );
    process.exit(1);
  }
  return found[0];
}

// The 30+ required parity queries: cities x transaction/property/price/
// surface/district combinations, plus explicit edge cases.
const PARITY_QUERIES: Array<{ label: string; query: DbListingsQuery }> = [
  { label: "rabat_all", query: { city: "Rabat", limit: 100 } },
  { label: "casablanca_all", query: { city: "Casablanca", limit: 100 } },
  { label: "marrakech_all", query: { city: "Marrakech", limit: 100 } },
  { label: "tanger_all", query: { city: "Tanger", limit: 100 } },
  { label: "agadir_all", query: { city: "Agadir", limit: 100 } },
  { label: "fes_all", query: { city: "Fes", limit: 100 } },
  { label: "rabat_buy", query: { city: "Rabat", transaction_type: "sale", limit: 100 } },
  { label: "rabat_rent", query: { city: "Rabat", transaction_type: "rent", limit: 100 } },
  { label: "casablanca_buy", query: { city: "Casablanca", transaction_type: "sale", limit: 100 } },
  { label: "casablanca_rent", query: { city: "Casablanca", transaction_type: "rent", limit: 100 } },
  { label: "marrakech_buy", query: { city: "Marrakech", transaction_type: "sale", limit: 100 } },
  { label: "marrakech_rent", query: { city: "Marrakech", transaction_type: "rent", limit: 100 } },
  { label: "rabat_apartment", query: { city: "Rabat", property_type: "apartment", limit: 100 } },
  { label: "rabat_villa", query: { city: "Rabat", property_type: "villa", limit: 100 } },
  { label: "casablanca_apartment", query: { city: "Casablanca", property_type: "apartment", limit: 100 } },
  { label: "casablanca_villa", query: { city: "Casablanca", property_type: "villa", limit: 100 } },
  { label: "marrakech_villa", query: { city: "Marrakech", property_type: "villa", limit: 100 } },
  { label: "rabat_min_price_500k", query: { city: "Rabat", min_price: 500000, limit: 100 } },
  { label: "rabat_max_price_1m", query: { city: "Rabat", max_price: 1000000, limit: 100 } },
  { label: "casablanca_price_range", query: { city: "Casablanca", min_price: 800000, max_price: 2000000, limit: 100 } },
  { label: "marrakech_min_price_2m", query: { city: "Marrakech", min_price: 2000000, limit: 100 } },
  { label: "rabat_min_surface_80", query: { city: "Rabat", min_surface: 80, limit: 100 } },
  { label: "rabat_max_surface_150", query: { city: "Rabat", max_surface: 150, limit: 100 } },
  { label: "casablanca_surface_range", query: { city: "Casablanca", min_surface: 60, max_surface: 200, limit: 100 } },
  { label: "rabat_bedrooms_3", query: { city: "Rabat", bedrooms: 3, limit: 100 } },
  { label: "casablanca_bedrooms_2", query: { city: "Casablanca", bedrooms: 2, limit: 100 } },
  { label: "no_result_city", query: { city: "Ville-Inexistante-XYZ", limit: 100 } },
  { label: "no_result_price", query: { city: "Rabat", min_price: 999999999, limit: 100 } },
  { label: "all_no_filter", query: { limit: 100 } },
  { label: "pagination_page_2_rabat", query: { city: "Rabat", limit: 20, offset: 20 } },
  { label: "pagination_page_3_casablanca", query: { city: "Casablanca", limit: 20, offset: 40 } },
  { label: "small_limit_5", query: { city: "Marrakech", limit: 5 } },
  { label: "tanger_buy_villa", query: { city: "Tanger", transaction_type: "sale", property_type: "villa", limit: 100 } },
  { label: "agadir_all_types", query: { city: "Agadir", limit: 100 } },
];

function stableStringify(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as object).length ? undefined : undefined);
}

type QueryDiff = {
  label: string;
  query: DbListingsQuery;
  legacy_total: number;
  market_index_total: number;
  total_mismatch: boolean;
  missing_listing_ids: string[];
  extra_listing_ids: string[];
  duplicate_listing_ids_legacy: string[];
  duplicate_listing_ids_market_index: string[];
  field_mismatches: Array<{ id: string; fields: string[] }>;
  ranking_order_mismatch: boolean;
};

function findDuplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  return [...dupes];
}

function diffResults(label: string, query: DbListingsQuery, legacy: DbListingsResult, marketIndex: DbListingsResult): QueryDiff {
  const legacyIds = legacy.listings.map((l) => String(l.id));
  const miIds = marketIndex.listings.map((l) => String(l.id));
  const legacySet = new Set(legacyIds);
  const miSet = new Set(miIds);

  const missing = legacyIds.filter((id) => !miSet.has(id));
  const extra = miIds.filter((id) => !legacySet.has(id));

  const legacyById = new Map(legacy.listings.map((l) => [String(l.id), l]));
  const miById = new Map(marketIndex.listings.map((l) => [String(l.id), l]));

  const fieldMismatches: Array<{ id: string; fields: string[] }> = [];
  for (const [id, legacyRow] of legacyById) {
    const miRow = miById.get(id);
    if (!miRow) continue;
    const keys = new Set([...Object.keys(legacyRow), ...Object.keys(miRow)]);
    const mismatched: string[] = [];
    for (const key of keys) {
      const a = JSON.stringify((legacyRow as Record<string, unknown>)[key]);
      const b = JSON.stringify((miRow as Record<string, unknown>)[key]);
      if (a !== b) mismatched.push(key);
    }
    if (mismatched.length > 0) fieldMismatches.push({ id, fields: mismatched });
  }

  const rankingOrderMismatch = stableStringify(legacyIds) !== stableStringify(miIds);

  return {
    label,
    query,
    legacy_total: legacy.total,
    market_index_total: marketIndex.total,
    total_mismatch: legacy.total !== marketIndex.total,
    missing_listing_ids: missing,
    extra_listing_ids: extra,
    duplicate_listing_ids_legacy: findDuplicates(legacyIds),
    duplicate_listing_ids_market_index: findDuplicates(miIds),
    field_mismatches: fieldMismatches,
    ranking_order_mismatch: rankingOrderMismatch,
  };
}

async function main() {
  const mode = getMode();
  loadEnvFile(join(process.cwd(), ".env.local"));
  loadEnvFile(join(process.cwd(), ".env.mission"));

  // Force legacy first (flag unset), run all queries, then flip the flag and
  // re-import the module fresh (cache-busted) so both runs are genuinely
  // independent evaluations, not sharing any in-process state.
  delete process.env.MARKET_INDEX_READ_ENABLED;
  const legacyMod = await import("../../lib/db/supabase-listings");

  process.env.MARKET_INDEX_READ_ENABLED = "true";
  const marketIndexMod = await import(`../../lib/db/supabase-listings?shadow=${Date.now()}`);

  const diffs: QueryDiff[] = [];
  for (const { label, query } of PARITY_QUERIES) {
    const legacyResult = await legacyMod.querySupabaseListings(query);
    const marketIndexResult = await marketIndexMod.querySupabaseListings(query);
    diffs.push(diffResults(label, query, legacyResult, marketIndexResult));
  }

  const totals = {
    total_mismatch: diffs.filter((d) => d.total_mismatch).length,
    missing_listing_ids: diffs.reduce((s, d) => s + d.missing_listing_ids.length, 0),
    extra_listing_ids: diffs.reduce((s, d) => s + d.extra_listing_ids.length, 0),
    duplicate_listing_ids: diffs.reduce(
      (s, d) => s + d.duplicate_listing_ids_legacy.length + d.duplicate_listing_ids_market_index.length,
      0,
    ),
    field_mismatches: diffs.reduce((s, d) => s + d.field_mismatches.length, 0),
    ranking_order_mismatches: diffs.filter((d) => d.ranking_order_mismatch).length,
  };

  const report = {
    audit_id: "market-index-shadow-read-results",
    mission: "AKARFINDER-MARKET-INDEX-READ-ACTIVATION-1",
    generated_at_utc: new Date().toISOString(),
    mode,
    read_only: true,
    write_operations_performed: 0,
    query_count: PARITY_QUERIES.length,
    totals,
    all_criteria_pass:
      totals.total_mismatch === 0 &&
      totals.missing_listing_ids === 0 &&
      totals.extra_listing_ids === 0 &&
      totals.duplicate_listing_ids === 0 &&
      totals.field_mismatches === 0 &&
      totals.ranking_order_mismatches === 0,
    diffs,
  };

  const outDir = join(process.cwd(), "data", "audits");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, "market-index-shadow-read-results.json");
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({ mode, query_count: PARITY_QUERIES.length, totals, all_criteria_pass: report.all_criteria_pass }, null, 2));
  console.log(`\nWrote ${outPath}`);

  if (!report.all_criteria_pass) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
