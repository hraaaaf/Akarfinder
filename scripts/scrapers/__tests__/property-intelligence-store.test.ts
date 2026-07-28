import test from "node:test";
import assert from "node:assert/strict";
import { PropertyIntelligenceStore, computePublicationEligibility, validatePersistFeatureInput } from "../../../lib/property-intelligence/store";
import type { ExtractedFeature } from "../../../lib/property-intelligence/rule-engine";

const feature = (overrides: Partial<ExtractedFeature> = {}): ExtractedFeature => ({
  key: "equipment.pool",
  value: true,
  confidence: 0.9,
  status: "inferred",
  method: "rule_engine_v2",
  evidence: ["positive_phrase"],
  ...overrides,
});

test("publication eligibility requires valid public feature, status and threshold", () => {
  assert.equal(computePublicationEligibility(feature()), true);
  assert.equal(computePublicationEligibility(feature({ confidence: 0.84 })), false);
  assert.equal(computePublicationEligibility(feature({ status: "conflicted", value: null })), false);
  assert.equal(computePublicationEligibility(feature({ key: "intelligence.aqi", value: 80 })), false);
});

test("store input validation rejects malformed records", () => {
  assert.throws(() => validatePersistFeatureInput({
    canonicalPropertyId: "",
    feature: feature(),
    methodologyVersion: "rule_v2",
    inputSnapshot: "sha256:abc",
  }), /canonical_property_id_required/);
  assert.throws(() => validatePersistFeatureInput({
    canonicalPropertyId: "property-1",
    feature: feature({ value: "yes" }),
    methodologyVersion: "rule_v2",
    inputSnapshot: "sha256:abc",
  }), /invalid_feature_value/);
});

test("persistFeature delegates an idempotent snapshot to the atomic RPC", async () => {
  let capturedName = "";
  let capturedArgs: Record<string, unknown> = {};
  const client = {
    async rpc(name: string, args: Record<string, unknown>) {
      capturedName = name;
      capturedArgs = args;
      return { data: "feature-id-1", error: null };
    },
    from() {
      throw new Error("not_used");
    },
  };
  const store = new PropertyIntelligenceStore(client as never);
  const id = await store.persistFeature({
    canonicalPropertyId: "property-1",
    feature: feature(),
    methodologyVersion: "rule_engine_v2.1",
    inputSnapshot: "sha256:abc",
    sourceObservationIds: ["obs-1"],
  });
  assert.equal(id, "feature-id-1");
  assert.equal(capturedName, "persist_property_intelligence_feature");
  assert.equal(capturedArgs.p_input_snapshot, "sha256:abc");
  assert.equal(capturedArgs.p_publication_eligible, true);
  assert.deepEqual(capturedArgs.p_source_observation_ids, ["obs-1"]);
});

test("latest feature reader returns typed current observations", async () => {
  const rows = [{ id: "f1", canonical_property_id: "property-1", feature_key: "equipment.pool" }];
  const client = {
    async rpc() { return { data: null, error: null }; },
    from(table: string) {
      assert.equal(table, "latest_internal_property_intelligence_features");
      return {
        select() {
          return {
            eq(column: string, value: string) {
              assert.equal(column, "canonical_property_id");
              assert.equal(value, "property-1");
              return {
                async order(columnName: string, options: { ascending: boolean }) {
                  assert.equal(columnName, "feature_key");
                  assert.equal(options.ascending, true);
                  return { data: rows, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
  const store = new PropertyIntelligenceStore(client as never);
  assert.deepEqual(await store.listLatestFeatures("property-1"), rows);
});
