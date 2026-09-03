import test from 'node:test';
import assert from 'node:assert/strict';

import {
  enumerateSaroutyPropertySitemaps,
  isSaroutyPropertySitemap,
} from '../sarouty-property-sitemap-enumerator.mjs';

function response(status, body, url = 'https://www.sarouty.ma/test.xml', contentType = 'application/xml') {
  const bytes = Buffer.from(String(body));
  return {
    status,
    url,
    headers: { get: (name) => name.toLowerCase() === 'content-type' ? contentType : null },
    arrayBuffer: async () => bytes,
  };
}

test('selects only property_details sitemap families', () => {
  assert.equal(isSaroutyPropertySitemap('https://www.sarouty.ma/property_details1.xml'), true);
  assert.equal(isSaroutyPropertySitemap('https://www.sarouty.ma/property_details6.xml'), true);
  assert.equal(isSaroutyPropertySitemap('https://www.sarouty.ma/page-sitemap99.xml'), false);
  assert.equal(isSaroutyPropertySitemap('https://www.sarouty.ma/post-sitemap.xml'), false);
});

test('enumerates only selected property sitemaps and deduplicates listing IDs', async () => {
  const robots = `User-agent: *\nCrawl-delay: 10\nSitemap: https://www.sarouty.ma/sitemap_index.xml\n`;
  const index = `<sitemapindex>
    <sitemap><loc>https://www.sarouty.ma/page-sitemap1.xml</loc></sitemap>
    <sitemap><loc>https://www.sarouty.ma/property_details1.xml</loc></sitemap>
    <sitemap><loc>https://www.sarouty.ma/property_details2.xml</loc></sitemap>
  </sitemapindex>`;
  const p1 = `<urlset>
    <url><loc>https://www.sarouty.ma/property-details/?listing_id=893792</loc></url>
    <url><loc>https://www.sarouty.ma/fr/acheter/casablanca/appartement-a-vendre-875823/</loc></url>
  </urlset>`;
  const p2 = `<urlset>
    <url><loc>https://www.sarouty.ma/en/buy/casablanca/flat-875823/</loc></url>
    <url><loc>https://www.sarouty.ma/en/rent/rabat/apartment-894039/</loc></url>
  </urlset>`;
  const requested = [];
  const sleeps = [];
  const fetchImpl = async (url) => {
    requested.push(url);
    if (url.endsWith('/robots.txt')) return response(200, robots, url, 'text/plain');
    if (url.endsWith('/sitemap_index.xml')) return response(200, index, url);
    if (url.endsWith('/property_details1.xml')) return response(200, p1, url);
    if (url.endsWith('/property_details2.xml')) return response(200, p2, url);
    throw new Error(`unexpected URL ${url}`);
  };

  const report = await enumerateSaroutyPropertySitemaps({ fetchImpl, sleepImpl: async (ms) => sleeps.push(ms) });
  assert.equal(report.zeroDbWrites, true);
  assert.equal(report.discoveredPropertySitemapCount, 2);
  assert.equal(report.selectedPropertySitemapCount, 2);
  assert.equal(report.requestCount, 4);
  assert.equal(report.uniqueRealEstateListingCount, 3);
  assert.equal(report.cappedBySitemaps, false);
  assert.equal(report.cappedByUrls, false);
  assert.deepEqual(sleeps, [10000, 10000, 10000]);
  assert.equal(requested.some((u) => u.includes('page-sitemap')), false);
});

test('stops immediately on 429 while preserving zero-write proof', async () => {
  const robots = `User-agent: *\nCrawl-delay: 10\nSitemap: https://www.sarouty.ma/sitemap_index.xml\n`;
  let calls = 0;
  const report = await enumerateSaroutyPropertySitemaps({
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
