import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";

import { adaptCollectionListing, type CollectionListing } from "../../../data-ingestion/collection-adapter.js";
import { reconcileLifecycleRun } from "../../../data-ingestion/lifecycle.js";
import { Lot7SandboxStore } from "../../../data-ingestion/sandbox-store.js";
import { getDbListingById, queryDbListings } from "../../../lib/listings/db-listings.js";

const ROOT = resolve(process.cwd());

function fixture(name: string): CollectionListing {
  return JSON.parse(readFileSync(resolve(ROOT, "data-ingestion", "samples", name), "utf8")) as CollectionListing;
}

function mubawab(): CollectionListing {
  const item = structuredClone(fixture("listing.villa.json"));
  item.akar_id = null;
  item.source.name = "mubawab";
  item.source.source_id = "lot7-lifecycle-mubawab";
  item.source.url = "https://www.mubawab.ma/fr/a/lot7-lifecycle-mubawab";
  item.provenance.source_type = "portal";
  item.provenance.source_listing_url = item.source.url;
  item.provenance.retrieval_method = "crawl";
  item.transaction = "sale";
  item.property_type = "villa";
  item.location.city = "Casablanca";
  item.location.district = "Anfa";
  item.surface.total_m2 = 300;
  item.source.content_hash = "a".repeat(64);
  return item;
}

function directWitness(): CollectionListing {
  const item = structuredClone(fixture("listing.complete.json"));
  item.akar_id = null;
  item.source.name = "akar-direct";
  item.source.source_id = "lot7-lifecycle-direct";
  item.source.url = "https://akarfinder.local/direct/lot7-lifecycle-direct";
  item.provenance.source_type = "agency_direct";
  item.provenance.source_listing_url = item.source.url;
  item.provenance.retrieval_method = "feed";
  item.source.content_hash = "b".repeat(64);
  return item;
}

describe("Lot 7 lifecycle visibility through real AkarFinder reader", () => {
  it("keeps stale visible, hides inactive, and preserves out-of-scope direct data", () => {
    const dir = mkdtempSync(join(tmpdir(), "akarfinder-lot7-lifecycle-"));
    const dbPath = join(dir, "lot7-lifecycle.db");
    const store = new Lot7SandboxStore(dbPath);

    try {
      const portal = mubawab();
      const direct = directWitness();
      store.importCanonical(adaptCollectionListing(portal, "lot7-lifecycle"));
      store.importCanonical(adaptCollectionListing(direct, "lot7-lifecycle"));

      let visible = queryDbListings({ limit: 20 }, dbPath);
      assert.equal(visible.total, 2);
      const portalRow = visible.listings.find((row) => row.source_name === "mubawab");
      assert.ok(portalRow);

      const initial = reconcileLifecycleRun([], [portal], { source_name: "mubawab", source_type: "portal" }, "2026-09-04T10:00:00Z");
      assert.equal(initial.counts.insert, 1);

      const withDirectRecord = [
        ...initial.records,
        reconcileLifecycleRun([], [direct], { source_name: "akar-direct", source_type: "agency_direct" }, "2026-09-04T10:00:00Z").records[0],
      ];

      const firstMissing = reconcileLifecycleRun(withDirectRecord, [], { source_name: "mubawab", source_type: "portal" }, "2026-09-05T10:00:00Z");
      assert.equal(firstMissing.counts.stale, 1);
      assert.equal(firstMissing.counts.out_of_scope, 1);
      assert.equal(queryDbListings({ limit: 20 }, dbPath).total, 2, "stale remains visible until inactive threshold");

      const secondMissing = reconcileLifecycleRun(firstMissing.records, [], { source_name: "mubawab", source_type: "portal" }, "2026-09-06T10:00:00Z");
      assert.equal(secondMissing.counts.inactive, 1);
      assert.equal(secondMissing.counts.out_of_scope, 1);

      const inactive = secondMissing.records.find((record) => record.source_key === "mubawab:lot7-lifecycle-mubawab");
      assert.ok(inactive);
      assert.equal(inactive.listing.status, "inactive");
      assert.equal(store.setSourceActive("mubawab", "lot7-lifecycle-mubawab", false), 1);

      visible = queryDbListings({ limit: 20 }, dbPath);
      assert.equal(visible.total, 1);
      assert.equal(visible.listings[0].source_name, "akar-direct");
      assert.equal(getDbListingById(String(portalRow.id), dbPath), null, "inactive portal listing must disappear from detail read");
    } finally {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
