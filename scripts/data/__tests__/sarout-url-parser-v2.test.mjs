import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSaroutRoute,
  inferSaroutTransaction,
  inferSaroutPropertyTypes,
  inferSaroutSurface,
  inferSaroutCity,
  preferredSaroutUrl,
} from '../sarout-url-parser-v2.mjs';

test('dedup identity is language-independent', () => {
  const ar=parseSaroutRoute('https://sarout.ma/ar/annonce/10000/appartement-70-m-louer-tanger-ahlane');
  const fr=parseSaroutRoute('https://sarout.ma/fr/annonce/10000/appartement-70-m-louer-tanger-ahlane');
  assert.equal(ar.identity,'annonce:10000');
  assert.equal(fr.identity,'annonce:10000');
});

test('transaction is explicit from source slug', () => {
  assert.equal(inferSaroutTransaction('appartement-70-m-louer-tanger-ahlane'),'rent');
  assert.equal(inferSaroutTransaction('villa-300-m-vendre-rabat'),'sale');
});

test('property type is prefix-scoped', () => {
  assert.deepEqual(inferSaroutPropertyTypes('local-commercial-22-m-louer-casablanca'),['commercial']);
  assert.deepEqual(inferSaroutPropertyTypes('appartement-70-m-louer-tanger'),['apartment']);
});

test('surface parses explicit N-m and N-m2 only', () => {
  assert.deepEqual(inferSaroutSurface('appartement-70-m-louer-tanger'),{
    state:'recoverable_from_url',value:70,confidence:'high',evidence:'sarout_slug_explicit_surface'
  });
  assert.equal(inferSaroutSurface('appartement-2-chambres-louer-marrakech').state,'unresolved');
});

test('city aliases normalize common transliterations', () => {
  assert.equal(inferSaroutCity('appartement-87-m-louer-tmara').value,'Témara');
  assert.equal(inferSaroutCity('appartement-120-m-louer-fs').value,'Fès');
  assert.equal(inferSaroutCity('appartement-126-m-louer-knitra').value,'Kénitra');
});

test('French route is preferred for future canonical fetch', () => {
  assert.equal(
    preferredSaroutUrl([
      'https://sarout.ma/ar/annonce/10000/appartement-70-m-louer-tanger-ahlane',
      'https://sarout.ma/fr/annonce/10000/appartement-70-m-louer-tanger-ahlane',
    ]),
    'https://sarout.ma/fr/annonce/10000/appartement-70-m-louer-tanger-ahlane'
  );
});
