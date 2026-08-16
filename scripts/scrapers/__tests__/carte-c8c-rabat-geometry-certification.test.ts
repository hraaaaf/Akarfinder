import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { RABAT_MARKET_ZONES_CANARY } from "../../../lib/geo/rabat-market-zones-canary";
import { validateMarketZoneRecord } from "../../../lib/geo/market-zone-registry";
import { RABAT_ALL_PRODUCT_LOCALITIES, RABAT_PRODUCT_LOCALITY_CANDIDATES } from "../../../lib/geo/rabat-locality-registry";
import {
  RABAT_C8C_CERTIFIED_GEOMETRIES,
  getRabatLocalityGeometryDecision,
  listRabatC8CUnresolvedLocalityIds,
} from "../../../lib/geo/rabat-locality-geometry-registry";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test("C8C certifies only the four already-reviewed C7 analytical market geometries", () => {
  assert.equal(RABAT_MARKET_ZONES_CANARY.length, 4);
  assert.ok(RABAT_MARKET_ZONES_CANARY.every((zone) => validateMarketZoneRecord(zone).length === 0));
  assert.deepEqual(
    RABAT_C8C_CERTIFIED_GEOMETRIES.map((entry) => entry.localityId).sort(),
    ["district_rabat_agdal", "district_rabat_hassan", "district_rabat_hay_riad", "district_rabat_souissi"],
  );
});

test("C8C labels every certified polygon as analytical and never official", () => {
  for (const entry of RABAT_C8C_CERTIFIED_GEOMETRIES) {
    assert.equal(entry.semanticType, "analytical_market_zone");
    assert.equal(entry.officialBoundary, false);
    assert.equal(entry.geometryStatus, "certified_polygon");
    assert.equal(entry.certificationStatus, "certified_for_market_analytics");
    assert.equal(entry.c8PublicActivation, false);
    assert.ok(entry.areaKm2 > 0);
    assert.ok(entry.derivationMethod.length > 0);
    assert.ok(entry.evidence.length > 0);
  }
});

test("C8C keeps Hassan binding explicit through the existing Centre Rabat market zone", () => {
  const hassan = getRabatLocalityGeometryDecision("district_rabat_hassan");
  assert.equal(hassan.status, "certified");
  if (hassan.status === "certified") assert.equal(hassan.certification.sourceMarketZoneId, "market_zone_rabat_centre");
});

test("C8C leaves Ocean and every taxonomy candidate unresolved", () => {
  assert.deepEqual(getRabatLocalityGeometryDecision("district_rabat_ocean"), { status: "unresolved", reason: "no_certified_geometry" });
  for (const candidate of RABAT_PRODUCT_LOCALITY_CANDIDATES) {
    assert.deepEqual(getRabatLocalityGeometryDecision(candidate.id), { status: "unresolved", reason: "no_certified_geometry" });
  }
});

test("C8C accounting is exhaustive over the current C8B registry", () => {
  const unresolved = listRabatC8CUnresolvedLocalityIds();
  assert.equal(RABAT_ALL_PRODUCT_LOCALITIES.length, 23);
  assert.equal(RABAT_C8C_CERTIFIED_GEOMETRIES.length, 4);
  assert.equal(unresolved.length, 19);
  assert.equal(new Set([...RABAT_C8C_CERTIFIED_GEOMETRIES.map((entry) => entry.localityId), ...unresolved]).size, 23);
});

test("C8C is not wired into public runtime before C8D", () => {
  const resolver = read("lib/geo/resolve-listing-geo.ts");
  const marketApi = read("app/api/geo/rabat-market-intelligence/route.ts");
  assert.ok(!resolver.includes("rabat-locality-geometry-registry"));
  assert.ok(!marketApi.includes("rabat-locality-geometry-registry"));
});
