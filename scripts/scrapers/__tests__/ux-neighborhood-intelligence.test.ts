import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildNeighborhoodIntelligenceModel, neighborhoodIntelligenceChangesRanking } from "../../../lib/ux/neighborhood-intelligence";

const priceReference = {
  status: "available",
  reason: null,
  city: "Casablanca",
  neighborhood: "Maarif",
  propertyType: "appartement",
  scope: "neighborhood",
  askingPricePerM2: 19000,
  currency: "MAD",
  unit: "MAD/m²",
  sourceName: "Yakeey",
  sourceUrl: "https://example.com/reference",
  observedAt: "2026-07-01",
  methodology: "Référence publiée",
  sampleSize: 30,
  sampleLabel: "30 observations publiées",
  confidence: "élevée",
  rangeLow: 17000,
  rangeHigh: 21000,
  disclosure: "Référence publique",
} as any;

const listing = {
  id: "listing-a",
  duplicate_group_id: "property-a",
  title: "Appartement Maarif",
  city: "Casablanca",
  neighborhood: "Maarif",
  district: "Maarif",
  property_type: "Appartement",
  transaction_type: "buy",
  price: 1800000,
  currency: "DH",
  surface_m2: 100,
  price_per_m2: 18000,
  bedrooms: 2,
  bathrooms: 1,
  freshness_label: "Récent",
  geo_precision: "exact",
  geo_source: "scraped_coordinates",
  latitude: 33.586,
  longitude: -7.632,
} as any;

test("neighborhood intelligence counts canonical properties once", () => {
  const model = buildNeighborhoodIntelligenceModel({
    visibleListings: [listing, { ...listing, id: "listing-a-copy" }, { ...listing, id: "listing-b", duplicate_group_id: "property-b", price_per_m2: 20000 }],
    city: "Casablanca",
    neighborhood: "Maarif",
    priceReference,
  });
  assert.equal(model.status, "available");
  assert.equal(model.canonicalPropertyCount, 2);
  assert.equal(model.displayedMedianPricePerM2, 19000);
  assert.equal(model.publishedReferencePricePerM2, 19000);
});

test("local indicators describe visible supply and never fabricate historical intelligence", () => {
  const model = buildNeighborhoodIntelligenceModel({
    visibleListings: [listing],
    city: "Casablanca",
    neighborhood: "Maarif",
    priceReference,
  });
  assert.ok(model.disclosure.includes("actuellement visibles"));
  assert.ok(model.unavailableInsights.includes("Vitesse de vente ou de location"));
  assert.ok(model.unavailableInsights.includes("Liquidité du quartier"));
  assert.equal(neighborhoodIntelligenceChangesRanking(), false);
  const text = JSON.stringify(model).toLowerCase();
  assert.ok(!text.includes("quartier en hausse"));
  assert.ok(!text.includes("forte demande"));
});

test("city scope is mandatory and empty search remains explicit", () => {
  const noCity = buildNeighborhoodIntelligenceModel({ visibleListings: [listing], city: "all", priceReference });
  const noResults = buildNeighborhoodIntelligenceModel({ visibleListings: [], city: "Casablanca", neighborhood: "Maarif", priceReference });
  assert.equal(noCity.status, "insufficient_scope");
  assert.equal(noResults.status, "no_visible_properties");
});

test("search explorer mounts the neighborhood insight panel with plain wording", () => {
  const dock = readFileSync(resolve(process.cwd(), "components/search/SearchPriceExplorerDock.tsx"), "utf8");
  const panel = readFileSync(resolve(process.cwd(), "components/search/NeighborhoodIntelligencePanel.tsx"), "utf8");
  assert.match(dock, /buildNeighborhoodIntelligenceModel/);
  assert.match(dock, /<NeighborhoodIntelligencePanel/);
  assert.match(panel, /Le quartier en chiffres/);
  assert.match(panel, /Ce que montrent les résultats/);
  assert.match(panel, /Données non disponibles/);
});
