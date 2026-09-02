import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import {
  avitoListingId,
  categorySegment,
  decodeBody,
  enumerateAvitoSitemap,
  isAvitoRealEstateListing,
  parseLocs,
  parseSitemapDirectives,
} from '../avito-sitemap-enumerator.mjs';

test('parses declared sitemap and XML locs', () => {
  assert.deepEqual(parseSitemapDirectives('User-agent: *\nSitemap: https://www.avito.ma/sitemap.xml\n'), ['https://www.avito.ma/sitemap.xml']);
  assert.deepEqual(parseLocs('<urlset><url><loc>https://www.avito.ma/a&amp;b</loc></url></urlset>'), ['https://www.avito.ma/a&b']);
});

test('classifies Avito real-estate listing URLs and IDs', () => {
  const apartment = 'https://avito.ma/fr/casablanca/appartements/Appartement_test_58482580.htm';
  const office = 'https://avito.ma/ar/rabat/%D9%85%D9%83%D8%A7%D8%AA%D8%A8/Bureau_57236986.htm';
  const car = 'https://avito.ma/fr/casablanca/voitures_d_occasion/Car_58482581.htm';
  assert.equal(avitoListingId(apartment), '58482580');
  assert.equal(categorySegment(apartment), 'appartements');
  assert.equal(isAvitoRealEstateListing(apartment), true);
  assert.equal(isAvitoRealEstateListing(office), true);
  assert.equal(isAvitoRealEstateListing(car), false);
});

test('decodes gzip sitemap bodies', () => {
  const xml = '<urlset><url><loc>https://www.avito.ma/fr/x/appartements/X_58482580.htm</loc></url></urlset>';
  assert.equal(decodeBody(gzipSync(xml)), xml);
});

test('bounded recursive enumeration deduplicates by listing id and stays zero-write', async () => {
  const responses = new Map([
    ['https://www.avito.ma/robots.txt', 'Sitemap: https://www.avito.ma/sitemap.xml'],
    ['https://www.avito.ma/sitemap.xml', '<sitemapindex><sitemap><loc>https://www.avito.ma/sitemap-1.xml</loc></sitemap><sitemap><loc>https://www.avito.ma/sitemap-2.xml</loc></sitemap></sitemapindex>'],
    ['https://www.avito.ma/sitemap-1.xml', '<urlset><url><loc>https://www.avito.ma/fr/casa/appartements/A_58482580.htm</loc></url><url><loc>https://www.avito.ma/fr/casa/voitures_d_occasion/C_58482581.htm</loc></url></urlset>'],
    ['https://www.avito.ma/sitemap-2.xml', '<urlset><url><loc>https://www.avito.ma/fr/rabat/appartements/A2_58482580.htm</loc></url><url><loc>https://www.avito.ma/fr/rabat/terrains_et_fermes/T_58482582.htm</loc></url></urlset>'],
  ]);
  const fetchImpl = async (url) => {
    const text = responses.get(String(url));
    return {
      status: text == null ? 404 : 200,
      url: String(url),
      headers: { get: () => 'application/xml' },
      arrayBuffer: async () => Buffer.from(text || ''),
    };
  };
  const report = await enumerateAvitoSitemap({ fetchImpl, maxSitemapDocs: 3 });
  assert.equal(report.zeroDbWrites, true);
  assert.equal(report.requestCount, 4);
  assert.equal(report.uniqueRealEstateListingCount, 2);
  assert.equal(report.stoppedEarly, null);
});

test('HTTP 429 stops sitemap traversal immediately', async () => {
  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    const isRobots = String(url).endsWith('/robots.txt');
    return {
      status: isRobots ? 200 : 429,
      url: String(url),
      headers: { get: () => 'text/plain' },
      arrayBuffer: async () => Buffer.from(isRobots ? 'Sitemap: https://www.avito.ma/sitemap.xml' : 'slow down'),
    };
  };
  const report = await enumerateAvitoSitemap({ fetchImpl, maxSitemapDocs: 10 });
  assert.equal(report.stoppedEarly, 'http_429');
  assert.equal(calls, 2);
});
