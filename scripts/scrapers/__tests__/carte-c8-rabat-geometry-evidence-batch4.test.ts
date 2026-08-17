import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/geo/rabat-geometry-evidence-batch4-v1.json"), "utf8"),
) as {
  version: string;
  publicActivation: boolean;
  productionWriteCount: number;
  decisions: Array<{
    localityId: string;
    decision: string;
    evidence: Array<{ componentId?: string; propertyAreaHa?: number; evidenceKind: string }>;
  }>;
};

test("C8 geometry evidence batch 4 records the authoritative Diour Jamaa component", () => {
  assert.equal(manifest.version, "c8_geometry_evidence_batch4_v1");
  assert.deepEqual(manifest.decisions.map((entry) => entry.localityId), ["candidate_rabat_diour_jamaa"]);
  const decision = manifest.decisions[0];
  assert.equal(decision.decision, "geometry_unresolved_rights_blocked");
  const geography = decision.evidence.find((entry) => entry.evidenceKind === "authoritative_component_geography");
  assert.ok(geography);
  assert.equal(geography.componentId, "1401-003");
  assert.equal(geography.propertyAreaHa, 3.78);
});

test("batch 4 explicitly records the reuse-permission blocker", () => {
  const decision = manifest.decisions[0];
  assert.ok(decision.evidence.some((entry) => entry.evidenceKind === "reuse_permission_required"));
});

test("batch 4 remains evidence-only and fail-closed", () => {
  assert.equal(manifest.publicActivation, false);
  assert.equal(manifest.productionWriteCount, 0);
});