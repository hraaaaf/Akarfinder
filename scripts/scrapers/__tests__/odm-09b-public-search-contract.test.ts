import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  decodePublicSearchCursor,
  encodePublicSearchCursor,
} from "../../../lib/search-gateway/public-search-cursor";

process.env.SEARCH_CURSOR_SECRET = "odm-09b-test-secret";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migration = readFileSync(
  resolve(__dirname, "../../../supabase/migrations/20260726233000_odm_09b_public_search_cursor.sql"),
  "utf8",
);
const route = readFileSync(
  resolve(__dirname, "../../../app/api/search/public-index/route.ts"),
  "utf8",
);

test("opaque cursor round-trips the complete ordering tuple", () => {
  const payload = {
    v: 2 as const,
    lane: 1,
    rank: 0.42,
    updatedAt: "2026-07-26T20:00:00.000Z",
    representationId: "00000000-0000-0000-0000-000000000001",
  };
  const cursor = encodePublicSearchCursor(payload);
  assert.ok(!cursor.includes(payload.representationId));
  assert.deepEqual(decodePublicSearchCursor(cursor), payload);
});

test("cursor rejects tampering", () => {
  const cursor = encodePublicSearchCursor({
    v: 2,
    lane: 0,
    rank: 1.2,
    updatedAt: "2026-07-26T20:00:00.000Z",
    representationId: "00000000-0000-0000-0000-000000000001",
  });
  assert.throws(() => decodePublicSearchCursor(`${cursor}x`), /invalid_search_cursor/);
});

test("SQL cursor predicate mirrors every ORDER BY key", () => {
  for (const token of [
    "c.lane_weight asc",
    "c.ranking_score desc",
    "c.updated_at desc",
    "c.representation_id desc",
    "c.lane_weight > p_after_lane",
    "c.ranking_score < p_after_rank",
    "c.updated_at < p_after_updated_at",
    "c.representation_id < p_after_representation_id",
  ]) {
    assert.ok(migration.includes(token), `missing cursor contract token: ${token}`);
  }
});

test("public RPC remains service-role only and bounded", () => {
  assert.ok(migration.includes("grant execute on function public.search_public_representations_v1"));
  assert.ok(migration.includes("to service_role"));
  assert.ok(migration.includes("from public, anon, authenticated"));
  assert.ok(migration.includes("least(greatest(coalesce(p_limit, 50), 1), 100)"));
});

test("public route exposes cursor traversal and no offset pagination", () => {
  assert.ok(route.includes('params.get("cursor")'));
  assert.ok(route.includes("next_cursor"));
  assert.ok(route.includes("has_more"));
  assert.ok(!route.includes('params.get("offset")'));
});

test("price and surface filters are applied inside the RPC", () => {
  for (const token of [
    "p_min_price",
    "p_max_price",
    "p_min_surface",
    "p_max_surface",
    "r.normalized_price_mad >= p_min_price",
    "r.normalized_surface_m2 >= p_min_surface",
  ]) {
    assert.ok(migration.includes(token), `missing structured filter: ${token}`);
  }
});
