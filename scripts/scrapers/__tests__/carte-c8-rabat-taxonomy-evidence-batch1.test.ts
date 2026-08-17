import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { RABAT_PRODUCT_LOCALITY_CANDIDATES } from "../../../lib/geo/rabat-locality-registry";

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/geo/rabat-taxonomy-evidence-batch1-v1.json"), "utf8"),
) as {
  publicActivation: boolean;
  productionWriteCount: number;
  decisions: Array<{ localityId: string; decision: string; sources: Array<{ provider: string; evidenceKind: string; url: string }> }>;
};

const candidateIds = new Set(RABAT_PRODUCT_LOCALITY_CANDIDATES.map((entry) => entry.id));

test("taxonomy evidence batch 1 is bounded to two existing Rabat candidates", () => {
  assert.equal(manifest.decisions.length, 2);
  assert.deepEqual(manifest.decisions.map((entry) => entry.localityId).sort(), [
    "candidate_rabat_akkari",
    "candidate_rabat_al_boustane",
  ]);
  assert.ok(manifest.decisions.every((entry) => candidateIds.has(entry.localityId)));
});

test("batch 1 requires explicit first-party quartier semantics", () => {
  for (const entry of manifest.decisions) {
    assert.equal(entry.decision, "ready_for_taxonomy_certification");
    assert.ok(entry.sources.length >= 1);
    assert.ok(entry.sources.every((source) => source.provider === "Agence Urbaine de Rabat-Sale"));
    assert.ok(entry.sources.every((source) => source.evidenceKind === "first_party_explicit_quartier"));
    assert.ok(entry.sources.every((source) => source.url.startsWith("https://aurs.org.ma/")));
  }
});

test("taxonomy evidence is proposal-only and performs no activation or DB write", () => {
  assert.equal(manifest.publicActivation, false);
  assert.equal(manifest.productionWriteCount, 0);
  for (const entry of RABAT_PRODUCT_LOCALITY_CANDIDATES.filter((candidate) => manifest.decisions.some((decision) => decision.localityId === candidate.id))) {
    assert.equal(entry.taxonomy_status, "candidate");
    assert.equal(entry.market_map_eligible, false);
    assert.equal(entry.activation_status, "blocked");
  }
});
