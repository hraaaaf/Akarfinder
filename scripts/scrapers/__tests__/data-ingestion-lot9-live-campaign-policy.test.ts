import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LOT9_LIVE_POLICY_LIMITS,
  resolveLiveCampaignPolicy,
} from "../../../data-ingestion/sources/mubawab/live-campaign-policy.js";

describe("Lot 9 live campaign policy", () => {
  it("uses conservative defaults", () => {
    const policy = resolveLiveCampaignPolicy({});
    assert.deepEqual(policy, {
      pageWindow: 3,
      maxWaves: 2,
      maxPartitionsPerWave: 3,
      requestDelayMs: 1500,
      theoreticalMaxPageRequests: 18,
    });
  });

  it("allows a broader but still bounded campaign", () => {
    const policy = resolveLiveCampaignPolicy({
      LOT9_MAX_WAVES: "8",
      LOT9_MAX_PARTITIONS_PER_WAVE: "5",
      LOT9_REQUEST_DELAY_MS: "1750",
    });

    assert.equal(policy.theoreticalMaxPageRequests, 120);
    assert.equal(policy.requestDelayMs, 1750);
  });

  it("rejects campaigns above the global request cap", () => {
    assert.throws(
      () => resolveLiveCampaignPolicy({ LOT9_MAX_WAVES: "20", LOT9_MAX_PARTITIONS_PER_WAVE: "20" }),
      /lot9_live_policy_request_cap_exceeded:1200:300/,
    );
  });

  it("rejects any request delay below the polite minimum", () => {
    assert.throws(
      () => resolveLiveCampaignPolicy({ LOT9_REQUEST_DELAY_MS: "1499" }),
      /lot9_live_policy_invalid_request_delay_ms:1499/,
    );
    assert.equal(LOT9_LIVE_POLICY_LIMITS.minimum_request_delay_ms, 1500);
  });

  it("rejects malformed or out-of-range integer overrides", () => {
    assert.throws(
      () => resolveLiveCampaignPolicy({ LOT9_MAX_WAVES: "2.5" }),
      /lot9_live_policy_invalid_max_waves:2.5/,
    );
    assert.throws(
      () => resolveLiveCampaignPolicy({ LOT9_MAX_PARTITIONS_PER_WAVE: "0" }),
      /lot9_live_policy_invalid_max_partitions_per_wave:0/,
    );
  });
});
