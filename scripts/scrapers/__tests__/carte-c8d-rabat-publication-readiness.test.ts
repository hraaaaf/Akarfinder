import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { RABAT_C8D_PUBLICATION_READINESS, getRabatC8DPublicationReadiness, listRabatC8DNewActivationCandidates } from "../../../lib/geo/rabat-locality-publication-readiness";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test("C8D accounts for all 23 C8B localities", () => {
  assert.equal(RABAT_C8D_PUBLICATION_READINESS.length, 23);
  assert.equal(new Set(RABAT_C8D_PUBLICATION_READINESS.map((entry) => entry.localityId)).size, 23);
});

test("C8D has no new public activation candidate yet", () => {
  assert.deepEqual(listRabatC8DNewActivationCandidates(), []);
  assert.equal(RABAT_C8D_PUBLICATION_READINESS.filter((entry) => entry.decision === "legacy_covered").length, 4);
  assert.equal(RABAT_C8D_PUBLICATION_READINESS.filter((entry) => entry.decision === "blocked").length, 19);
});

test("C8D legacy-ready set is exactly the existing C0-C7 market-zone coverage", () => {
  assert.deepEqual(
    RABAT_C8D_PUBLICATION_READINESS.filter((entry) => entry.decision === "legacy_covered").map((entry) => entry.localityId).sort(),
    ["district_rabat_agdal", "district_rabat_hassan", "district_rabat_hay_riad", "district_rabat_souissi"],
  );
});

test("C8D keeps Ocean blocked for geometry and metrics", () => {
  const ocean = getRabatC8DPublicationReadiness("district_rabat_ocean");
  assert.ok(ocean);
  assert.equal(ocean.taxonomyReady, true);
  assert.equal(ocean.contextReady, true);
  assert.equal(ocean.geometryReady, false);
  assert.equal(ocean.metricsReady, false);
  assert.deepEqual(ocean.blockers, ["geometry_not_certified", "metrics_not_available"]);
});

test("C8D does not wire readiness into the public API", () => {
  const route = read("app/api/geo/rabat-market-intelligence/route.ts");
  assert.ok(!route.includes("rabat-locality-publication-readiness"));
});

test("C8D documents the current C3 four-slug metric boundary", () => {
  const metricsReader = read("lib/map/rabat-market-intelligence-live.ts");
  for (const slug of ["agdal", "hay-riad", "souissi", "hassan"]) assert.ok(metricsReader.includes(`\"${slug}\"`));
});

test("C8 status records the verified live dry-run without inventing readiness", () => {
  const status = read("docs/CARTE_C8_RABAT_EXTENSION_STATUS.md");
  assert.match(status, /Aucun pourcentage C8 n’est publié/);
  assert.match(status, /C8D — Resolver shadow \+ autorité proposée \+ maturité marché \+ récupération Agenz ✅ LIVE DRY-RUN VERIFIED/);
  assert.match(status, /run live `31960247064`/);
  assert.match(status, /prix récupérable : \*\*8\/9\*\* ; surface récupérable : \*\*0\/9\*\*/);
  assert.match(status, /nouvelles activations publiques C8 : \*\*0\*\*/);
  assert.match(status, /mutations DB C8 : \*\*0\*\*/);
});
