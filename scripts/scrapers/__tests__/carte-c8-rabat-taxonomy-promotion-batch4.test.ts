import assert from "node:assert/strict";
import test from "node:test";

import { RABAT_PRODUCT_LOCALITY_CANDIDATES, getRabatMapEligibleLocalities } from "../../../lib/geo/rabat-locality-registry";

const diourJamaa = RABAT_PRODUCT_LOCALITY_CANDIDATES.find((entry) => entry.id === "candidate_rabat_diour_jamaa");

test("C8 taxonomy promotion batch 4 promotes Diour Jamaa only", () => {
  assert.ok(diourJamaa);
  assert.equal(diourJamaa.taxonomy_status, "certified");
  assert.equal(diourJamaa.context_availability, "first_party_available");
  assert.equal(diourJamaa.geometry_status, "unresolved");
  assert.equal(diourJamaa.geometry_source, null);
  assert.equal(diourJamaa.fail_closed_reason, "geometry_unresolved");
});

test("promotion batch 4 leaves eleven taxonomy candidates", () => {
  assert.equal(RABAT_PRODUCT_LOCALITY_CANDIDATES.filter((entry) => entry.taxonomy_status === "candidate").length, 11);
});

test("promotion batch 4 never expands public map eligibility", () => {
  assert.equal(diourJamaa?.market_map_eligible, false);
  assert.equal(diourJamaa?.activation_status, "blocked");
  assert.deepEqual(getRabatMapEligibleLocalities().map((entry) => entry.id), ["district_rabat_agdal", "district_rabat_hay_riad", "district_rabat_hassan"]);
});
