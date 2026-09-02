import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';

import {
  decodeBody,
  enumerateSaroutySitemaps,
  isSaroutyRealEstateListing,
  parseLocs,
  parseRobots,
  saroutyListingId,
} from '../sarouty-sitemap-enumerator.mjs';

function response(status, body, url = 'https://www.sarouty.ma/test.xml', contentType = 'application/xml') {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  return {
    status,
    url,
    headers: { get: (name) => name.toLowerCase() === 'content-type' ? contentType : null },
    arrayBuffer: async () => bytes,
  };
}

test('parses wildcard crawl delay and declared sitemap', () => {
  const parsed = parseRobots(`User-agent: *\nDisallow: /wp-admin/\nCrawl-delay: 10\n\nUser-agent: GPTBot\nAllow: /\n\nSitemap: https://www.sarouty.ma/sitemap_index.xml\n`);
  assert.equal(parsed.crawlDelaySeconds, 10);
  assert.deepEqual(parsed.sitemapRoots, ['https://www.sarouty.ma/sitemap_index.xml']);
});

test('classifies current, query and legacy Sarouty listing formats', () => {
  const urls = [
    'https://www.sarouty.ma/ar/للبيع/شقة-casablanca-دار-بوعزة-903380/',
    'https://www.sarouty.ma/property-details/?listing_id=893792',
    'https://www.sarouty.ma/ar/plp/للبيع/شقة-للبيع-الدار-البيضاء-دار-بوعزة-831965.html',
    'https://www.sarouty.ma/en/buy/casablanca/villa-for-sale-894039/',
    'https://www.sarouty.ma/fr/acheter/casablanca/appartement-a-vendre-875823/',
  ];
  assert.deepEqual(urls.map(saroutyListingId), ['903380', '893792', '831965', '894039', '875823']);
  assert.equal(urls.every(isSaroutyRealEstateListing), true);
  assert.equal(isSaroutyRealEstateListing('https://www.sarouty.ma/en/buy/casablanca/apartments-for-sale/'), false);
});

test('parses XML locs and gzip bodies', () => {
  const xml = '<urlset><url><loc>https://www.sarouty.ma/en/buy/test-894039/</loc></url></urlset>';
  assert.deepEqual(parseLocs(xml), ['https://www.sarouty.ma/en/buy/test-894039/']);
  assert.equal(decodeBody(gzipSync(xml)), xml);
});

test('recursive sitemap enumeration deduplicates IDs and honors crawl delay without writes', async () => {
  const requested = [];
  const sleeps = [];
  const robots = `User-agent: *\nCrawl-delay: 10\nSitemap: https://www.sarouty.ma/sitemap_index.xml\n`;
  const index = '<sitemapindex><sitemap><loc>https://www.sarouty.ma/post-sitemap.xml</loc></sitemap><sitemap><loc>https://www.sarouty.ma/property-sitemap.xml.gz</loc></sitemap></sitemapindex>';
  const first = '<urlset><url><loc>https://www.sarouty.ma/ar/للبيع/شقة-test-903380/</loc></url><url><loc>https://www.sarouty.ma/property-details/?listing_id=893792</loc></url></urlset>';
  const second = '<urlset><url><loc>https://www.sarouty.ma/en/buy/test-903380/</loc></url><url><loc>https://www.sarouty.ma/en/rent/test-894039/</loc></url></urlset>';

  const fetchImpl = async (url) => {
    requested.push(url);
    if (url.endsWith('/robots.txt')) return response(200, robots, url, 'text/plain');
    if (url.endsWith('/sitemap_index.xml')) return response(200, index, url);
    if (url.endsWith('/post-sitemap.xml')) return response(200, first, url);
    if (url.endsWith('/property-sitemap.xml.gz')) return response(200, gzipSync(second), url, 'application/gzip');
    throw new Error(`unexpected URL ${url}`);
  };

  const report = await enumerateSaroutySitemaps({ fetchImpl, sleepImpl: async (ms) => sleeps.push(ms), maxSitemapDocs: 10 });
  assert.equal(report.zeroDbWrites, true);
  assert.equal(report.crawlDelayMs, 10000);
  assert.equal(report.requestCount, 4);
  assert.equal(report.uniqueRealEstateListingCount, 3);
  assert.deepEqual(report.listingUrls.map(saroutyListingId).sort(), ['893792', '894039', '903380']);
  assert.deepEqual(sleeps, [10000, 10000, 10000]);
  assert.equal(requested.length, 4);
});

test('enforces 10 second minimum even if robots declares a lower delay', async () => {
  const sleeps = [];
  const robots = `User-agent: *\nCrawl-delay: 1\nSitemap: https://www.sarouty.ma/sitemap_index.xml\n`;
  const index = '<urlset><url><loc>https://www.sarouty.ma/en/buy/test-894039/</loc></url></urlset>';
  const report = await enumerateSaroutySitemaps({
    fetchImpl: async (url) => url.endsWith('/robots.txt')
      ? response(200, robots, url, 'text/plain')
      : response(200, index, url),
    sleepImpl: async (ms) => sleeps.push(ms),
    maxSitemapDocs: 1,
  });
  assert.equal(report.crawlDelaySeconds, 1);
  assert.equal(report.crawlDelayMs, 10000);
  assert.deepEqual(sleeps, [10000]);
});

test('HTTP 429 stops traversal immediately', async () => {
  const robots = `User-agent: *\nCrawl-delay: 10\nSitemap: https://www.sarouty.ma/sitemap_index.xml\n`;
  let calls = 0;
  const report = await enumerateSaroutySitemaps({
    fetchImpl: async (url) => {
      calls += 1;
      if (url.endsWith('/robots.txt')) return response(200, robots, url, 'text/plain');
      return response(429, '', url);
    },
    sleepImpl: async () => {},
  });
  assert.equal(report.zeroDbWrites, true);
  assert.equal(report.stoppedEarly, 'http_429');
  assert.equal(report.requestCount, 2);
  assert.equal(calls, 2);
});
