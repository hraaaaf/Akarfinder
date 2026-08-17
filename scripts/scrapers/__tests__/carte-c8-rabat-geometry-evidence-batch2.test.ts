import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/geo/rabat-geometry-evidence-batch2-v1.json"), "utf8"),
) as {
  version: string;
  publicActivation: boolean;
  productionWriteCount: number;
  decisions: Array<{
    localityId: string;
    decision: string;
    reason: string;
    sources: Array<{ provider: string; evidenceKind: string }>;
  }>;
  guardrails: string[];
};

test("C8 geometry evidence batch 2 is bounded to Yacoub El Mansour", () => {
  assert.equal(manifest.version, "c8_geometry_evidence_batch2_v1");
  assert.equal(manifest.decisions.length, 1);
  assert.equal(manifest.decisions[0]?.localityId, "candidate_rabat_yacoub_el_mansour");
  assert.equal(manifest.decisions[0]?.decision, "geometry_unresolved_semantic_mismatch");
});

test("Yacoub geometry evidence separates quartier and arrondissement semantics", () => {
  const decision = manifest.decisions[0];
  assert.ok(decision?.reason.includes("arrondissement"));
  assert.ok(decision?.reason.includes("product-locality"));
  assert.ok(decision?.sources.some((source) => source.evidenceKind === "first_party_explicit_quartier"));
  assert.ok(decision?.sources.some((source) => source.evidenceKind === "administrative_semantics_arrondissement"));
});

test("geometry evidence batch 2 remains fail-closed", () => {
  assert.equal(manifest.publicActivation, false);
  assert.equal(manifest.productionWriteCount, 0);
  assert.ok(manifest.guardrails.some((guardrail) => guardrail.includes("No arrondissement boundary")));
  assert.ok(manifest.guardrails.some((guardrail) => guardrail.includes("No centroid")));
});
