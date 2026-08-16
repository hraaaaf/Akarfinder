#!/usr/bin/env tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const OUTPUT = join(process.cwd(), "data/audits/runtime/carte-c2b-rabat-price-gap.json");
const TARGETS = ["agdal", "hay-riad", "souissi", "hassan"];

function err(e: any) {
  return JSON.stringify({ message: e?.message, code: e?.code, details: e?.details, hint: e?.hint, status: e?.status });
}

async function main() {
  const db: any = getSupabaseServerClient();
  const { data, error } = await db
    .from("odm_neighborhood_offer_shadow_listing_v1")
    .select("neighborhood_slug,transaction_type,source_domain,price_per_m2_mad,price_per_m2_source,price_mad,surface_m2,freshness_status")
    .in("neighborhood_slug", TARGETS);
  if (error) throw new Error(`C2B bounded read failed: ${err(error)}`);

  const rows = data ?? [];
  const groups = new Map<string, any>();
  for (const row of rows) {
    const key = [row.neighborhood_slug, row.transaction_type ?? "unknown", row.source_domain ?? "unknown"].join("|");
    const g = groups.get(key) ?? {
      neighborhoodSlug: row.neighborhood_slug,
      transactionType: row.transaction_type ?? "unknown",
      sourceDomain: row.source_domain ?? "unknown",
      listings: 0,
      withPricePerM2: 0,
      withPrice: 0,
      withSurface: 0,
      normalizedPricePerM2: 0,
      derivedPricePerM2: 0,
      freshConfirmed: 0,
    };
    g.listings += 1;
    if (Number(row.price_per_m2_mad) > 0) g.withPricePerM2 += 1;
    if (Number(row.price_mad) > 0) g.withPrice += 1;
    if (Number(row.surface_m2) > 0) g.withSurface += 1;
    if (row.price_per_m2_source === "normalized_price_m2") g.normalizedPricePerM2 += 1;
    if (row.price_per_m2_source === "derived_exact_price_surface") g.derivedPricePerM2 += 1;
    if (row.freshness_status === "fresh_confirmed") g.freshConfirmed += 1;
    groups.set(key, g);
  }

  const bySource = [...groups.values()].sort((a, b) => b.listings - a.listings || a.sourceDomain.localeCompare(b.sourceDomain));
  const total = rows.length;
  const withPricePerM2 = rows.filter((r: any) => Number(r.price_per_m2_mad) > 0).length;
  const missingPriceButHasSurface = rows.filter((r: any) => !(Number(r.price_mad) > 0) && Number(r.surface_m2) > 0).length;
  const hasPriceButMissingSurface = rows.filter((r: any) => Number(r.price_mad) > 0 && !(Number(r.surface_m2) > 0)).length;
  const neither = rows.filter((r: any) => !(Number(r.price_mad) > 0) && !(Number(r.surface_m2) > 0)).length;

  const report = {
    contractVersion: "carte_c2b_rabat_price_gap_v1",
    readOnly: true,
    source: "odm_neighborhood_offer_shadow_listing_v1_bounded",
    targetSlugs: TARGETS,
    totalListings: total,
    withPricePerM2,
    pricePerM2CoveragePct: total ? Number(((withPricePerM2 / total) * 100).toFixed(2)) : 0,
    missingPriceButHasSurface,
    hasPriceButMissingSurface,
    neitherPriceNorSurface: neither,
    bySource,
    verdict: withPricePerM2 >= 10 ? "C2B_PRICE_COVERAGE_REVIEWABLE" : "C2B_PRICE_COVERAGE_INSUFFICIENT",
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
