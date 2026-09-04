// Server-only: reads property_listings from the local SQLite database.
// Safe to call when the DB is absent - returns empty results instead of throwing.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const HISTORICAL_DB_PATH = join(
  process.cwd(),
  "scripts/scrapers/output/akarfinder.db"
);

function defaultDbPath(): string {
  return process.env.AKARFINDER_SQLITE_PATH?.trim() || HISTORICAL_DB_PATH;
}

export type DbListingRow = {
  id: number;
  canonical_fingerprint: string;
  title: string | null;
  price_mad: number | null;
  city: string | null;
  district: string | null;
  property_type: string | null;
  transaction_type: string | null;
  surface_m2: number | null;
  rooms_count: number | null;
  bedrooms_count: number | null;
  bathrooms_count: number | null;
  description_snippet: string | null;
  images_count: number | null;
  thumbnail_url: string | null;
  seller_name: string | null;
  data_completeness_score: number;
  field_confidence: string | null;
  created_at: string;
  updated_at: string;
  duplicate_group_id: string | null;
  duplicate_score: number | null;
  reliability_score: number | null;
  reliability_badge: string | null;
  reliability_reasons: string | null;
  built_surface_m2: number | null;
  plot_surface_m2: number | null;
  condition: string | null;
  property_age_range: string | null;
  orientation: string | null;
  floor_type: string | null;
  floors_count: number | null;
  garden_m2: number | null;
  terrace_m2: number | null;
  garage_spaces: number | null;
  has_pool: number | null;
  has_concierge: number | null;
  has_moroccan_living_room: number | null;
  has_european_living_room: number | null;
  has_equipped_kitchen: number | null;
  premium_features: string | null;
  source_name: string | null;
  listing_url: string | null;
  source_url: string | null;
  origin_type?: string | null;
};

export type DbListingsQuery = {
  city?: string;
  property_type?: string;
  transaction_type?: string;
  min_price?: number;
  max_price?: number;
  min_surface?: number;
  max_surface?: number;
  bedrooms?: number;
  limit?: number;
  offset?: number;
};

export type DbListingsResult = {
  listings: DbListingRow[];
  total: number;
};

function normalizePropertyTypeFilter(value?: string) {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "appartement":
    case "apartment": return "apartment";
    case "villa": return "villa";
    case "terrain":
    case "land": return "land";
    case "riad": return "riad";
    case "bureau":
    case "office": return "office";
    default: return value;
  }
}

function normalizeTransactionTypeFilter(value?: string) {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "buy":
    case "sale":
    case "achat": return "sale";
    case "rent":
    case "location": return "rent";
    case "new":
    case "neuf": return "new";
    default: return value;
  }
}

function openReadOnlyDb(dbPath: string) {
  return new DatabaseSync(dbPath, { readOnly: true });
}

export function isDbAvailable(dbPath = defaultDbPath()): boolean {
  return existsSync(dbPath);
}

const ACTIVE_SOURCE_EXISTS = "EXISTS (SELECT 1 FROM listing_sources active_ls WHERE active_ls.property_listing_id = pl.id AND active_ls.is_active = 1)";

export function queryDbListings(
  query: DbListingsQuery = {},
  dbPath = defaultDbPath()
): DbListingsResult {
  if (!isDbAvailable(dbPath)) return { listings: [], total: 0 };

  let db: DatabaseSync | null = null;
  try {
    db = openReadOnlyDb(dbPath);
    const conditions: string[] = [ACTIVE_SOURCE_EXISTS];
    const params: Array<string | number> = [];
    const propertyType = normalizePropertyTypeFilter(query.property_type);
    const transactionType = normalizeTransactionTypeFilter(query.transaction_type);

    if (query.city) { conditions.push("pl.city = ?"); params.push(query.city); }
    if (propertyType) { conditions.push("pl.property_type = ?"); params.push(propertyType); }
    if (transactionType) { conditions.push("pl.transaction_type = ?"); params.push(transactionType); }
    if (query.min_price != null) { conditions.push("pl.price_mad >= ?"); params.push(query.min_price); }
    if (query.max_price != null) { conditions.push("pl.price_mad <= ?"); params.push(query.max_price); }
    if (query.min_surface != null) { conditions.push("pl.surface_m2 >= ?"); params.push(query.min_surface); }
    if (query.max_surface != null) { conditions.push("pl.surface_m2 <= ?"); params.push(query.max_surface); }
    if (query.bedrooms != null) { conditions.push("pl.bedrooms_count = ?"); params.push(query.bedrooms); }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM property_listings pl ${whereClause}`).get(...params) as { total: number } | undefined;

    const rows = db.prepare(`
      SELECT
        pl.*,
        (SELECT ls.source_name FROM listing_sources ls WHERE ls.property_listing_id = pl.id AND ls.is_active = 1 ORDER BY ls.first_seen_at LIMIT 1) AS source_name,
        (SELECT ls.listing_url FROM listing_sources ls WHERE ls.property_listing_id = pl.id AND ls.is_active = 1 ORDER BY ls.first_seen_at LIMIT 1) AS listing_url,
        (SELECT ls.source_url FROM listing_sources ls WHERE ls.property_listing_id = pl.id AND ls.is_active = 1 ORDER BY ls.first_seen_at LIMIT 1) AS source_url
      FROM property_listings pl
      ${whereClause}
      ORDER BY pl.data_completeness_score DESC, pl.updated_at DESC, pl.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as DbListingRow[];

    return { listings: rows, total: countRow?.total ?? 0 };
  } catch (error) {
    console.error("[db-listings]", error instanceof Error ? error.message : String(error));
    return { listings: [], total: 0 };
  } finally {
    try { db?.close(); } catch { /* ignore */ }
  }
}

export type DbStats = {
  total_listings: number;
  avg_completeness: number;
  duplicates_detected: number;
  avg_reliability: number;
};

export function queryDbStats(dbPath = defaultDbPath()): DbStats {
  const empty: DbStats = { total_listings: 0, avg_completeness: 0, duplicates_detected: 0, avg_reliability: 0 };
  if (!isDbAvailable(dbPath)) return empty;

  let db: DatabaseSync | null = null;
  try {
    db = openReadOnlyDb(dbPath);
    const row = db.prepare(`
      SELECT
        COUNT(*) AS total_listings,
        ROUND(AVG(data_completeness_score), 1) AS avg_completeness,
        COUNT(DISTINCT duplicate_group_id) AS duplicates_detected,
        ROUND(AVG(CASE WHEN reliability_score IS NOT NULL THEN reliability_score END), 1) AS avg_reliability
      FROM property_listings pl
      WHERE ${ACTIVE_SOURCE_EXISTS}
    `).get() as { total_listings: number; avg_completeness: number; duplicates_detected: number; avg_reliability: number } | undefined;
    return row ?? empty;
  } catch {
    return empty;
  } finally {
    try { db?.close(); } catch { /* ignore */ }
  }
}

export function getDbListingById(
  id: string,
  dbPath = defaultDbPath()
): DbListingRow | null {
  if (!isDbAvailable(dbPath)) return null;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  let db: DatabaseSync | null = null;
  try {
    db = openReadOnlyDb(dbPath);
    const row = db.prepare(`
      SELECT
        pl.*,
        (SELECT ls.source_name FROM listing_sources ls WHERE ls.property_listing_id = pl.id AND ls.is_active = 1 ORDER BY ls.first_seen_at LIMIT 1) AS source_name,
        (SELECT ls.listing_url FROM listing_sources ls WHERE ls.property_listing_id = pl.id AND ls.is_active = 1 ORDER BY ls.first_seen_at LIMIT 1) AS listing_url,
        (SELECT ls.source_url FROM listing_sources ls WHERE ls.property_listing_id = pl.id AND ls.is_active = 1 ORDER BY ls.first_seen_at LIMIT 1) AS source_url
      FROM property_listings pl
      WHERE pl.id = ? AND ${ACTIVE_SOURCE_EXISTS}
      LIMIT 1
    `).get(numericId) as DbListingRow | undefined;
    return row ?? null;
  } catch (error) {
    console.error("[db-listings:getById]", error instanceof Error ? error.message : String(error));
    return null;
  } finally {
    try { db?.close(); } catch { /* ignore */ }
  }
}
