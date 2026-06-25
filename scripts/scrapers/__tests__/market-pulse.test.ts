import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildMarketPulseItems,
  containsForbiddenMarketPulseWording,
  formatMarketPulsePrice,
  getMarketPulseHref,
  getMarketPulseShortDetail,
  isPresentableMarketPulseListing,
  mapMarketPulseOperationLabel,
  shouldUseMockMarketPulseFallback,
} from "../../../lib/market-pulse/get-market-pulse-listings.js";
import type { Listing } from "../../../lib/listings/types.js";

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "listing-1",
    title: "Appartement centre ville",
    city: "Rabat",
    neighborhood: "Hay Riad",
    price: 8500,
    currency: "DH",
    surface_m2: 92,
    price_per_m2: 92,
    property_type: "Appartement",
    transaction_type: "rent",
    bedrooms: 2,
    bathrooms: 1,
    freshness_label: "Mise a jour recente",
    source_type: "Source analysÃ©e",
    reliability_label: "FiabilitÃ© Ã©levÃ©e",
    reliability_score: 78,
    is_mre_friendly: false,
    description: "Annonce analysee",
    image_url: "",
    reliability_explanation: "Score indicatif disponible",
    ...overrides,
  };
}

describe("UI-MARKET-PULSE - operation mapping", () => {
  test("maps rent synonyms to Location", () => {
    assert.equal(mapMarketPulseOperationLabel("rent"), "Location");
    assert.equal(mapMarketPulseOperationLabel("location"), "Location");
    assert.equal(mapMarketPulseOperationLabel("louer"), "Location");
  });

  test("maps buy and sale synonyms to Vente", () => {
    assert.equal(mapMarketPulseOperationLabel("buy"), "Vente");
    assert.equal(mapMarketPulseOperationLabel("sale"), "Vente");
    assert.equal(mapMarketPulseOperationLabel("vente"), "Vente");
    assert.equal(mapMarketPulseOperationLabel("acheter"), "Vente");
  });

  test("maps new synonyms to Neuf", () => {
    assert.equal(mapMarketPulseOperationLabel("new"), "Neuf");
    assert.equal(mapMarketPulseOperationLabel("neuf"), "Neuf");
  });

  test("drops unknown transaction types", () => {
    assert.equal(mapMarketPulseOperationLabel("invest"), null);
    assert.equal(mapMarketPulseOperationLabel(undefined), null);
  });
});

describe("UI-MARKET-PULSE - price formatting", () => {
  test("formats rent price in DH/mois", () => {
    assert.match(formatMarketPulsePrice(8500, "rent"), /DH\/mois$/);
  });

  test("formats sale price in DH", () => {
    const value = formatMarketPulsePrice(1450000, "buy");
    assert.match(value, /DH$/);
    assert.ok(!value.includes("/mois"));
  });
});

describe("UI-MARKET-PULSE - filtering", () => {
  test("rejects incomplete listings without city", () => {
    assert.equal(
      isPresentableMarketPulseListing(
        makeListing({ city: "" })
      ),
      false
    );
  });

  test("rejects low reliability listings when score is available", () => {
    assert.equal(
      isPresentableMarketPulseListing(
        makeListing({ reliability_score: 44 })
      ),
      false
    );
  });

  test("rejects high duplicate score listings", () => {
    assert.equal(
      isPresentableMarketPulseListing(
        makeListing({ duplicate_score: 91 })
      ),
      false
    );
  });

  test("keeps a listing when price is missing but useful detail exists", () => {
    assert.equal(
      isPresentableMarketPulseListing(
        makeListing({ price: 0, transaction_type: "new", surface_m2: 0, bedrooms: 0, bedrooms_count: 0 })
      ),
      true
    );
  });
});

describe("UI-MARKET-PULSE - helpers", () => {
  test("returns fallback when there is no provider and no fetched rows", () => {
    assert.equal(shouldUseMockMarketPulseFallback(0, false, false), true);
    assert.equal(shouldUseMockMarketPulseFallback(0, true, false), false);
    assert.equal(shouldUseMockMarketPulseFallback(4, false, false), false);
  });

  test("creates href for listing ids", () => {
    assert.equal(getMarketPulseHref("42"), "/listings/42");
    assert.equal(getMarketPulseHref("slug-id"), "/listings/slug-id");
    assert.equal(getMarketPulseHref(""), undefined);
  });

  test("returns a short detail with surface first", () => {
    assert.equal(
      getMarketPulseShortDetail(makeListing({ surface_m2: 105 })),
      "105 m²"
    );
  });

  test("dedupes and limits presentable items", () => {
    const items = buildMarketPulseItems([
      makeListing({ id: "1", duplicate_group_id: "dup-1" }),
      makeListing({ id: "2", duplicate_group_id: "dup-1" }),
      makeListing({ id: "3", transaction_type: "buy", price: 1450000 }),
    ], 8);

    assert.equal(items.length, 2);
  });
});

describe("UI-MARKET-PULSE - wording guardrails", () => {
  test("does not allow forbidden wording", () => {
    assert.equal(containsForbiddenMarketPulseWording("Temps réel"), true);
    assert.equal(containsForbiddenMarketPulseWording("Annonce vérifiée"), true);
    assert.equal(
      containsForbiddenMarketPulseWording("Prix observé disponible"),
      false
    );
  });
});
