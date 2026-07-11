import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getIndicativePricePositionDisplay, getIndicativePricePositionDecision } from "../../../lib/price-position/price-position-display";

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

function withEnv<T>(changes: Record<string, string | undefined>, fn: () => T): T {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(changes)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe("price-position V2", () => {
  it("respects the server feature flag", () => {
    withEnv({ PRICE_POSITION_REFERENCE_ENABLED: undefined, NEXT_PUBLIC_PRICE_POSITION_REFERENCE_ENABLED: undefined }, () => {
      assert.equal(getIndicativePricePositionDisplay(makeListing() as never), null);
    });

    withEnv({ PRICE_POSITION_REFERENCE_ENABLED: "false", NEXT_PUBLIC_PRICE_POSITION_REFERENCE_ENABLED: undefined }, () => {
      assert.equal(getIndicativePricePositionDisplay(makeListing() as never), null);
    });

    withEnv({ PRICE_POSITION_REFERENCE_ENABLED: "true", NEXT_PUBLIC_PRICE_POSITION_REFERENCE_ENABLED: undefined }, () => {
      assert.ok(getIndicativePricePositionDisplay(makeListing() as never));
    });
  });

  it("does not display when city is missing", () => {
    withEnv({ PRICE_POSITION_REFERENCE_ENABLED: "true", NEXT_PUBLIC_PRICE_POSITION_REFERENCE_ENABLED: undefined }, () => {
      const display = getIndicativePricePositionDisplay(makeListing({ city: "" }) as never);
      assert.equal(display, null);
    });
  });

  it("does not display when surface is missing", () => {
    withEnv({ PRICE_POSITION_REFERENCE_ENABLED: "true", NEXT_PUBLIC_PRICE_POSITION_REFERENCE_ENABLED: undefined }, () => {
      const display = getIndicativePricePositionDisplay(makeListing({ surface_m2: 0 }) as never);
      assert.equal(display, null);
    });
  });

  it("does not display when price is missing", () => {
    withEnv({ PRICE_POSITION_REFERENCE_ENABLED: "true", NEXT_PUBLIC_PRICE_POSITION_REFERENCE_ENABLED: undefined }, () => {
      const display = getIndicativePricePositionDisplay(makeListing({ price: 0, price_per_m2: 0 }) as never);
      assert.equal(display, null);
    });
  });

  it("does not display for unsupported property types", () => {
    withEnv({ PRICE_POSITION_REFERENCE_ENABLED: "true", NEXT_PUBLIC_PRICE_POSITION_REFERENCE_ENABLED: undefined }, () => {
      const display = getIndicativePricePositionDisplay(makeListing({ property_type: "Terrain" }) as never);
      assert.equal(display, null);
    });
  });

  it("does not display for external gateway sources by default", () => {
    withEnv({ PRICE_POSITION_REFERENCE_ENABLED: "true", NEXT_PUBLIC_PRICE_POSITION_REFERENCE_ENABLED: undefined }, () => {
      const display = getIndicativePricePositionDisplay(makeListing({ source_name: "mubawab" }) as never);
      assert.equal(display, null);
    });
  });

  it("still displays for safe internal listings without source_name", () => {
    withEnv({ PRICE_POSITION_REFERENCE_ENABLED: "true", NEXT_PUBLIC_PRICE_POSITION_REFERENCE_ENABLED: undefined }, () => {
      const display = getIndicativePricePositionDisplay(makeListing({ source_name: undefined }) as never);
      assert.ok(display);
    });
  });

  it("returns a prudent public label for supported listings", () => {
    withEnv({ PRICE_POSITION_REFERENCE_ENABLED: "true", NEXT_PUBLIC_PRICE_POSITION_REFERENCE_ENABLED: undefined }, () => {
      const display = getIndicativePricePositionDisplay(makeListing() as never);
      assert.ok(display);
      assert.equal(display?.title, "Repère prix indicatif");
      assert.ok(display?.label.includes("Position relative"));
      assert.ok(!display?.label.toLowerCase().includes("marché"));
      assert.ok(display?.description.includes("source originale"));
      assert.ok(display?.note.length > 0);
    });
  });

  it("does not expose internal dataset fields", () => {
    withEnv({ PRICE_POSITION_REFERENCE_ENABLED: "true", NEXT_PUBLIC_PRICE_POSITION_REFERENCE_ENABLED: undefined }, () => {
      const display = getIndicativePricePositionDisplay(makeListing() as never);
      assert.ok(display);
      const keys = Object.keys(display ?? {});
      for (const forbidden of ["value_low", "value_median", "value_high", "evidence_ref", "source_registry", "confidence"]) {
        assert.ok(!keys.includes(forbidden));
      }
    });
  });

  it("exposes an internal decision object without public leakage", () => {
    withEnv({ PRICE_POSITION_REFERENCE_ENABLED: "true", NEXT_PUBLIC_PRICE_POSITION_REFERENCE_ENABLED: undefined }, () => {
      const decision = getIndicativePricePositionDecision(makeListing() as never);
      assert.ok(decision);
      assert.ok(decision?.benchmark_id);
      assert.ok(decision?.benchmark_level);
      assert.ok(decision?.benchmark_date);
      assert.ok(decision?.benchmark_methodology);
      assert.ok(decision?.decision_reason);
      assert.ok(decision?.fallback_applied);
      assert.ok(decision?.public_view);
      const publicKeys = Object.keys(decision?.public_view ?? {});
      for (const forbidden of ["benchmark_id", "benchmark_value", "benchmark_date", "benchmark_methodology", "decision_reason", "fallback_applied"]) {
        assert.ok(!publicKeys.includes(forbidden));
      }
    });
  });
});
