import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyFetchOutcome,
  discoverSaroutyPublicListings,
  extractXmlLocs,
  isPropertySitemapUrl,
  isSaroutyListingCandidate,
} from '../sarouty-public-adapter.mjs';

const ROOT_XML = `<?xml version="1.0"?><sitemapindex>
  <sitemap><loc>https://www.sarouty.ma/property_details1.xml</loc></sitemap>
  <sitemap><loc>https://www.sarouty.ma/property_details2.xml</loc></sitemap>
  <sitemap><loc>https://www.sarouty.ma/other.xml</loc></sitemap>
</sitemapindex>`;

const CHILD_XML = `<?xml version="1.0"?><urlset>
  <url><loc>https://www.sarouty.ma/fr/properties/appartement-a-vendre-casablanca-123</loc></url>
  <url><loc>https://www.sarouty.ma/fr/properties/villa-a-louer-rabat-456</loc></url>
  <url><loc>https://evil.example/property</loc></url>
</urlset>`;

function response(status, text, contentType = 'application/xml', url = '') {
  return {
    status,
    url,
    headers: { get: (name) => name.toLowerCase() === 'content-type' ? contentType : null },
    async text() { return text; },
  };
}

test('extractXmlLocs decodes sitemap locations', () => {
  assert.deepEqual(extractXmlLocs('<urlset><url><loc>https://www.sarouty.ma/a?x=1&amp;y=2</loc></url></urlset>'), [
    'https://www.sarouty.ma/a?x=1&y=2',
  ]);
});

test('property sitemap classifier is host and filename bounded', () => {
  assert.equal(isPropertySitemapUrl('https://www.sarouty.ma/property_details12.xml'), true);
  assert.equal(isPropertySitemapUrl('https://www.sarouty.ma/other.xml'), false);
  assert.equal(isPropertySitemapUrl('https://evil.example/property_details1.xml'), false);
});

test('listing candidate rejects xml and off-host URLs', () => {
  assert.equal(isSaroutyListingCandidate('https://www.sarouty.ma/fr/properties/a-1'), true);
  assert.equal(isSaroutyListingCandidate('https://www.sarouty.ma/property_details1.xml'), false);
  assert.equal(isSaroutyListingCandidate('https://evil.example/fr/properties/a-1'), false);
});

test('fetch outcomes classify 403, 429, timeout and schema drift exactly', () => {
  assert.equal(classifyFetchOutcome({ status: 403, text: '' }), 'http_403');
  assert.equal(classifyFetchOutcome({ status: 429, text: '' }), 'http_429');
  assert.equal(classifyFetchOutcome({ status: 0, error: 'timeout', text: '' }), 'timeout');
  assert.equal(classifyFetchOutcome({ status: 200, contentType: 'text/html', text: '<html></html>' }), 'schema_drift');
  assert.equal(classifyFetchOutcome({ status: 200, contentType: 'application/xml', text: '<urlset></urlset>' }), 'ok');
});

test('deterministic discovery recurses property sitemaps and keeps provenance', async () => {
  const fetchImpl = async (url) => {
    if (url.endsWith('sitemap_index.xml')) return response(200, ROOT_XML, 'application/xml', url);
    if (url.endsWith('property_details1.xml')) return response(200, CHILD_XML, 'application/xml', url);
    if (url.endsWith('property_details2.xml')) return response(200, '<urlset></urlset>', 'application/xml', url);
    return response(404, '', 'text/plain', url);
  };

  const result = await discoverSaroutyPublicListings({ fetchImpl, maxPropertySitemaps: 10, maxUrls: 100 });
  assert.equal(result.zeroDbWrites, true);
  assert.equal(result.stoppedEarly, null);
  assert.equal(result.childSitemaps.length, 2);
  assert.deepEqual(result.urls, [
    'https://www.sarouty.ma/fr/properties/appartement-a-vendre-casablanca-123',
    'https://www.sarouty.ma/fr/properties/villa-a-louer-rabat-456',
  ]);
  assert.equal(result.requests.length, 3);
  assert.equal(result.requests.every((r) => r.classification === 'ok'), true);
});

test('429 stops recursion instead of evading the rate limit', async () => {
  const fetchImpl = async (url) => {
    if (url.endsWith('sitemap_index.xml')) return response(200, ROOT_XML, 'application/xml', url);
    return response(429, '', 'text/plain', url);
  };

  const result = await discoverSaroutyPublicListings({ fetchImpl });
  assert.equal(result.stoppedEarly, 'http_429');
  assert.equal(result.urls.length, 0);
  assert.equal(result.requests.length, 2);
});
