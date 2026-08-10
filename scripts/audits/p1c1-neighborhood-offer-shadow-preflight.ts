#!/usr/bin/env tsx
// P1C.1 — live read-only preflight for neighborhood offer Shadow metrics.
// Reproduces the future view boundary from current production data without creating views or writing data.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const OUTPUT = join(process.cwd(), "data/audits/runtime/p1c1-neighborhood-offer-shadow-preflight.json");

function positive(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

export async function runP1C1NeighborhoodOfferShadowPreflight() {
  const db: any = getSupabaseServerClient();
  const [joinR, geoR] = await Promise.all([
    db.from("odm_territorial_metric_listing_join_v1")
      .select("seed_id,city_id,city_slug,city_name,neighborhood_id,neighborhood_slug,neighborhood_name,resolver_version,resolved_at"),
    db.rpc("odm_territorial_metric_join_report_v1"),
  ]);
  if (joinR.error) throw new Error(`P1C.1 territorial join read failed: ${joinR.error.message}`);
  if (geoR.error) throw new Error(`P1C.1 territorial report failed: ${geoR.error.message}`);

  const geoRaw = geoR.data;
  const geo = Array.isArray(geoRaw) ? (geoRaw[0]?.report ?? geoRaw[0]) : (geoRaw?.report ?? geoRaw);
  assert(geo?.contract_version === "p1b3_territorial_metric_join_v1", "P1B.3 contract drift");
  assert(Number(geo.latest_resolution_collisions) === 0, "latest Geo collision blocks P1C.1");
  assert(Number(geo.conflicting_resolution_history) === 0, "conflicting Geo history blocks P1C.1");
  assert(Number(geo.missing_canonical_geo) === 0, "missing canonical Geo blocks P1C.1");
  assert(geo.metric_layers_activated === false, "public territorial metrics are already active unexpectedly");

  const joined = joinR.data ?? [];
  const ids = joined.map((row: any) => String(row.seed_id));
  assert(ids.length > 0, "P1C.1 has no resolved neighborhood listings");
  assert(new Set(ids).size === ids.length, "P1C.1 territorial join contains duplicate seed rows");
  assert(ids.length === Number(geo.resolved_neighborhood_listings), `P1C.1 denominator mismatch: join=${ids.length}, report=${geo.resolved_neighborhood_listings}`);

  const [docsR, seedsR] = await Promise.all([
    db.from("thin_index_search_documents")
      .select("seed_id,normalized_intent,normalized_property_type,normalized_price_mad,normalized_surface_m2,normalized_price_m2,freshness_status,quality_score,quality_tier,display_eligibility")
      .in("seed_id", ids),
    db.from("source_offer_seeds")
      .select("id,source_domain,last_observed_at,metadata")
      .in("id", ids),
  ]);
  if (docsR.error) throw new Error(`P1C.1 documents read failed: ${docsR.error.message}`);
  if (seedsR.error) throw new Error(`P1C.1 seeds read failed: ${seedsR.error.message}`);

  const docs = new Map((docsR.data ?? []).map((row: any) => [String(row.seed_id), row]));
  const seeds = new Map((seedsR.data ?? []).map((row: any) => [String(row.id), row]));
  assert(docs.size === ids.length, `P1C.1 document coverage drift: ${docs.size}/${ids.length}`);
  assert(seeds.size === ids.length, `P1C.1 seed coverage drift: ${seeds.size}/${ids.length}`);

  const neighborhoodIds = new Set<string>();
  const segments = new Set<string>();
  const propertyTypes = new Set<string>();
  const intents = new Set<string>();
  let withPrice = 0;
  let withSurface = 0;
  let withPriceM2 = 0;
  let derivedPriceM2 = 0;
  let normalizedPriceM2 = 0;
  let freshConfirmed = 0;
  let seedOnly = 0;
  let withPropertyType = 0;
  let withIntent = 0;
  let bridged = 0;

  const neighborhoodRows = new Map<string, number>();
  for (const joinedRow of joined as any[]) {
    const id = String(joinedRow.seed_id);
    const doc: any = docs.get(id);
    const seed: any = seeds.get(id);
    const price = positive(doc?.normalized_price_mad);
    const surface = positive(doc?.normalized_surface_m2);
    const normalizedM2 = positive(doc?.normalized_price_m2);
    const effectiveM2 = normalizedM2 ?? (price !== null && surface !== null ? price / surface : null);
    const intent = String(doc?.normalized_intent ?? "").trim() || "unknown";
    const propertyType = String(doc?.normalized_property_type ?? "").trim();
    const neighborhood = String(joinedRow.neighborhood_id);

    neighborhoodIds.add(neighborhood);
    segments.add(`${neighborhood}\u0000${intent}`);
    intents.add(intent);
    neighborhoodRows.set(neighborhood, (neighborhoodRows.get(neighborhood) ?? 0) + 1);
    if (propertyType) { propertyTypes.add(propertyType); withPropertyType += 1; }
    if (intent !== "unknown") withIntent += 1;
    if (price !== null) withPrice += 1;
    if (surface !== null) withSurface += 1;
    if (effectiveM2 !== null) withPriceM2 += 1;
    if (normalizedM2 !== null) normalizedPriceM2 += 1;
    else if (price !== null && surface !== null) derivedPriceM2 += 1;
    if (doc?.freshness_status === "fresh_confirmed") freshConfirmed += 1;
    if (doc?.freshness_status === "seed_only") seedOnly += 1;
    if (String(seed?.metadata?.coverage_bridge?.property_listing_id ?? "").trim()) bridged += 1;
  }

  const rows = ids.length;
  const pct = (n: number) => Number(((n / rows) * 100).toFixed(2));
  const report = {
    schema_version: "p1c1-neighborhood-offer-shadow-preflight-v1",
    generated_at: new Date().toISOString(),
    contract: {
      read_only: true,
      db_mutation: false,
      public_activation: false,
      reliability_certified: false,
      metric_layers_activated: false,
      fuzzy_geo_inference: false,
      sale_rent_price_medians_mixed: false,
      sample_sizes_disclosed: true,
    },
    geo: {
      contract_version: geo.contract_version,
      resolved_neighborhood_listings: Number(geo.resolved_neighborhood_listings),
      latest_resolution_collisions: Number(geo.latest_resolution_collisions),
      conflicting_resolution_history: Number(geo.conflicting_resolution_history),
      missing_canonical_geo: Number(geo.missing_canonical_geo),
    },
    shadow: {
      listing_rows: rows,
      neighborhoods: neighborhoodIds.size,
      transaction_segments: segments.size,
      intents: [...intents].sort(),
      property_types: [...propertyTypes].sort(),
      rows_with_intent: withIntent,
      rows_with_property_type: withPropertyType,
      rows_with_price: withPrice,
      rows_with_surface: withSurface,
      rows_with_price_per_m2: withPriceM2,
      normalized_price_per_m2_rows: normalizedPriceM2,
      derived_exact_price_surface_rows: derivedPriceM2,
      fresh_confirmed_rows: freshConfirmed,
      seed_only_rows: seedOnly,
      bridged_property_listing_rows: bridged,
      price_coverage_percent: pct(withPrice),
      surface_coverage_percent: pct(withSurface),
      price_per_m2_coverage_percent: pct(withPriceM2),
      intent_coverage_percent: pct(withIntent),
      property_type_coverage_percent: pct(withPropertyType),
      largest_neighborhood_sample: Math.max(...neighborhoodRows.values()),
      smallest_neighborhood_sample: Math.min(...neighborhoodRows.values()),
    },
    observations: {
      price_evidence_incomplete: withPrice < rows,
      price_per_m2_evidence_incomplete: withPriceM2 < rows,
      reliability_engine_required_before_publication: true,
    },
    verdict: "P1C1_NEIGHBORHOOD_OFFER_SHADOW_READY",
    next_boundary: "P1C.2 Reliability Engine after P1C.1 shadow contract is deployed and post-deploy report is certified.",
  };

  assert(bridged === rows, `P1C.1 bridge coverage drift: ${bridged}/${rows}`);
  assert(withIntent > 0 && withPropertyType > 0, "P1C.1 offer dimensions disappeared");
  assert(report.contract.public_activation === false && report.contract.reliability_certified === false, "P1C.1 activation boundary drift");

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  return report;
}

const invoked = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) runP1C1NeighborhoodOfferShadowPreflight().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
