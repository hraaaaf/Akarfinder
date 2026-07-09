import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getIndicativePricePositionDisplay } from "../../../lib/price-position/price-position-display";

function makeListing(overrides: Record<string, unknown> = {}) {
  return {
    id: "listing-test",
    title: "Appartement test",
    city: "Casablanca",
    neighborhood: "Maarif",
    price: 1_500_000,
    currency: "DH",
    surface_m2: 100,
    price_per_m2: 15_000,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 2,
    bathrooms: 2,
    freshness_label: "Récent",
    source_type: "Source analysée",
    reliability_label: "Informations complètes",
    reliability_score: 90,
    is_mre_friendly: false,
    description: "Test",
    image_url: "https://example.com/image.jpg",
    reliability_explanation: "Test",
    source_name: "akarfinder",
    ...overrides,
  } as const;
}

describe("price-position V2", () => {
  it("does not display when city is missing", () => {
    const display = getIndicativePricePositionDisplay(makeListing({ city: "" }) as never);
    assert.equal(display, null);
  });

  it("does not display when surface is missing", () => {
    const display = getIndicativePricePositionDisplay(makeListing({ surface_m2: 0 }) as never);
    assert.equal(display, null);
  });

  it("does not display when price is missing", () => {
    const display = getIndicativePricePositionDisplay(makeListing({ price: 0, price_per_m2: 0 }) as never);
    assert.equal(display, null);
  });

  it("does not display for unsupported property types", () => {
    const display = getIndicativePricePositionDisplay(makeListing({ property_type: "Terrain" }) as never);
    assert.equal(display, null);
  });

  it("does not display for external gateway sources by default", () => {
    const display = getIndicativePricePositionDisplay(makeListing({ source_name: "mubawab" }) as never);
    assert.equal(display, null);
  });

  it("still displays for safe internal listings without source_name", () => {
    const display = getIndicativePricePositionDisplay(makeListing({ source_name: undefined }) as never);
    assert.ok(display);
  });

  it("returns a prudent public label for supported listings", () => {
    const display = getIndicativePricePositionDisplay(makeListing() as never);
    assert.ok(display);
    assert.equal(display?.title, "Repère prix indicatif");
    assert.ok(display?.label.includes("indicatif"));
    assert.ok(!display?.label.toLowerCase().includes("marché"));
    assert.ok(display?.description.includes("source originale"));
    assert.ok(display?.note.length > 0);
  });

  it("does not expose internal dataset fields", () => {
    const display = getIndicativePricePositionDisplay(makeListing() as never);
    assert.ok(display);
    const keys = Object.keys(display ?? {});
    for (const forbidden of ["value_low", "value_median", "value_high", "evidence_ref", "source_registry", "confidence"]) {
      assert.ok(!keys.includes(forbidden));
    }
  });
});
