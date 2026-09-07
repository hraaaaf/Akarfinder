import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPriceForListing, inferPricePeriod, isSafeShardUrl, parseMadPrice } from '../mubawab-price-recovery.mjs';

test('parseMadPrice handles grouped DH values', () => {
  assert.equal(parseMadPrice('Prix 1 500 000 DH'), 1500000);
  assert.equal(parseMadPrice('9.500.000 DHS'), 9500000);
  assert.equal(parseMadPrice('1,5 MDH'), 1500000);
});

test('inferPricePeriod detects day and month', () => {
  assert.equal(inferPricePeriod('500 DH / jour'), 'day');
  assert.equal(inferPricePeriod('7 500 DH par mois'), 'month');
});

test('extractPriceForListing isolates the matching card', () => {
  const html = `
    <div class="card"><a href="/fr/a/111/foo">A</a><span>850 000 DH</span></div>
    <div class="card"><a href="/fr/a/222/bar">B</a><span>1 450 000 DH</span></div>`;
  assert.equal(extractPriceForListing(html, '222')?.price, 1450000);
});

test('extractPriceForListing handles daily rent', () => {
  const html = `<article><a href="https://www.mubawab.ma/fr/a/333/x">Annonce</a><strong>500 DH / jour</strong></article>`;
  const actual = extractPriceForListing(html, '333');
  assert.equal(actual?.price, 500);
  assert.equal(actual?.period, 'day');
});

test('safe shard guard rejects colon pagination and accepts cd shard', () => {
  assert.equal(isSafeShardUrl('https://www.mubawab.ma/fr/cd/agadir/founti/immobilier-a-vendre'), true);
  assert.equal(isSafeShardUrl('https://www.mubawab.ma/fr/cd/agadir/founti/immobilier-a-vendre:p:2'), false);
});
