import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const national = readFileSync("components/map/PremiumInteractiveMap.tsx", "utf8");
const rail = readFileSync("components/map/P4MapDecisionRail.tsx", "utf8");
const poi = readFileSync("lib/neighborhood-context/poi-registry.ts", "utf8");
const seed = readFileSync("lib/neighborhood-context/certified-seed.ts", "utf8");

test("no fake prices, verified POI counts, or synthetic availability published by national selection UI", () => {
  for (const forbidden of ["priceRepere", "landmarksVerified", "QuartierStats", "readablePrice", "selectedQuartier.stats", "quartier.stats"]) {
    assert.equal(national.includes(forbidden), false, `production UI must not contain ${forbidden}`);
  }
  assert.match(national, /data-local-evidence="unavailable"/);
  assert.match(national, /Informations locales à documenter/);
  assert.match(national, /Contours de quartiers indisponibles/);
  assert.match(national, /data-city-location-notice/);
  for (const inventedShape of ["neighborhoodPolygon", "<motion.polygon", "data-neighborhood-schematic"]) {
    assert.equal(national.includes(inventedShape), false, `L2-A must not restore fabricated geometry: ${inventedShape}`);
  }
});

test("zero recent POIs have an explicit honest fallback, not a false sourcing claim", () => {
  assert.match(rail, /localContext\?\.anchor_count/);
  assert.match(rail, /Aucun repère suffisamment récent n’est actuellement disponible/);
  assert.match(rail, /Repères récents indisponibles/);
  assert.match(rail, /className="p4-premium-empty-evidence"/);
  const css = readFileSync("app/map/ux-convergence-l9.css", "utf8");
  assert.match(css, /\.p4-premium-empty-evidence/);
});

test("seed is expired by audit date; don't increase the source freshness window to hide missing POIs", () => {
  const observedAt = seed.match(/ANN_L5_CERTIFIED_SEED_OBSERVED_AT = "([^"]+)"/)?.[1];
  assert.ok(observedAt, "dated certified seed must exist");
  assert.match(poi, /NEIGHBORHOOD_POI_MAX_AGE_MS = 30 \* 24 \* 60 \* 60 \* 1000/);
  const ageMs = Date.parse("2026-11-07T00:00:00Z") - Date.parse(observedAt);
  assert.ok(ageMs > 30 * 24 * 60 * 60 * 1000, "baseline should disclose expired seed");
});
