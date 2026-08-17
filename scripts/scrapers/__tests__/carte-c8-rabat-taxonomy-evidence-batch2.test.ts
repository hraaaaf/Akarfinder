import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/geo/rabat-taxonomy-evidence-batch2-v1.json"), "utf8"),
) as {
  publicActivation: boolean;
  productionWriteCount: number;
  decisions: Array<{
    localityId: string;
    decision: string;
    reason: string;
    sources: Array<{ provider: string; evidenceKind: string; url: string }>;
  }>;
  guardrails: string[];
};

test("C8 taxonomy evidence batch 2 contains only Yacoub El Mansour", () => {
  assert.deepEqual(manifest.decisions.map((entry) => entry.localityId), ["candidate_rabat_yacoub_el_mansour"]);
});

test("Yacoub El Mansour is backed by explicit first-party quartier wording", () => {
  const decision = manifest.decisions[0];
  assert.equal(decision.decision, "ready_for_taxonomy_certification");
  assert.ok(decision.reason.includes("quartier"));
  assert.equal(decision.sources.length, 1);
  assert.equal(decision.sources[0]?.provider, "Agence Urbaine de Rabat-Sale");
  assert.equal(decision.sources[0]?.evidenceKind, "first_party_explicit_quartier");
});

test("C8 taxonomy evidence batch 2 performs no activation or production write", () => {
  assert.equal(manifest.publicActivation, false);
  assert.equal(manifest.productionWriteCount, 0);
  assert.ok(manifest.guardrails.some((guardrail) => guardrail.includes("No taxonomy status")));
});
