import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreListing, POLICY_VERSION } from '../mubawab-freshness-engine.mjs';

test('policy version is pinned', () => {
  assert.equal(POLICY_VERSION, 'mubawab-freshness-v1.0.0');
});

test('current + historical + URL gets max confidence', () => {
  assert.deepEqual(scoreListing({ current: true, historical: true, hasUrl: true }), {
    freshness_score: 100,
    freshness_status: 'fresh_confirmed',
    freshness_reasons: ['current_manifest_certified','historical_catalog_reappearance','canonical_url_observed'],
  });
});

test('current-only with URL stays fresh but below recurrence', () => {
  const r = scoreListing({ current: true, historical: false, hasUrl: true });
  assert.equal(r.freshness_score, 95);
  assert.equal(r.freshness_status, 'fresh_confirmed');
});

test('current-only without URL remains fresh-confirmed at 90', () => {
  const r = scoreListing({ current: true, historical: false, hasUrl: false });
  assert.equal(r.freshness_score, 90);
  assert.equal(r.freshness_status, 'fresh_confirmed');
});

test('historical-only is uncertain, not stale or dead', () => {
  const r = scoreListing({ current: false, historical: true, hasUrl: false });
  assert.equal(r.freshness_score, 40);
  assert.equal(r.freshness_status, 'uncertain');
  assert.ok(r.freshness_reasons.includes('no_negative_liveness_proof'));
});

test('listing absent from all evidence is rejected', () => {
  assert.throws(() => scoreListing({ current: false, historical: false, hasUrl: false }));
});
