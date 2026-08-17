import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/geo/rabat-taxonomy-evidence-batch3-v1.json"), "utf8"),
) as {
  version: string;
  publicActivation: boolean;
  productionWriteCount: number;
  decisions: Array<{ localityId: string; decision: string; sources: Array<{ evidenceKind: string }> }>;
  notPromotedByThisEvidence: string[];
};

test("C8 taxonomy evidence batch 3 qualifies exactly three explicit AURS quartiers", () => {
  assert.equal(manifest.version, "c8_taxonomy_evidence_batch3_v1");
  assert.deepEqual(
    manifest.decisions.map((entry) => entry.localityId).sort(),
    ["candidate_rabat_douar_doum", "candidate_rabat_el_garaa", "candidate_rabat_el_kora"].sort(),
  );
  assert.ok(manifest.decisions.every((entry) => entry.decision === "ready_for_taxonomy_certification"));
  assert.ok(manifest.decisions.every((entry) => entry.sources.some((source) => source.evidenceKind === "first_party_explicit_quartier")));
});

test("batch 3 does not over-promote programme-only names", () => {
  assert.deepEqual(
    manifest.notPromotedByThisEvidence.sort(),
    ["candidate_rabat_kbibat", "candidate_rabat_mabella", "candidate_rabat_takaddoum"].sort(),
  );
});

test("batch 3 remains evidence-only and fail-closed", () => {
  assert.equal(manifest.publicActivation, false);
  assert.equal(manifest.productionWriteCount, 0);
});
