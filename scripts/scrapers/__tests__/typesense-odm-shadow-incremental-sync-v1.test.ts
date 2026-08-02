import test from "node:test";
import assert from "node:assert/strict";
import { syncOdmTypesenseShadowIncrementally } from "../../../lib/typesense-shadow/incremental-sync";
import type { OdmSearchProjectionRow } from "../../../lib/typesense-shadow/odm-projection";

function row(overrides: Partial<OdmSearchProjectionRow> = {}): OdmSearchProjectionRow {
  return {
    representation_id: "00000000-0000-0000-0000-000000000001",
    canonical_url: "https://example.com/1",
    source_domain: "example.com",
    title: "Appartement Casablanca",
    normalized_city: "Casablanca",
    normalized_property_type: "apartment",
    normalized_intent: "sale",
    quality_tier: "A",
    quality_score: 90,
    reliability_score: 80,
    freshness_score: 70,
    display_eligibility: "eligible_primary",
    document_kind: "LISTING",
    production_allowed: true,
    updated_at: "2026-08-01T10:00:00.000Z",
    ...overrides,
  };
}

test("upserts eligible rows and deletes rows that leave the publishability contract", async () => {
  const pages = [
    [
      row(),
      row({ representation_id: "00000000-0000-0000-0000-000000000002", production_allowed: false, updated_at: "2026-08-01T10:01:00.000Z" }),
    ],
    [],
  ];
  const upserts: string[] = [];
  const deletes: string[] = [];
  const report = await syncOdmTypesenseShadowIncrementally({
    loadPage: async () => pages.shift() || [],
    upsertBatch: async (documents) => {
      upserts.push(...documents.map((document) => document.id));
      return { indexed: documents.length, failed: 0 };
    },
    deleteBatch: async (ids) => {
      deletes.push(...ids);
      return { deleted: ids.length, failed: 0 };
    },
    pageSize: 10,
  });
  assert.deepEqual(upserts, ["00000000-0000-0000-0000-000000000001"]);
  assert.deepEqual(deletes, ["00000000-0000-0000-0000-000000000002"]);
  assert.equal(report.indexed, 1);
  assert.equal(report.deleted, 1);
  assert.equal(report.failed, 0);
  assert.deepEqual(report.next_cursor, {
    updated_at: "2026-08-01T10:01:00.000Z",
    representation_id: "00000000-0000-0000-0000-000000000002",
  });
});

test("refuses a page that does not advance the checkpoint", async () => {
  await assert.rejects(
    syncOdmTypesenseShadowIncrementally({
      cursor: { updated_at: "2026-08-01T10:00:00.000Z", representation_id: "z" },
      loadPage: async () => [row()],
      upsertBatch: async () => ({ indexed: 0, failed: 0 }),
      deleteBatch: async () => ({ deleted: 0, failed: 0 }),
    }),
    /cursor_not_advancing/,
  );
});
