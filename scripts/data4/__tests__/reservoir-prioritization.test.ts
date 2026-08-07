import assert from "node:assert/strict";
import test from "node:test";
import { prioritizeReservoir, rankReservoirs, type ReservoirMetrics } from "../reservoir-prioritization";

function row(overrides: Partial<ReservoirMetrics> = {}): ReservoirMetrics {
  return {
    sourceDomain: "example.ma",
    normalizedRows: 3000,
    normalizedOk: 2800,
    unavailableRows: 100,
    freshConfirmed: 300,
    withCity: 2800,
    withPrice: 200,
    withSurface: 300,
    coreStructured: 2600,
    decisionStructured: 400,
    technicalDisplayRows: 2700,
    avgQualityScore: 55,
    authorizationStatus: "unverified",
    acquisitionMode: "public_sitemap_canonical_link",
    displayPolicy: "canonical_link_only",
    displayGate: "external_tail_link_only",
    allowedDiscoveryChannels: ["public_sitemap"],
    structureScore: 18,
    executionScore: 60,
    ...overrides,
  };
}

test("canonical-link source can enter admissible growth without being called publicly activable", () => {
  const result = prioritizeReservoir(row());
  assert.equal(result.lane, "ADMISSIBLE_GROWTH");
  assert.equal(result.publicActivableNow, false);
  assert.ok(result.admissibleScore > 35);
});

test("hidden internal-only source cannot receive an immediate admissible score", () => {
  const result = prioritizeReservoir(row({
    sourceDomain: "internal.ma",
    displayPolicy: "internal_signal_only",
    displayGate: "hidden",
    acquisitionMode: "public_index_internal_only",
    freshConfirmed: 1200,
    decisionStructured: 1100,
  }));
  assert.equal(result.admissibleScore, 0);
  assert.equal(result.lane, "PARTNERSHIP_UPSIDE");
});

test("prohibited source cannot win partnership upside", () => {
  const result = prioritizeReservoir(row({
    sourceDomain: "blocked.ma",
    authorizationStatus: "prohibited",
    displayPolicy: "internal_signal_only",
    displayGate: "hidden",
  }));
  assert.equal(result.partnershipScore, 0);
  assert.equal(result.lane, "HOLD");
});

test("small pristine catalog cannot win the scale-oriented partnership lane", () => {
  const result = prioritizeReservoir(row({
    sourceDomain: "tiny-perfect.ma",
    normalizedRows: 191,
    normalizedOk: 191,
    freshConfirmed: 191,
    withCity: 191,
    withPrice: 100,
    withSurface: 120,
    coreStructured: 191,
    decisionStructured: 191,
    technicalDisplayRows: 191,
    avgQualityScore: 80,
    displayPolicy: "internal_signal_only",
    displayGate: "hidden",
    acquisitionMode: "public_index_internal_only",
  }));
  assert.equal(result.partnershipScore, 0);
  assert.equal(result.lane, "HOLD");
});

test("rankings keep immediate growth and partnership upside separate", () => {
  const ranked = rankReservoirs([
    row({ sourceDomain: "canonical.ma", normalizedRows: 6000 }),
    row({
      sourceDomain: "partner.ma",
      normalizedRows: 4500,
      displayPolicy: "internal_signal_only",
      displayGate: "hidden",
      acquisitionMode: "public_index_internal_only",
      freshConfirmed: 1500,
      decisionStructured: 1200,
    }),
  ]);
  assert.equal(ranked.admissibleGrowth[0]?.sourceDomain, "canonical.ma");
  assert.equal(ranked.partnershipUpside[0]?.sourceDomain, "partner.ma");
});
