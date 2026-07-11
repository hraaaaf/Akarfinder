import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getMarketPriceScoreDisplay } from "../../../lib/market/market-price-score-display";

function withPricePositionEnabled<T>(fn: () => T): T {
  const previous = process.env.PRICE_POSITION_REFERENCE_ENABLED;
  process.env.PRICE_POSITION_REFERENCE_ENABLED = "true";
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.PRICE_POSITION_REFERENCE_ENABLED;
    else process.env.PRICE_POSITION_REFERENCE_ENABLED = previous;
  }
}

describe("market price score display", () => {
  test("maps below_market to the expected label and tone", () => {
    const display = withPricePositionEnabled(() =>
      getMarketPriceScoreDisplay({
        city: "Casablanca",
        property_type: "appartement",
        surface_m2: 100,
        total_price_mad: 550000,
      })
    );

    assert.ok(display);
    assert.equal(display?.label, "Position relative inférieure");
    assert.equal(display?.tone, "success");
    assert.equal(display?.confidence, "medium");
  });

  test("maps near_market to the expected label and tone", () => {
    const display = withPricePositionEnabled(() =>
      getMarketPriceScoreDisplay({
        city: "Casablanca",
        property_type: "appartement",
        surface_m2: 100,
        total_price_mad: 800000,
      })
    );

    assert.ok(display);
    assert.equal(display?.label, "Position relative proche");
    assert.equal(display?.tone, "info");
  });

  test("maps above_market to the expected label and tone", () => {
    const display = withPricePositionEnabled(() =>
      getMarketPriceScoreDisplay({
        city: "Casablanca",
        property_type: "appartement",
        surface_m2: 100,
        total_price_mad: 850000,
      })
    );

    assert.ok(display);
    assert.equal(display?.label, "Position relative supérieure");
    assert.equal(display?.tone, "warning");
  });

  test("maps overpriced to the expected label and tone", () => {
    const display = withPricePositionEnabled(() =>
      getMarketPriceScoreDisplay({
        city: "Casablanca",
        property_type: "appartement",
        surface_m2: 100,
        total_price_mad: 1000000,
      })
    );

    assert.ok(display);
    assert.equal(display?.label, "Écart indicatif important");
    assert.equal(display?.tone, "danger");
  });

  test("returns null for insufficient data", () => {
    withPricePositionEnabled(() => {
      assert.equal(
        getMarketPriceScoreDisplay({
          city: "Casablanca",
          property_type: "appartement",
          surface_m2: 100,
        }),
        null
      );
      assert.equal(
        getMarketPriceScoreDisplay({
          city: "Casablanca",
          property_type: "Terrain",
          surface_m2: 100,
          total_price_mad: 500000,
        }),
        null
      );
      assert.equal(
        getMarketPriceScoreDisplay({
          city: "Casablanca",
          property_type: "appartement",
          total_price_mad: 500000,
        }),
        null
      );
    });
  });

  test("uses quartier confidence when available", () => {
    const display = withPricePositionEnabled(() =>
      getMarketPriceScoreDisplay({
        city: "Casablanca",
        neighborhood: "Maârif",
        property_type: "villa",
        surface_m2: 100,
        total_price_mad: 1100000,
      })
    );

    assert.ok(display);
    assert.equal(display?.confidence, "high");
  });

  test("does not use forbidden wording", () => {
    const display = withPricePositionEnabled(() =>
      getMarketPriceScoreDisplay({
        city: "Rabat",
        neighborhood: "Agdal",
        property_type: "villa",
        surface_m2: 100,
        total_price_mad: 1800000,
      })
    );

    assert.ok(display);
    const text = `${display?.label} ${display?.description} ${display?.title}`.toLowerCase();
    for (const word of [
      "prix officiel",
      "prix certifié",
      "prix vérifié",
      "prix garanti",
      "prix exact",
      "prix réel",
      "bonne affaire garantie",
      "arnaque",
      "surcoté",
      "trop cher garanti",
      "sans risque",
    ]) {
      assert.ok(!text.includes(word), `forbidden wording present: ${word}`);
    }
  });
});
