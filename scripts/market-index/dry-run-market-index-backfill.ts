// AKARFINDER-MARKET-INDEX-FOUNDATION-1 — dry-run backfill simulation ONLY.
// Reads Production (read-only) via the Supabase JS client. Performs NO
// INSERT/UPDATE/DELETE. Requires --dry-run; refuses to run without it.
//
// Usage: npx tsx scripts/market-index/dry-run-market-index-backfill.ts --dry-run

import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "../../lib/openserp-ingestion/env";
import { canonicalizeUrl } from "../../lib/market-index/market-index-identifiers";
import { classifyPrice } from "../../lib/market-index/market-index-price";
import { projectLegacyBatch, type LegacyPropertyListingRow, type LegacySourceRow } from "../../lib/market-index/market-index-legacy-adapter";

loadEnvFile(join(process.cwd(), ".env.local"));
loadEnvFile(join(process.cwd(), ".env.mission"));

function assertDryRunFlag(): void {
  if (!process.argv.includes("--dry-run")) {
    console.error(
      "[dry-run-market-index-backfill] Refused: this script requires --dry-run. " +
        "No execution mode without --dry-run exists in this mission -- see AKARFINDER-MARKET-INDEX-FOUNDATION-1 section 17.",
    );
    process.exit(1);
  }
}

type Report = {
  script: string;
  mode: "dry_run_read_only";
  generated_at_utc: string;
  inserts_performed: 0;
  updates_performed: 0;
  deletes_performed: 0;
  input_counts: {
    property_listings: number;
    listing_sources: number;
  };
  projected_rows_if_backfilled: {
    property_clusters: number;
    property_cluster_members: number;
    source_offer_observations: number;
  };
  idempotency_conflicts: {
    duplicate_canonical_url_hash_within_same_source: number;
  };
  data_quality: {
    invalid_urls: number;
    invalid_prices: number;
    not_disclosed_prices: number;
    valid_prices: number;
    missing_provenance_field_confidence: number;
    multi_source_unverified_clusters: number;
  };
};

async function main() {
  assertDryRunFlag();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials (.env.local / .env.mission).");

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: listingsRaw, error: e1 } = await supabase
    .from("property_listings")
    .select("id, price_mad, city, district, property_type, transaction_type, surface_m2, duplicate_group_id, field_confidence");
  if (e1) throw e1;

  const { data: sourcesRaw, error: e2 } = await supabase
    .from("listing_sources")
    .select("id, property_listing_id, source_name, listing_url, source_url, is_active, first_seen_at, last_seen_at");
  if (e2) throw e2;

  const listings: LegacyPropertyListingRow[] = (listingsRaw ?? []) as LegacyPropertyListingRow[];
  const sources: LegacySourceRow[] = (sourcesRaw ?? []) as LegacySourceRow[];

  const projected = projectLegacyBatch(listings, sources);

  let invalidUrls = 0;
  for (const s of sources) {
    if (!canonicalizeUrl(s.listing_url ?? s.source_url ?? "")) invalidUrls++;
  }

  let invalidPrices = 0;
  let notDisclosedPrices = 0;
  let validPrices = 0;
  for (const l of listings) {
    const classification = classifyPrice(l.price_mad);
    if (classification.status === "invalid") invalidPrices++;
    else if (classification.status === "not_disclosed") notDisclosedPrices++;
    else if (classification.status === "valid") validPrices++;
  }

  const missingProvenance = listings.filter((l) => !l.field_confidence).length;
  const multiSourceUnverified = projected.filter((p) => p.multi_source_unverified).length;

  // Idempotency conflict check: two sources with the same source_name +
  // canonicalized URL hash would collide on the new partial unique index
  // (listing_sources_source_offer_key_idx only applies when source_offer_key
  // is set, which legacy rows never have -- so this checks a hypothetical
  // future collision, not an actual constraint violation today).
  const seen = new Map<string, number>();
  let duplicateCanonicalWithinSource = 0;
  for (const s of sources) {
    const canonical = canonicalizeUrl(s.listing_url ?? s.source_url ?? "");
    if (!canonical) continue;
    const key = `${(s.source_name ?? "").toLowerCase()}::${canonical.toLowerCase()}`;
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count > 1) duplicateCanonicalWithinSource++;
  }

  const report: Report = {
    script: "dry-run-market-index-backfill",
    mode: "dry_run_read_only",
    generated_at_utc: new Date().toISOString(),
    inserts_performed: 0,
    updates_performed: 0,
    deletes_performed: 0,
    input_counts: {
      property_listings: listings.length,
      listing_sources: sources.length,
    },
    projected_rows_if_backfilled: {
      // legacy_one_to_one_projection: exactly one cluster per existing listing.
      property_clusters: listings.length,
      // one membership row per existing source, all first-and-only members.
      property_cluster_members: sources.length,
      // this mission's backfill NEVER invents historical observations.
      source_offer_observations: 0,
    },
    idempotency_conflicts: {
      duplicate_canonical_url_hash_within_same_source: duplicateCanonicalWithinSource,
    },
    data_quality: {
      invalid_urls: invalidUrls,
      invalid_prices: invalidPrices,
      not_disclosed_prices: notDisclosedPrices,
      valid_prices: validPrices,
      missing_provenance_field_confidence: missingProvenance,
      multi_source_unverified_clusters: multiSourceUnverified,
    },
  };

  console.log(JSON.stringify(report, null, 2));

  const fs = await import("node:fs/promises");
  const outPath = join(process.cwd(), "data", "audits", "market-index-foundation-prod-readonly-dry-run.json");
  await fs.mkdir(join(process.cwd(), "data", "audits"), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`\nWrote ${outPath}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
