// SEARCH-GATEWAY-REAL-ESTATE-ONLY-FILTER-1
// Unit tests for the real-estate-only filter.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  isRealEstateGatewayResult,
  REAL_ESTATE_SIGNALS,
  VEHICLE_SIGNALS,
  VEHICLE_URL_SEGMENTS,
} from "../../../lib/search-gateway/search-gateway-real-estate-filter.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function accept(title: string, snippet?: string, url = "https://avito.ma/annonce/123") {
  return isRealEstateGatewayResult(title, snippet, url);
}

// ─── URL blacklist ─────────────────────────────────────────────────────────────

describe("search-gateway-real-estate-filter — URL blacklist", () => {
  it("rejects Avito voitures category URL", () => {
    assert.equal(
      isRealEstateGatewayResult(
        "Renault Clio 2020",
        undefined,
        "https://avito.ma/casablanca/voitures-d-occasion/renault-clio-123"
      ),
      false
    );
  });

  it("rejects Avito voiture- prefix URL", () => {
    assert.equal(
      isRealEstateGatewayResult(
        "Dacia Sandero 2022",
        undefined,
        "https://avito.ma/agadir/voiture-occasion-456"
      ),
      false
    );
  });

  it("rejects Avito motos category URL", () => {
    assert.equal(
      isRealEstateGatewayResult(
        "Yamaha 125cc",
        undefined,
        "https://avito.ma/rabat/motos-scooters/yamaha-789"
      ),
      false
    );
  });

  it("rejects Avito camions category URL", () => {
    assert.equal(
      isRealEstateGatewayResult(
        "Camion Mercedes",
        undefined,
        "https://avito.ma/casablanca/camions-utilitaires/mercedes-111"
      ),
      false
    );
  });

  it("rejects Avito utilitaires category URL", () => {
    assert.equal(
      isRealEstateGatewayResult(
        "Fourgon Renault",
        undefined,
        "https://avito.ma/fes/utilitaires/fourgon-222"
      ),
      false
    );
  });

  it("accepts Avito appartement URL (not a vehicle path)", () => {
    assert.equal(
      isRealEstateGatewayResult(
        "Appartement 3 pièces Casablanca",
        "75m², 2 chambres, salon",
        "https://avito.ma/casablanca/appartements-a-vendre/appt-3p-333"
      ),
      true
    );
  });

  it("accepts Avito immobilier URL", () => {
    assert.equal(
      isRealEstateGatewayResult(
        "Villa moderne Marrakech",
        "250m², 4 chambres, piscine",
        "https://avito.ma/marrakech/immobilier/villa-moderne-444"
      ),
      true
    );
  });
});

// ─── Vehicle keyword filter ────────────────────────────────────────────────────

describe("search-gateway-real-estate-filter — vehicle keyword rejection", () => {
  it("rejects title with 'voiture' and no real estate signal", () => {
    assert.equal(accept("Voiture occasion pas cher Casablanca"), false);
  });

  it("rejects title with car brand (BMW) and no real estate signal", () => {
    assert.equal(accept("BMW Série 3 2021 très bon état"), false);
  });

  it("rejects title with 'automobile' and no real estate signal", () => {
    assert.equal(accept("Automobile d'occasion à vendre"), false);
  });

  it("rejects title with 'camion' and no real estate signal", () => {
    assert.equal(accept("Camion frigorifique Mercedes disponible"), false);
  });

  it("rejects title with 'kilométrage' in snippet", () => {
    assert.equal(
      accept("Véhicule d'occasion Casablanca", "Faible kilométrage, première main"),
      false
    );
  });

  it("rejects title with 'diesel' and no real estate signal", () => {
    assert.equal(accept("Citroën C5 diesel 2019"), false);
  });

  it("rejects title with 'boîte automatique'", () => {
    assert.equal(accept("Peugeot 308 boîte automatique"), false);
  });
});

// ─── Real estate signal acceptance ────────────────────────────────────────────

describe("search-gateway-real-estate-filter — real estate acceptance", () => {
  it("accepts title with 'appartement'", () => {
    assert.equal(accept("Appartement 2 chambres à louer Rabat"), true);
  });

  it("accepts title with 'villa'", () => {
    assert.equal(accept("Villa 4 chambres Marrakech Palmeraie"), true);
  });

  it("accepts title with 'terrain'", () => {
    assert.equal(accept("Terrain constructible 500m² Kenitra"), true);
  });

  it("accepts title with 'immobilier' (Sarouty-style)", () => {
    assert.equal(
      isRealEstateGatewayResult(
        "Immobilier Casablanca — annonces récentes",
        "Appartements, villas, terrains disponibles",
        "https://sarouty.ma/annonces/casablanca"
      ),
      true
    );
  });

  it("accepts title with 'villa' (Yakeey-style)", () => {
    assert.equal(
      isRealEstateGatewayResult(
        "Villas à vendre Marrakech",
        "Découvrez nos villas de standing",
        "https://yakeey.com/fr/villas-marrakech"
      ),
      true
    );
  });

  it("accepts title with 'm²'", () => {
    assert.equal(accept("Studio 35m² meublé centre-ville Casablanca"), true);
  });

  it("accepts 'local commercial' in title", () => {
    assert.equal(accept("Local commercial 80m² Agadir centre"), true);
  });
});

// ─── False positive protection ─────────────────────────────────────────────────

describe("search-gateway-real-estate-filter — false positives avoided", () => {
  it("accepts 'garage' (real estate parking spot)", () => {
    assert.equal(accept("Garage à vendre Casablanca Maârif"), true);
  });

  it("accepts 'parking' (real estate)", () => {
    assert.equal(accept("Parking couvert disponible à louer Casablanca"), true);
  });

  it("accepts 'bureau' (office real estate)", () => {
    assert.equal(accept("Bureau 120m² à louer quartier Gauthier"), true);
  });

  it("accepts result with vehicle brand AND real estate signal (RE wins)", () => {
    // Listing description mentions a car brand in context of luxury property
    assert.equal(
      accept(
        "Villa de standing Marrakech avec garage",
        "Propriété de luxe — garage pour BMW et Mercedes inclus"
      ),
      true
    );
  });

  it("accepts result with 'voiture' in snippet but strong RE signal in title", () => {
    assert.equal(
      accept(
        "Appartement 3 chambres Casablanca",
        "Avec parking voiture en sous-sol"
      ),
      true
    );
  });

  it("accepts result with no signal (benefit of the doubt)", () => {
    // Generic title with no RE or vehicle keywords — keep it
    assert.equal(
      isRealEstateGatewayResult(
        "Annonce Casablanca 2024",
        undefined,
        "https://sarouty.ma/annonce/555"
      ),
      true
    );
  });
});

// ─── Ranking unaffected ────────────────────────────────────────────────────────

describe("search-gateway-real-estate-filter — ranking invariants", () => {
  it("filter is a pure function — same inputs always yield same output", () => {
    const url = "https://avito.ma/appartements/casablanca-appt-999";
    const r1 = isRealEstateGatewayResult("Appartement Casablanca", "75m²", url);
    const r2 = isRealEstateGatewayResult("Appartement Casablanca", "75m²", url);
    assert.equal(r1, r2);
  });

  it("filter does not modify result title or snippet", () => {
    const title = "Appartement 3 pièces Casablanca";
    const snippet = "75m², 2 chambres, standing";
    isRealEstateGatewayResult(title, snippet, "https://avito.ma/appt/123");
    // Strings are immutable in JS — just verifying the call doesn't throw
    assert.equal(title, "Appartement 3 pièces Casablanca");
    assert.equal(snippet, "75m², 2 chambres, standing");
  });
});

// ─── Signal arrays integrity ───────────────────────────────────────────────────

describe("search-gateway-real-estate-filter — signal arrays", () => {
  it("REAL_ESTATE_SIGNALS contains expected terms", () => {
    assert.ok(REAL_ESTATE_SIGNALS.includes("appartement"));
    assert.ok(REAL_ESTATE_SIGNALS.includes("villa"));
    assert.ok(REAL_ESTATE_SIGNALS.includes("terrain"));
    assert.ok(REAL_ESTATE_SIGNALS.includes("m²"));
    assert.ok(REAL_ESTATE_SIGNALS.includes("chambre"));
  });

  it("VEHICLE_SIGNALS does not contain 'garage' or 'parking'", () => {
    assert.ok(!VEHICLE_SIGNALS.includes("garage"));
    assert.ok(!VEHICLE_SIGNALS.includes("parking"));
  });

  it("VEHICLE_SIGNALS does not contain 'auto' (too short, false positives)", () => {
    assert.ok(!VEHICLE_SIGNALS.includes("auto"));
  });

  it("VEHICLE_SIGNALS does not contain 'moteur' (matches 'promoteur')", () => {
    assert.ok(!VEHICLE_SIGNALS.includes("moteur"));
  });

  it("VEHICLE_URL_SEGMENTS contains expected Avito paths", () => {
    assert.ok(VEHICLE_URL_SEGMENTS.includes("/voitures/"));
    assert.ok(VEHICLE_URL_SEGMENTS.includes("/motos/"));
    assert.ok(VEHICLE_URL_SEGMENTS.includes("/camions/"));
  });
});
