import test from "node:test";
import assert from "node:assert/strict";

import {
  routePublicSearch,
  supportsOdmPublicSearchQuery,
} from "../../../lib/odm/odm-public-routing";

const canonicalEnv = {
  ODM_PUBLIC_CANARY_ENABLED: "true",
  ODM_PUBLIC_CANARY_APPROVED: "true",
  ODM_PUBLIC_CANARY_STOP: "false",
  ODM_PUBLIC_CANARY_PERCENT: "100",
} as NodeJS.ProcessEnv;

const publicQuery = { limit: 10 } as any;
const legacyResult = {
  listings: [],
  total: 0,
  limit: 10,
  offset: 0,
  source: "database",
  generated_at: "2026-08-23T00:00:00.000Z",
  has_more: false,
} as any;
const odmPage = {
  results: [],
  total_count: 0,
  has_more: false,
  next_cursor: null,
} as any;

function dependencies(env: NodeJS.ProcessEnv, overrides: Record<string, unknown> = {}) {
  return {
    env,
    now: () => 1000,
    searchOdm: async () => odmPage,
    searchLegacy: async () => legacyResult,
    logInfo: () => undefined,
    logWarn: () => undefined,
    ...overrides,
  } as any;
}

test("M6-B 100% approved routes every ODM-compatible query to ODM", async () => {
  let legacyCalls = 0;
  const routed = await routePublicSearch(
    { stableKey: "m6-b-cutover", publicQuery, surface: "api_search" },
    dependencies(canonicalEnv, {
      searchLegacy: async () => {
        legacyCalls += 1;
        return legacyResult;
      },
    }),
  );

  assert.equal(routed.lane, "odm");
  assert.equal(legacyCalls, 0);
});

test("M6-B production approval is mandatory even at 100%", async () => {
  let odmCalls = 0;
  const routed = await routePublicSearch(
    { stableKey: "m6-b-not-approved", publicQuery, surface: "api_search" },
    dependencies(
      { ...canonicalEnv, ODM_PUBLIC_CANARY_APPROVED: "false" },
      {
        searchOdm: async () => {
          odmCalls += 1;
          return odmPage;
        },
      },
    ),
  );

  assert.equal(routed.lane, "legacy_primary");
  assert.equal(odmCalls, 0);
});

test("M6-B emergency stop forces the safe legacy primary lane", async () => {
  let odmCalls = 0;
  const routed = await routePublicSearch(
    { stableKey: "m6-b-stop", publicQuery, surface: "api_search" },
    dependencies(
      { ...canonicalEnv, ODM_PUBLIC_CANARY_STOP: "true" },
      {
        searchOdm: async () => {
          odmCalls += 1;
          return odmPage;
        },
      },
    ),
  );

  assert.equal(routed.lane, "legacy_primary");
  assert.equal(odmCalls, 0);
});

test("M6-B ODM failure falls back to the guarded legacy lane", async () => {
  const routed = await routePublicSearch(
    { stableKey: "m6-b-fallback", publicQuery, surface: "api_search" },
    dependencies(canonicalEnv, {
      searchOdm: async () => {
        throw new Error("synthetic ODM failure");
      },
    }),
  );

  assert.equal(routed.lane, "legacy_fallback");
});

test("M6-B district queries remain legacy until ODM has an authoritative district field", async () => {
  const districtQuery = { ...publicQuery, district: "Agdal" };
  assert.equal(supportsOdmPublicSearchQuery(districtQuery), false);

  let odmCalls = 0;
  const routed = await routePublicSearch(
    { stableKey: "m6-b-district", publicQuery: districtQuery, surface: "api_search" },
    dependencies(canonicalEnv, {
      searchOdm: async () => {
        odmCalls += 1;
        return odmPage;
      },
    }),
  );

  assert.equal(routed.lane, "legacy_primary");
  assert.equal(odmCalls, 0);
});
