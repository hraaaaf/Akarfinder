// Server-only Neon equivalents of the public listing read path.
// This file is intentionally read-only and is activated only when
// DATABASE_PROVIDER=neon is explicitly selected.
import type {
  DbListingRow,
  DbListingsQuery,
  DbListingsResult,
  DbStats,
} from "@/lib/listings/db-listings";
import { isMarketIndexReadEnabled } from "@/lib/market-index/market-index-feature-flags";
import { NeonMarketIndexReadRepository } from "@/lib/market-index/neon-market-index-read-repository";
import {
  resolveSourcesForListings,
  logMarketIndexReadMetrics,
} from "@/lib/market-index/market-index-read-service";
import type { ReadCandidateSource } from "@/lib/market-index/market-index-read-adapter";
import { neonExecutor, type NeonQueryExecutor } from "./neon-client";
export type { NeonQueryExecutor } from "./neon-client";

type NeonSourceRow = {
  id: number;
  origin_type: string | null;
  source_name: string;
  listing_url: string;
  source_url: string | null;
  is_active: boolean;
  first_seen_at: string;
};

type NeonListingRow = Omit<
  DbListingRow,
  | "field_confidence"
  | "reliability_reasons"
  | "premium_features"
  | "has_pool"
  | "has_concierge"
  | "has_moroccan_living_room"
  | "has_european_living_room"
  | "has_equipped_kitchen"
  | "source_name"
  | "listing_url"
  | "source_url"
  | "origin_type"
> & {
  field_confidence: unknown;
  reliability_reasons: unknown;
  premium_features: unknown;
  has_pool: boolean | null;
  has_concierge: boolean | null;
  has_moroccan_living_room: boolean | null;
  has_european_living_room: boolean | null;
  has_equipped_kitchen: boolean | null;
  listing_sources?: NeonSourceRow[] | null;
};

function jsonToString(value: unknown): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function boolToSqlite(value: boolean | null): number {
  return value === true ? 1 : 0;
}

function mapToDbRow(
  row: NeonListingRow,
  resolvedSource?: ReadCandidateSource | null,
): DbListingRow {
  const {
    listing_sources: listingSources,
    field_confidence: fieldConfidence,
    reliability_reasons: reliabilityReasons,
    premium_features: premiumFeatures,
    has_pool: hasPool,
    has_concierge: hasConcierge,
    has_moroccan_living_room: hasMoroccanLivingRoom,
    has_european_living_room: hasEuropeanLivingRoom,
    has_equipped_kitchen: hasEquippedKitchen,
    ...base
  } = row;

  const sources = listingSources ?? [];
  const activeSource =
    resolvedSource !== undefined
      ? resolvedSource
      : sources.find((source) => source.is_active) ?? sources[0] ?? null;

  return {
    ...base,
    field_confidence: jsonToString(fieldConfidence),
    reliability_reasons: jsonToString(reliabilityReasons),
    premium_features: jsonToString(premiumFeatures),
    has_pool: boolToSqlite(hasPool),
    has_concierge: boolToSqlite(hasConcierge),
    has_moroccan_living_room: boolToSqlite(hasMoroccanLivingRoom),
    has_european_living_room: boolToSqlite(hasEuropeanLivingRoom),
    has_equipped_kitchen: boolToSqlite(hasEquippedKitchen),
    source_name: activeSource?.source_name ?? null,
    listing_url: activeSource?.listing_url ?? null,
    source_url: activeSource?.source_url ?? null,
    origin_type: activeSource?.origin_type ?? null,
  };
}

function toReadCandidateSources(
  sources: NeonSourceRow[] | null | undefined,
): ReadCandidateSource[] {
  return (sources ?? []).map((source) => ({
    id: source.id,
    source_name: source.source_name,
    listing_url: source.listing_url,
    source_url: source.source_url,
    is_active: source.is_active,
    origin_type: source.origin_type,
  }));
}

async function resolveSingleListingSource(
  row: NeonListingRow,
  executor: NeonQueryExecutor,
): Promise<ReadCandidateSource | null | undefined> {
  if (!isMarketIndexReadEnabled()) return undefined;

  const repository = new NeonMarketIndexReadRepository(executor);
  const { picks, metrics } = await resolveSourcesForListings(repository, [
    { id: row.id, sources: toReadCandidateSources(row.listing_sources) },
  ]);
  logMarketIndexReadMetrics(metrics);

  const outcome = picks.get(row.id);
  return outcome?.usedMarketIndex ? outcome.source : undefined;
}

async function resolveBatchListingSources(
  rows: NeonListingRow[],
  executor: NeonQueryExecutor,
): Promise<Map<number, ReadCandidateSource | null>> {
  const result = new Map<number, ReadCandidateSource | null>();
  if (!isMarketIndexReadEnabled() || rows.length === 0) return result;

  const repository = new NeonMarketIndexReadRepository(executor);
  const listings = rows.map((row) => ({
    id: row.id,
    sources: toReadCandidateSources(row.listing_sources),
  }));
  const { picks, metrics } = await resolveSourcesForListings(repository, listings);
  logMarketIndexReadMetrics(metrics);

  for (const [listingId, outcome] of picks) {
    if (outcome.usedMarketIndex) result.set(listingId, outcome.source);
  }

  return result;
}

function normalizePropertyType(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "appartement" || normalized === "apartment") return "apartment";
  if (normalized === "terrain" || normalized === "land") return "land";
  if (normalized === "bureau" || normalized === "office") return "office";
  if (normalized === "villa") return "villa";
  if (normalized === "riad") return "riad";
  return value;
}

function normalizeTransactionType(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "buy" || normalized === "sale" || normalized === "achat") return "sale";
  if (normalized === "rent" || normalized === "location") return "rent";
  if (normalized === "new" || normalized === "neuf") return "new";
  return value;
}

type WhereParts = {
  clause: string;
  params: unknown[];
};

function buildWhere(query: DbListingsQuery): WhereParts {
  const conditions: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    conditions.push(sql.replace("?", () => "$" + params.length));
  };

  const propertyType = normalizePropertyType(query.property_type);
  const transactionType = normalizeTransactionType(query.transaction_type);

  if (query.city) add("pl.city = ?", query.city);
  if (propertyType) add("pl.property_type = ?", propertyType);
  if (transactionType) add("pl.transaction_type = ?", transactionType);
  if (query.min_price != null) add("pl.price_mad >= ?", query.min_price);
  if (query.max_price != null) add("pl.price_mad <= ?", query.max_price);
  if (query.min_surface != null) add("pl.surface_m2 >= ?", query.min_surface);
  if (query.max_surface != null) add("pl.surface_m2 <= ?", query.max_surface);
  if (query.bedrooms != null) add("pl.bedrooms_count = ?", query.bedrooms);

  return {
    clause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

const LISTING_SELECT = `
  SELECT
    pl.*,
    source_bundle.listing_sources
  FROM property_listings pl
  LEFT JOIN LATERAL (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', ls.id,
          'origin_type', ls.origin_type,
          'source_name', ls.source_name,
          'listing_url', ls.listing_url,
          'source_url', ls.source_url,
          'is_active', ls.is_active,
          'first_seen_at', ls.first_seen_at
        )
        ORDER BY ls.first_seen_at ASC
      ),
      '[]'::jsonb
    ) AS listing_sources
    FROM listing_sources ls
    WHERE ls.property_listing_id = pl.id
  ) source_bundle ON TRUE
`;

export async function queryNeonListings(
  query: DbListingsQuery = {},
  executor: NeonQueryExecutor = neonExecutor,
): Promise<DbListingsResult> {
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 500);
  const offset = Math.max(query.offset ?? 0, 0);
  const where = buildWhere(query);

  const countRows = await executor.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM property_listings pl ${where.clause}`,
    where.params,
  );

  const limitParam = where.params.length + 1;
  const offsetParam = where.params.length + 2;
  const rows = await executor.query<NeonListingRow>(
    `${LISTING_SELECT}
     ${where.clause}
     ORDER BY pl.data_completeness_score DESC, pl.updated_at DESC, pl.id DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    [...where.params, limit, offset],
  );

  const resolvedByListingId = await resolveBatchListingSources(rows, executor);
  return {
    listings: rows.map((row) =>
      mapToDbRow(row, resolvedByListingId.get(row.id)),
    ),
    total: Number(countRows[0]?.total ?? 0),
  };
}

export type NeonStructuredDistrictCountFilter = {
  cityVariants: string[];
  district: string;
  property_type?: string;
  transaction_type?: string;
  min_price?: number;
  max_price?: number;
  min_surface?: number;
  max_surface?: number;
};

export async function queryNeonStructuredDistrictTotal(
  filter: NeonStructuredDistrictCountFilter,
  executor: NeonQueryExecutor = neonExecutor,
): Promise<number> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    conditions.push(sql.replace("?", "$" + params.length));
  };

  add("pl.district = ?", filter.district);

  if (filter.cityVariants.length === 1) {
    add("pl.city = ?", filter.cityVariants[0]);
  } else if (filter.cityVariants.length > 1) {
    params.push(filter.cityVariants);
    conditions.push("pl.city = ANY($" + params.length + "::text[])");
  }

  const propertyType = normalizePropertyType(filter.property_type);
  const transactionType = normalizeTransactionType(filter.transaction_type);
  if (propertyType) add("pl.property_type = ?", propertyType);
  if (transactionType) add("pl.transaction_type = ?", transactionType);
  if (filter.min_price != null) add("pl.price_mad >= ?", filter.min_price);
  if (filter.max_price != null) add("pl.price_mad <= ?", filter.max_price);
  if (filter.min_surface != null) add("pl.surface_m2 >= ?", filter.min_surface);
  if (filter.max_surface != null) add("pl.surface_m2 <= ?", filter.max_surface);

  const rows = await executor.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM property_listings pl
     WHERE ${conditions.join(" AND ")}`,
    params,
  );
  return Number(rows[0]?.total ?? 0);
}

export async function queryNeonListingById(
  id: number,
  executor: NeonQueryExecutor = neonExecutor,
): Promise<DbListingRow | null> {
  const rows = await executor.query<NeonListingRow>(
    `${LISTING_SELECT}
     WHERE pl.id = $1
     LIMIT 1`,
    [id],
  );

  const row = rows[0];
  if (!row) return null;

  const resolvedSource = await resolveSingleListingSource(row, executor);
  return mapToDbRow(row, resolvedSource);
}

type AvgRow = {
  data_completeness_score: number | null;
  reliability_score: number | null;
};

type DuplicateRow = {
  duplicate_group_id: string | null;
};

export async function queryNeonStats(
  executor: NeonQueryExecutor = neonExecutor,
): Promise<DbStats> {
  const [totalRows, avgRows, duplicateRows] = await Promise.all([
    executor.query<{ total: number }>(
      "SELECT COUNT(*)::int AS total FROM property_listings",
    ),
    executor.query<AvgRow>(
      "SELECT data_completeness_score, reliability_score FROM property_listings LIMIT 5000",
    ),
    executor.query<DuplicateRow>(
      "SELECT duplicate_group_id FROM property_listings WHERE duplicate_group_id IS NOT NULL LIMIT 5000",
    ),
  ]);

  const avgCompleteness =
    avgRows.length > 0
      ? Math.round(
          (avgRows.reduce((sum, row) => sum + (row.data_completeness_score ?? 0), 0) /
            avgRows.length) *
            10,
        ) / 10
      : 0;

  const reliabilityRows = avgRows.filter((row) => row.reliability_score != null);
  const avgReliability =
    reliabilityRows.length > 0
      ? Math.round(
          (reliabilityRows.reduce((sum, row) => sum + (row.reliability_score ?? 0), 0) /
            reliabilityRows.length) *
            10,
        ) / 10
      : 0;

  return {
    total_listings: Number(totalRows[0]?.total ?? 0),
    avg_completeness: avgCompleteness,
    duplicates_detected: new Set(
      duplicateRows.map((row) => row.duplicate_group_id).filter(Boolean),
    ).size,
    avg_reliability: avgReliability,
  };
}