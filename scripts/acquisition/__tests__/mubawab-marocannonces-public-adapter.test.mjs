import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalizeMarocAnnoncesListing,
  classifyHtmlFetchOutcome,
  discoverMubawabAndMarocAnnonces,
  extractMarocAnnoncesListings,
  extractMubawabListings,
  isMubawabListingUrl,
} from '../mubawab-marocannonces-public-adapter.mjs';

test('Mubawab classifier accepts only public listing detail patterns', () => {
  assert.equal(isMubawabListingUrl('https://www.mubawab.ma/fr/a/123456/appartement-casablanca'), true);
  assert.equal(isMubawabListingUrl('https://mubawab.ma/fr/pa/987654/villa-rabat'), true);
  assert.equal(isMubawabListingUrl('https://www.mubawab.ma/fr/cc/immobilier-a-vendre'), false);
  assert.equal(isMubawabListingUrl('https://example.com/fr/a/123456/fake'), false);
});

test('MarocAnnonces canonicalizer roots relative listing URLs safely', () => {
  assert.equal(
    canonicalizeMarocAnnoncesListing('categorie/315/Vente-immobilier/Appartements/annonce/123456/appartement-casa.html'),
    'https://www.marocannonces.com/categorie/315/Vente-immobilier/Appartements/annonce/123456/appartement-casa.html',
  );
  assert.equal(canonicalizeMarocAnnoncesListing('https://example.com/annonce/123456/nope.html'), null);
});

test('HTML extractors retain only source listing URLs', () => {
  const mubawab = extractMubawabListings(`
    <a href="/fr/a/123456/appartement-casablanca">A</a>
    <a href="https://www.mubawab.ma/fr/pa/987654/villa-rabat">B</a>
    <a href="/fr/cc/immobilier-a-vendre">category</a>
  `);
  assert.deepEqual(mubawab.sort(), [
    'https://www.mubawab.ma/fr/a/123456/appartement-casablanca',
    'https://www.mubawab.ma/fr/pa/987654/villa-rabat',
  ].sort());

  const maroc = extractMarocAnnoncesListings(`
    <a href="categorie/315/Vente-immobilier/Appartements/annonce/111111/appartement.html">A</a>
    https://www.marocannonces.com/categorie/319/Vente-immobilier/Villas-Maisons-Riads/annonce/222222/villa.html
  `);
  assert.equal(maroc.length, 2);
  assert.ok(maroc.every((url) => url.startsWith('https://www.marocannonces.com/')));
});

test('fetch outcome classifies 403, 429, timeout and schema drift exactly', () => {
  assert.equal(classifyHtmlFetchOutcome({ status: 403, text: 'blocked' }), 'http_403');
  assert.equal(classifyHtmlFetchOutcome({ status: 429, text: 'slow down' }), 'http_429');
  assert.equal(classifyHtmlFetchOutcome({ status: 0, error: 'timeout' }), 'timeout');
  assert.equal(classifyHtmlFetchOutcome({ status: 200, contentType: 'application/json', text: '{}' }), 'schema_drift');
  assert.equal(classifyHtmlFetchOutcome({ status: 200, contentType: 'text/html', text: '<html></html>' }), 'ok');
});

test('deterministic discovery returns both productive sources and provenance', async () => {
  const fakeFetch = async (url) => {
    const isMubawab = String(url).includes('mubawab.ma');
    const body = isMubawab
      ? '<a href="/fr/a/123456/appartement-casablanca">listing</a>'
      : '<a href="categorie/315/Vente-immobilier/Appartements/annonce/654321/appartement-rabat.html">listing</a>';
    return {
      status: 200,
      url,
      headers: { get: () => 'text/html; charset=UTF-8' },
      text: async () => body,
    };
  };

  const result = await discoverMubawabAndMarocAnnonces({ fetchImpl: fakeFetch, maxPages: 1 });
  assert.equal(result.zeroDbWrites, true);
  assert.equal(result.sources.length, 2);
  assert.equal(result.sources[0].urls.length, 1);
  assert.equal(result.sources[1].urls.length, 1);
  assert.ok(result.sources.every((source) => source.requests.every((request) => request.classification === 'ok')));
});

test('legacy Mubawab adapter never emits colon pagination even when maxPages is high', async () => {
  const seen = [];
  const fakeFetch = async (url) => {
    seen.push(String(url));
    const isMubawab = String(url).includes('mubawab.ma');
    return {
      status: 200,
      url,
      headers: { get: () => 'text/html; charset=UTF-8' },
      text: async () => isMubawab
        ? '<a href="/fr/a/123456/appartement-casablanca">listing</a>'
        : '<a href="categorie/315/Vente-immobilier/Appartements/annonce/654321/appartement-rabat.html">listing</a>',
    };
  };
  const result = await discoverMubawabAndMarocAnnonces({ fetchImpl: fakeFetch, maxPages: 3 });
  const mubawab = result.sources.find((source) => source.name === 'mubawab');
  assert.equal(mubawab.requests.length, 2);
  assert.ok(mubawab.requests.every((request) => !new URL(request.url).pathname.includes(':')));
  assert.ok(seen.some((url) => url.includes('marocannonces.com') && url.includes('/2.html')));
});

test('429 stops a source instead of continuing or evading the rate limit', async () => {
  let count = 0;
  const fakeFetch = async (url) => {
    count += 1;
    return {
      status: String(url).includes('mubawab.ma') ? 429 : 200,
      url,
      headers: { get: () => 'text/html' },
      text: async () => String(url).includes('mubawab.ma')
        ? 'rate limited'
        : '<a href="categorie/315/Vente-immobilier/Appartements/annonce/654321/appartement.html">listing</a>',
    };
  };

  const result = await discoverMubawabAndMarocAnnonces({ fetchImpl: fakeFetch, maxPages: 3 });
  const mubawab = result.sources.find((source) => source.name === 'mubawab');
  assert.equal(mubawab.stoppedEarly, 'http_429');
  assert.equal(mubawab.requests.length, 1);
  assert.ok(count >= 2);
});
