import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  NEIGHBORHOOD_POINTS,
  buildNeighborhoodSearchHref,
  getNeighborhoodBySlug,
  getNeighborhoods,
  getNeighborhoodsByCity,
  isKnownNeighborhood,
  slugifyNeighborhood,
} from "@/lib/map/neighborhood-data";

describe("neighborhood-data first-party contract", () => {
  const dataSource = fs.readFileSync(
    path.join(process.cwd(), "lib/map/neighborhood-data.ts"),
    "utf8"
  );
  const mapPageSource = fs.readFileSync(path.join(process.cwd(), "app/map/page.tsx"), "utf8");
  const mapExperienceSource = fs.readFileSync(
    path.join(process.cwd(), "components/map/MapNeighborhoodExperience.tsx"),
    "utf8"
  );

  it("expose une base quartier typée et complète", () => {
    assert.equal(getNeighborhoods().length, NEIGHBORHOOD_POINTS.length);
    assert.ok(NEIGHBORHOOD_POINTS.length > 0);
    for (const point of NEIGHBORHOOD_POINTS) {
      assert.ok(point.city);
      assert.ok(point.neighborhood);
      assert.ok(point.citySlug);
      assert.ok(point.neighborhoodSlug);
      assert.ok(point.slug);
      assert.equal(point.searchHref.startsWith("/search?"), true);
      assert.equal(point.searchHref.includes("/listings/"), false);
      assert.ok(Number.isFinite(point.lat));
      assert.ok(Number.isFinite(point.lng));
      assert.ok(["benchmark_source", "first_party_estimate", "not_available"].includes(point.priceSignal.source));
    }
  });

  it("maintient des slugs uniques par point", () => {
    const slugs = new Set(NEIGHBORHOOD_POINTS.map((point) => point.slug));
    assert.equal(slugs.size, NEIGHBORHOOD_POINTS.length);
  });

  it("garde des coordonnées plausibles au Maroc", () => {
    for (const point of NEIGHBORHOOD_POINTS) {
      assert.ok(point.lat >= 20 && point.lat <= 37, point.slug);
      assert.ok(point.lng <= -1 && point.lng >= -12, point.slug);
    }
  });

  it("encode correctement les CTA de recherche", () => {
    assert.equal(buildNeighborhoodSearchHref("Casablanca", "Maârif"), "/search?city=Casablanca&q=Ma%C3%A2rif");
    assert.equal(buildNeighborhoodSearchHref("Marrakech", "Guéliz"), "/search?city=Marrakech&q=Gu%C3%A9liz");
    assert.equal(buildNeighborhoodSearchHref("Rabat", "Hay Riad"), "/search?city=Rabat&q=Hay+Riad");
    assert.equal(buildNeighborhoodSearchHref("Fès", "Ville Nouvelle"), "/search?city=F%C3%A8s&q=Ville+Nouvelle");
    assert.equal(slugifyNeighborhood("Jardin d'Essais"), "jardin-dessais");
  });

  it("résout les recherches quartier de façon sûre", () => {
    assert.ok(getNeighborhoodsByCity("casablanca").some((point) => point.neighborhood === "Maârif"));
    assert.ok(getNeighborhoodsByCity("CASABLANCA").some((point) => point.neighborhood === "Maârif"));
    assert.equal(getNeighborhoodsByCity("Ville Inconnue").length, 0);
    assert.ok(getNeighborhoodBySlug("casablanca", "maarif"));
    assert.equal(getNeighborhoodBySlug("casablanca", "inconnu"), null);
    assert.equal(isKnownNeighborhood("Casablanca", "Maârif"), true);
    assert.equal(isKnownNeighborhood("Casablanca", "Quartier Inconnu"), false);
  });

  it("n'invente pas de prix/m2 précis hors source", () => {
    const uncited = NEIGHBORHOOD_POINTS.filter((point) => point.priceSignal.source === "not_available");
    for (const point of uncited) {
      assert.match(point.priceSignal.label, /Repère|Benchmark|bientôt disponible/i);
    }
    assert.equal(dataSource.includes("17 500 MAD/m²"), false);
    assert.equal(dataSource.includes("18 000 MAD/m²"), false);
  });

  it("verrouille le wording risqué hors donnée quartier", () => {
    const forbidden = [
      "annonces analysées",
      "biens analysés",
      "sources analysées",
      "données analysées",
      "index AkarFinder",
      "densité d'annonces",
      "clusters d'annonces",
      "fiabilité moyenne des annonces",
    ];

    for (const word of forbidden) {
      assert.equal(dataSource.includes(word), false, word);
      assert.equal(mapExperienceSource.includes(word), false, word);
      assert.equal(mapPageSource.includes(word), false, word);
    }
    assert.equal(mapPageSource.includes("minReliabilityScore"), false);
    assert.equal(dataSource.includes("minReliabilityScore"), false);
  });

  it("conserve reliability_score ailleurs dans le projet", () => {
    const listingTypesSource = fs.readFileSync(
      path.join(process.cwd(), "lib/listings/types.ts"),
      "utf8"
    );
    assert.equal(listingTypesSource.includes("reliability_score"), true);
  });
});
