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
  base.source.source_id = `lot7-mubawab-100-${String(index).padStart(3, "0")}`;
  base.source.url = `https://www.mubawab.ma/fr/a/lot7-100-${index}`;
  base.provenance.source_type = "portal";
  base.provenance.source_listing_url = base.source.url;
  base.provenance.retrieval_method = "crawl";
  base.transaction = isRent ? "rent" : "sale";
  base.property_type = index % 4 === 0 ? "villa" : "apartment";
  base.location.city = index <= 50 ? "Casablanca" : "Rabat";
  base.price.amount = isRent ? 7_500 + index * 75 : 900_000 + index * 35_000;
  base.price.period = isRent ? "month" : "total";
  base.price.on_request = false;
  base.surface.total_m2 = 70 + index * 3;
  base.title = `${isRent ? "Location" : "Vente"} lot7-100 ${index}`;
  base.source.content_hash = index.toString(16).padStart(64, "0");
  return base;
}

function directWitness(): CollectionListing {
  const base = structuredClone(fixture("listing.complete.json"));
  base.akar_id = null;
  base.source.name = "akar-direct";
  base.source.source_id = "lot7-direct-witness-100";
  base.source.url = "https://akarfinder.local/direct/lot7-witness-100";
  base.provenance.source_type = "agency_direct";
  base.provenance.source_listing_url = base.source.url;
  base.provenance.retrieval_method = "feed";
  base.source.content_hash = "e".repeat(64);
  return base;
}

describe("Lot 7 isolated SQLite sandbox — 100 listings", () => {
  it("imports 100 Mubawab listings, proves queries/pagination/idempotence and purges only portal data", () => {
    const dir = mkdtempSync(join(tmpdir(), "akarfinder-lot7-100-"));
    const dbPath = join(dir, "lot7-sandbox-100.db");
    const store = new Lot7SandboxStore(dbPath);

    try {
      const mubawab = Array.from({ length: 100 }, (_, index) =>
        adaptCollectionListing(mubawabListing(index + 1), "lot7-sandbox-100"),
      );
      const direct = adaptCollectionListing(directWitness(), "lot7-sandbox-100");

      for (const property of mubawab) assert.equal(store.importCanonical(property), "inserted");
      assert.equal(store.importCanonical(direct), "inserted");
      assert.equal(store.count(), 101);

      for (const property of mubawab) assert.equal(store.importCanonical(property), "updated");
      assert.equal(store.count(), 101, "re-import must stay idempotent at 100 listings");

      const casablanca = store.query({ city: "Casablanca", limit: 200 });
      assert.equal(casablanca.filter((row) => row.source_name === "mubawab").length, 50);
      const rabat = store.query({ city: "Rabat", limit: 200 });
      assert.equal(rabat.filter((row) => row.source_name === "mubawab").length, 50);

      const rentals = store.query({ transaction_type: "rent", limit: 200 });
      assert.equal(rentals.filter((row) => row.source_name === "mubawab").length, 50);
      assert.ok(rentals.every((row) => row.transaction_type === "rent"));

      const sales = store.query({ transaction_type: "sale", limit: 200 });
      assert.equal(sales.filter((row) => row.source_name === "mubawab").length, 50);
      assert.ok(sales.every((row) => row.transaction_type === "sale"));

      const villas = store.query({ property_type: "villa", limit: 200 });
      assert.equal(villas.filter((row) => row.source_name === "mubawab").length, 25);

      const expensiveSales = store.query({ transaction_type: "sale", min_price: 2_000_000, limit: 200 });
      assert.ok(expensiveSales.length > 0);
      assert.ok(expensiveSales.every((row) => (row.price_mad ?? 0) >= 2_000_000));

      const mediumSurface = store.query({ min_surface: 100, max_surface: 220, limit: 200 });
      assert.ok(mediumSurface.length > 0);
      assert.ok(mediumSurface.every((row) => (row.surface_m2 ?? 0) >= 100 && (row.surface_m2 ?? 0) <= 220));

      const page1 = store.query({ limit: 20, offset: 0 });
      const page2 = store.query({ limit: 20, offset: 20 });
      assert.equal(page1.length, 20);
      assert.equal(page2.length, 20);
      assert.equal(new Set([...page1, ...page2].map((row) => row.id)).size, 40);

      const first = store.query({ limit: 1 })[0];
      assert.ok(first);
      assert.equal(first.source_type, "portal");
      assert.equal(store.getById(first.id)?.property_id, first.property_id);

      const purged = store.purgePortalSource("mubawab");
      assert.equal(purged, 100);
      assert.equal(store.query({ limit: 200 }).filter((row) => row.source_name === "mubawab").length, 0);
      assert.equal(store.count(), 1);

      const survivor = store.query({ limit: 10 });
      assert.equal(survivor.length, 1);
      assert.equal(survivor[0].source_name, "akar-direct");
      assert.equal(survivor[0].origin_type, "agency_direct");
      assert.equal(survivor[0].source_type, "agency_direct");
    } finally {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
