import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";

import { adaptCollectionListing, type CollectionListing } from "../../../data-ingestion/collection-adapter.js";
import { Lot7SandboxStore } from "../../../data-ingestion/sandbox-store.js";
import { queryDbListings } from "../../../lib/listings/db-listings.js";
import { mapDbRowToListing } from "../../../lib/listings/map-db-listing.js";
import { compareRecommendedListings, computeRankingBreakdown } from "../../../lib/search/ranking.js";

const ROOT = resolve(process.cwd());

function fixture(name: string): CollectionListing {
  return JSON.parse(readFileSync(resolve(ROOT, "data-ingestion", "samples", name), "utf8")) as CollectionListing;
}

function listing(sourceId: string, city: string, propertyType: "villa" | "apartment", transaction: "sale" | "rent", price: number, title: string): CollectionListing {
  const base = structuredClone(fixture(propertyType === "villa" ? "listing.villa.json" : "listing.complete.json"));
  base.akar_id = null;
  base.source.name = "mubawab";
  base.source.source_id = sourceId;
  base.source.url = `https://www.mubawab.ma/fr/a/${sourceId}`;
  base.provenance.source_type = "portal";
  base.provenance.source_listing_url = base.source.url;
  base.provenance.retrieval_method = "crawl";
  base.transaction = transaction;
  base.property_type = propertyType;
  base.location.city = city;
  base.price.amount = price;
  base.price.period = transaction === "rent" ? "month" : "total";
  base.price.on_request = false;
  base.surface.total_m2 = 180;
  base.title = title;
  base.source.content_hash = sourceId.padEnd(64, "a").slice(0, 64);
  return base;
}

describe("Lot 7 real AkarFinder ranking pipeline", () => {
  it("ranks exact structured intent ahead of higher-quality mismatches", () => {
    const dir = mkdtempSync(join(tmpdir(), "akarfinder-lot7-ranking-"));
    const dbPath = join(dir, "lot7-ranking.db");
    const store = new Lot7SandboxStore(dbPath);

    try {
      const inputs = [
        listing("lot7-rank-exact", "Casablanca", "villa", "sale", 4_200_000, "Villa familiale Casablanca"),
        listing("lot7-rank-wrong-city", "Rabat", "villa", "sale", 4_000_000, "Villa premium très complète"),
        listing("lot7-rank-wrong-type", "Casablanca", "apartment", "sale", 2_600_000, "Appartement premium Casablanca"),
        listing("lot7-rank-wrong-tx", "Casablanca", "villa", "rent", 28_000, "Villa Casablanca location"),
      ];

      for (const input of inputs) {
        store.importCanonical(adaptCollectionListing(input, "lot7-ranking"));
      }

      const rows = queryDbListings({ limit: 20 }, dbPath).listings;
      assert.equal(rows.length, 4);

      const mapped = rows.map((row) => mapDbRowToListing(row));
      const query = { city: "Casablanca", property_type: "villa", transaction_type: "sale" };
      const ranked = [...mapped].sort((a, b) => compareRecommendedListings(a, b, query));

      assert.equal(ranked[0].city, "Casablanca");
      assert.equal(ranked[0].property_type, "Villa");
      assert.equal(ranked[0].transaction_type, "buy");
      assert.match(ranked[0].title, /Villa familiale Casablanca/);

      const exact = computeRankingBreakdown(ranked[0], query);
      assert.equal(exact.relevance, 75);

      const wrongCity = ranked.find((item) => item.city === "Rabat");
      assert.ok(wrongCity);
      assert.ok(exact.relevance > computeRankingBreakdown(wrongCity, query).relevance);

      const wrongType = ranked.find((item) => item.property_type === "Appartement");
      assert.ok(wrongType);
      assert.ok(exact.relevance > computeRankingBreakdown(wrongType, query).relevance);

      const wrongTx = ranked.find((item) => item.transaction_type === "rent");
      assert.ok(wrongTx);
      assert.ok(exact.relevance > computeRankingBreakdown(wrongTx, query).relevance);
    } finally {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
