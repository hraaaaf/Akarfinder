import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { RABAT_MARKET_ZONES_SHADOW } from "@/lib/geo/rabat-market-zones-shadow";
import { buildMarketZoneMetricRow } from "@/lib/map/rabat-market-zone-metrics";
import { evaluateMetricReliability } from "@/lib/map/market-metric-reliability";
import type { IntelligenceMetricInput } from "@/lib/map/intelligence-payload";

const TARGETS = ["agdal", "hay-riad", "souissi", "hassan"] as const;
const CHUNK_SIZE = 100;
const MAX_TARGET_EVENTS = 1000;

const ZONE_BY_NEIGHBORHOOD: ReadonlyMap<string, string> = new Map<string, string>([
  ["agdal", "market_zone_rabat_agdal"],
  ["hay-riad", "market_zone_rabat_hay_riad"],
  ["souissi", "market_zone_rabat_souissi"],
  ["hassan", "market_zone_rabat_centre"],
]);

function chunks<T>(values: readonly T[], size = CHUNK_SIZE): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < values.length; index += size) output.push(values.slice(index, index + size) as T[]);
  return output;
}

function errorDetails(error: any): string {
  return JSON.stringify({
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    status: error?.status,
  });
}

function newer(a: any, b: any): boolean {
  if (!b) return true;
  if (String(a.created_at) !== String(b.created_at)) return String(a.created_at) > String(b.created_at);
  return String(a.id) > String(b.id);
}

function normalizeTransaction(value: unknown): "sale" | "rent" | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["sale", "buy", "new", "achat", "vente"].includes(normalized)) return "sale";
  if (["rent", "location", "louer"].includes(normalized)) return "rent";
  return null;
}

async function readByIds(
  db: any,
  table: string,
  select: string,
  key: string,
  ids: readonly string[],
): Promise<any[]> {
  if (!ids.length) return [];
  const rows: any[] = [];
  for (const batch of chunks(ids)) {
    const { data, error } = await db.from(table).select(select).in(key, batch);
    if (error) throw new Error(`C3 ${table} bounded read failed: ${errorDetails(error)}`);
    rows.push(...(data ?? []));
  }
  return rows;
}

function canonicalDedupKey(row: any): string {
  const canonical = String(row.canonical_url ?? "").trim().toLowerCase().replace(/\/+$/, "");
  return canonical || `seed:${row.seed_id}`;
}

export async function readRabatMarketIntelligenceMetrics(): Promise<readonly IntelligenceMetricInput[]> {
  const db: any = getSupabaseServerClient();

  const { data: cityRows, error: cityError } = await db
    .from("geo_entities")
    .select("id,slug,entity_type,validation_status")
    .eq("entity_type", "city")
    .eq("slug", "rabat")
    .eq("validation_status", "validated")
    .limit(2);
  if (cityError) throw new Error(`C3 Rabat city read failed: ${errorDetails(cityError)}`);
  if ((cityRows ?? []).length !== 1) throw new Error(`C3 expected exactly one validated Rabat city, got ${(cityRows ?? []).length}`);
  const rabatCityId = String(cityRows[0].id);

  const { data: neighborhoodRows, error: neighborhoodError } = await db
    .from("geo_entities")
    .select("id,slug,parent_id,entity_type,validation_status")
    .eq("entity_type", "neighborhood")
    .eq("parent_id", rabatCityId)
    .eq("validation_status", "validated")
    .in("slug", [...TARGETS]);
  if (neighborhoodError) throw new Error(`C3 neighborhoods read failed: ${errorDetails(neighborhoodError)}`);

  const neighborhoodById = new Map<string, string>(
    (neighborhoodRows ?? []).map((row: any): [string, string] => [String(row.id), String(row.slug)]),
  );
  const foundSlugs = new Set<string>(neighborhoodById.values());
  for (const slug of TARGETS) if (!foundSlugs.has(slug)) throw new Error(`C3 missing validated Rabat neighborhood: ${slug}`);
  const targetNeighborhoodIds: string[] = [...neighborhoodById.keys()];

  const { data: targetEvents, error: targetEventsError } = await db
    .from("geo_resolution_events")
    .select("id,source_record_type,source_record_id,resolution_status,resolved_city_id,resolved_neighborhood_id,created_at")
    .eq("source_record_type", "source_offer_seed")
    .eq("resolution_status", "resolved")
    .in("resolved_neighborhood_id", targetNeighborhoodIds)
    .range(0, MAX_TARGET_EVENTS - 1);
  if (targetEventsError) throw new Error(`C3 target resolution event read failed: ${errorDetails(targetEventsError)}`);
  if ((targetEvents ?? []).length >= MAX_TARGET_EVENTS) throw new Error("C3 target resolution event safety bound reached");

  const candidateSeedIds: string[] = [...new Set<string>(
    (targetEvents ?? []).map((row: any) => String(row.source_record_id)).filter((value: string) => value.length > 0),
  )];
  const allCandidateEvents = await readByIds(
    db,
    "geo_resolution_events",
    "id,source_record_type,source_record_id,resolution_status,resolved_city_id,resolved_neighborhood_id,created_at",
    "source_record_id",
    candidateSeedIds,
  );

  const latest = new Map<string, any>();
  for (const event of allCandidateEvents) {
    if (event.source_record_type !== "source_offer_seed") continue;
    const seedId = String(event.source_record_id);
    if (newer(event, latest.get(seedId))) latest.set(seedId, event);
  }

  const currentEvents = [...latest.values()].filter((event: any) =>
    event.resolution_status === "resolved" &&
    neighborhoodById.has(String(event.resolved_neighborhood_id)) &&
    (!event.resolved_city_id || String(event.resolved_city_id) === rabatCityId),
  );
  const currentSeedIds: string[] = currentEvents.map((event: any) => String(event.source_record_id));

  const docsRows = await readByIds(
    db,
    "thin_index_search_documents",
    "seed_id,canonical_url,vertical_classification,document_kind,display_eligibility,normalized_intent,normalized_price_mad,normalized_surface_m2,normalized_price_m2,freshness_status,updated_at",
    "seed_id",
    currentSeedIds,
  );
  const seedRows = await readByIds(db, "source_offer_seeds", "id,source_domain", "id", currentSeedIds);
  const docs = new Map<string, any>(docsRows.map((row: any): [string, any] => [String(row.seed_id), row]));
  const seeds = new Map<string, any>(seedRows.map((row: any): [string, any] => [String(row.id), row]));

  const eventBySeed = new Map<string, any>(
    currentEvents.map((event: any): [string, any] => [String(event.source_record_id), event]),
  );
  const eligible = currentSeedIds.flatMap((seedId) => {
    const doc = docs.get(seedId);
    const seed = seeds.get(seedId);
    const event = eventBySeed.get(seedId);
    if (!doc || !seed || !event) return [];
    if (doc.vertical_classification !== "real_estate_likely" || doc.document_kind !== "LISTING") return [];
    if (!["eligible_primary", "eligible_secondary"].includes(doc.display_eligibility)) return [];
    const transaction = normalizeTransaction(doc.normalized_intent);
    if (!transaction) return [];
    const neighborhoodSlug = neighborhoodById.get(String(event.resolved_neighborhood_id));
    const zoneId = neighborhoodSlug ? ZONE_BY_NEIGHBORHOOD.get(neighborhoodSlug) : undefined;
    if (!zoneId) return [];
    const normalizedPriceM2 = Number(doc.normalized_price_m2) > 0 ? Number(doc.normalized_price_m2) : null;
    const price = Number(doc.normalized_price_mad) > 0 ? Number(doc.normalized_price_mad) : null;
    const surface = Number(doc.normalized_surface_m2) > 0 ? Number(doc.normalized_surface_m2) : null;
    const effectivePriceM2 = normalizedPriceM2 ?? (price != null && surface != null ? price / surface : null);
    return [{
      seedId,
      zoneId,
      transaction,
      canonicalUrl: doc.canonical_url,
      updatedAt: doc.updated_at,
      pricePerM2: effectivePriceM2,
      fresh: doc.freshness_status === "fresh_confirmed",
      sourceDomain: String(seed.source_domain ?? "unknown"),
    }];
  });

  const deduped = new Map<string, (typeof eligible)[number]>();
  for (const row of [...eligible].sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")))) {
    const key = canonicalDedupKey({ canonical_url: row.canonicalUrl, seed_id: row.seedId });
    if (!deduped.has(key)) deduped.set(key, row);
  }
  const rows = [...deduped.values()];
  const snapshotTimestamp = rows.reduce((max, row) => String(row.updatedAt ?? "") > max ? String(row.updatedAt ?? "") : max, "");
  const snapshotVersion = `rabat-observed-v1:${snapshotTimestamp || "no-updated-at"}:${rows.length}`;

  const zoneById = new Map<string, (typeof RABAT_MARKET_ZONES_SHADOW)[number]>(
    RABAT_MARKET_ZONES_SHADOW.map((zone): [string, (typeof RABAT_MARKET_ZONES_SHADOW)[number]] => [zone.id, zone]),
  );
  const output: IntelligenceMetricInput[] = [];
  for (const zoneId of ZONE_BY_NEIGHBORHOOD.values()) {
    const zone = zoneById.get(zoneId);
    if (!zone) throw new Error(`C3 missing market zone record ${zoneId}`);
    for (const transaction of ["sale", "rent"] as const) {
      const scoped = rows.filter((row) => row.zoneId === zoneId && row.transaction === transaction);
      const priceObservations = scoped.flatMap((row) => row.pricePerM2 != null ? [{
        value: row.pricePerM2,
        fresh: row.fresh,
        sourceDomain: row.sourceDomain,
      }] : []);
      const reliability = evaluateMetricReliability({ listingCount: scoped.length, observations: priceObservations });
      const base = buildMarketZoneMetricRow({
        zoneId,
        displayName: zone.displayName,
        transactionType: transaction,
        areaKm2: zone.areaKm2,
        listingCount: scoped.length,
        pricePerM2SampleCount: reliability.sampleCount,
        medianPricePerM2Mad: reliability.median,
      });
      output.push({
        ...base,
        priceReliability: reliability.level,
        freshnessStatus: scoped.length && scoped.every((row) => row.fresh) ? "fresh_confirmed" : scoped.some((row) => row.fresh) ? "mixed" : "unconfirmed",
        snapshotVersion,
      });
    }
  }

  return output;
}
