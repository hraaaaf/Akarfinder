import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/search/page.tsx", "utf8");

test("visible search page uses the same ODM Canary decision as the API route", () => {
  assert.match(source, /buildSearchStableKey\(publicRequestQuery\)/);
  assert.match(source, /shouldServeOdmPublicCanary\(stableKey\)/);
  assert.match(source, /searchPublicRepresentations\(odmInput\(publicRequestQuery\)\)/);
  assert.match(source, /mapOdmPageToSearchResult\(odmPage, publicRequestQuery\)/);
  assert.match(source, /initialSearchResult\s*=\s*await searchVisibleInitialResult\([\s\S]*resolvedQuery,[\s\S]*publicRequestQuery/);
});

test("visible search page preserves fail-safe Legacy fallback and shadow behavior", () => {
  assert.match(source, /console\.warn\("\[search-page:odm-public-canary:fallback\]"/);
  assert.match(source, /return searchListings\(resolvedQuery\)/);
  assert.match(source, /scheduleOdmDualReadShadow\(resolvedQuery, legacyResult\)/);
  assert.doesNotMatch(source, /initialSearchResult\s*=\s*await searchListings\(resolvedQuery\)/);
});
