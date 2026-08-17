import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/geo/rabat-taxonomy-evidence-batch4-v1.json"), "utf8"),
) as {
  version: string;
  publicActivation: boolean;
  productionWriteCount: number;
  decisions: Array<{ localityId: string; decision: string; sources: Array<{ evidenceKind: string; provider: string }> }>;
  notPromotedByThisEvidence: string[];
};

test("C8 taxonomy evidence batch 4 qualifies only explicit Commune de Rabat quartier evidence", () => {
  assert.equal(manifest.version, "c8_taxonomy_evidence_batch4_v1");
  assert.deepEqual(manifest.decisions.map((entry) => entry.localityId), ["candidate_rabat_diour_jamaa"]);
  assert.ok(manifest.decisions.every((entry) => entry.decision === "ready_for_taxonomy_certification"));
  assert.ok(manifest.decisions.every((entry) => entry.sources.some((source) => source.evidenceKind === "first_party_explicit_quartier" && source.provider === "Commune de Rabat")));
});

test("batch 4 does not infer taxonomy from heritage or address mentions", () => {
  assert.deepEqual(
    manifest.notPromotedByThisEvidence.sort(),
    ["candidate_rabat_hay_nahda", "candidate_rabat_mellah", "candidate_rabat_oudayas"].sort(),
  );
});

test("batch 4 remains evidence-only and fail-closed", () => {
  assert.equal(manifest.publicActivation, false);
  assert.equal(manifest.productionWriteCount, 0);
});