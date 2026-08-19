import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Carte Lot 11 — neighborhood intelligence", () => {
  it("wires the neighborhood page to the same observed market aggregator as the map", () => {
    const page = source("app/quartiers/[citySlug]/[neighborhoodSlug]/page.tsx");
    assert.match(page, /readCityMarketIntelligenceMetrics/);
    assert.match(page, /row\.districtSlug === neighborhoodSlug/);
    assert.match(page, /row\.transactionType === "sale"/);
    assert.match(page, /Stock observé dédupliqué/);
  });

  it("fails closed instead of publishing fake price, density, trend, or categories", () => {
    const page = source("app/quartiers/[citySlug]/[neighborhoodSlug]/page.tsx");
    assert.match(page, /Données insuffisantes/);
    assert.match(page, /Historique insuffisant/);
    assert.match(page, /Données insuffisantes pour une classification certifiée/);
    assert.match(page, /AkarFinder n’extrapole pas une courbe/);
  });

  it("surfaces the three Lot 9 market KPIs and data quality signals", () => {
    const page = source("app/quartiers/[citySlug]/[neighborhoodSlug]/page.tsx");
    assert.match(page, /Prix médian \/ m²/);
    assert.match(page, /Densité observée/);
    assert.match(page, /Volume d’annonces/);
    assert.match(page, /Confiance des données/);
    assert.match(page, /Fraîcheur confirmée/);
  });

  it("keeps Search and Map handoffs structured around city + district", () => {
    const page = source("app/quartiers/[citySlug]/[neighborhoodSlug]/page.tsx");
    assert.match(page, /href=\{point\.searchHref\}/);
    assert.match(page, /const mapHref = `\/map\?city=\$\{encodeURIComponent\(point\.citySlug\)\}&district=\$\{encodeURIComponent\(point\.neighborhoodSlug\)\}&layer=listings`/);
    assert.match(page, /mapHref=\{mapHref\}/);
  });

  it("includes the canonical neighborhood map preview and real header actions", () => {
    const page = source("app/quartiers/[citySlug]/[neighborhoodSlug]/page.tsx");
    const preview = source("components/map/NeighborhoodMiniMap.tsx");
    const share = source("components/map/NeighborhoodShareButton.tsx");
    assert.match(page, /NeighborhoodMiniMap/);
    assert.match(page, /NeighborhoodShareButton/);
    assert.match(page, /data-akarfinder-neighborhood-back/);
    assert.match(preview, /data-akarfinder-neighborhood-map-preview/);
    assert.match(preview, /tiles\.openfreemap\.org/);
    assert.match(preview, /interactive: false/);
    assert.match(share, /navigator\.share/);
    assert.match(share, /navigator\.clipboard\.writeText/);
  });

  it("keeps the existing Rabat rich sheet truth-safe", () => {
    const sheet = source("components/map/RabatMarketZoneSheet.tsx");
    assert.match(sheet, /Confiance des données/);
    assert.match(sheet, /Historique insuffisant/);
    assert.match(sheet, /Données insuffisantes pour une classification certifiée/);
    assert.match(sheet, /Les valeurs sont observées, jamais interpolées/);
  });
});
