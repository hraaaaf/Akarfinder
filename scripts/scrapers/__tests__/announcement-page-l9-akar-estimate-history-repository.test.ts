import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assembleObservedPriceHistory } from "../../../lib/property-detail/akar-estimate-history-repository";

describe("ANN-L9 observed history repository assembler", () => {
  it("retains successive real price observations for the same verified source", () => {
    const history = assembleObservedPriceHistory({
      members: [{ property_cluster_id: "cluster-1", source_offer_id: 10 }],
      sources: [{ id: 10, source_name: "Mubawab" }],
      observations: [
        { source_offer_id: 10, observed_at: "2026-06-01T00:00:00Z", displayed_price: 1_300_000 },
        { source_offer_id: 10, observed_at: "2026-07-01T00:00:00Z", displayed_price: 1_250_000 },
        { source_offer_id: 10, observed_at: "2026-08-01T00:00:00Z", displayed_price: 1_200_000 },
      ],
    });

    assert.equal(history.status, "available");
    assert.equal(history.observationCount, 3);
    assert.deepEqual(history.points.map((point) => point.displayedPriceMad), [1_300_000, 1_250_000, 1_200_000]);
  });

  it("supports multiple cluster member sources while preserving attribution", () => {
    const history = assembleObservedPriceHistory({
      members: [
        { property_cluster_id: "cluster-1", source_offer_id: 10 },
        { property_cluster_id: "cluster-1", source_offer_id: 20 },
      ],
      sources: [
        { id: 10, source_name: "Mubawab" },
        { id: 20, source_name: "Avito" },
      ],
      observations: [
        { source_offer_id: 10, observed_at: "2026-07-01T00:00:00Z", displayed_price: 1_250_000 },
        { source_offer_id: 20, observed_at: "2026-07-02T00:00:00Z", displayed_price: 1_245_000 },
      ],
    });

    assert.deepEqual(history.points.map((point) => point.sourceName), ["Mubawab", "Avito"]);
  });

  it("rejects observations outside verified cluster members and unattributed sources", () => {
    const history = assembleObservedPriceHistory({
      members: [{ property_cluster_id: "cluster-1", source_offer_id: 10 }],
      sources: [{ id: 10, source_name: "" }],
      observations: [
        { source_offer_id: 10, observed_at: "2026-07-01T00:00:00Z", displayed_price: 1_250_000 },
        { source_offer_id: 99, observed_at: "2026-07-02T00:00:00Z", displayed_price: 900_000 },
      ],
    });

    assert.equal(history.status, "unavailable");
    assert.equal(history.observationCount, 0);
  });

  it("does not collapse repeated unchanged prices observed on different dates", () => {
    const history = assembleObservedPriceHistory({
      members: [{ property_cluster_id: "cluster-1", source_offer_id: 10 }],
      sources: [{ id: 10, source_name: "Mubawab" }],
      observations: [
        { source_offer_id: 10, observed_at: "2026-07-01T00:00:00Z", displayed_price: 1_250_000 },
        { source_offer_id: 10, observed_at: "2026-08-01T00:00:00Z", displayed_price: 1_250_000 },
      ],
    });

    assert.equal(history.observationCount, 2);
  });
});
