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
    assert.ok(page.includes("ne constitue ni une mesure live du marché"));
    assert.equal(page.includes("Intelligence quartier"), false);
  });

  it("merges the duplicate Quartiers directory into the canonical Immobilier hub", () => {
    const page = source("app/quartiers/page.tsx");
    assert.ok(page.includes('permanentRedirect("/immobilier")'));
    assert.equal(page.includes("Rechercher dans cette ville"), false);
  });

  it("keeps city-cluster clicks inside map exploration and rewrites legacy intelligence wording", () => {
    const client = source("components/map/MapNeighborhoodClient.tsx");
    assert.ok(client.includes("a.maplibre-cluster-marker"));
    assert.ok(client.includes("router.push(`/map?city="));
    assert.ok(client.includes("Repères quartier · Données indicatives"));
    assert.ok(client.includes("Repères quartier · AkarFinder"));
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
