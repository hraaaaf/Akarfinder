import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";

import { adaptCollectionListing, type CollectionListing } from "../../../data-ingestion/collection-adapter.js";
import { Lot7SandboxStore } from "../../../data-ingestion/sandbox-store.js";

const ROOT = resolve(process.cwd());

function fixture(name: string): CollectionListing {
  return JSON.parse(readFileSync(resolve(ROOT, "data-ingestion", "samples", name), "utf8")) as CollectionListing;
}

function mubawabListing(index: number): CollectionListing {
  const base = structuredClone(fixture(index % 2 === 0 ? "listing.villa.json" : "listing.complete.json"));
  const isRent = index % 2 === 1;
  base.akar_id = null;
  base.source.name = "mubawab";
  base.source.source_id = `lot7-mubawab-1000-${String(index).padStart(4, "0")}`;
  base.source.url = `https://www.mubawab.ma/fr/a/lot7-1000-${index}`;
  base.provenance.source_type = "portal";
  base.provenance.source_listing_url = base.source.url;
  base.provenance.retrieval_method = "crawl";
  base.transaction = isRent ? "rent" : "sale";
  base.property_type = index % 5 === 0 ? "villa" : "apartment";
  base.location.city = index <= 500 ? "Casablanca" : "Rabat";
  base.price.amount = isRent ? 6_500 + index * 20 : 850_000 + index * 12_500;
  base.price.period = isRent ? "month" : "total";
  base.price.on_request = false;
  base.surface.total_m2 = 60 + (index % 240);
  base.title = `${isRent ? "Location" : "Vente"} lot7-1000 ${index}`;
  base.source.content_hash = index.toString(16).padStart(64, "0");
  return base;
}

function directWitness(): CollectionListing {
  const base = structuredClone(fixture("listing.complete.json"));
  base.akar_id = null;
  base.source.name = "akar-direct";
  base.source.source_id = "lot7-direct-witness-1000";
  base.source.url = "https://akarfinder.local/direct/lot7-witness-1000";
  base.provenance.source_type = "agency_direct";
  base.provenance.source_listing_url = base.source.url;
  base.provenance.retrieval_method = "feed";
  base.source.content_hash = "d".repeat(64);
  return base;
}

describe("Lot 7 isolated SQLite sandbox — 1000 listings", () => {
  it("imports 1000 Mubawab listings, proves deep pagination/idempotence and selective purge", () => {
    const dir = mkdtempSync(join(tmpdir(), "akarfinder-lot7-1000-"));
    const dbPath = join(dir, "lot7-sandbox-1000.db");
    const store = new Lot7SandboxStore(dbPath);

    try {
      const mubawab = Array.from({ length: 1000 }, (_, index) =>
        adaptCollectionListing(mubawabListing(index + 1), "lot7-sandbox-1000"),
      );
      const direct = adaptCollectionListing(directWitness(), "lot7-sandbox-1000");

      for (const property of mubawab) assert.equal(store.importCanonical(property), "inserted");
      assert.equal(store.importCanonical(direct), "inserted");
      assert.equal(store.count(), 1001);

      for (const property of mubawab) assert.equal(store.importCanonical(property), "updated");
      assert.equal(store.count(), 1001, "re-import must stay idempotent at 1000 listings");

      const casablanca = store.query({ city: "Casablanca", limit: 1000 });
      assert.equal(casablanca.filter((row) => row.source_name === "mubawab").length, 500);
      const rabat = store.query({ city: "Rabat", limit: 1000 });
      assert.equal(rabat.filter((row) => row.source_name === "mubawab").length, 500);

      const rentals = store.query({ transaction_type: "rent", limit: 1000 });
      assert.equal(rentals.filter((row) => row.source_name === "mubawab").length, 500);
      const sales = store.query({ transaction_type: "sale", limit: 1000 });
      assert.equal(sales.filter((row) => row.source_name === "mubawab").length, 500);

      const villas = store.query({ property_type: "villa", limit: 1000 });
      assert.equal(villas.filter((row) => row.source_name === "mubawab").length, 200);

      const expensiveSales = store.query({ transaction_type: "sale", min_price: 5_000_000, limit: 1000 });
      assert.ok(expensiveSales.length > 0);
      assert.ok(expensiveSales.every((row) => (row.price_mad ?? 0) >= 5_000_000));

      const boundedSurface = store.query({ min_surface: 120, max_surface: 180, limit: 1000 });
      assert.ok(boundedSurface.length > 0);
      assert.ok(boundedSurface.every((row) => (row.surface_m2 ?? 0) >= 120 && (row.surface_m2 ?? 0) <= 180));

      const ids = new Set<number>();
      for (let offset = 0; offset < 1000; offset += 100) {
        const page = store.query({ limit: 100, offset });
        assert.equal(page.length, 100);
        for (const row of page) ids.add(row.id);
      }
      assert.equal(ids.size, 1000, "deep pagination must expose 1000 unique Mubawab rows before witness");

      const first = store.query({ limit: 1 })[0];
      assert.ok(first);
      assert.equal(store.getById(first.id)?.property_id, first.property_id);

      const purged = store.purgePortalSource("mubawab");
      assert.equal(purged, 1000);
      assert.equal(store.query({ limit: 1000 }).filter((row) => row.source_name === "mubawab").length, 0);
      assert.equal(store.count(), 1);

      const survivor = store.query({ limit: 10 });
      assert.equal(survivor.length, 1);
      assert.equal(survivor[0].source_name, "akar-direct");
      assert.equal(survivor[0].origin_type, "agency_direct");
    } finally {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
