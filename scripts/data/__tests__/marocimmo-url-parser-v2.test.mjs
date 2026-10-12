import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMarocImmoRoute, normalizeMarocImmoPropertyType, titleTransactionEvidence } from '../marocimmo-url-parser-v2.mjs';

test('parses MarocImmo structured listing route', () => {
  const r=parseMarocImmoRoute('https://marocimmo.com/fr/location/appartement/agadir/amicales/appartement-lumineux-a-louer-a-long-terme');
  assert.deepEqual(r,{
    locale:'fr',
    identity:'https://marocimmo.com/fr/location/appartement/agadir/amicales/appartement-lumineux-a-louer-a-long-terme',
    transaction_type:'rent',
    property_type:'apartment',
    city:'agadir',
    district:'amicales',
    slug:'appartement-lumineux-a-louer-a-long-terme'
  });
});

test('normalizes canonical property types', () => {
  assert.equal(normalizeMarocImmoPropertyType('terrain'),'land');
  assert.equal(normalizeMarocImmoPropertyType('bureau'),'office');
  assert.equal(normalizeMarocImmoPropertyType('commercial'),'commercial');
});

test('rejects non listing routes', () => {
  assert.equal(parseMarocImmoRoute('https://marocimmo.com/fr/'),null);
  assert.equal(parseMarocImmoRoute('https://marocimmo.com/fr/blog/article'),null);
});

test('extracts explicit transaction evidence from title', () => {
  assert.equal(titleTransactionEvidence('Appartement 2 chambres à louer, Amicales, Agadir | MarocImmo'),'rent');
  assert.equal(titleTransactionEvidence('Villa à vendre à Marrakech | MarocImmo'),'sale');
});
