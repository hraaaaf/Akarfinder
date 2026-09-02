import test from 'node:test';
import assert from 'node:assert/strict';

import {
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
});

test('Supabase manifest loader paginates read-only source rows', async () => {
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
    return {
      ok: true,
      status: 200,
      json: async () => batches.shift() || [],
    };
  };
  const manifest = await loadMubawabShardManifestFromSupabase({
    supabaseUrl: 'https://example.supabase.co',
    serviceRoleKey: 'secret',
    fetchImpl,
    pageSize: 2,
  });
  assert.equal(manifest.zeroDbWrites, true);
  assert.equal(manifest.sourceRowCount, 3);
  assert.equal(manifest.shardUrls.length, 2);
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /source_domain=eq\.mubawab\.ma/);
  assert.equal(calls[0].options.headers.range, '0-1');
  assert.equal(calls[1].options.headers.range, '2-3');
});

test('bounded manifest replay enumerates selected shards and remains zero-write', async () => {
  let dbCall = 0;
  const fetchImpl = async (url, options = {}) => {
    const asString = String(url);
    if (asString.includes('/rest/v1/discovery_candidates')) {
      dbCall += 1;
      return {
        ok: true,
        status: 200,
        json: async () => dbCall === 1 ? [
          { canonical_url: 'https://www.mubawab.ma/fr/sd/casablanca/hay-hassani/bureaux-et-commerces-a-louer' },
          { canonical_url: 'https://www.mubawab.ma/fr/cd/rabat/agdal/immobilier-a-vendre' },
        ] : [],
      };
    }
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
  });
  assert.equal(report.zeroDbWrites, true);
  assert.equal(report.safeShardCount, 2);
  assert.equal(report.selectedShardCount, 2);
  assert.equal(report.requestCount, 2);
  assert.equal(report.uniqueListingUrlCount, 1);
});
