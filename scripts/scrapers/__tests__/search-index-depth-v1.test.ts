import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const databaseSearch = readFileSync("lib/search/database-search.ts", "utf8");
const apiSearch = readFileSync("app/api/search/route.ts", "utf8");
const requestQuery = readFileSync("lib/search/search-request-query.ts", "utf8");
const searchTypes = readFileSync("lib/search/types.ts", "utf8");
const shell = readFileSync("components/search/LightZillowSearchShell.tsx", "utf8");

test("database fallback no longer has the historical 200-row candidate ceiling", () => {
  assert.doesNotMatch(databaseSearch, /limit:\s*200\b/);
  assert.match(databaseSearch, /DB_SCAN_BATCH_SIZE\s*=\s*500/);
  assert.match(databaseSearch, /MAX_DB_ROWS_SCANNED_PER_REQUEST\s*=\s*10_000/);
  assert.match(databaseSearch, /while \(matchedListings\.length < targetMatches/);
});

test("first search tranche still targets up to 100 local results", () => {
  assert.match(requestQuery, /parseBoundedInteger\(read\("limit"\), 100, 1, 100\)/);
  assert.match(databaseSearch, /Math\.min\(Math\.max\(query\.limit \?\? 50, 1\), 100\)/);
  assert.match(shell, /new URLSearchParams\(\{ limit: "100" \}\)/);
  assert.match(apiSearch, /buildSearchRequestQuery\(/);
});

test("budget and surface filters are sent to and parsed by the server", () => {
  assert.match(shell, /params\.set\("min_price", filters\.minBudget\)/);
  assert.match(shell, /params\.set\("max_price", filters\.maxBudget\)/);
  assert.match(shell, /params\.set\("min_surface", filters\.minSurface\)/);
  assert.match(requestQuery, /read\("min_price"\) \?\? read\("budget_min"\)/);
  assert.match(requestQuery, /read\("max_price"\) \?\? read\("budget_max"\)/);
  assert.match(requestQuery, /read\("min_surface"\)/);
  assert.match(requestQuery, /read\("max_surface"\)/);
});

test("deep pagination cursor is part of the search contract and shared API routing", () => {
  assert.match(searchTypes, /cursor\?: number/);
  assert.match(searchTypes, /next_cursor\?: number \| null/);
  assert.match(searchTypes, /has_more\?: boolean/);
  assert.match(requestQuery, /parseNonNegativeInteger\(read\("cursor"\)\)/);
  assert.match(apiSearch, /buildSearchRequestQuery\(/);
  assert.match(databaseSearch, /next_cursor: hasMore \? scanCursor : null/);
  assert.match(databaseSearch, /has_more: hasMore/);
  assert.match(shell, /Afficher plus de résultats indexés/);
});

test("cursor advances at raw-row precision instead of skipping the remainder of a DB batch", () => {
  assert.match(databaseSearch, /scanCursor = batchStart \+ index \+ 1/);
  assert.match(databaseSearch, /if \(matchedListings\.length >= targetMatches/);
});
