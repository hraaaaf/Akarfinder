import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildOdmPublicSearchInput,
  routePublicSearch,
  type OdmPublicRoutingMetric,
} from "../../../lib/odm/odm-public-routing.ts";
import type { SearchResult } from "../../../lib/search/types.ts";

const FULL_CUTOVER_ENV = {
  ODM_PUBLIC_CANARY_ENABLED: "true",
  ODM_PUBLIC_CANARY_APPROVED: "true",
  ODM_PUBLIC_CANARY_STOP: "false",
  ODM_PUBLIC_CANARY_PERCENT: "100",
} as NodeJS.ProcessEnv;

const LEGACY_RESULT: SearchResult = {
  listings: [],
  total: 0,
  limit: 25,
  offset: 0,
  source: "database",
  generated_at: "2026-08-05T00:00:00.000Z",
  next_cursor: null,
  has_more: false,
};

const EMPTY_ODM_PAGE = {
  results: [],
  results_count: 0,
  total_count: 0,
  has_more: false,
  next_cursor: null,
};

function clock() {
  let value = 1_000;
  return () => {
    value += 25;
    return value;
  };
}

test("builds one bounded ODM input for API and SSR", () => {
  assert.deepEqual(buildOdmPublicSearchInput({
    q: "appartement",
    city: "Casablanca",
    property_type: "apartment",
    transaction_type: "sale",
    min_price: 10_000,
    max_price: 5_000_000,
    min_surface: 40,
    max_surface: 250,
    limit: 500,
  }), {
    q: "appartement",
    city: "Casablanca",
    propertyType: "apartment",
    intent: "sale",
    minPrice: 10_000,
    maxPrice: 5_000_000,
    minSurface: 40,
    maxSurface: 250,
    limit: 100,
  });
});

test("full cutover routes through ODM and emits one structured completion metric", async () => {
  const info: OdmPublicRoutingMetric[] = [];
  const warnings: OdmPublicRoutingMetric[] = [];
  let legacyCalls = 0;

  const routed = await routePublicSearch({
    stableKey: "city=Casablanca&type=apartment",
    publicQuery: { city: "Casablanca", limit: 25 },
    surface: "api_search",
  }, {
    env: FULL_CUTOVER_ENV,
    now: clock(),
    searchOdm: async () => EMPTY_ODM_PAGE,
    searchLegacy: async () => {
      legacyCalls += 1;
      return LEGACY_RESULT;
    },
    logInfo: (metric) => info.push(metric),
    logWarn: (metric) => warnings.push(metric),
  });

  assert.equal(routed.lane, "odm");
  assert.equal(legacyCalls, 0);
  assert.equal(warnings.length, 0);
  assert.equal(info.length, 1);
  assert.equal(info[0].event, "route_completed");
  assert.equal(info[0].lane, "odm");
  assert.equal(info[0].configured_percent, 100);
  assert.equal(info[0].full_cutover_configured, true);
  assert.equal(info[0].surface, "api_search");
  assert.equal(info[0].result_source, "database_fallback");
  assert.match(info[0].stable_key_hash, /^[0-9a-f]{16}$/);
  assert.notEqual(info[0].stable_key_hash, "city=Casablanca&type=apartment");
});

test("ODM failure is observable and falls back to Legacy without losing completion telemetry", async () => {
  const warnings: OdmPublicRoutingMetric[] = [];

  const routed = await routePublicSearch({
    stableKey: "fallback-case",
    publicQuery: { city: "Rabat", limit: 25 },
    legacyQuery: { city: "Rabat", transaction_type: "sale", limit: 25 },
    surface: "search_page",
  }, {
    env: FULL_CUTOVER_ENV,
    now: clock(),
    searchOdm: async () => {
      throw new TypeError("rpc unavailable");
    },
    searchLegacy: async () => LEGACY_RESULT,
    logInfo: () => undefined,
    logWarn: (metric) => warnings.push(metric),
  });

  assert.equal(routed.lane, "legacy_fallback");
  assert.equal(warnings.length, 2);
  assert.equal(warnings[0].event, "route_failed");
  assert.equal(warnings[0].failure_stage, "odm");
  assert.equal(warnings[0].error_name, "TypeError");
  assert.equal(warnings[1].event, "route_completed");
  assert.equal(warnings[1].lane, "legacy_fallback");
  assert.equal(warnings[1].surface, "search_page");
});

test("emergency stop preserves Legacy as the primary rollback path", async () => {
  let odmCalls = 0;
  const info: OdmPublicRoutingMetric[] = [];

  const routed = await routePublicSearch({
    stableKey: "rollback-case",
    publicQuery: { city: "Tanger", limit: 25 },
    surface: "api_search",
  }, {
    env: { ...FULL_CUTOVER_ENV, ODM_PUBLIC_CANARY_STOP: "true" },
    now: clock(),
    searchOdm: async () => {
      odmCalls += 1;
      return EMPTY_ODM_PAGE;
    },
    searchLegacy: async () => LEGACY_RESULT,
    logInfo: (metric) => info.push(metric),
    logWarn: () => undefined,
  });

  assert.equal(routed.lane, "legacy_primary");
  assert.equal(odmCalls, 0);
  assert.equal(info[0].emergency_stop, true);
  assert.equal(info[0].lane, "legacy_primary");
});

test("API and SSR use the same public routing controller", () => {
  const apiRoute = readFileSync("app/api/search/route.ts", "utf8");
  const searchPage = readFileSync("app/search/page.tsx", "utf8");

  assert.match(apiRoute, /routePublicSearch\(/);
  assert.match(searchPage, /routePublicSearch\(/);
  assert.match(apiRoute, /surface: "api_search"/);
  assert.match(searchPage, /surface: "search_page"/);
  assert.doesNotMatch(apiRoute, /shouldServeOdmPublicCanary\(/);
  assert.doesNotMatch(searchPage, /shouldServeOdmPublicCanary\(/);
  assert.doesNotMatch(apiRoute, /searchPublicRepresentations\(/);
  assert.doesNotMatch(searchPage, /searchPublicRepresentations\(/);
});
