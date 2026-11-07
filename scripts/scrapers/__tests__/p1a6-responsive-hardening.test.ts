import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("P1A.6 — Responsive hardening", () => {
  it("keeps the certified responsive viewport matrix including Pro Max", () => {
    const audit = source("scripts/audits/p1a6-map-responsive-smoke.ts");
    for (const expected of [
      '{ width: 390, height: 844, label: "390" }',
      '{ width: 430, height: 932, label: "430" }',
      '{ width: 768, height: 900, label: "768" }',
      '{ width: 1280, height: 900, label: "1280" }',
    ]) assert.ok(audit.includes(expected));
  });

  it("audits Morocco, city and selected district states across national, intelligence and MapLibre experiences", () => {
    const audit = source("scripts/audits/p1a6-map-responsive-smoke.ts");
    assert.ok(audit.includes('{ path: "/map", slug: "map", experience: "national" }'));
    assert.ok(audit.includes('{ path: "/map?city=Rabat", slug: "map-rabat", experience: "intelligence" }'));
    assert.ok(audit.includes('{ path: "/map?city=Rabat&district=Agdal", slug: "map-rabat-agdal", experience: "maplibre", citySlug: "rabat", districtSlug: "agdal" }'));
    assert.ok(audit.includes('{ path: "/map?city=casablanca&district=maarif&layer=explore", slug: "map-casablanca-maarif", experience: "maplibre", citySlug: "casablanca", districtSlug: "maarif" }'));
    assert.ok(audit.includes('data-selected-quartier="maarif"'));
    assert.ok(audit.includes('data-local-evidence="unavailable"'));
    assert.ok(audit.includes("fresh-poi-empty-state"));
    assert.ok(audit.includes('[data-premium-map]'));
    assert.ok(audit.includes('[data-region-slug]'));
    assert.ok(audit.includes('[data-region-list-slug]'));
    assert.ok(audit.includes('[data-akarfinder-market-intelligence-map]'));
    assert.ok(audit.includes('[data-maplibre-spike]'));
  });

  it("certifies real viewport composition rather than full-page screenshots", () => {
    const audit = source("scripts/audits/p1a6-map-responsive-smoke.ts");
    assert.ok(audit.includes("fullPage: false"));
    assert.ok(audit.includes("screenshotsCaptured += 1"));
    assert.ok(audit.includes("horizontal-overflow"));
    assert.ok(audit.includes("MapLibre canvas missing"));
    assert.ok(audit.includes('route.experience !== "national"'));
    assert.equal(audit.includes('keyboard.press("Tab")'), false);
  });

  it("uses the premium SVG on initial /map and the city map router on other routes", () => {
    const page = source("app/map/page.tsx");
    const router = source("components/map/NationalMapRouter.tsx");
    const national = source("components/map/NationalTerritoryExperience.tsx");
    assert.match(page, /usePremiumNationalExplore/);
    assert.match(page, /PremiumInteractiveMapBridge/);
    assert.match(router, /NationalTerritoryExperienceDynamic/);
    assert.match(router, /useNationalExplore/);
    assert.match(national, /\/api\/geo\/national-territories/);
    assert.match(national, /__AKARFINDER_NATIONAL_MAP__/);
  });

  it("L2-A captures an honest city-scale map and prevents synthetic neighborhood geometry", () => {
    const audit = source("scripts/audits/p1a6-map-responsive-smoke.ts");
    const national = source("components/map/PremiumInteractiveMap.tsx");
    for (const required of [
      "data-city-location-notice",
      "map-casablanca-city-",
      "l2a-no-fake-geometries",
      'data-neighborhood-schematic',
    ]) assert.ok(audit.includes(required), `L2-A browser audit must retain ${required}`);
    assert.ok(national.includes("Contours de quartiers indisponibles"));
    assert.ok(national.includes("data-region-slug"));
    for (const invented of ["neighborhoodPolygon", "<motion.polygon", "data-neighborhood-schematic"]) {
      assert.equal(national.includes(invented), false, `UI must never return to ${invented}`);
    }
  });

  it("preserves Rabat intelligence for city-only while canonical district routing uses MapLibre", () => {
    const router = source("components/map/NationalMapRouter.tsx");
    assert.match(router, /rabat-market-intelligence/);
    assert.match(router, /MapNeighborhoodClient/);
    assert.match(router, /useMapLibreNeighborhood/);
    assert.match(router, /MapLibreNeighborhood3D/);
  });
});
