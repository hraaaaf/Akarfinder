import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";

import { adaptCollectionListing, type CollectionListing } from "../../../data-ingestion/collection-adapter.js";
import { Lot7SandboxStore } from "../../../data-ingestion/sandbox-store.js";
import { getDbListingById, queryDbListings } from "../../../lib/listings/db-listings.js";

const ROOT = resolve(process.cwd());

function fixture(name: string): CollectionListing {
  return JSON.parse(readFileSync(resolve(ROOT, "data-ingestion", "samples", name), "utf8")) as CollectionListing;
}

function listing(index: number): CollectionListing {
  const base = structuredClone(fixture(index % 2 === 0 ? "listing.villa.json" : "listing.complete.json"));
  const isRent = index % 2 === 1;
  base.akar_id = null;
  base.source.name = "mubawab";
  base.source.source_id = `lot7-real-read-${String(index).padStart(3, "0")}`;
  base.source.url = `https://www.mubawab.ma/fr/a/lot7-real-read-${index}`;
  base.provenance.source_type = "portal";
  base.provenance.source_listing_url = base.source.url;
  base.provenance.retrieval_method = "crawl";
  base.transaction = isRent ? "rent" : "sale";
  base.property_type = index % 4 === 0 ? "villa" : "apartment";
  base.location.city = index <= 10 ? "Casablanca" : "Rabat";
  base.price.amount = isRent ? 8_000 + index * 100 : 1_000_000 + index * 50_000;
  base.price.period = isRent ? "month" : "total";
  base.price.on_request = false;
  base.surface.total_m2 = 80 + index * 5;
  base.source.content_hash = index.toString(16).padStart(64, "0");
  return base;
}

describe("Lot 7 real AkarFinder SQLite read path", () => {
  it("reads sandbox-imported canonical listings through queryDbListings/getDbListingById", () => {
    const dir = mkdtempSync(join(tmpdir(), "akarfinder-lot7-real-read-"));
    const dbPath = join(dir, "lot7-real-read.db");
    const store = new Lot7SandboxStore(dbPath);

    try {
      for (let index = 1; index <= 20; index += 1) {
        const canonical = adaptCollectionListing(listing(index), "lot7-real-read");
        assert.equal(store.importCanonical(canonical), "inserted");
      }

      const all = queryDbListings({ limit: 50 }, dbPath);
      assert.equal(all.total, 20);
      assert.equal(all.listings.length, 20);

      const casaSales = queryDbListings({ city: "Casablanca", transaction_type: "sale", limit: 50 }, dbPath);
      assert.equal(casaSales.total, 5);
      assert.ok(casaSales.listings.every((row) => row.city === "Casablanca" && row.transaction_type === "sale"));

      const villas = queryDbListings({ property_type: "villa", limit: 50 }, dbPath);
      assert.equal(villas.total, 5);
      assert.ok(villas.listings.every((row) => row.property_type === "villa"));

      const priceFiltered = queryDbListings({ min_price: 1_500_000, transaction_type: "sale", limit: 50 }, dbPath);
      assert.ok(priceFiltered.total > 0);
      assert.ok(priceFiltered.listings.every((row) => (row.price_mad ?? 0) >= 1_500_000));

      const surfaceFiltered = queryDbListings({ min_surface: 100, max_surface: 150, limit: 50 }, dbPath);
      assert.ok(surfaceFiltered.total > 0);
      assert.ok(surfaceFiltered.listings.every((row) => (row.surface_m2 ?? 0) >= 100 && (row.surface_m2 ?? 0) <= 150));

      const first = all.listings[0];
      assert.ok(first);
      const detail = getDbListingById(String(first.id), dbPath);
      assert.ok(detail);
      assert.equal(detail.id, first.id);
      assert.equal(detail.source_name, "mubawab");
      assert.match(detail.listing_url ?? "", /^https:\/\/www\.mubawab\.ma\//);
    } finally {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
