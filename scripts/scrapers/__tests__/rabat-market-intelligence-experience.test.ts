import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  districtSlugForMarketZone,
  formatIntelligenceMetric,
  marketZoneIdForDistrict,
} from "../../../components/map/RabatMarketIntelligenceExperience";

describe("C4 Rabat market intelligence experience", () => {
  it("binds the four market zones to canonical district slugs", () => {
    assert.equal(districtSlugForMarketZone("market_zone_rabat_agdal"), "agdal");
    assert.equal(districtSlugForMarketZone("market_zone_rabat_hay_riad"), "hay-riad");
    assert.equal(districtSlugForMarketZone("market_zone_rabat_souissi"), "souissi");
    assert.equal(districtSlugForMarketZone("market_zone_rabat_centre"), "hassan");
    assert.equal(marketZoneIdForDistrict("hassan"), "market_zone_rabat_centre");
    assert.equal(districtSlugForMarketZone("unknown"), null);
  });

  it("formats metrics and preserves missing values", () => {
    assert.ok(formatIntelligenceMetric(18500, "price").includes("DH/m²"));
    assert.ok(formatIntelligenceMetric(3.42, "density").includes("annonces/km²"));
    assert.equal(formatIntelligenceMetric(1, "listings"), "1 annonce");
    assert.equal(formatIntelligenceMetric(4, "listings"), "4 annonces");
    assert.equal(formatIntelligenceMetric(null, "price"), "Données insuffisantes");
  });

  it("contains the C3 endpoint, three modes, legend and fail-closed copy", () => {
    const source = readFileSync("components/map/RabatMarketIntelligenceExperience.tsx", "utf8");
    assert.ok(source.includes("/api/geo/rabat-market-intelligence"));
    assert.ok(source.includes("price: { label: \"Prix\""));
    assert.ok(source.includes("density: { label: \"Densité\""));
    assert.ok(source.includes("listings: { label: \"Annonces\""));
    assert.ok(source.includes("data-akarfinder-intelligence-legend"));
    assert.ok(source.includes("Aucune couleur de remplacement n’est inventée"));
  });

  it("preserves the legacy experience outside certified premium intelligence cities", () => {
    const source = readFileSync("components/map/MapNeighborhoodClient.tsx", "utf8");
    const registry = readFileSync("lib/map/premium-map-city-registry.ts", "utf8");
    assert.ok(source.includes("hasPremiumMarketIntelligence(navigationState.city)"));
    assert.ok(source.includes("RabatMarketIntelligenceExperienceDynamic"));
    assert.ok(source.includes("MapNeighborhoodExperienceDynamic"));
    assert.ok(registry.includes('slug: "rabat"'));
    assert.ok(registry.includes("marketIntelligence: true"));
    for (const slug of ["casablanca", "marrakech", "tanger", "agadir", "fes"]) {
      const block = registry.slice(registry.indexOf(`slug: "${slug}"`));
      assert.ok(block.includes("marketIntelligence: false"), `${slug} must remain on the legacy experience until certified`);
    }
  });
});
