import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/geo/rabat-geometry-evidence-batch3-v1.json"), "utf8"),
) as {
  version: string;
  publicActivation: boolean;
  productionWriteCount: number;
  decisions: Array<{ localityId: string; decision: string; reason: string }>;
  source: { evidenceKind: string };
  guardrails: string[];
};

test("C8 geometry evidence batch 3 is bounded to the promoted AURS trio", () => {
  assert.equal(manifest.version, "c8_geometry_evidence_batch3_v1");
  assert.deepEqual(
    manifest.decisions.map((entry) => entry.localityId).sort(),
    ["candidate_rabat_douar_doum", "candidate_rabat_el_garaa", "candidate_rabat_el_kora"].sort(),
  );
  assert.ok(manifest.decisions.every((entry) => entry.decision === "geometry_unresolved_taxonomy_source_not_spatial"));
});

test("batch 3 explicitly separates taxonomy evidence from geometry evidence", () => {
  assert.equal(manifest.source.evidenceKind, "first_party_taxonomy_semantics_without_polygon");
  assert.ok(manifest.decisions.every((entry) => entry.reason.includes("no directly reusable polygon")));
});

test("geometry evidence batch 3 remains fail-closed", () => {
  assert.equal(manifest.publicActivation, false);
  assert.equal(manifest.productionWriteCount, 0);
  assert.ok(manifest.guardrails.some((guardrail) => guardrail.includes("does not claim that no geometry exists")));
  assert.ok(manifest.guardrails.some((guardrail) => guardrail.includes("No point, centroid")));
});
