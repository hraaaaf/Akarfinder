import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { hasExplicitSourceUrlDistrictConflict } from "../../../lib/geo/district-matcher.js";
import { getAnnL5CertifiedSeedPois } from "../../../lib/neighborhood-context/certified-seed.js";
import { isPublishableNeighborhoodPoiName } from "../../../lib/neighborhood-context/read-model.js";

const root = process.cwd();
const databaseSearchSource = readFileSync(join(root, "lib/search/database-search.ts"), "utf8");
const readModelSource = readFileSync(join(root, "lib/neighborhood-context/read-model.ts"), "utf8");

test("Data Trust rejects an explicit source-URL district contradiction", () => {
  assert.equal(
    hasExplicitSourceUrlDistrictConflict(
      "Rabat",
      "Agdal",
      "https://example.com/rabat/les-orangers/appartement-123",
    ),
    true,
  );
  assert.equal(
    hasExplicitSourceUrlDistrictConflict(
      "Rabat",
      "Agdal",
      "https://example.com/rabat/agdal/appartement-123",
    ),
    false,
  );
  assert.equal(
    hasExplicitSourceUrlDistrictConflict(
      "Rabat",
      "Agdal",
      "https://example.com/rabat/appartement-123",
    ),
    false,
  );
});

test("Data Trust only treats an explicit URL path segment as contradictory evidence", () => {
  assert.equal(
    hasExplicitSourceUrlDistrictConflict(
      "Rabat",
      "Agdal",
      "https://example.com/rabat/listing?note=les-orangers",
    ),
    false,
  );
});

test("legacy database search enforces the explicit district-conflict guard", () => {
  assert.match(
    databaseSearchSource,
    /hasExplicitSourceUrlDistrictConflict\([\s\S]*listing\.city,[\s\S]*query\.district,[\s\S]*listing\.listing_url/,
  );
});

test("POI publication policy blocks placeholders and the known malformed label without aesthetic heuristics", () => {
  for (const value of ["", "Unnamed", "unknown", "Sans nom", "N/A", "crastelf 2"]) {
    assert.equal(isPublishableNeighborhoodPoiName(value), false, value);
  }
  for (const value of ["Carrefour Market", "APEX Dental Clinic", "Marjane 2"]) {
    assert.equal(isPublishableNeighborhoodPoiName(value), true, value);
  }
});

test("the certified Rabat Agdal seed no longer contains the malformed POI", () => {
  const pois = getAnnL5CertifiedSeedPois(
    "district_rabat_agdal",
    new Date("2026-08-17T12:00:00.000Z"),
  );
  assert.equal(pois.some((poi) => poi.name.toLowerCase() === "crastelf 2"), false);
});

test("the neighborhood public read-model applies POI name publication policy", () => {
  assert.match(
    readModelSource,
    /isPublishableNeighborhoodPoiName\(poi\.name\)/,
  );
});
