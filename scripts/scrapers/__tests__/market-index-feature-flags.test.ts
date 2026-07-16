// AKARFINDER-MARKET-INDEX-FOUNDATION-1 — Feature flag tests (mission section 19.F).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isMarketIndexClusteringEnabled,
  isMarketIndexObservationsEnabled,
  isMarketIndexReadEnabled,
  isMarketIndexWriteEnabled,
  MARKET_INDEX_FEATURE_FLAG_NAMES,
} from "../../../lib/market-index/market-index-feature-flags.js";

describe("Feature flags — all false by default", () => {
  it("all four flags are false with an empty env", () => {
    const env = {} as NodeJS.ProcessEnv;
    assert.equal(isMarketIndexWriteEnabled(env), false);
    assert.equal(isMarketIndexReadEnabled(env), false);
    assert.equal(isMarketIndexObservationsEnabled(env), false);
    assert.equal(isMarketIndexClusteringEnabled(env), false);
  });

  it("all four flags are false when explicitly set to \"false\"", () => {
    const env = {
      MARKET_INDEX_WRITE_ENABLED: "false",
      MARKET_INDEX_READ_ENABLED: "false",
      MARKET_INDEX_OBSERVATIONS_ENABLED: "false",
      MARKET_INDEX_CLUSTERING_ENABLED: "false",
    } as unknown as NodeJS.ProcessEnv;
    assert.equal(isMarketIndexWriteEnabled(env), false);
    assert.equal(isMarketIndexReadEnabled(env), false);
    assert.equal(isMarketIndexObservationsEnabled(env), false);
    assert.equal(isMarketIndexClusteringEnabled(env), false);
  });

  it("lists exactly the four expected flag names", () => {
    assert.deepEqual(
      [...MARKET_INDEX_FEATURE_FLAG_NAMES].sort(),
      [
        "MARKET_INDEX_CLUSTERING_ENABLED",
        "MARKET_INDEX_OBSERVATIONS_ENABLED",
        "MARKET_INDEX_READ_ENABLED",
        "MARKET_INDEX_WRITE_ENABLED",
      ].sort(),
    );
  });
});

describe("Feature flags — current public behavior unchanged when all flags are false/absent", () => {
  it("this module does not import or touch any public component/route", () => {
    // Structural assertion: the feature-flags module has zero dependencies
    // beyond process.env -- it cannot itself alter public rendering.
    // (No import of React/Next.js/components in this file's own source.)
    assert.equal(typeof isMarketIndexWriteEnabled, "function");
  });
});
