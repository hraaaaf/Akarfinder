import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { CanonicalPropertyV1 } from "../lib/property-schema/core";
import type { CollectionSourceType } from "./collection-adapter";

type CanonicalOfferWithCollectionSourceType = CanonicalPropertyV1["offers"][number] & {
  source_type?: CollectionSourceType;
};

export type SandboxListingQuery = {
  city?: string;
  property_type?: string;
  transaction_type?: "sale" | "rent";
  min_price?: number;
  max_price?: number;
  min_surface?: number;
  max_surface?: number;
  limit?: number;
  offset?: number;
};

export type SandboxListingRow = {
  id: number;
  canonical_fingerprint: string;
  property_id: string;
  title: string | null;
  price_mad: number | null;
  city: string | null;
  property_type: string | null;
  transaction_type: string;
  surface_m2: number | null;
  data_completeness_score: number;
  source_name: string;
  source_id: string;
  source_url: string | null;
  origin_type: string;
  source_type: CollectionSourceType | null;
  offer_status: string;
};

export class Lot7SandboxStore {
  private readonly db: DatabaseSync;

  constructor(readonly dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS property_listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        canonical_fingerprint TEXT NOT NULL UNIQUE,
        property_id TEXT NOT NULL UNIQUE,
        title TEXT,
        price_mad REAL,
        city TEXT,
        property_type TEXT,
        transaction_type TEXT NOT NULL CHECK(transaction_type IN ('sale','rent')),
        surface_m2 REAL,
        data_completeness_score REAL NOT NULL DEFAULT 0,
        offer_status TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS listing_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        property_listing_id INTEGER NOT NULL,
        source_name TEXT NOT NULL,
        source_id TEXT NOT NULL,
        listing_url TEXT,
        source_url TEXT,
        origin_type TEXT NOT NULL,
        source_type TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        first_seen_at TEXT,
        last_seen_at TEXT,
        UNIQUE(source_name, source_id),
        FOREIGN KEY(property_listing_id) REFERENCES property_listings(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_lot7_city ON property_listings(city);
      CREATE INDEX IF NOT EXISTS idx_lot7_type ON property_listings(property_type);
      CREATE INDEX IF NOT EXISTS idx_lot7_tx ON property_listings(transaction_type);
      CREATE INDEX IF NOT EXISTS idx_lot7_source ON listing_sources(source_name, source_id);
      CREATE INDEX IF NOT EXISTS idx_lot7_source_type ON listing_sources(source_type);
    `);

    const sourceColumns = this.db.prepare("PRAGMA table_info(listing_sources)").all() as Array<{ name: string }>;
    if (!sourceColumns.some((column) => column.name === "source_type")) {
      this.db.exec("ALTER TABLE listing_sources ADD COLUMN source_type TEXT");
      this.db.exec("CREATE INDEX IF NOT EXISTS idx_lot7_source_type ON listing_sources(source_type)");
    }
  }

  close() { this.db.close(); }

  importCanonical(property: CanonicalPropertyV1): "inserted" | "updated" {
    const offer = property.offers[0] as CanonicalOfferWithCollectionSourceType | undefined;
    if (!offer) throw new Error(`lot7_missing_offer:${property.property_id}`);
    if (offer.transaction_type !== "sale" && offer.transaction_type !== "rent") throw new Error(`lot7_invalid_transaction:${property.property_id}`);

    const sourceId = offer.external_offer_id ?? offer.offer_id;
    const existing = this.db.prepare("SELECT property_listing_id FROM listing_sources WHERE source_name = ? AND source_id = ? LIMIT 1")
      .get(offer.source_name, sourceId) as { property_listing_id: number } | undefined;
    const fingerprint = `${offer.source_name}:${sourceId}`;
    const title = offer.title.value;
    const price = offer.price_amount.value;
    const city = property.facts.location.city.value;
    const propertyType = property.facts.classification.property_type.value;
    const surface = property.facts.surfaces.surface_total_m2?.value ?? null;
    const completeness = property.intelligence?.data_completeness_score ?? 0;
    // Keep collection provenance distinct from canonical origin_type so portal purge never conflates generic unknown origins.
    const sourceType = offer.source_type ?? null;

    if (existing) {
      this.db.prepare(`UPDATE property_listings SET title=?, price_mad=?, city=?, property_type=?, transaction_type=?, surface_m2=?, data_completeness_score=?, offer_status=?, updated_at=? WHERE id=?`)
        .run(title, price, city, propertyType, offer.transaction_type, surface, completeness, offer.offer_status, property.updated_at, existing.property_listing_id);
      this.db.prepare(`UPDATE listing_sources SET listing_url=?, source_url=?, origin_type=?, source_type=?, is_active=1, last_seen_at=? WHERE source_name=? AND source_id=?`)
        .run(offer.canonical_source_url, offer.source_url, offer.origin_type, sourceType, offer.last_observed_at, offer.source_name, sourceId);
      return "updated";
    }

    const inserted = this.db.prepare(`INSERT INTO property_listings (canonical_fingerprint, property_id, title, price_mad, city, property_type, transaction_type, surface_m2, data_completeness_score, offer_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(fingerprint, property.property_id, title, price, city, propertyType, offer.transaction_type, surface, completeness, offer.offer_status, property.updated_at);
    this.db.prepare(`INSERT INTO listing_sources (property_listing_id, source_name, source_id, listing_url, source_url, origin_type, source_type, is_active, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`)
      .run(Number(inserted.lastInsertRowid), offer.source_name, sourceId, offer.canonical_source_url, offer.source_url, offer.origin_type, sourceType, offer.first_observed_at, offer.last_observed_at);
    return "inserted";
  }

  setSourceActive(sourceName: string, sourceId: string, active: boolean): number {
    const result = this.db.prepare("UPDATE listing_sources SET is_active = ? WHERE source_name = ? AND source_id = ?")
      .run(active ? 1 : 0, sourceName, sourceId);
    return Number(result.changes);
  }

  count(): number {
    const row = this.db.prepare("SELECT COUNT(*) AS total FROM property_listings").get() as { total: number };
    return row.total;
  }

  getById(id: number): SandboxListingRow | null {
    return (this.db.prepare(`SELECT pl.*, ls.source_name, ls.source_id, ls.source_url, ls.origin_type, ls.source_type FROM property_listings pl JOIN listing_sources ls ON ls.property_listing_id = pl.id AND ls.is_active = 1 WHERE pl.id = ? LIMIT 1`)
      .get(id) as SandboxListingRow | undefined) ?? null;
  }

  query(input: SandboxListingQuery = {}): SandboxListingRow[] {
    const conditions: string[] = ["ls.is_active = 1"];
    const params: Array<string | number> = [];
    if (input.city) { conditions.push("pl.city = ?"); params.push(input.city); }
    if (input.property_type) { conditions.push("pl.property_type = ?"); params.push(input.property_type); }
    if (input.transaction_type) { conditions.push("pl.transaction_type = ?"); params.push(input.transaction_type); }
    if (input.min_price != null) { conditions.push("pl.price_mad >= ?"); params.push(input.min_price); }
    if (input.max_price != null) { conditions.push("pl.price_mad <= ?"); params.push(input.max_price); }
    if (input.min_surface != null) { conditions.push("pl.surface_m2 >= ?"); params.push(input.min_surface); }
    if (input.max_surface != null) { conditions.push("pl.surface_m2 <= ?"); params.push(input.max_surface); }
    const limit = Math.min(Math.max(input.limit ?? 100, 1), 1000);
    const offset = Math.max(input.offset ?? 0, 0);
    return this.db.prepare(`SELECT pl.*, ls.source_name, ls.source_id, ls.source_url, ls.origin_type, ls.source_type FROM property_listings pl JOIN listing_sources ls ON ls.property_listing_id = pl.id WHERE ${conditions.join(" AND ")} ORDER BY pl.id ASC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as SandboxListingRow[];
  }

  purgePortalSource(sourceName: string): number {
    const rows = this.db.prepare(`SELECT ls.property_listing_id FROM listing_sources ls WHERE ls.source_name = ? AND ls.source_type = 'portal'`)
      .all(sourceName) as Array<{ property_listing_id: number }>;
    if (!rows.length) return 0;
    const ids = rows.map((row) => row.property_listing_id);
    this.db.prepare("DELETE FROM listing_sources WHERE source_name = ? AND source_type = 'portal'").run(sourceName);
    const remove = this.db.prepare("DELETE FROM property_listings WHERE id = ? AND NOT EXISTS (SELECT 1 FROM listing_sources WHERE property_listing_id = ?)");
    for (const id of ids) remove.run(id, id);
    return ids.length;
  }
}
