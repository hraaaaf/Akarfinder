import assert from "node:assert/strict";
import test from "node:test";

import { RABAT_ALL_PRODUCT_LOCALITIES } from "../../../lib/geo/rabat-locality-registry";
import {
  RABAT_C8C_CERTIFIED_GEOMETRIES,
  listRabatC8CUnresolvedLocalityIds,
} from "../../../lib/geo/rabat-locality-geometry-registry";

const certifiedIds = new Set(RABAT_C8C_CERTIFIED_GEOMETRIES.map((entry) => entry.localityId));
const unresolved = RABAT_ALL_PRODUCT_LOCALITIES.filter((locality) => !certifiedIds.has(locality.id));
const taxonomyReady = unresolved.filter((locality) => locality.taxonomy_status === "certified");
const taxonomyBlocked = unresolved.filter((locality) => locality.taxonomy_status === "candidate");

test("C8C unresolved geometry matrix accounts for all 19 remaining localities", () => {
  assert.equal(RABAT_ALL_PRODUCT_LOCALITIES.length, 23);
  assert.equal(RABAT_C8C_CERTIFIED_GEOMETRIES.length, 4);
  assert.equal(unresolved.length, 19);
  assert.deepEqual(
    unresolved.map((locality) => locality.id).sort(),
    listRabatC8CUnresolvedLocalityIds().sort(),
  );
});

test("only Ocean is taxonomy-ready among unresolved C8C localities", () => {
  assert.deepEqual(taxonomyReady.map((locality) => locality.id), ["district_rabat_ocean"]);
  assert.equal(taxonomyReady[0]?.geometry_status, "unresolved");
  assert.equal(taxonomyReady[0]?.geometry_source, null);
  assert.equal(taxonomyReady[0]?.fail_closed_reason, "geometry_unresolved");
});

test("the other 18 unresolved localities remain taxonomy candidates", () => {
  assert.equal(taxonomyBlocked.length, 18);
  assert.ok(taxonomyBlocked.every((locality) => locality.geometry_status === "unresolved"));
  assert.ok(taxonomyBlocked.every((locality) => locality.geometry_source === null));
  assert.ok(taxonomyBlocked.every((locality) => locality.fail_closed_reason === "taxonomy_candidate"));
});

test("blocker audit never changes public eligibility", () => {
  assert.equal(unresolved.filter((locality) => locality.market_map_eligible).length, 0);
  assert.equal(unresolved.filter((locality) => locality.activation_status !== "blocked").length, 0);
});
