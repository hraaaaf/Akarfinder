// OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1 — Phase 9, items 1-3.
// Pure unit tests for the time-budget primitive -- fully injectable clock,
// zero real waiting.

import assert from "node:assert/strict";
import test from "node:test";
import {
  createTimeBudget,
  remainingBudgetMs,
  isTimeBudgetExhausted,
  elapsedMs,
  snapshotTimeBudget,
  DEFAULT_SAFETY_MARGIN_MS,
} from "../../../lib/openserp-ingestion/time-budget";

test("item 1: sufficient budget -- not exhausted right after start", () => {
  let clock = 1_000_000;
  const now = () => clock;
  const budget = createTimeBudget({ routeMaxDurationMs: 120_000, safetyMarginMs: 20_000, now });
  assert.equal(isTimeBudgetExhausted(budget, now), false);
  assert.equal(remainingBudgetMs(budget, now), 100_000);
});

test("item 2: budget already exhausted before the first request (margin >= route limit)", () => {
  let clock = 1_000_000;
  const now = () => clock;
  const budget = createTimeBudget({ routeMaxDurationMs: 10_000, safetyMarginMs: 20_000, now });
  assert.equal(isTimeBudgetExhausted(budget, now), true, "margin larger than the route limit must collapse the usable window to zero");
  assert.equal(remainingBudgetMs(budget, now), 0);
});

test("item 3: budget exhausted between two requests (time advances past the deadline mid-loop)", () => {
  let clock = 1_000_000;
  const now = () => clock;
  const budget = createTimeBudget({ routeMaxDurationMs: 30_000, safetyMarginMs: 10_000, now });
  assert.equal(isTimeBudgetExhausted(budget, now), false, "not exhausted immediately after start");

  clock += 15_000; // simulate a slow first request
  assert.equal(isTimeBudgetExhausted(budget, now), false, "still within the 20s usable window after 15s elapsed");

  clock += 10_000; // simulate a second slow request pushing past the deadline
  assert.equal(isTimeBudgetExhausted(budget, now), true, "must be exhausted once elapsed time exceeds the usable window");
});

test("elapsedMs tracks real elapsed time against the injected clock", () => {
  let clock = 5_000;
  const now = () => clock;
  const budget = createTimeBudget({ routeMaxDurationMs: 60_000, now });
  clock += 7_500;
  assert.equal(elapsedMs(budget, now), 7_500);
});

test("snapshotTimeBudget reports a complete, consistent structure", () => {
  let clock = 0;
  const now = () => clock;
  const budget = createTimeBudget({ routeMaxDurationMs: 120_000, safetyMarginMs: 20_000, now });
  clock += 50_000;
  const snapshot = snapshotTimeBudget(budget, now);
  assert.equal(snapshot.elapsed_ms, 50_000);
  assert.equal(snapshot.remaining_ms, 50_000);
  assert.equal(snapshot.route_max_duration_ms, 120_000);
  assert.equal(snapshot.safety_margin_ms, 20_000);
  assert.equal(snapshot.exhausted, false);
});

test("DEFAULT_SAFETY_MARGIN_MS is a single named constant, not hardcoded ad hoc at call sites", () => {
  assert.equal(typeof DEFAULT_SAFETY_MARGIN_MS, "number");
  assert.ok(DEFAULT_SAFETY_MARGIN_MS > 0);
  const budgetWithDefault = createTimeBudget({ routeMaxDurationMs: 120_000, now: () => 0 });
  assert.equal(budgetWithDefault.safetyMarginMs, DEFAULT_SAFETY_MARGIN_MS);
});
