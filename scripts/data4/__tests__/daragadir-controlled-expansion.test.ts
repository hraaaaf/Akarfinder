import assert from "node:assert/strict";
import test from "node:test";
import { buildExpansionPlan, requireCertifiedExpansionStart } from "../daragadir-controlled-expansion";

test("50 to 500 expands as 100+100+100+100+50", () => {
  const plan = buildExpansionPlan(50, 5554);
  assert.deepEqual(plan.plannedBatchSizes, [100,100,100,100,50]);
  assert.equal(plan.nextBatchSize, 100);
  assert.equal(plan.remainingToTarget, 450);
  assert.equal(plan.canReachTarget, true);
  assert.doesNotThrow(() => requireCertifiedExpansionStart(plan));
});

test("candidate shortage fails certification", () => {
  const plan = buildExpansionPlan(50, 449);
  assert.equal(plan.canReachTarget, false);
  assert.throws(() => requireCertifiedExpansionStart(plan));
});

test("cap cannot already be exceeded", () => {
  assert.throws(() => buildExpansionPlan(501, 1000));
});
