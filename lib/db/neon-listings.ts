// Server-only Neon equivalents of the public listing read path.
// This file is intentionally read-only. It does not migrate schema/data and
// it is not activated unless DATABASE_PROVIDER=neon is explicitly selected.
import type {
  DbListingRow,
  DbListingsQuery,
  DbListingsResult,
  DbStats,
} from "@/lib/listings/db-listings";
import { isMarketIndexReadEnabled } from "@/lib/market-index/market-index-feature-flags";
import { neonExecutor, type NeonQueryExecutor } from "./neon-client";

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
> & {
  field_confidence: unknown;
  reliability_reasons: unknown;
  premium_features: unknown;
  has_pool: boolean | null;
  has_concierge: boolean | null;
  has_moroccan_living_room: boolean | null;
  has_european_living_room: boolean | null;
  has_equipped_kitchen: boolean | null;
};

function jsonToString(value: unknown): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function boolToSqlite(value: boolean | null): number {
  return value === true ? 1 : 0;
}

function mapToDbRow(row: NeonListingRow): DbListingRow {
  return {
    ...row,
    field_confidence: jsonToString(row.field_confidence),
    reliability_reasons: jsonToString(row.reliability_reasons),
    premium_features: jsonToString(row.premium_features),
    has_pool: boolToSqlite(row.has_pool),
    has_concierge: boolToSqlite(row.has_concierge),
    has_moroccan_living_room: boolToSqlite(row.has_moroccan_living_room),
    has_european_living_room: boolToSqlite(row.has_european_living_room),
    has_equipped_kitchen: boolToSqlite(row.has_equipped_kitchen),
  };
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
    conditions.push(sql.replace("?", `$${params.length}`));
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
    source_pick.source_name,
    source_pick.listing_url,
    source_pick.source_url,
    source_pick.origin_type
  FROM property_listings pl
  LEFT JOIN LATERAL (
    SELECT
      ls.source_name,
      ls.listing_url,
      ls.source_url,
      ls.origin_type
    FROM listing_sources ls
    WHERE ls.property_listing_id = pl.id
    ORDER BY ls.is_active DESC, ls.first_seen_at ASC
    LIMIT 1
  ) source_pick ON TRUE
`;

function assertSupportedReadFlags(): void {
  if (isMarketIndexReadEnabled()) {
    throw new Error(
      "[neon-listings] MARKET_INDEX_READ_ENABLED must remain false until the Neon Market Index repository is ported",
    );
  }
}

export async function queryNeonListings(
  query: DbListingsQuery = {},
  executor: NeonQueryExecutor = neonExecutor,
): Promise<DbListingsResult> {
  assertSupportedReadFlags();

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

  return {
    listings: rows.map(mapToDbRow),
    total: Number(countRows[0]?.total ?? 0),
  };
}

export async function queryNeonListingById(
  id: number,
  executor: NeonQueryExecutor = neonExecutor,
): Promise<DbListingRow | null> {
  assertSupportedReadFlags();

  const rows = await executor.query<NeonListingRow>(
    `${LISTING_SELECT}
     WHERE pl.id = $1
     LIMIT 1`,
    [id],
  );

  return rows[0] ? mapToDbRow(rows[0]) : null;
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
  assertSupportedReadFlags();

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
