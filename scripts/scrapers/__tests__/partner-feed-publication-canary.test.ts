import assert from 'node:assert/strict';
import test from 'node:test';
import { canRollbackBatch, planPublicationCanary } from '../partner-feed-publication-canary';

const base = {
  sourceActive: true,
  rightsAttested: true,
  reviewStatus: 'accepted' as const,
  dedupDecision: 'new_property' as const,
  dryRunCompleted: true,
  itemCount: 50,
  canaryLimit: 50,
};

test('ready canary remains non-publishable until server execution', () => {
  const plan = planPublicationCanary(base);
  assert.equal(plan.decision, 'ready');
  assert.equal(plan.action, 'create_property');
  assert.equal(plan.publicationEligible, false);
});

test('blocks inactive sources and missing rights', () => {
  assert.equal(planPublicationCanary({ ...base, sourceActive: false }).decision, 'blocked_source');
  assert.equal(planPublicationCanary({ ...base, rightsAttested: false }).decision, 'blocked_rights');
});

test('blocks incomplete review and unsafe dedup outcomes', () => {
  assert.equal(planPublicationCanary({ ...base, reviewStatus: 'pending' }).decision, 'blocked_review');
  assert.equal(planPublicationCanary({ ...base, dedupDecision: 'manual_review' }).decision, 'blocked_dedup');
  assert.equal(planPublicationCanary({ ...base, dedupDecision: 'duplicate' }).decision, 'blocked_dedup');
});

test('blocks missing dry-run and batch overflow', () => {
  assert.equal(planPublicationCanary({ ...base, dryRunCompleted: false }).decision, 'blocked_dry_run');
  assert.equal(planPublicationCanary({ ...base, itemCount: 51 }).decision, 'blocked_limit');
  assert.equal(planPublicationCanary({ ...base, canaryLimit: 501 }).decision, 'blocked_limit');
});

test('maps accepted decisions to explicit actions', () => {
  assert.equal(planPublicationCanary({ ...base, dedupDecision: 'new_offer' }).action, 'create_offer');
  assert.equal(planPublicationCanary({ ...base, dedupDecision: 'update_offer' }).action, 'update_offer');
});

test('rollback requires complete rollback payload coverage', () => {
  assert.equal(canRollbackBatch('completed', 10, 10), true);
  assert.equal(canRollbackBatch('completed', 10, 9), false);
  assert.equal(canRollbackBatch('ready', 10, 10), false);
});
