import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/geo/rabat-geometry-evidence-batch1-v1.json"), "utf8"),
) as {
  publicActivation: boolean;
  productionWriteCount: number;
  rawGeometryCreated: boolean;
  decisions: Array<{
    localityId: string;
    decision: string;
    reason: string;
    sources: Array<{ provider: string; url: string; evidenceKind: string }>;
  }>;
  guardrails: string[];
};

test("C8 geometry evidence batch 1 is exhaustive over the two promoted taxonomy targets", () => {
  assert.deepEqual(
    manifest.decisions.map((entry) => entry.localityId).sort(),
    ["candidate_rabat_akkari", "candidate_rabat_al_boustane"].sort(),
  );
});

test("C8 geometry evidence batch 1 keeps both targets fail-closed", () => {
  assert.ok(manifest.decisions.every((entry) => entry.decision === "geometry_unresolved"));
  assert.ok(manifest.decisions.every((entry) => entry.reason.length > 80));
  assert.ok(manifest.decisions.every((entry) => entry.sources.length >= 1));
  assert.ok(manifest.decisions.flatMap((entry) => entry.sources).every((source) => source.provider === "Agence Urbaine de Rabat-Sale"));
});

test("C8 geometry evidence batch 1 creates no synthetic or production geometry", () => {
  assert.equal(manifest.rawGeometryCreated, false);
  assert.equal(manifest.publicActivation, false);
  assert.equal(manifest.productionWriteCount, 0);
  assert.ok(manifest.guardrails.some((guardrail) => guardrail.includes("No centroid")));
  assert.ok(manifest.guardrails.some((guardrail) => guardrail.includes("No Voronoi")));
});
