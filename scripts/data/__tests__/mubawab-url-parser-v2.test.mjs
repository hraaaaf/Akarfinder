import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMubawabRoute,
  inferTransactionFromSlug,
  inferPropertyTypesFromSlug,
  inferSurfaceEvidenceFromSlug,
  aggregateMubawabIdentity,
} from '../mubawab-url-parser-v2.mjs';

test('parses Mubawab individual listing identity', () => {
  const r = parseMubawabRoute('https://mubawab.ma/en/a/6350845/luxury-villa-for-rent-in-souissi-surface-area-400-m%C2%B2-garden-and-garage-');
  assert.equal(r.identity, 'a:6350845');
  assert.equal(r.kind, 'a');
});

test('rejects search/navigation URL as listing identity', () => {
  assert.equal(parseMubawabRoute('https://mubawab.ma/en/is/apartment-rent_casablanca_cheap'), null);
});

test('extracts explicit rent, villa and strong primary surface', () => {
  const slug='luxury-villa-for-rent-in-souissi-surface-area-400-m²-garden-and-garage';
  assert.equal(inferTransactionFromSlug(slug), 'rent');
  assert.deepEqual(inferPropertyTypesFromSlug(slug), ['villa']);
  assert.deepEqual(inferSurfaceEvidenceFromSlug(slug), [{value:400,confidence:'high',evidence:'slug:400 m²'}]);
});

test('does not force a single property type when title says offices and shops', () => {
  const types = inferPropertyTypesFromSlug('offices-shops-for-sale-in-quartier-du-parc-area-441-m²');
  assert.deepEqual(types.sort(), ['commercial','office']);
});

test('historical slugs with sale and rent become conflict', () => {
  const p=aggregateMubawabIdentity([
    'https://mubawab.ma/en/a/6160197/magnificent-villa-for-sale-in-ain-diab-7-rooms-carpark-and-garden',
    'https://mubawab.ma/fr/a/6160197/villa-%C3%A0-louer-ain-diab-casablanca',
  ]);
  assert.equal(p.transaction_type.state, 'conflict');
});

test('thousands separator in URL surface is parsed as 1800 m²', () => {
  const e=inferSurfaceEvidenceFromSlug('surface-area-1-800-m²');
  assert.equal(e[0].value, 1800);
  assert.equal(e[0].confidence, 'high');
});
