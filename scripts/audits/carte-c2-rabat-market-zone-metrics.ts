#!/usr/bin/env tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { RABAT_MARKET_ZONES_SHADOW } from "@/lib/geo/rabat-market-zones-shadow";
import { buildMarketZoneMetricRow } from "@/lib/map/rabat-market-zone-metrics";

const OUTPUT = join(process.cwd(), "data/audits/runtime/carte-c2-rabat-market-zone-metrics.json");
const METRIC_SLUG_BY_ZONE: Record<string, string> = {
  market_zone_rabat_agdal: "agdal",
  market_zone_rabat_hay_riad: "hay-riad",
  market_zone_rabat_souissi: "souissi",
  market_zone_rabat_centre: "hassan",
};

function errorText(error: any): string {
  if (!error) return "unknown";
  return JSON.stringify({ message: error.message, code: error.code, details: error.details, hint: error.hint, status: error.status });
}

async function main() {
  const db: any = getSupabaseServerClient();
  const slugs = Object.values(METRIC_SLUG_BY_ZONE);
  const { data, error } = await db
    .from("odm_neighborhood_offer_shadow_segment_v1")
    .select("neighborhood_slug,transaction_type,listing_count,price_per_m2_sample_count,median_price_per_m2_mad,metric_state,public_activation,metric_layers_activated")
    .in("neighborhood_slug", slugs);
  if (error) throw new Error(`C2 bounded Shadow read failed: ${errorText(error)}`);

  const segments = data ?? [];
  const rows = RABAT_MARKET_ZONES_SHADOW.flatMap((zone) => {
    const slug = METRIC_SLUG_BY_ZONE[zone.id];
    const matches = segments.filter((row: any) => row.neighborhood_slug === slug);
    if (matches.length === 0) {
      return [buildMarketZoneMetricRow({
        zoneId: zone.id,
        displayName: zone.displayName,
        transactionType: "no_observation",
        areaKm2: zone.areaKm2,
        listingCount: 0,
        pricePerM2SampleCount: 0,
        medianPricePerM2Mad: null,
      })];
    }
    return matches.map((row: any) => {
      if (row.metric_state !== "shadow" || row.public_activation !== false || row.metric_layers_activated !== false) {
        throw new Error(`C2 Shadow boundary drift for ${zone.id}/${row.transaction_type}`);
      }
      return buildMarketZoneMetricRow({
        zoneId: zone.id,
        displayName: zone.displayName,
        transactionType: String(row.transaction_type ?? "unknown"),
        areaKm2: zone.areaKm2,
        listingCount: Number(row.listing_count ?? 0),
        pricePerM2SampleCount: Number(row.price_per_m2_sample_count ?? 0),
        medianPricePerM2Mad: row.median_price_per_m2_mad == null ? null : Number(row.median_price_per_m2_mad),
      });
    });
  });

  const observedZones = new Set(rows.filter((row) => row.transactionType !== "no_observation").map((row) => row.zoneId));
  const report = {
    contractVersion: "carte_c2_rabat_market_zone_metrics_v1",
    state: "shadow",
    publicActivation: false,
    marketRepresentativenessCertified: false,
    zoneCount: RABAT_MARKET_ZONES_SHADOW.length,
    observedZoneCount: observedZones.size,
    dataGapZoneCount: RABAT_MARKET_ZONES_SHADOW.length - observedZones.size,
    rows,
    verdict: observedZones.size === RABAT_MARKET_ZONES_SHADOW.length
      ? "C2_RABAT_METRICS_SHADOW_OBSERVED"
      : "C2_RABAT_METRICS_DATA_GAP",
  };
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
