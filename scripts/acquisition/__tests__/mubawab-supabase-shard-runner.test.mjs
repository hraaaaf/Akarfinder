import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_REQUEST_DELAY_MS,
  checkpointFromReport,
  loadMubawabShardManifestFromSupabase,
  runShardManifest,
  selectSafeShardManifest,
} from '../mubawab-supabase-shard-runner.mjs';

test('safe manifest keeps only public robots-safe Mubawab shards and prioritizes deepest', () => {
  const shards = selectSafeShardManifest([
    { canonical_url: 'https://www.mubawab.ma/fr/cc/immobilier-a-vendre' },
    { canonical_url: 'https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre' },
    { canonical_url: 'https://www.mubawab.ma/fr/cd/casablanca/sidi-maarouf/immobilier-a-vendre' },
    { canonical_url: 'https://www.mubawab.ma/fr/sd/casablanca/hay-hassani/bureaux-et-commerces-a-louer' },
    { canonical_url: 'https://www.mubawab.ma/fr/cc/immobilier-a-vendre:p:2' },
    { canonical_url: 'https://example.com/fr/sd/foo' },
    { canonical_url: 'https://www.mubawab.ma/fr/a/12345/listing' },
  ]);
  assert.equal(shards.length, 4);
  assert.ok(shards[0].includes('/fr/sd/'));
  assert.ok(shards.at(-1).includes('/fr/cc/'));
  assert.equal(DEFAULT_REQUEST_DELAY_MS, 2750);
});

test('checkpoint folds prior successful shards and listing ids', () => {
  const checkpoint = checkpointFromReport({
    checkpoint: {
      completedShardUrls: ['https://mubawab.ma/fr/sd/rabat/agdal/appartements-a-louer'],
      listingIds: ['10'],
    },
    shards: [{
      url: 'https://www.mubawab.ma/fr/sd/casablanca/oasis/appartements-a-vendre',
      fetchState: 'ok',
      listingIds: ['11', '10'],
    }],
  });
  assert.equal(checkpoint.completedShardUrls.length, 2);
  assert.deepEqual(checkpoint.listingIds, ['10', '11']);
});

test('Supabase manifest loader paginates read-only source rows without ORDER BY', async () => {
  const calls = [];
  const batches = [
    [
      { canonical_url: 'https://www.mubawab.ma/fr/sd/casablanca/hay-hassani/bureaux-et-commerces-a-louer' },
      { canonical_url: 'https://www.mubawab.ma/fr/a/12345/listing' },
    ],
    [{ canonical_url: 'https://www.mubawab.ma/fr/ct/rabat/immobilier-a-vendre' }],
  ];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    return { ok: true, status: 200, json: async () => batches.shift() || [] };
  };
  const manifest = await loadMubawabShardManifestFromSupabase({
    supabaseUrl: 'https://example.supabase.co', serviceRoleKey: 'secret', fetchImpl, pageSize: 2,
  });
  assert.equal(manifest.zeroDbWrites, true);
  assert.equal(manifest.sourceRowCount, 3);
  assert.equal(manifest.shardUrls.length, 2);
  assert.equal(calls.length, 2);
  const first = new URL(calls[0].url);
  const second = new URL(calls[1].url);
  assert.equal(first.searchParams.get('source_domain'), 'eq.mubawab.ma');
  assert.equal(first.searchParams.get('canonical_url'), 'not.is.null');
  assert.equal(first.searchParams.get('limit'), '2');
  assert.equal(first.searchParams.get('offset'), '0');
  assert.equal(first.searchParams.has('order'), false);
  assert.equal(second.searchParams.get('offset'), '2');
  assert.equal(calls[0].options.headers.range, undefined);
});

test('checkpoint resume skips completed shard and aggregates listing ids', async () => {
  let dbCall = 0;
  const fetchedMubawab = [];
  const shardA = 'https://www.mubawab.ma/fr/sd/casablanca/hay-hassani/bureaux-et-commerces-a-louer';
  const shardB = 'https://www.mubawab.ma/fr/cd/rabat/agdal/immobilier-a-vendre';
  const fetchImpl = async (url) => {
    const asString = String(url);
    if (asString.includes('/rest/v1/discovery_candidates')) {
      dbCall += 1;
      return { ok: true, status: 200, json: async () => dbCall === 1 ? [
        { canonical_url: shardA }, { canonical_url: shardB },
      ] : [] };
    }
    fetchedMubawab.push(asString);
    return {
      ok: true,
      status: 200,
      url: asString,
      headers: { get: () => 'text/html; charset=utf-8' },
      text: async () => '<a href="/fr/a/12345/listing">listing</a>',
    };
  };

  const report = await runShardManifest({
    supabaseUrl: 'https://example.supabase.co',
    serviceRoleKey: 'secret',
    fetchImpl,
    manifestLimit: 2,
    maxRequests: 2,
    requestDelayMs: 0,
    checkpoint: { completedShardUrls: [shardA], listingIds: ['999'] },
  });
  assert.equal(report.zeroDbWrites, true);
  assert.equal(report.safeShardCount, 2);
  assert.equal(report.targetShardCount, 2);
  assert.equal(report.previousCompletedShardCount, 1);
  assert.equal(report.selectedShardCount, 1);
  assert.equal(report.requestCount, 1);
  assert.equal(report.totalCompletedShardCount, 2);
  assert.equal(report.remainingShardCount, 0);
  assert.equal(report.aggregatedUniqueListingIdCount, 2);
  assert.deepEqual(report.checkpoint.listingIds, ['999', '12345']);
  assert.equal(fetchedMubawab.length, 1);
  assert.ok(fetchedMubawab[0].includes('/fr/cd/rabat/agdal/'));
});
