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
  base.source.source_id = `lot7-mubawab-${String(index).padStart(3, "0")}`;
  base.source.url = `https://www.mubawab.ma/fr/a/lot7-${index}`;
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
  base.title = `${isRent ? "Location" : "Vente"} lot7 ${index}`;
  base.source.content_hash = index.toString(16).padStart(64, "0");
  return base;
}

function directWitness(): CollectionListing {
  const base = structuredClone(fixture("listing.complete.json"));
  base.akar_id = null;
  base.source.name = "akar-direct";
  base.source.source_id = "lot7-direct-witness";
  base.source.url = "https://akarfinder.local/direct/lot7-witness";
  base.provenance.source_type = "agency_direct";
  base.provenance.source_listing_url = base.source.url;
  base.provenance.retrieval_method = "feed";
  base.source.content_hash = "f".repeat(64);
  return base;
}

function partnerWitness(): CollectionListing {
  const base = structuredClone(fixture("listing.complete.json"));
  base.akar_id = null;
  base.source.name = "partner-feed";
  base.source.source_id = "lot7-partner-witness";
  base.source.url = "https://partner.example/lot7-witness";
  base.provenance.source_type = "partner_feed";
  base.provenance.source_listing_url = base.source.url;
  base.provenance.retrieval_method = "feed";
  base.source.content_hash = "e".repeat(64);
  return base;
}

describe("Lot 7 isolated SQLite sandbox", () => {
  it("imports 20 Mubawab listings, queries them, reimports idempotently and purges only explicit portal data", () => {
    const dir = mkdtempSync(join(tmpdir(), "akarfinder-lot7-"));
    const dbPath = join(dir, "lot7-sandbox.db");
    const store = new Lot7SandboxStore(dbPath);

    try {
      const mubawab = Array.from({ length: 20 }, (_, index) =>
        adaptCollectionListing(mubawabListing(index + 1), "lot7-sandbox-20"),
      );
      const direct = adaptCollectionListing(directWitness(), "lot7-sandbox-20");
      const partner = adaptCollectionListing(partnerWitness(), "lot7-sandbox-20");

      for (const property of mubawab) assert.equal(store.importCanonical(property), "inserted");
      assert.equal(store.importCanonical(direct), "inserted");
      assert.equal(store.importCanonical(partner), "inserted");
      assert.equal(store.count(), 22);

      for (const property of mubawab) assert.equal(store.importCanonical(property), "updated");
      assert.equal(store.count(), 22, "re-import must not create duplicates");

      const casablanca = store.query({ city: "Casablanca" });
      assert.equal(casablanca.filter((row) => row.source_name === "mubawab").length, 10);

      const rentals = store.query({ transaction_type: "rent" });
      assert.ok(rentals.some((row) => row.source_name === "mubawab"));
      assert.ok(rentals.every((row) => row.transaction_type === "rent"));

      const villas = store.query({ property_type: "villa" });
      assert.ok(villas.length > 0);
      assert.ok(villas.every((row) => row.property_type === "villa"));

      const expensiveSales = store.query({ transaction_type: "sale", min_price: 1_500_000 });
      assert.ok(expensiveSales.length > 0);
      assert.ok(expensiveSales.every((row) => (row.price_mad ?? 0) >= 1_500_000));

      const mediumSurface = store.query({ min_surface: 100, max_surface: 150 });
      assert.ok(mediumSurface.length > 0);
      assert.ok(mediumSurface.every((row) => (row.surface_m2 ?? 0) >= 100 && (row.surface_m2 ?? 0) <= 150));

      const first = store.query({ limit: 1 })[0];
      assert.ok(first);
      assert.equal(store.getById(first.id)?.property_id, first.property_id);
      assert.equal(store.query().filter((row) => row.source_name === "mubawab")[0]?.source_type, "portal");
      assert.equal(store.query().find((row) => row.source_name === "akar-direct")?.source_type, "agency_direct");
      assert.equal(store.query().find((row) => row.source_name === "partner-feed")?.source_type, "partner_feed");

      const purged = store.purgePortalSource("mubawab");
      assert.equal(purged, 20);
      assert.equal(store.query().filter((row) => row.source_name === "mubawab").length, 0);
      assert.equal(store.count(), 2);

      const survivors = store.query({ limit: 10 });
      assert.equal(survivors.length, 2);
      assert.deepEqual(new Set(survivors.map((row) => row.source_name)), new Set(["akar-direct", "partner-feed"]));
      assert.equal(survivors.find((row) => row.source_name === "akar-direct")?.origin_type, "agency_direct");
      assert.equal(survivors.find((row) => row.source_name === "akar-direct")?.source_type, "agency_direct");
      assert.equal(survivors.find((row) => row.source_name === "partner-feed")?.origin_type, "partner_feed");
      assert.equal(survivors.find((row) => row.source_name === "partner-feed")?.source_type, "partner_feed");
    } finally {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
