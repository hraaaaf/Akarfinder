import assert from "node:assert/strict";
import test from "node:test";
import { FINANCE_MAROC_DISCLAIMER, simulateFinanceMaroc } from "../../../lib/property-detail/finance-maroc";

const base = {
  propertyPriceMad: 2_000_000,
  downPaymentMad: 400_000,
  annualRatePct: 4.5,
  durationYears: 20,
  assumptionsVersion: "user-input-v1",
  assumptionsObservedAt: "2026-08-16T15:45:00.000Z",
};

test("ANN-L10 computes a deterministic amortizing monthly payment", () => {
  const result = simulateFinanceMaroc(base);
  assert.ok(result);
  assert.equal(result.financedPrincipalMad, 1_600_000);
  assert.equal(result.paymentCount, 240);
  assert.equal(result.monthlyPaymentMad, 10_122.39);
  assert.equal(result.totalPaymentsMad, 2_429_373.6);
  assert.equal(result.totalInterestMad, 829_373.6);
});

test("ANN-L10 handles zero interest without division by zero", () => {
  const result = simulateFinanceMaroc({ ...base, annualRatePct: 0, durationYears: 10 });
  assert.ok(result);
  assert.equal(result.monthlyPaymentMad, 13_333.33);
  assert.equal(result.totalInterestMad, 0);
});

test("ANN-L10 handles full cash contribution", () => {
  const result = simulateFinanceMaroc({ ...base, downPaymentMad: 2_000_000 });
  assert.ok(result);
  assert.equal(result.financedPrincipalMad, 0);
  assert.equal(result.monthlyPaymentMad, 0);
  assert.equal(result.totalInterestMad, 0);
});

test("ANN-L10 fails closed on malformed or silent assumptions", () => {
  assert.equal(simulateFinanceMaroc({ ...base, propertyPriceMad: 0 }), null);
  assert.equal(simulateFinanceMaroc({ ...base, downPaymentMad: 2_000_001 }), null);
  assert.equal(simulateFinanceMaroc({ ...base, annualRatePct: -1 }), null);
  assert.equal(simulateFinanceMaroc({ ...base, durationYears: 0 }), null);
  assert.equal(simulateFinanceMaroc({ ...base, durationYears: 50.5 }), null);
  assert.equal(simulateFinanceMaroc({ ...base, assumptionsVersion: "" }), null);
  assert.equal(simulateFinanceMaroc({ ...base, assumptionsObservedAt: "not-a-date" }), null);
});

test("ANN-L10 disclaimer refuses to present simulation as a bank offer", () => {
  assert.match(FINANCE_MAROC_DISCLAIMER, /Simulation indicative/i);
  assert.match(FINANCE_MAROC_DISCLAIMER, /ni une offre de crédit/i);
  assert.match(FINANCE_MAROC_DISCLAIMER, /frais d’acquisition ne sont pas inclus/i);
});
