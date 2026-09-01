import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isStrictPropertyUrl,
  parsePublicSeedCdxJsonLines,
  rankLiveSeedDomains,
} from '../commoncrawl-domain-first-live.mjs';

test('HTTP-aware seed parser keeps public HTTP and HTTPS rows', () => {
  const parsed = parsePublicSeedCdxJsonLines([
    JSON.stringify({ url: 'http://atlasimmo.ma/offres/1', status: '200', mime: 'text/html' }),
    JSON.stringify({ url: 'https://rabat-immo.ma/biens/2', status: '200', mime: 'text/html' }),
    JSON.stringify({ url: 'ftp://bad.ma/file', status: '200', mime: 'text/html' }),
  ].join('\n'));

  assert.deepEqual(parsed.map((item) => item.url), [
    'http://atlasimmo.ma/offres/1',
    'https://rabat-immo.ma/biens/2',
  ]);
});

test('strict property classifier rejects generic transaction words and substrings', () => {
  assert.equal(isStrictPropertyUrl('http://04.ma/2020/01/02/location-de-voitures/'), false);
  assert.equal(isStrictPropertyUrl('http://04.ma/2022/03/10/ventec-maroc-recrute-plusieurs-profils/'), false);
  assert.equal(isStrictPropertyUrl('https://example.ma/location-appartement-rabat'), true);
  assert.equal(isStrictPropertyUrl('https://example.ma/vente-villa-casablanca'), true);
});

test('live seed ranking recognizes real-estate hosts and excludes known portals and false positives', () => {
  const ranked = rankLiveSeedDomains([
    { url: 'http://atlasimmo.ma/offres/1', family: 'immo' },
    { url: 'https://rabat-immo.ma/biens/2', family: 'immo' },
    { url: 'https://www.mubawab.ma/fr/immo/3', family: 'immo' },
    { url: 'http://04.ma/2020/01/02/location-de-voitures/', family: 'immo' },
    { url: 'http://04.ma/2022/03/10/ventec-maroc-recrute-plusieurs-profils/', family: 'immo' },
  ]);

  assert.equal(ranked.some((item) => item.host === 'atlasimmo.ma'), true);
  assert.equal(ranked.some((item) => item.host === 'rabat-immo.ma'), true);
  assert.equal(ranked.some((item) => item.host === 'www.mubawab.ma'), false);
  assert.equal(ranked.some((item) => item.host === '04.ma'), false);
});
