import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";

import { adaptCollectionListing, type CollectionListing } from "../../../data-ingestion/collection-adapter.js";
import { ControlledSqliteBatchIngestor } from "../../../data-ingestion/controlled-ingestion.js";
import { Lot7SandboxStore } from "../../../data-ingestion/sandbox-store.js";

const ROOT = resolve(process.cwd());

function fixture(name: string): CollectionListing {
  return JSON.parse(readFileSync(resolve(ROOT, "data-ingestion", "samples", name), "utf8")) as CollectionListing;
}

function portalListing(index: number): CollectionListing {
  const base = structuredClone(fixture(index % 2 === 0 ? "listing.villa.json" : "listing.complete.json"));
  const isRent = index % 2 === 1;
  base.akar_id = null;
  base.source.name = "mubawab";
  base.source.source_id = `lot8-mubawab-${String(index).padStart(5, "0")}`;
  base.source.url = `https://www.mubawab.ma/fr/a/lot8-${index}`;
  base.provenance.source_type = "portal";
  base.provenance.source_listing_url = base.source.url;
  base.provenance.retrieval_method = "crawl";
  base.transaction = isRent ? "rent" : "sale";
  base.property_type = index % 5 === 0 ? "villa" : "apartment";
  base.location.city = index % 3 === 0 ? "Rabat" : "Casablanca";
  base.price.amount = isRent ? 7_000 + index * 10 : 900_000 + index * 10_000;
  base.price.period = isRent ? "month" : "total";
  base.price.on_request = false;
  base.surface.total_m2 = 60 + (index % 250);
  base.title = `${isRent ? "Location" : "Vente"} lot8 ${index}`;
  base.source.content_hash = index.toString(16).padStart(64, "0");
  return base;
}

function witness(sourceName: string, sourceType: "agency_direct" | "partner_feed", marker: string): CollectionListing {
  const base = structuredClone(fixture("listing.complete.json"));
  base.akar_id = null;
  base.source.name = sourceName;
  base.source.source_id = `lot8-${marker}`;
  base.source.url = `https://akarfinder.local/${marker}`;
  base.provenance.source_type = sourceType;
  base.provenance.source_listing_url = base.source.url;
  base.provenance.retrieval_method = "feed";
  base.source.content_hash = marker.repeat(64).slice(0, 64);
  return base;
}

function canonicalPortal(count: number) {
  return Array.from({ length: count }, (_, index) =>
    adaptCollectionListing(portalListing(index + 1), "lot8-controlled-massive"),
  );
}

describe("Lot 8 controlled massive ingestion — isolated SQLite only", () => {
  it("ingests 2500 listings in batches, stays idempotent, and purges only portal data", () => {
    const dir = mkdtempSync(join(tmpdir(), "akarfinder-lot8-massive-"));
    const dbPath = join(dir, "lot8-controlled.db");

    try {
      const seedStore = new Lot7SandboxStore(dbPath);
      seedStore.importCanonical(adaptCollectionListing(witness("akar-direct", "agency_direct", "d"), "lot8-witness"));
      seedStore.importCanonical(adaptCollectionListing(witness("akar-partner", "partner_feed", "p"), "lot8-witness"));
      seedStore.close();

      const properties = canonicalPortal(2500);
      const ingestor = new ControlledSqliteBatchIngestor(dbPath);
      const first = ingestor.ingest(properties, { batchSize: 500 });

      assert.equal(first.status, "completed");
      assert.equal(first.batches_planned, 5);
      assert.equal(first.batches_committed, 5);
      assert.equal(first.inserted, 2500);
      assert.equal(first.updated, 0);
      assert.equal(first.next_batch, 5);

      const second = ingestor.ingest(properties, { batchSize: 500 });
      assert.equal(second.status, "completed");
      assert.equal(second.inserted, 0);
      assert.equal(second.updated, 2500);

      const store = new Lot7SandboxStore(dbPath);
      assert.equal(store.count(), 2502, "re-ingestion must not create duplicates");
      assert.equal(store.purgePortalSource("mubawab"), 2500);
      assert.equal(store.count(), 2);

      const survivors = store.query({ limit: 10 });
      assert.deepEqual(new Set(survivors.map((row) => row.source_type)), new Set(["agency_direct", "partner_feed"]));
      assert.deepEqual(new Set(survivors.map((row) => row.source_name)), new Set(["akar-direct", "akar-partner"]));
      store.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("stops cleanly between batches and resumes from the returned checkpoint", () => {
    const dir = mkdtempSync(join(tmpdir(), "akarfinder-lot8-resume-"));
    const dbPath = join(dir, "lot8-resume.db");

    try {
      const properties = canonicalPortal(1200);
      const ingestor = new ControlledSqliteBatchIngestor(dbPath);
      let stopChecks = 0;

      const stopped = ingestor.ingest(properties, {
        batchSize: 400,
        shouldStop: () => {
          stopChecks += 1;
          return stopChecks > 1;
        },
      });

      assert.equal(stopped.status, "stopped");
      assert.equal(stopped.batches_committed, 1);
      assert.equal(stopped.inserted, 400);
      assert.equal(stopped.next_batch, 1);

      let store = new Lot7SandboxStore(dbPath);
      assert.equal(store.count(), 400);
      store.close();

      const resumed = ingestor.ingest(properties, { batchSize: 400, startBatch: stopped.next_batch });
      assert.equal(resumed.status, "completed");
      assert.equal(resumed.batches_committed, 2);
      assert.equal(resumed.inserted, 800);
      assert.equal(resumed.next_batch, 3);

      store = new Lot7SandboxStore(dbPath);
      assert.equal(store.count(), 1200);
      store.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rolls back the entire current batch after a mid-batch failure", () => {
    const dir = mkdtempSync(join(tmpdir(), "akarfinder-lot8-rollback-"));
    const dbPath = join(dir, "lot8-rollback.db");

    try {
      const witnessProperty = adaptCollectionListing(witness("akar-direct", "agency_direct", "r"), "lot8-rollback");
      let store = new Lot7SandboxStore(dbPath);
      store.importCanonical(witnessProperty);
      store.close();

      const good = canonicalPortal(1)[0];
      const bad = structuredClone(canonicalPortal(2)[1]);
      bad.offers[0].transaction_type = "lease" as never;

      const ingestor = new ControlledSqliteBatchIngestor(dbPath);
      assert.throws(
        () => ingestor.ingest([good, bad], { batchSize: 2 }),
        /lot8_batch_rollback:0:lot7_invalid_transaction/,
      );

      store = new Lot7SandboxStore(dbPath);
      assert.equal(store.count(), 1, "failed batch must restore the exact pre-batch database state");
      const rows = store.query({ limit: 10 });
      assert.equal(rows.length, 1);
      assert.equal(rows[0].source_type, "agency_direct");
      store.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses any SQLite path outside the OS temporary directory", () => {
    assert.throws(
      () => new ControlledSqliteBatchIngestor(resolve(ROOT, "scripts", "scrapers", "output", "akarfinder.db")),
      /lot8_non_isolated_db_path|lot8_historical_sqlite_forbidden/,
    );
  });
});
