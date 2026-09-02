import test from 'node:test';
import assert from 'node:assert/strict';
import { agenzListingId, enumerateAgenz, extractDiscoveryUrls, extractListingUrls, isHardBlock, parseResultCount, parseRobots } from '../agenz-source-first.mjs';

function response(status, body, url = 'https://agenz.ma/test') { return { status, url, text: async () => String(body) }; }

test('parses wildcard robots rules', () => {
  assert.deepEqual(parseRobots('User-agent: *\nDisallow: /private/\nCrawl-delay: 4\n'), { crawlDelaySeconds: 4, disallow: ['/private/'] });
});

test('extracts Agenz numeric listing id', () => {
  assert.equal(agenzListingId('https://agenz.ma/fr/annonces/immo-casablanca/vente-appartements/2-mars/540241'), '540241');
  assert.equal(agenzListingId('https://agenz.ma/fr/acheter/immo-casablanca'), null);
});

test('extracts and deduplicates listing links', () => {
  const html = '<a href="/fr/annonces/immo-casablanca/vente-appartements/2-mars/540241">a</a><a href="/fr/annonces/immo-casablanca/vente-appartements/2-mars/540241">dup</a><a href="/fr/annonces/immo-casablanca/vente-villas/oasis/103821">b</a>';
  assert.equal(extractListingUrls(html).length, 2);
});

test('extracts public discovery links', () => {
  const html = '<a href="/fr/acheter/immo-casablanca/vente-villas/oasis">buy</a><a href="/fr/louer/immo-casablanca/location-appartement/anfa">rent</a><a href="https://example.com/x">x</a>';
  assert.equal(extractDiscoveryUrls(html).length, 2);
});

test('parses visible result count', () => {
  assert.equal(parseResultCount('<h1>1 529 Appartements à vendre à Casablanca</h1>'), 1529);
  assert.equal(parseResultCount('<h1>1 104 Annonces immobilières à louer à Casablanca</h1>'), 1104);
});

test('detects hard block markers', () => {
  assert.equal(isHardBlock('Verify you are human'), true);
  assert.equal(isHardBlock('normal listings'), false);
});

test('stops safely when robots is blocked', async () => {
  const r = await enumerateAgenz({ fetchImpl: async () => response(403, ''), sleepImpl: async () => {} });
  assert.equal(r.zeroDbWrites, true);
  assert.equal(r.stoppedEarly, 'robots_http_403');
  assert.equal(r.requestCount, 1);
});

test('enumerates one public root and honors delay floor', async () => {
  const root = 'https://agenz.ma/fr/acheter/immo-casablanca';
  const sleeps = [];
  const html = '<h1>1 529 Appartements à vendre à Casablanca</h1><a href="/fr/annonces/immo-casablanca/vente-appartements/2-mars/540241">detail</a>';
  const r = await enumerateAgenz({ roots: [root], maxPages: 1, fetchImpl: async (url) => url.endsWith('/robots.txt') ? response(404, '', url) : response(200, html, url), sleepImpl: async (ms) => sleeps.push(ms) });
  assert.equal(r.uniqueListingCount, 1);
  assert.equal(r.pages[0].resultCount, 1529);
  assert.deepEqual(sleeps, [3000]);
  assert.equal(r.stoppedEarly, null);
});

test('stops immediately on hard block', async () => {
  let calls = 0;
  const root = 'https://agenz.ma/fr/acheter/immo-casablanca';
  const r = await enumerateAgenz({ roots: [root], fetchImpl: async (url) => { calls += 1; return url.endsWith('/robots.txt') ? response(404, '', url) : response(200, 'Verify you are human', url); }, sleepImpl: async () => {} });
  assert.equal(r.stoppedEarly, 'hard_block');
  assert.equal(calls, 2);
});
