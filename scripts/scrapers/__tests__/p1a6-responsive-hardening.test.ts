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

  it("L2-B rail follows quotidien > cadre de vie > biens without unsupported market claims", () => {
    const rail = source("components/map/P4MapDecisionRail.tsx");
    const quotidien = rail.indexOf("data-l2b-daily-context");
    const cadre = rail.indexOf("data-l2b-living-context");
    const biens = rail.indexOf("data-l2b-listings");
    assert.ok(quotidien >= 0 && cadre > quotidien && biens > cadre, "truthful context section order");
    assert.equal(rail.includes("Indicateurs disponibles"), false, "provider must not imply live prices without source evidence");
    assert.equal(rail.includes('className="p4-premium-tabs"'), false, "decorative inactive navigation must be removed");
    assert.ok(rail.includes("p4-premium-empty-evidence"), "explicit stale POI disclosure preserved");
    assert.ok(rail.includes('className="p4-premium-primary-action"'), "Search CTA must remain");
    assert.ok(rail.includes("href={searchHref}"), "Search handoff remains geo-filtered");
  });

  it("L2-B daily evidence uses only source-backed context and never promises listings", () => {
    const rail = source("components/map/P4MapDecisionRail.tsx");
    const page = source("app/map/page.tsx");
    const audit = source("scripts/audits/vivre-ici-maarif-daily-context-qa.mjs");
    assert.ok(rail.includes("data-vivre-ici-daily-details"));
    assert.ok(rail.includes("data-vivre-ici-daily-grid"));
    assert.ok(rail.includes("localContext?.anchors.filter"));
    assert.ok(rail.includes("category.count > 0"));
    assert.ok(rail.includes("Non documenté"));
    assert.ok(rail.includes("Rechercher des biens à"));
    assert.equal(rail.includes("Voir les biens disponibles à"), false);
    assert.ok(page.includes('import "./vivre-ici-daily-evidence.css";'));
    assert.ok(audit.includes("VIVRE_ICI_DAILY_QA_AFTER"));
  });

  it("L2-C replaces decorative mobile handle with a true accessible sheet", () => {
    const rail = source("components/map/P4MapDecisionRail.tsx");
    const css = source("app/map/l2c-sheet.css");
    const page = source("app/map/page.tsx");
    const audit = source("scripts/audits/p1a6-map-responsive-smoke.ts");
    assert.ok(rail.includes('data-sheet-expanded={sheetExpanded ? "true" : "false"}'));
    assert.ok(rail.includes('aria-controls="vivre-ici-sheet-extra"'));
    assert.ok(rail.includes('aria-expanded={sheetExpanded}'));
    assert.ok(rail.includes('id="vivre-ici-sheet-extra"'));
    assert.ok(css.includes('max-height: 160px !important'));
    assert.ok(css.includes('min-height: 44px !important'));
    assert.ok(page.includes('import "./l2c-sheet.css";'));
    assert.ok(audit.includes("l2c-sheet-expand-collapse"));
    assert.ok(audit.includes("map-casablanca-maarif-sheet-expanded-"));
  });

  it("L3-A Maârif modes use actual 2D camera and street navigation, not fake administrative bounds", () => {
    const map = source("components/map/MapLibreNeighborhood3D.tsx");
    const css = source("app/map/l3-maarif-modes.css");
    const audit = source("scripts/audits/p1a6-map-responsive-smoke.ts");
    assert.ok(map.includes('data-l3-maarif-pilot={isMaarifPilot ? "true" : "false"}'));
    assert.ok(map.includes('data-l3-admin-boundary={adminPreviewBounds ? "osm-indicative-preview" : "unavailable"}'));
    assert.ok(map.includes('data-l3-go-street'));
    assert.ok(map.includes('data-l3-go-quarter'));
    assert.ok((map.match(/pitch: 0,/g) ?? []).length >= 4, 'all map modes keep pitch zero');
    assert.ok((map.match(/bearing: 0,/g) ?? []).length >= 4, 'all map modes keep north-up bearing');
    assert.equal(map.includes('<span>Quartiers</span>'), false);
    assert.ok(css.includes('min-height: 44px'));
    assert.ok(audit.includes('l3a-maarif-real-camera-modes'));
    assert.ok(audit.includes('map-casablanca-maarif-street-'));
  });

  it("L2-D exposes real OSM/Esri map credits without hiding them under the mobile sheet", () => {
    const maplibre = source("components/map/MapLibreNeighborhood3D.tsx");
    const national = source("components/map/PremiumInteractiveMap.tsx");
    const css = source("app/map/l2d-attribution.css");
    const page = source("app/map/page.tsx");
    const audit = source("scripts/audits/p1a6-map-responsive-smoke.ts");
    assert.ok(maplibre.includes("attributionControl: { compact: false, customAttribution:"));
    assert.equal(maplibre.includes("attributionControl: false"), false);
    assert.ok(national.includes("data-premium-map-attribution"));
    assert.ok(national.includes("https://www.openstreetmap.org/copyright"));
    assert.ok(national.includes("https://www.geoboundaries.org/"));
    assert.ok(css.includes("maplibregl-ctrl-bottom-right"));
    assert.ok(page.includes('import "./l2d-attribution.css";'));
    assert.ok(audit.includes("l2d-maplibre-attribution"));
    assert.ok(audit.includes("l2d-national-attribution"));
  });

  it("preserves Rabat intelligence for city-only while canonical district routing uses MapLibre", () => {
    const router = source("components/map/NationalMapRouter.tsx");
    const legacy = source("components/map/MapNeighborhoodClient.tsx");
    assert.match(legacy, /rabat-market-intelligence/);
    assert.match(router, /if \(!useNationalExplore\) return <MapNeighborhoodClient initialState=\{initialState\} \/>/);
    assert.match(router, /const useNationalExplore = rawLayer === MAP_LAYER_EXPLORE && !useMapLibreNeighborhood/);
    assert.match(router, /MapNeighborhoodClient/);
    assert.match(router, /useMapLibreNeighborhood/);
    assert.match(router, /MapLibreNeighborhood3D/);
  });
});
