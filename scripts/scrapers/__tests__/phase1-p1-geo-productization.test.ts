import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Phase 1 P1 — Geo productization", () => {
  it("turns /immobilier into a shared-layout national product hub", () => {
    const page = source("app/immobilier/page.tsx");
    assert.ok(page.includes("SiteHeader"));
    assert.ok(page.includes("SiteFooter"));
    assert.ok(page.includes('action="/search"'));
    assert.ok(page.includes('href="/map"'));
    assert.ok(page.includes("Index immobilier local"));
  });

  it("connects city pages to real Search previews and structured query parameters", () => {
    const page = source("app/immobilier/[city]/page.tsx");
    assert.ok(page.includes("searchListings"));
    assert.ok(page.includes("GeoResultPreview"));
    assert.ok(page.includes("transaction_type=buy"));
    assert.ok(page.includes("transaction_type=rent"));
    assert.ok(page.includes("property_type="));
    assert.ok(page.includes("SiteHeader"));
    assert.ok(page.includes("SiteFooter"));
  });

  it("keeps neighborhood pages behind the geo eligibility gate and uses cautious reference wording", () => {
    const page = source("app/immobilier/[city]/[district]/page.tsx");
    assert.ok(page.includes("isSeoEligibleGeoPair"));
    assert.ok(page.includes("GeoResultPreview"));
    assert.ok(page.includes("Repères quartier"));
    assert.ok(page.includes("mesure live du marché"));
    assert.ok(page.includes("recommandation d’achat"));
    assert.equal(page.includes("Intelligence quartier"), false);
  });

  it("merges the duplicate Quartiers directory into the canonical Immobilier hub", () => {
    const page = source("app/quartiers/page.tsx");
    assert.ok(page.includes('permanentRedirect("/immobilier")'));
    assert.equal(page.includes("Rechercher dans cette ville"), false);
  });

  it("uses the URL as the map navigation source of truth", () => {
    const client = source("components/map/MapNeighborhoodClient.tsx");
    const experience = source("components/map/MapNeighborhoodExperience.tsx");
    assert.ok(client.includes("useSearchParams"));
    assert.ok(client.includes("buildMapHref"));
    assert.ok(client.includes("router.push"));
    assert.ok(client.includes("router.replace"));
    assert.ok(client.includes("initialState"));
    assert.ok(experience.includes("maplibre-cluster-marker"));
    assert.ok(experience.includes("Carte immobilière · repères indicatifs"));
    assert.equal(experience.includes("showCityOverlay"), false);
    assert.equal(experience.includes("CityCinematicEntrance"), false);
  });

  it("keeps the interactive map on the canonical neighborhood adapter", () => {
    const experience = source("components/map/MapNeighborhoodExperience.tsx");
    const canonical = source("lib/map/canonical-neighborhood-data.ts");

    assert.ok(experience.includes('@/lib/map/canonical-neighborhood-data'));
    assert.equal(experience.includes('@/lib/map/neighborhood-data'), false);
    assert.ok(canonical.includes('from "@/lib/geo/geo-entity-registry"'));
    assert.ok(canonical.includes("resolveCityEntity"));
    assert.ok(canonical.includes("resolveNeighborhoodEntity"));
    assert.ok(canonical.includes("RAW_NEIGHBORHOOD_POINTS.map(canonicalizePoint)"));
  });

  it("preserves structured map context across Search and neighborhood handoffs", () => {
    const searchPage = source("app/search/page.tsx");
    const bridge = source("components/search/SearchMapNavigationBridge.tsx");
    const neighborhoodPage = source("app/immobilier/[city]/[district]/page.tsx");
    assert.ok(searchPage.includes("SearchMapNavigationBridge"));
    assert.ok(bridge.includes("CANONICAL_SEARCH_SESSION_EVENT"));
    assert.ok(bridge.includes('a[href^="/map"]'));
    assert.ok(bridge.includes("buildMapHref"));
    assert.ok(neighborhoodPage.includes("buildMapHref"));
    assert.ok(neighborhoodPage.includes("buildMapSearchHref"));
    assert.ok(neighborhoodPage.includes("Voir ce quartier sur la carte"));
  });
});

describe("Phase 1 P1 — structured local Search contracts", () => {
  it("does not use free-text-only city and neighborhood CTA contracts", () => {
    const city = source("components/seo/CitySearchCtas.tsx");
    const neighborhood = source("components/seo/NeighborhoodSearchCtas.tsx");
    assert.ok(city.includes("transaction_type=buy"));
    assert.ok(city.includes("city="));
    assert.ok(city.includes("property_type="));
    assert.ok(neighborhood.includes("transaction_type=rent"));
    assert.ok(neighborhood.includes("city="));
    assert.ok(neighborhood.includes("property_type="));
  });
});
