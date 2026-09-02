import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enumerateMarocAnnonces,
  extractListingUrls,
  extractPaginationUrls,
  isHardBlock,
  marocAnnoncesListingId,
  parseCategoryCounts,
  parseRobots,
} from '../marocannonces-source-first.mjs';

function response(status, body, url = 'https://www.marocannonces.com/test') {
  return { status, url, text: async () => String(body) };
}

test('parses wildcard robots rules and delay', () => {
  assert.deepEqual(parseRobots('User-agent: *\nDisallow: /private/\nCrawl-delay: 5\n'), {
    crawlDelaySeconds: 5,
    disallow: ['/private/'],
  });
});

test('detects MarocAnnonces detail IDs', () => {
  const url = 'https://www.marocannonces.com/categorie/315/Appartements/annonce/10229450/Appartement.html';
  assert.equal(marocAnnoncesListingId(url), '10229450');
  assert.equal(marocAnnoncesListingId('https://example.com/annonce/10229450/x'), null);
});

test('extracts and deduplicates detail URLs', () => {
  const html = `<a href="/categorie/315/Appartements/annonce/10229450/A.html">A</a>
    <a href="/categorie/315/Appartements/annonce/10229450/B.html">dup</a>
    <a href="/categorie/315/Appartements/annonce/10288297/C.html">C</a>`;
  assert.equal(extractListingUrls(html).length, 2);
});

test('extracts same-category pagination only', () => {
  const current = 'https://www.marocannonces.com/categorie/315/Vente-immobilier/Appartements.html';
  const html = `<a href="/categorie/315/Vente-immobilier/Appartements/2.html">2</a>
    <a href="/categorie/321/Location-immobilier/Appartements/2.html">other</a>`;
  assert.deepEqual(extractPaginationUrls(html, current), [
    'https://www.marocannonces.com/categorie/315/Vente-immobilier/Appartements/2.html',
  ]);
});

test('parses section and category counts', () => {
  assert.deepEqual(parseCategoryCounts('<p>Vous consultez les 18 176 annonces Vente immobilier dont 7 718 de vente Appartements</p>'), {
    sectionTotal: 18176,
    categoryTotal: 7718,
  });
});

test('detects verification hard-block pages', () => {
  assert.equal(isHardBlock('<html>Please wait while your request is being verified...</html>'), true);
  assert.equal(isHardBlock('<html>normal listings</html>'), false);
});

test('stops safely when robots is blocked', async () => {
  const report = await enumerateMarocAnnonces({
    fetchImpl: async () => response(403, ''),
    sleepImpl: async () => {},
  });
  assert.equal(report.zeroDbWrites, true);
  assert.equal(report.stoppedEarly, 'robots_http_403');
  assert.equal(report.requestCount, 1);
});

test('enumerates one public category page with conservative delay', async () => {
  const sleeps = [];
  const root = 'https://www.marocannonces.com/categorie/315/Vente-immobilier/Appartements.html';
  const html = `<p>Vous consultez les 18 176 annonces Vente immobilier dont 7 718 de vente Appartements</p>
    <a href="/categorie/315/Appartements/annonce/10229450/Appartement.html">detail</a>`;
  const report = await enumerateMarocAnnonces({
    roots: [root],
    maxPages: 1,
    fetchImpl: async (url) => url.endsWith('/robots.txt')
      ? response(404, '', url)
      : response(200, html, url),
    sleepImpl: async (ms) => sleeps.push(ms),
  });
  assert.equal(report.zeroDbWrites, true);
  assert.equal(report.uniqueListingCount, 1);
  assert.equal(report.pages[0].categoryTotal, 7718);
  assert.deepEqual(sleeps, [3000]);
  assert.equal(report.stoppedEarly, null);
});

test('stops immediately on hard-block content', async () => {
  let calls = 0;
  const root = 'https://www.marocannonces.com/categorie/315/Vente-immobilier/Appartements.html';
  const report = await enumerateMarocAnnonces({
    roots: [root],
    fetchImpl: async (url) => {
      calls += 1;
      return url.endsWith('/robots.txt')
        ? response(404, '', url)
        : response(200, 'Please wait while your request is being verified...', url);
    },
    sleepImpl: async () => {},
  });
  assert.equal(report.stoppedEarly, 'hard_block');
  assert.equal(report.zeroDbWrites, true);
  assert.equal(calls, 2);
});
