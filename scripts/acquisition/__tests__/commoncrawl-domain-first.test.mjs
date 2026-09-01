import test from 'node:test';
import assert from 'node:assert/strict';

import { COLLECTIONS_URL } from '../commoncrawl-open-web-mesh.mjs';
import {
  discoverDomainFirst,
  rankSeedDomains,
  validateSeedDomain,
} from '../commoncrawl-domain-first.mjs';

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

test('domain-first seed ranking accepts one-family evidence but excludes known portals', () => {
  const ranked = rankSeedDomains([
    { url: 'https://www.mubawab.ma/fr/immo/test', family: 'immo' },
    { url: 'https://atlasimmo.ma/offres/123', family: 'immo' },
    { url: 'https://agence-casa.ma/immobilier/appartement', family: 'immo' },
    { url: 'https://unrelated.ma/immobilisation-comptable', family: 'immo' },
  ]);

  assert.equal(ranked.some((item) => item.host === 'www.mubawab.ma'), false);
  assert.equal(ranked.some((item) => item.host === 'atlasimmo.ma'), true);
  assert.equal(ranked.some((item) => item.host === 'agence-casa.ma'), true);
});

test('live validation requires multiple independent public evidence points', async () => {
  const domain = {
    host: 'atlasimmo.ma',
    urlCount: 2,
    urls: [
      'https://atlasimmo.ma/immo/appartement-rabat',
      'https://atlasimmo.ma/immo/villa-rabat',
    ],
  };

  const fetchImpl = async (raw) => {
    const url = String(raw);
    const u = new URL(url);
    if (u.pathname === '/robots.txt') return response(200, 'Sitemap: https://atlasimmo.ma/sitemap.xml', url, 'text/plain');
    if (u.pathname === '/sitemap.xml') {
      return response(200, '<urlset><url><loc>https://atlasimmo.ma/annonce/villa-rabat</loc></url></urlset>', url, 'application/xml');
    }
    if (u.pathname === '/sitemap_index.xml') return response(404, 'missing', url, 'text/plain');
    if (u.pathname.startsWith('/immo/')) return response(200, '<html><body>Appartement à vendre à Rabat</body></html>', url, 'text/html');
    return response(404, 'missing', url, 'text/plain');
  };

  const result = await validateSeedDomain({ domain, fetchImpl, maxSitemaps: 2, seedProbes: 1 });
  assert.equal(result.validated, true);
  assert.equal(result.sitemapCandidateCount, 1);
  assert.equal(result.probeOkCount, 1);
  assert.equal(result.candidateUrls.length, 2);
});

test('domain-first discovery validates net-new domains from one Common Crawl query', async () => {
  const collections = JSON.stringify([
    { id: 'CC-MAIN-2026-34', 'cdx-api': 'https://index.commoncrawl.org/CC-MAIN-2026-34-index' },
  ]);
  const hosts = ['atlasimmo.ma', 'rabat-immo.ma', 'casa-property.ma'];
  const seedUrls = hosts.flatMap((host) => [
    `https://${host}/immo/appartement-1`,
    `https://${host}/immo/villa-2`,
  ]);

  const fetchImpl = async (raw) => {
    const url = String(raw);
    if (url === COLLECTIONS_URL) return response(200, collections, url, 'application/json');
    if (url.startsWith('https://index.commoncrawl.org/CC-MAIN-2026-34-index')) {
      return response(200, cdxLines(seedUrls), url, 'application/x-ndjson');
    }
    const u = new URL(url);
    if (u.pathname === '/robots.txt') return response(200, `Sitemap: https://${u.hostname}/sitemap.xml`, url, 'text/plain');
    if (u.pathname === '/sitemap.xml') {
      return response(200, [
        '<urlset>',
        `<url><loc>https://${u.hostname}/annonce/appartement-a-vendre</loc></url>`,
        `<url><loc>https://${u.hostname}/annonce/villa-a-vendre</loc></url>`,
        `<url><loc>https://${u.hostname}/annonce/terrain-a-vendre</loc></url>`,
        '</urlset>',
      ].join(''), url, 'application/xml');
    }
    if (u.pathname === '/sitemap_index.xml') return response(404, 'missing', url, 'text/plain');
    if (u.pathname.startsWith('/immo/')) return response(200, '<html><body>Immobilier à vendre</body></html>', url, 'text/html');
    return response(404, 'missing', url, 'text/plain');
  };

  const result = await discoverDomainFirst({
    fetchImpl,
    topSeeds: 3,
    maxSitemaps: 2,
    seedProbes: 1,
  });

  assert.equal(result.crawl, 'CC-MAIN-2026-34');
  assert.equal(result.seedDomains.length, 3);
  assert.equal(result.validatedDomains.length, 3);
  assert.equal(result.candidateUrls.length, 12);
  assert.equal(result.zeroDbWrites, true);
  assert.equal(result.stoppedEarly, null);
});

test('domain-first discovery hard-stops on 429 without bypass', async () => {
  const collections = JSON.stringify([
    { id: 'CC-MAIN-2026-34', 'cdx-api': 'https://index.commoncrawl.org/CC-MAIN-2026-34-index' },
  ]);
  const fetchImpl = async (raw) => {
    const url = String(raw);
    if (url === COLLECTIONS_URL) return response(200, collections, url, 'application/json');
    if (url.startsWith('https://index.commoncrawl.org/')) return response(429, 'rate limited', url, 'text/plain');
    return response(500, 'unexpected', url, 'text/plain');
  };

  const result = await discoverDomainFirst({ fetchImpl });
  assert.equal(result.stoppedEarly, 'http_429');
  assert.equal(result.zeroDbWrites, true);
  assert.equal(result.validatedDomains.length, 0);
});
