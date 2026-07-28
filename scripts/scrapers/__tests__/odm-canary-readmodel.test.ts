import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ODM_CANARY_FLAG_NAMES,
  ODM_CANARY_MAX_PERCENT,
  ODM_CANARY_THRESHOLDS_V1,
  canServeOdmReadModel,
  evaluateCanaryStopGate,
  isOdmCanaryConfigured,
  readCanaryPercent,
  shouldEnterOdmCanary,
  stableCanaryBucket,
} from "../../../lib/odm/odm-canary-readmodel.js";

const healthyMetrics = {
  sampleSize: 500,
  errorRate: 0,
  canonicalLinkDivergenceRate: 0,
  trustedPriceDivergenceRate: 0,
  trustedSurfaceDivergenceRate: 0,
  suppressedFieldRate: 0.02,
  unresolvedSourcePolicyRate: 0.01,
};

describe("ODM canary configuration", () => {
  it("is disabled by default", () => {
    const env = {} as NodeJS.ProcessEnv;
    assert.equal(isOdmCanaryConfigured(env), false);
    assert.equal(readCanaryPercent(env), 0);
    assert.equal(shouldEnterOdmCanary("request-1", env), false);
  });

  it("requires an explicit true flag and a positive percentage", () => {
    assert.equal(isOdmCanaryConfigured({ ODM_CANARY_READMODEL_PERCENT: "1" } as NodeJS.ProcessEnv), false);
    assert.equal(isOdmCanaryConfigured({ ODM_CANARY_READMODEL_ENABLED: "true" } as NodeJS.ProcessEnv), false);
    assert.equal(
      isOdmCanaryConfigured({
        ODM_CANARY_READMODEL_ENABLED: "true",
        ODM_CANARY_READMODEL_PERCENT: "1",
      } as NodeJS.ProcessEnv),
      true,
    );
  });

  it("fails closed for malformed, negative or above-cap percentages", () => {
    for (const value of ["abc", "-1", "1.01", "10", "Infinity"]) {
      const env = {
        ODM_CANARY_READMODEL_ENABLED: "true",
        ODM_CANARY_READMODEL_PERCENT: value,
      } as NodeJS.ProcessEnv;
      assert.equal(readCanaryPercent(env), 0);
      assert.equal(isOdmCanaryConfigured(env), false);
    }
    assert.equal(ODM_CANARY_MAX_PERCENT, 1);
  });

  it("exposes exactly the two preparation flags", () => {
    assert.deepEqual([...ODM_CANARY_FLAG_NAMES].sort(), [
      "ODM_CANARY_READMODEL_ENABLED",
      "ODM_CANARY_READMODEL_PERCENT",
    ].sort());
  });
});

describe("ODM canary deterministic routing", () => {
  it("uses a stable bucket for the same request key", () => {
    assert.equal(stableCanaryBucket("same-key"), stableCanaryBucket("same-key"));
  });

  it("never admits a missing stable key", () => {
    const env = {
      ODM_CANARY_READMODEL_ENABLED: "true",
      ODM_CANARY_READMODEL_PERCENT: "1",
    } as NodeJS.ProcessEnv;
    assert.equal(shouldEnterOdmCanary(null, env), false);
    assert.equal(shouldEnterOdmCanary("", env), false);
  });

  it("keeps admission at or below one percent", () => {
    const env = {
      ODM_CANARY_READMODEL_ENABLED: "true",
      ODM_CANARY_READMODEL_PERCENT: "1",
    } as NodeJS.ProcessEnv;
    const total = 100_000;
    let admitted = 0;
    for (let index = 0; index < total; index += 1) {
      if (shouldEnterOdmCanary(`request-${index}`, env)) admitted += 1;
    }
    assert.ok(admitted > 700, `unexpectedly low admission: ${admitted}`);
    assert.ok(admitted <= 1_100, `canary exceeded safe bound: ${admitted}`);
  });
});

describe("ODM canary automatic stop gates", () => {
  it("allows a healthy observation window", () => {
    assert.deepEqual(evaluateCanaryStopGate(healthyMetrics), { stop: false, reasons: [] });
  });

  it("stops before the minimum evidence window", () => {
    const result = evaluateCanaryStopGate({ ...healthyMetrics, sampleSize: 199 });
    assert.equal(result.stop, true);
    assert.ok(result.reasons.includes("insufficient_sample"));
  });

  it("stops on every safety threshold breach", () => {
    const result = evaluateCanaryStopGate({
      sampleSize: 500,
      errorRate: ODM_CANARY_THRESHOLDS_V1.maximumErrorRate + 0.001,
      canonicalLinkDivergenceRate: ODM_CANARY_THRESHOLDS_V1.maximumCanonicalLinkDivergenceRate + 0.001,
      trustedPriceDivergenceRate: ODM_CANARY_THRESHOLDS_V1.maximumTrustedPriceDivergenceRate + 0.001,
      trustedSurfaceDivergenceRate: ODM_CANARY_THRESHOLDS_V1.maximumTrustedSurfaceDivergenceRate + 0.001,
      suppressedFieldRate: ODM_CANARY_THRESHOLDS_V1.maximumSuppressedFieldRate + 0.001,
      unresolvedSourcePolicyRate: ODM_CANARY_THRESHOLDS_V1.maximumUnresolvedSourcePolicyRate + 0.001,
    });
    assert.equal(result.stop, true);
    assert.equal(result.reasons.length, 6);
  });

  it("serves legacy whenever routing or safety is not proven", () => {
    const enabled = {
      ODM_CANARY_READMODEL_ENABLED: "true",
      ODM_CANARY_READMODEL_PERCENT: "1",
    } as NodeJS.ProcessEnv;
    const disabled = {} as NodeJS.ProcessEnv;

    assert.equal(canServeOdmReadModel("request-1", healthyMetrics, disabled), false);
    assert.equal(
      canServeOdmReadModel("request-1", { ...healthyMetrics, errorRate: 1 }, enabled),
      false,
    );
  });
});
