import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COLLECTIONS_URL,
  KNOWN_PORTAL_HOSTS,
  discoverCommonCrawlOpenWeb,
  extractXmlLocs,
  parseCdxJsonLines,
  parseRobotsSitemaps,
  rankNetNewDomains,
  realEstateSignals,
  selectLatestCrawl,
} from '../commoncrawl-open-web-mesh.mjs';

function response(status, text, url = 'https://example.test/', contentType = 'text/plain') {
  return {
    status,
    url,
    headers: { get: (name) => name.toLowerCase() === 'content-type' ? contentType : null },
    text: async () => text,
  };
}

function cdxLines(urls) {
  return urls.map((url) => JSON.stringify({ url, status: '200', mime: 'text/html' })).join('\n');
}

test('selectLatestCrawl chooses first valid public CDX collection', () => {
  const selected = selectLatestCrawl([
    { id: 'bad', 'cdx-api': 'https://index.commoncrawl.org/bad' },
    { id: 'CC-MAIN-2026-34', 'cdx-api': 'https://index.commoncrawl.org/CC-MAIN-2026-34-index' },
    { id: 'CC-MAIN-2026-30', 'cdx-api': 'https://index.commoncrawl.org/CC-MAIN-2026-30-index' },
  ]);
  assert.equal(selected.id, 'CC-MAIN-2026-34');
});

test('CDX parser keeps only valid HTTPS records and retains family provenance', () => {
  const parsed = parseCdxJsonLines([
    JSON.stringify({ url: 'https://atlasimmo.ma/immobilier/rabat', status: '200', mime: 'text/html' }),
    JSON.stringify({ url: 'http://atlasimmo.ma/immobilier/old', status: '200', mime: 'text/html' }),
    'not-json',
  ].join('\n'), 'immobilier');
  assert.deepEqual(parsed, [{ url: 'https://atlasimmo.ma/immobilier/rabat', family: 'immobilier', status: '200', mime: 'text/html' }]);
});

test('real-estate signals recognize property and transaction vocabulary', () => {
  const signals = realEstateSignals('https://example.ma/annonce/villa-a-vendre-rabat');
  assert.equal(signals.has('annonce'), true);
  assert.equal(signals.has('villa'), true);
  assert.equal(signals.has('transaction'), true);
});

test('domain ranking excludes known portals and requires repeated evidence', () => {
  const records = [
    { url: 'https://www.mubawab.ma/fr/a/123/test', family: 'annonce' },
    { url: 'https://atlasimmo.ma/immobilier/rabat', family: 'immobilier' },
    { url: 'https://atlasimmo.ma/annonce/appartement-rabat', family: 'annonce' },
    { url: 'https://weak.ma/villa', family: 'villa' },
  ];
  const ranked = rankNetNewDomains(records, KNOWN_PORTAL_HOSTS);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].host, 'atlasimmo.ma');
  assert.equal(ranked[0].familyCount, 2);
});

test('robots and XML parsers stay host-bounded and decode locs', () => {
  assert.deepEqual(parseRobotsSitemaps([
    'Sitemap: https://atlasimmo.ma/sitemap.xml',
    'Sitemap: https://evil.example/sitemap.xml',
  ].join('\n'), 'atlasimmo.ma'), ['https://atlasimmo.ma/sitemap.xml']);
  assert.deepEqual(extractXmlLocs('<urlset><url><loc>https://atlasimmo.ma/annonce/a&amp;b</loc></url></urlset>'), ['https://atlasimmo.ma/annonce/a&b']);
});

test('end-to-end discovery ranks net-new domains and harvests public sitemaps deterministically', async () => {
  const collections = JSON.stringify([
    { id: 'CC-MAIN-2026-34', 'cdx-api': 'https://index.commoncrawl.org/CC-MAIN-2026-34-index' },
  ]);
  const domainUrls = {
    immobilier: [
      'https://atlasimmo.ma/immobilier/rabat',
      'https://rabat-home.ma/immobilier/appartement',
      'https://casa-biens.ma/immobilier/casablanca',
    ],
    annonce: [
      'https://atlasimmo.ma/annonce/appartement-rabat',
      'https://rabat-home.ma/annonce/villa-rabat',
      'https://casa-biens.ma/annonce/appartement-casa',
    ],
  };

  const fetchImpl = async (raw) => {
    const url = String(raw);
    if (url === COLLECTIONS_URL) return response(200, collections, url, 'application/json');
    if (url.startsWith('https://index.commoncrawl.org/CC-MAIN-2026-34-index')) {
      const familyPattern = new URL(url).searchParams.get('url') || '';
      const family = familyPattern.includes('immobilier') ? 'immobilier' : familyPattern.includes('annonce') ? 'annonce' : 'other';
      return response(200, cdxLines(domainUrls[family] || []), url, 'application/x-ndjson');
    }
    const u = new URL(url);
    if (u.pathname === '/robots.txt') return response(200, `Sitemap: https://${u.hostname}/sitemap.xml`, url, 'text/plain');
    if (u.pathname === '/sitemap.xml') return response(200, `<urlset><url><loc>https://${u.hostname}/annonce/villa-a-vendre</loc></url></urlset>`, url, 'application/xml');
    if (u.pathname === '/sitemap_index.xml') return response(404, 'missing', url, 'text/plain');
    return response(404, 'missing', url, 'text/plain');
  };

  const result = await discoverCommonCrawlOpenWeb({
    fetchImpl,
    families: [
      { name: 'immobilier', pattern: '*.ma/*immobilier*' },
      { name: 'annonce', pattern: '*.ma/*annonce*' },
    ],
    topDomains: 3,
    maxSitemapsPerDomain: 2,
  });

  assert.equal(result.crawl, 'CC-MAIN-2026-34');
  assert.deepEqual(result.domains.map((item) => item.host), ['rabat-home.ma', 'atlasimmo.ma', 'casa-biens.ma']);
  assert.equal(result.sitemapEvidence.length, 3);
  assert.equal(result.candidateUrls.length, 9);
  assert.equal(result.zeroDbWrites, true);
  assert.equal(result.stoppedEarly, null);
});

test('429 hard-stops Common Crawl query sequence without evasion', async () => {
  let indexCalls = 0;
  const fetchImpl = async (raw) => {
    const url = String(raw);
    if (url === COLLECTIONS_URL) return response(200, JSON.stringify([{ id: 'CC-MAIN-2026-34', 'cdx-api': 'https://index.commoncrawl.org/CC-MAIN-2026-34-index' }]), url, 'application/json');
    if (url.startsWith('https://index.commoncrawl.org/')) {
      indexCalls += 1;
      return response(429, 'rate limited', url, 'text/plain');
    }
    return response(500, 'unexpected', url, 'text/plain');
  };

  const result = await discoverCommonCrawlOpenWeb({
    fetchImpl,
    families: [
      { name: 'immobilier', pattern: '*.ma/*immobilier*' },
      { name: 'annonce', pattern: '*.ma/*annonce*' },
    ],
  });

  assert.equal(indexCalls, 1);
  assert.equal(result.stoppedEarly, 'http_429');
  assert.equal(result.zeroDbWrites, true);
});
