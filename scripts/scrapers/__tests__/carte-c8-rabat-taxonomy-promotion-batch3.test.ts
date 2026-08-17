import assert from "node:assert/strict";
import test from "node:test";

import {
  RABAT_ALL_PRODUCT_LOCALITIES,
  RABAT_PRODUCT_LOCALITY_CANDIDATES,
  getRabatMapEligibleLocalities,
} from "../../../lib/geo/rabat-locality-registry";

const promoted = [
  "candidate_rabat_douar_doum",
  "candidate_rabat_el_kora",
  "candidate_rabat_el_garaa",
] as const;

test("C8 taxonomy promotion batch 3 promotes exactly the source-backed trio", () => {
  for (const id of promoted) {
    const locality = RABAT_ALL_PRODUCT_LOCALITIES.find((entry) => entry.id === id);
    assert.ok(locality, `${id} must exist`);
    assert.equal(locality.taxonomy_status, "certified");
    assert.equal(locality.geometry_status, "unresolved");
    assert.equal(locality.geometry_source, null);
    assert.equal(locality.market_map_eligible, false);
    assert.equal(locality.activation_status, "blocked");
    assert.equal(locality.fail_closed_reason, "geometry_unresolved");
  }
});

test("promotion batch 3 preserves the remaining taxonomy candidates", () => {
  const certifiedCandidateIds = RABAT_PRODUCT_LOCALITY_CANDIDATES
    .filter((entry) => entry.taxonomy_status === "certified")
    .map((entry) => entry.id)
    .sort();
  assert.deepEqual(certifiedCandidateIds, [
    "candidate_rabat_akkari",
    "candidate_rabat_al_boustane",
    "candidate_rabat_diour_jamaa",
    "candidate_rabat_douar_doum",
    "candidate_rabat_el_garaa",
    "candidate_rabat_el_kora",
    "candidate_rabat_yacoub_el_mansour",
  ].sort());
  assert.equal(RABAT_PRODUCT_LOCALITY_CANDIDATES.filter((entry) => entry.taxonomy_status === "candidate").length, 11);
});

test("promotion batch 3 never expands public map eligibility", () => {
  assert.equal(RABAT_ALL_PRODUCT_LOCALITIES.length, 23);
  assert.deepEqual(
    getRabatMapEligibleLocalities().map((entry) => entry.id),
    ["district_rabat_agdal", "district_rabat_hay_riad", "district_rabat_hassan"],
  );
});
