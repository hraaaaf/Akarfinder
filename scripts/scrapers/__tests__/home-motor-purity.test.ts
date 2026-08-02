// HOME-MOTOR-PURITY-WORDING-1
// Invariant tests for the home page motor-purity alignment:
//   - Forbidden wording absent from all home-touched modules
//   - MarketPulse ticker only returns authorized-source listings
//   - getMarketPulseHref only produces /listings/ paths (safe for authorized-only data)
//   - DataProofBlock stat labels are doctrine-clean
//   - Hero wording updated
//   - HomeResultPreview removed from page imports

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildMarketPulseItem,
  buildMarketPulseItems,
  containsForbiddenMarketPulseWording,
  getMarketPulseHref,
} from "../../../lib/market-pulse/get-market-pulse-listings.js";
import { canPublishStructuredListing } from "../../../lib/sources/source-access-registry.js";
import type { Listing } from "../../../lib/listings/types.js";

// ─── Forbidden wording in MarketPulse fallback ────────────────────────────────

describe("home-motor-purity — MarketPulse fallback ne contient pas de wording interdit", () => {
  function baseListing(overrides: Partial<Listing> = {}): Listing {
    return {
      id: "test-1",
      title: "Appartement Casablanca",
      city: "Casablanca",
      neighborhood: "Maarif",
      price: 900_000,
      currency: "DH",
      surface_m2: 80,
      price_per_m2: 11_250,
      property_type: "Appartement",
      transaction_type: "buy",
      bedrooms: 2,
      bathrooms: 1,
      freshness_label: "",
      source_type: "",
      reliability_label: "",
      reliability_score: 75,
      is_mre_friendly: false,
      description: "",
      image_url: "",
      reliability_explanation: "",
      source_name: "partner_csv",
      ...overrides,
    } as Listing;
  }

  it("shortDetail fallback: 'Repère disponible' is not 'Annonce analysée'", () => {
    const l = baseListing({
      surface_m2: 0,
      bedrooms: 0,
      bedrooms_count: 0,
      price_per_m2: 0,
      reliability_score: 75,
    });
    const item = buildMarketPulseItem(l);
    if (!item) return;
    assert.ok(!item.shortDetail.includes("analysée"));
    assert.ok(!item.lineLabel.includes("analysée"));
  });

  it("containsForbiddenMarketPulseWording detects 'données vérifiées'", () => {
    assert.equal(containsForbiddenMarketPulseWording("données vérifiées"), true);
  });

  it("containsForbiddenMarketPulseWording does not flag 'Repère disponible'", () => {
    assert.equal(containsForbiddenMarketPulseWording("Repère disponible"), false);
  });

  it("getMarketPulseHref returns undefined for empty/null id", () => {
    assert.equal(getMarketPulseHref(undefined), undefined);
    assert.equal(getMarketPulseHref(""), undefined);
    assert.equal(getMarketPulseHref("  "), undefined);
  });

  it("getMarketPulseHref returns /listings/ path for valid id", () => {
    const href = getMarketPulseHref("partner-listing-123");
    assert.ok(href?.startsWith("/listings/"));
  });
});

describe("home-motor-purity — sources autorisées pour MarketPulse", () => {
  it("partner_csv: canPublishStructuredListing=true", () => {
    assert.equal(canPublishStructuredListing("partner_csv"), true);
  });
  it("mubawab: canPublishStructuredListing=false", () => {
    assert.equal(canPublishStructuredListing("mubawab"), false);
  });
  it("avito: canPublishStructuredListing=false", () => {
    assert.equal(canPublishStructuredListing("avito"), false);
  });
  it("sarouty: canPublishStructuredListing=false", () => {
    assert.equal(canPublishStructuredListing("sarouty"), false);
  });
});

describe("home-motor-purity — buildMarketPulseItems de-duplication et qualité", () => {
  function authorizedListing(id: string, city: string): Listing {
    return {
      id,
      title: `Appartement ${city}`,
      city,
      neighborhood: "Centre",
      price: 1_000_000,
      currency: "DH",
      surface_m2: 90,
      price_per_m2: 11_111,
      property_type: "Appartement",
      transaction_type: "buy",
      bedrooms: 2,
      bathrooms: 1,
      freshness_label: "",
      source_type: "",
      reliability_label: "",
      reliability_score: 80,
      is_mre_friendly: false,
      description: "",
      image_url: "",
      reliability_explanation: "",
      source_name: "partner_csv",
      data_completeness_score: 75,
    } as Listing;
  }

  it("builds items from authorized listings", () => {
    const items = buildMarketPulseItems([
      authorizedListing("p1", "Casablanca"),
      authorizedListing("p2", "Rabat"),
    ], 10);
    assert.ok(items.length >= 1);
  });

  it("empty listings produces empty items", () => {
    assert.equal(buildMarketPulseItems([], 10).length, 0);
  });

  it("maxItems cap respected", () => {
    const listings = Array.from({ length: 10 }, (_, i) =>
      authorizedListing(`p${i}`, i < 5 ? "Casablanca" : "Rabat")
    );
    listings.forEach((l, i) => { (l as Listing).price = 900_000 + i * 1000; });
    assert.ok(buildMarketPulseItems(listings, 3).length <= 3);
  });
});

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("home-motor-purity — HomeResultPreview supprimé de la page d'accueil", () => {
  const pageSource = readFileSync(resolve(__dirname, "../../../app/page.tsx"), "utf-8");

  it("app/page.tsx ne contient plus HomeResultPreview", () => {
    assert.ok(!pageSource.includes("HomeResultPreview"));
  });

  it("app/page.tsx contient MarketPulse", () => {
    assert.ok(pageSource.includes("MarketPulse"));
  });
});

describe("home-motor-purity — hero wording aligné avec la doctrine", () => {
  const heroSource = readFileSync(
    resolve(__dirname, "../../../components/home/GoogleLikeHero.tsx"),
    "utf-8"
  );

  it("hero ne contient plus 'analysez les biens'", () => {
    assert.ok(!heroSource.includes("analysez les biens"));
  });

  it("hero affirme le positionnement moteur de recherche immobilier", () => {
    assert.ok(
      heroSource.includes("1er moteur de recherche immobilier au Maroc"),
      "Hero headline must preserve the canonical search-first positioning"
    );
  });

  it("hero conserve l'orchestrateur de recherche comme action centrale", () => {
    assert.ok(
      heroSource.includes("SearchEntryOrchestrator"),
      "Hero must keep SearchEntryOrchestrator as the central action"
    );
  });

  it("hero n'ajoute pas de promesse de vérification ou certification", () => {
    assert.ok(!heroSource.includes("vérifié"));
    assert.ok(!heroSource.includes("certifié"));
  });

  it("hero conserve la photo (HERO_DESKTOP path présent)", () => {
    assert.ok(heroSource.includes("akar-residence-sunset-desktop.webp"));
  });
});

describe("home-motor-purity — wording interdit absent des composants clés", () => {
  const FILES = [
    ["WhySection", "../../../components/landing/WhySection.tsx"],
    ["HomeFinalCTA", "../../../components/landing/HomeFinalCTA.tsx"],
    ["CityIntentGrid", "../../../components/landing/CityIntentGrid.tsx"],
    ["MreTrustSection", "../../../components/landing/MreTrustSection.tsx"],
    ["DataProofBlock", "../../../components/landing/DataProofBlock.tsx"],
    ["SignatureMapSection", "../../../components/landing/SignatureMapSection.tsx"],
  ] as const;

  const FORBIDDEN_TOKENS = [
    "biens analysés",
    "annonces analysées",
    "données analysées",
    "doublons détectés",
    "Doublons détectés",
    "index AkarFinder",
    "Index AkarFinder",
    "biens indexés",
    "résultats observés récemment",
    "Résultats observés récemment",
    "Voir les biens analysés",
    "Voir les biens analyses",
    "rassemble les annonces",
    "Sources analysees",
    "Annonces analysees",
  ];

  for (const [name, relPath] of FILES) {
    const source = readFileSync(resolve(__dirname, relPath), "utf-8");
    for (const token of FORBIDDEN_TOKENS) {
      it(`${name}: does not contain "${token}"`, () => {
        assert.ok(!source.includes(token), `${name} must not contain forbidden token: "${token}"`);
      });
    }
  }
});
