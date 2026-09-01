import test from 'node:test';
import assert from 'node:assert/strict';

import {
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

test('live seed ranking recognizes concatenated immo hostnames and excludes known portals', () => {
  const ranked = rankLiveSeedDomains([
    { url: 'http://atlasimmo.ma/offres/1', family: 'immo' },
    { url: 'https://rabat-immo.ma/biens/2', family: 'immo' },
    { url: 'https://www.mubawab.ma/fr/immo/3', family: 'immo' },
  ]);

  assert.equal(ranked.some((item) => item.host === 'atlasimmo.ma'), true);
  assert.equal(ranked.some((item) => item.host === 'rabat-immo.ma'), true);
  assert.equal(ranked.some((item) => item.host === 'www.mubawab.ma'), false);
});
