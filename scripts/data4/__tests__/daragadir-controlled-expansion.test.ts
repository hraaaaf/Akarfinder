import assert from "node:assert/strict";
import test from "node:test";
import { buildExpansionPlan, requireCertifiedExpansionCheckpoint } from "../daragadir-controlled-expansion";

const cases = [
  { current: 50, expected: [100,100,100,100,50] },
  { current: 150, expected: [100,100,100,50] },
  { current: 250, expected: [100,100,50] },
  { current: 350, expected: [100,50] },
  { current: 450, expected: [50] },
  { current: 500, expected: [] },
] as const;

for (const { current, expected } of cases) {
  test(`${current} is a certified expansion checkpoint`, () => {
    const plan = buildExpansionPlan(current, 6000);
    assert.deepEqual(plan.plannedBatchSizes, expected);
    assert.equal(plan.nextBatchSize, expected[0] ?? 0);
    assert.doesNotThrow(() => requireCertifiedExpansionCheckpoint(plan));
  });
}

test("candidate shortage fails before target", () => {
  const plan = buildExpansionPlan(150, 349);
  assert.equal(plan.canReachTarget, false);
  assert.throws(() => requireCertifiedExpansionCheckpoint(plan));
});

test("non-checkpoint cumulative state fails closed", () => {
  const plan = buildExpansionPlan(151, 6000);
  assert.throws(() => requireCertifiedExpansionCheckpoint(plan), /Uncertified DATA-4.3H checkpoint/);
});

test("cap cannot already be exceeded", () => {
  assert.throws(() => buildExpansionPlan(501, 1000));
});
