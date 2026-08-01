import assert from "node:assert/strict";
import test from "node:test";
import { rebuildOdmTypesenseShadow } from "../../../lib/typesense-shadow/rebuild";
import type { OdmSearchProjectionRow } from "../../../lib/typesense-shadow/odm-projection";

const eligible: OdmSearchProjectionRow = {
  representation_id: "11111111-1111-4111-8111-111111111111",
  canonical_url: "https://example.ma/a/1",
  canonical_property_id: "property-1",
  source_domain: "example.ma",
  title: "Appartement Casablanca",
  normalized_city: "Casablanca",
  normalized_property_type: "apartment",
  normalized_intent: "sale",
  display_eligibility: "eligible_primary",
  document_kind: "LISTING",
  production_allowed: true,
  updated_at: "2026-08-01T12:00:00Z",
};

const rejected: OdmSearchProjectionRow = {
  ...eligible,
  representation_id: "22222222-2222-4222-8222-222222222222",
  document_kind: "CATEGORY",
};

test("rebuild paginates, filters and reports deterministic counts", async () => {
  const pages = [[eligible, rejected], []];
  const imported: string[] = [];
  const report = await rebuildOdmTypesenseShadow({
    pageSize: 2,
    batchSize: 1,
    loadPage: async (offset) => pages[offset / 2] || [],
    importBatch: async (documents) => {
      imported.push(...documents.map((document) => document.id));
      return { indexed: documents.length, failed: 0 };
    },
  });

  assert.deepEqual(imported, [eligible.representation_id]);
  assert.deepEqual(report, {
    scanned: 2,
    eligible: 1,
    rejected: 1,
    indexed: 1,
    failed: 0,
    batches: 1,
  });
});

test("rebuild propagates failed document counts", async () => {
  const report = await rebuildOdmTypesenseShadow({
    loadPage: async (offset) => offset === 0 ? [eligible] : [],
    importBatch: async () => ({ indexed: 0, failed: 1 }),
  });
  assert.equal(report.failed, 1);
  assert.equal(report.indexed, 0);
});
