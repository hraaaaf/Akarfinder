#!/usr/bin/env tsx
// P1C.1 — live read-only preflight for neighborhood offer Shadow metrics.
// Replays the P1B.3 latest-event-first contract from bounded base-table reads so
// CI does not depend on a full SELECT from the comparatively expensive join view.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";

const OUTPUT = join(process.cwd(), "data/audits/runtime/p1c1-neighborhood-offer-shadow-preflight.json");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 1000;
const IN_CHUNK = 100;

function positive(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function newer(a: any, b: any): boolean {
  if (!b) return true;
  if (String(a.created_at) !== String(b.created_at)) return String(a.created_at) > String(b.created_at);
  return String(a.id) > String(b.id);
}
function chunks<T>(values: T[], size = IN_CHUNK): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

async function readAllResolutionEvents(db: any): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const response = await db.from("geo_resolution_events")
      .select("id,source_record_type,source_record_id,resolution_status,resolved_city_id,resolved_neighborhood_id,resolver_version,created_at")
      .eq("source_record_type", "source_offer_seed")
      .range(from, from + PAGE_SIZE - 1);
    if (response.error) throw new Error(`P1C.1 resolution events read failed: ${response.error.message}`);
    const page = response.data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
    if (rows.length > 100000) throw new Error("P1C.1 resolution event safety bound exceeded");
  }
}

async function readByIds(db: any, table: string, select: string, key: string, ids: string[]): Promise<any[]> {
  if (ids.length === 0) return [];
  const rows: any[] = [];
  for (const batch of chunks(ids)) {
    const response = await db.from(table).select(select).in(key, batch);
    if (response.error) throw new Error(`P1C.1 ${table} read failed: ${response.error.message}`);
    rows.push(...(response.data ?? []));
  }
  return rows;
}

export async function runP1C1NeighborhoodOfferShadowPreflight() {
  const db: any = getSupabaseServerClient();
  const [events, geoR] = await Promise.all([
    readAllResolutionEvents(db),
    db.rpc("odm_territorial_metric_join_report_v1"),
  ]);
  if (geoR.error) throw new Error(`P1C.1 territorial report failed: ${geoR.error.message}`);

  const geoRaw = geoR.data;
  const geo = Array.isArray(geoRaw) ? (geoRaw[0]?.report ?? geoRaw[0]) : (geoRaw?.report ?? geoRaw);
  assert(geo?.contract_version === "p1b3_territorial_metric_join_v1", "P1B.3 contract drift");
  assert(Number(geo.latest_resolution_collisions) === 0, "latest Geo collision blocks P1C.1");
  assert(Number(geo.conflicting_resolution_history) === 0, "conflicting Geo history blocks P1C.1");
  assert(Number(geo.missing_canonical_geo) === 0, "missing canonical Geo blocks P1C.1");
  assert(geo.metric_layers_activated === false, "public territorial metrics are already active unexpectedly");

  // Exact P1B.3 replay: latest event wins for each UUID source_offer_seed record.
  const latest = new Map<string, any>();
  for (const event of events) {
    const id = String(event.source_record_id ?? "");
    if (!UUID_RE.test(id)) continue;
    if (newer(event, latest.get(id))) latest.set(id, event);
  }
  const latestResolved = [...latest.values()].filter(
    (event) => event.resolution_status === "resolved" && String(event.resolved_neighborhood_id ?? "").trim(),
  );
  const candidateIds = latestResolved.map((event) => String(event.source_record_id));
  const docsRows = await readByIds(
    db,
    "thin_index_search_documents",
    "seed_id,vertical_classification,document_kind,display_eligibility,normalized_intent,normalized_property_type,normalized_price_mad,normalized_surface_m2,normalized_price_m2,freshness_status,quality_score,quality_tier",
    "seed_id",
    candidateIds,
  );
  const docs = new Map(docsRows.map((row: any) => [String(row.seed_id), row]));

  const eligibleEvents = latestResolved.filter((event) => {
    const doc: any = docs.get(String(event.source_record_id));
    return Boolean(
      doc &&
      doc.vertical_classification === "real_estate_likely" &&
      doc.document_kind === "LISTING" &&
      ["eligible_primary", "eligible_secondary"].includes(doc.display_eligibility),
    );
  });

  const neighborhoodIds = [...new Set(eligibleEvents.map((event) => String(event.resolved_neighborhood_id)))];
  const neighborhoodRows = await readByIds(
    db,
    "geo_entities",
    "id,entity_type,parent_id,canonical_name,slug,validation_status",
    "id",
    neighborhoodIds,
  );
  const neighborhoods = new Map(neighborhoodRows.map((row: any) => [String(row.id), row]));
  const parentIds = [...new Set(neighborhoodRows.map((row: any) => String(row.parent_id ?? "")).filter(Boolean))];
  const cityRows = await readByIds(
    db,
    "geo_entities",
    "id,entity_type,canonical_name,slug,validation_status",
    "id",
    parentIds,
  );
  const cities = new Map(cityRows.map((row: any) => [String(row.id), row]));

  const joined = eligibleEvents.flatMap((event) => {
    const neighborhood: any = neighborhoods.get(String(event.resolved_neighborhood_id));
    if (!neighborhood || neighborhood.entity_type !== "neighborhood" || neighborhood.validation_status !== "validated") return [];
    const city: any = cities.get(String(neighborhood.parent_id));
    if (!city || city.entity_type !== "city" || city.validation_status !== "validated") return [];
    if (event.resolved_city_id && String(event.resolved_city_id) !== String(city.id)) return [];
    return [{
      seed_id: String(event.source_record_id),
      city_id: String(city.id),
      city_slug: String(city.slug),
      city_name: String(city.canonical_name),
      neighborhood_id: String(neighborhood.id),
      neighborhood_slug: String(neighborhood.slug),
      neighborhood_name: String(neighborhood.canonical_name),
      resolver_version: event.resolver_version,
      resolved_at: event.created_at,
    }];
  });

  const ids = joined.map((row) => row.seed_id);
  assert(ids.length > 0, "P1C.1 has no resolved neighborhood listings");
  assert(new Set(ids).size === ids.length, "P1C.1 P1B.3 replay contains duplicate seed rows");
  assert(ids.length === Number(geo.resolved_neighborhood_listings), `P1C.1 denominator mismatch: replay=${ids.length}, report=${geo.resolved_neighborhood_listings}`);

  const seedsRows = await readByIds(
    db,
    "source_offer_seeds",
    "id,source_domain,last_observed_at,metadata",
    "id",
    ids,
  );
  const seeds = new Map(seedsRows.map((row: any) => [String(row.id), row]));
  assert(seeds.size === ids.length, `P1C.1 seed coverage drift: ${seeds.size}/${ids.length}`);

  const shadowNeighborhoodIds = new Set<string>();
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

  const perNeighborhood = new Map<string, number>();
  for (const joinedRow of joined) {
    const id = joinedRow.seed_id;
    const doc: any = docs.get(id);
    const seed: any = seeds.get(id);
    assert(doc, `P1C.1 eligible document disappeared: ${id}`);
    const price = positive(doc.normalized_price_mad);
    const surface = positive(doc.normalized_surface_m2);
    const normalizedM2 = positive(doc.normalized_price_m2);
    const effectiveM2 = normalizedM2 ?? (price !== null && surface !== null ? price / surface : null);
    const intent = String(doc.normalized_intent ?? "").trim() || "unknown";
    const propertyType = String(doc.normalized_property_type ?? "").trim();
    const neighborhood = joinedRow.neighborhood_id;

    shadowNeighborhoodIds.add(neighborhood);
    segments.add(`${neighborhood}\u0000${intent}`);
    intents.add(intent);
    perNeighborhood.set(neighborhood, (perNeighborhood.get(neighborhood) ?? 0) + 1);
    if (propertyType) { propertyTypes.add(propertyType); withPropertyType += 1; }
    if (intent !== "unknown") withIntent += 1;
    if (price !== null) withPrice += 1;
    if (surface !== null) withSurface += 1;
    if (effectiveM2 !== null) withPriceM2 += 1;
    if (normalizedM2 !== null) normalizedPriceM2 += 1;
    else if (price !== null && surface !== null) derivedPriceM2 += 1;
    if (doc.freshness_status === "fresh_confirmed") freshConfirmed += 1;
    if (doc.freshness_status === "seed_only") seedOnly += 1;
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
      p1b3_replayed_from_base_tables: true,
    },
    geo: {
      contract_version: geo.contract_version,
      resolved_neighborhood_listings: Number(geo.resolved_neighborhood_listings),
      replayed_resolved_neighborhood_listings: rows,
      latest_resolution_collisions: Number(geo.latest_resolution_collisions),
      conflicting_resolution_history: Number(geo.conflicting_resolution_history),
      missing_canonical_geo: Number(geo.missing_canonical_geo),
    },
    shadow: {
      listing_rows: rows,
      neighborhoods: shadowNeighborhoodIds.size,
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
      largest_neighborhood_sample: Math.max(...perNeighborhood.values()),
      smallest_neighborhood_sample: Math.min(...perNeighborhood.values()),
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
