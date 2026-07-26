import test from "node:test";
import assert from "node:assert/strict";
import { runPropertyIntelligenceBackfill, type BackfillFeatureWrite, type BackfillPage } from "../../../lib/property-intelligence/backfill";

const pages: Record<string, BackfillPage> = {
  start: {
    rows: [
      { cursor: "1", canonicalPropertyId: "p1", description: "Appartement avec piscine et parking", sourceReliability: 1 },
      { cursor: "2", canonicalPropertyId: "p2", description: "Bel appartement central", sourceReliability: 1 },
    ],
    nextCursor: "2",
  },
  "2": {
    rows: [
      { cursor: "3", canonicalPropertyId: "p3", description: "Résidence avec piscine. Mise à jour: pas de piscine.", sourceReliability: 1 },
    ],
    nextCursor: null,
  },
};

function makeDependencies(writes: BackfillFeatureWrite[]) {
  return {
    fetchPage: async (cursor: string | null): Promise<BackfillPage> => pages[cursor ?? "start"],
    persistFeature: async (input: BackfillFeatureWrite): Promise<void> => { writes.push(input); },
  };
}

test("backfill is dry-run by default and returns resumable metrics", async () => {
  const writes: BackfillFeatureWrite[] = [];
  const report = await runPropertyIntelligenceBackfill(makeDependencies(writes), {
    methodologyVersion: "property_intelligence_v1",
    inputSnapshot: "snapshot-1",
    maxRows: 2,
    batchSize: 2,
  });

  assert.equal(report.dryRun, true);
  assert.equal(report.status, "max_rows_reached");
  assert.equal(report.scannedRows, 2);
  assert.equal(report.persistedFeatures, 0);
  assert.equal(report.nextCursor, "2");
  assert.equal(writes.length, 0);
  assert.ok(report.skippedUnknown > 0);
});

test("write mode persists only material features by default", async () => {
  const writes: BackfillFeatureWrite[] = [];
  const report = await runPropertyIntelligenceBackfill(makeDependencies(writes), {
    methodologyVersion: "property_intelligence_v1",
    inputSnapshot: "snapshot-2",
    dryRun: false,
    batchSize: 2,
    maxRows: 10,
  });

  assert.equal(report.status, "completed");
  assert.equal(report.scannedRows, 3);
  assert.equal(report.persistedFeatures, writes.length);
  assert.ok(writes.some((item) => item.canonicalPropertyId === "p1" && item.feature.key === "equipment.pool"));
  assert.ok(writes.some((item) => item.canonicalPropertyId === "p3" && item.feature.status === "conflicted"));
  assert.equal(writes.some((item) => item.feature.status === "unknown"), false);
});

test("persistUnknown explicitly preserves unknown outputs", async () => {
  const writes: BackfillFeatureWrite[] = [];
  await runPropertyIntelligenceBackfill({
    fetchPage: async () => ({ rows: [{ cursor: "1", canonicalPropertyId: "p1", description: "Bel appartement" }], nextCursor: null }),
    persistFeature: async (input) => { writes.push(input); },
  }, {
    methodologyVersion: "property_intelligence_v1",
    inputSnapshot: "snapshot-3",
    dryRun: false,
    persistUnknown: true,
  });

  assert.ok(writes.some((item) => item.feature.status === "unknown"));
});

test("invalid execution limits fail before fetching", async () => {
  let fetched = false;
  await assert.rejects(() => runPropertyIntelligenceBackfill({
    fetchPage: async () => { fetched = true; return { rows: [], nextCursor: null }; },
    persistFeature: async () => undefined,
  }, {
    methodologyVersion: "property_intelligence_v1",
    inputSnapshot: "snapshot-4",
    batchSize: 0,
  }), /invalid_batch_size/);
  assert.equal(fetched, false);
});
