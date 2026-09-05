import test from 'node:test';
import assert from 'node:assert/strict';

import {
  enumerateMubawab,
  extractChildShardUrls,
  extractListingUrls,
  isRobotsSafeUrl,
  parseResultCount,
  reconcileShard,
} from '../mubawab-exhaustive-enumerator.mjs';

test('robots guard blocks legacy colon pagination and sensitive paths', () => {
  assert.equal(isRobotsSafeUrl('https://www.mubawab.ma/fr/cc/immobilier-a-vendre'), true);
  assert.equal(isRobotsSafeUrl('https://www.mubawab.ma/fr/cc/immobilier-a-vendre:p:2'), false);
  assert.equal(isRobotsSafeUrl('https://www.mubawab.ma/fr/login'), false);
  assert.equal(isRobotsSafeUrl('https://www.mubawab.ma/fr/cc/immobilier-a-vendre?n=1'), false);
});

test('parses localized result counters', () => {
  assert.equal(parseResultCount('<h1>Immobilier</h1><div>(25 263 résultats)</div>'), 25263);
  assert.equal(parseResultCount('<div>(105\u202f372 résultats)</div>'), 105372);
  assert.equal(parseResultCount('<div>aucun compteur</div>'), null);
});

test('extracts and deduplicates listing URLs by listing id', () => {
  const html = `
    <a href="https://www.mubawab.ma/fr/a/12345/appartement-a-vendre">A</a>
    <a href="/fr/a/12345/appartement-a-vendre?foo=1">same id</a>
    <a href="https://www.mubawab.ma/fr/pa/777/projet">P</a>
    <a href="https://www.mubawab.ma/fr/cc/immobilier-a-vendre:p:2">blocked</a>
  `;
  const urls = extractListingUrls(html);
  assert.equal(urls.length, 2);
  assert.ok(urls.some((url) => url.includes('/fr/a/12345/')));
  assert.ok(urls.some((url) => url.includes('/fr/pa/777/')));
});

test('extracts only deeper safe same-intent shards', () => {
  const html = `
    <a href="/fr/ct/casablanca/immobilier-a-vendre">city</a>
    <a href="/fr/cd/casablanca/sidi-maarouf/immobilier-a-vendre">district</a>
    <a href="/fr/ct/casablanca/immobilier-a-louer">wrong intent</a>
    <a href="/fr/cc/immobilier-a-vendre:p:2">blocked pagination</a>
  `;
  const children = extractChildShardUrls(html, 'https://www.mubawab.ma/fr/cc/immobilier-a-vendre');
  assert.deepEqual(children, [
    'https://www.mubawab.ma/fr/cd/casablanca/sidi-maarouf/immobilier-a-vendre',
    'https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre',
  ]);
});

test('reconciliation distinguishes complete, splittable and gaps', () => {
  assert.equal(reconcileShard({ url: 'x', expectedCount: 2, listingUrls: ['a', 'b'], childUrls: [] }).state, 'complete-leaf');
  assert.equal(reconcileShard({ url: 'x', expectedCount: 100, listingUrls: ['a'], childUrls: ['child'] }).state, 'split-required');
  assert.equal(reconcileShard({ url: 'x', expectedCount: 100, listingUrls: ['a'], childUrls: [] }).state, 'coverage-gap');
});

test('bounded enumeration recursively splits, preserves shard listing ids and remains zero-write', async () => {
  const pages = new Map([
    ['https://www.mubawab.ma/fr/cc/immobilier-a-vendre', `
      <div>(3 résultats)</div>
      <a href="/fr/a/1/one">one</a>
      <a href="/fr/ct/casablanca/immobilier-a-vendre">Casablanca</a>
    `],
    ['https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre', `
      <div>(2 résultats)</div>
      <a href="/fr/a/1/one">one</a>
      <a href="/fr/a/2/two">two</a>
    `],
  ]);
  const fetchImpl = async (url) => ({
    status: 200,
    url,
    headers: { get: () => 'text/html; charset=utf-8' },
    text: async () => pages.get(url) || '<div>(0 résultats)</div>',
  });
  const report = await enumerateMubawab({
    roots: ['https://www.mubawab.ma/fr/cc/immobilier-a-vendre'],
    fetchImpl,
    maxRequests: 5,
    requestDelayMs: 0,
  });
  assert.equal(report.zeroDbWrites, true);
  assert.equal(report.requestCount, 2);
  assert.equal(report.uniqueListingUrlCount, 2);
  assert.equal(report.shards[0].reconciliation.state, 'split-required');
  assert.equal(report.shards[1].reconciliation.state, 'complete-leaf');
  assert.deepEqual(report.shards[0].listingIds, ['1']);
  assert.deepEqual(report.shards[1].listingIds, ['1', '2']);
  assert.equal(report.shards[1].listingUrls.length, 2);
});

test('configured request floor paces sequential shard starts', async () => {
  const starts = [];
  const fetchImpl = async (url) => {
    starts.push(Date.now());
    return {
      status: 200,
      url,
      headers: { get: () => 'text/html; charset=utf-8' },
      text: async () => '<a href="/fr/a/12345/listing">listing</a>',
    };
  };
  const report = await enumerateMubawab({
    roots: [
      'https://www.mubawab.ma/fr/sd/casablanca/oasis/appartements-a-louer',
      'https://www.mubawab.ma/fr/sd/rabat/agdal/appartements-a-vendre',
    ],
    fetchImpl,
    maxRequests: 2,
    requestDelayMs: 25,
  });
  assert.equal(report.requestCount, 2);
  assert.equal(report.requestDelayMs, 25);
  assert.ok(starts[1] - starts[0] >= 20, `expected paced starts, got ${starts[1] - starts[0]}ms`);
});

test('429 stops immediately', async () => {
  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    return {
      status: 429,
      url,
      headers: { get: () => 'text/html' },
      text: async () => '',
    };
  };
  const report = await enumerateMubawab({
    roots: ['https://www.mubawab.ma/fr/cc/immobilier-a-vendre', 'https://www.mubawab.ma/fr/cc/immobilier-a-louer'],
    fetchImpl,
    requestDelayMs: 0,
  });
  assert.equal(calls, 1);
  assert.equal(report.stoppedEarly, 'http_429');
  assert.equal(report.zeroDbWrites, true);
});
