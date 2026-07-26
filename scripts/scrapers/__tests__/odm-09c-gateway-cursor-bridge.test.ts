import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const route = readFileSync(
  resolve(__dirname, "../../../app/api/search/gateway/route.ts"),
  "utf8",
);

function cursorContinuationBlock(): string {
  const start = route.indexOf("if (cursor)");
  const end = route.indexOf("const enabledSources", start);
  assert.ok(start >= 0, "cursor continuation branch must exist");
  assert.ok(end > start, "live-provider first-page branch must follow cursor continuation branch");
  return route.slice(start, end);
}

test("gateway delegates deterministic continuation pages to the signed public cursor", () => {
  const cursorBlock = cursorContinuationBlock();
  assert.match(cursorBlock, /searchPublicRepresentations\(publicSearchInput\)/);
  assert.match(cursorBlock, /sources_queried: \["thin_index"\]/);
  assert.doesNotMatch(cursorBlock, /runSearchGatewayProviderSearch/);
  assert.doesNotMatch(cursorBlock, /executeSearchGatewayWithCache/);
});

test("gateway exposes the public index pagination contract", () => {
  assert.match(route, /total_count: indexedPage\.total_count/);
  assert.match(route, /has_more: indexedPage\.has_more/);
  assert.match(route, /next_cursor: indexedPage\.next_cursor/);
});

test("gateway forwards price and surface filters to the public index", () => {
  for (const field of ["minPrice", "maxPrice", "minSurface", "maxSurface"]) {
    assert.match(route, new RegExp(`\\b${field}\\b`));
  }
});

test("gateway deduplicates live and indexed representations by canonical source URL", () => {
  assert.match(route, /result\.original_url \|\| result\.display_url \|\| result\.id/);
  assert.match(route, /mergeGatewayResults\(gatewayResponse\.results, indexedPage\.results\)/);
});

test("legacy seed scan is isolated as an explicitly degraded migration fallback", () => {
  assert.match(route, /appendSeedThinIndexResults\(gatewayResponse, legacySeedInput\)/);
  assert.match(route, /public_index_degraded: true/);
});
