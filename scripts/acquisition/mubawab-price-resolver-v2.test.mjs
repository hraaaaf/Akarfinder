import assert from 'node:assert/strict';
import { resolveLeadingCardPrice } from './mubawab-price-resolver-v2.mjs';

assert.deepEqual(
  resolveLeadingCardPrice([{ price:null, priceAmbiguous:true, context:'7 500 DH Studio... Baisse du prix 500 DH' }]),
  { status:'resolved', value:7500, currency:'MAD', source:'safe_shard_card_primary_price_consensus', evidenceCount:1 }
);

assert.deepEqual(
  resolveLeadingCardPrice([
    { price:null, priceAmbiguous:true, context:'3 650 000 DH Maison... Prix 3 600000 DH' },
    { price:null, priceAmbiguous:true, context:'3 650 000 DH Maison... Prix 3 600000 DH' },
  ]),
  { status:'resolved', value:3650000, currency:'MAD', source:'safe_shard_card_primary_price_consensus', evidenceCount:2 }
);

assert.equal(
  resolveLeadingCardPrice([{ price:null, priceAmbiguous:true, context:'Prix à consulter Terrain... Prix 900 dh et 1000 dh' }]).status,
  'unresolved'
);

assert.equal(
  resolveLeadingCardPrice([{ price:null, priceAmbiguous:true, context:'670 000 EUR Terrain... 7.200.000DH' }]).status,
  'unresolved'
);

assert.equal(
  resolveLeadingCardPrice([
    { price:null, priceAmbiguous:true, context:'900 DH Appartement... Prix 650 DH' },
    { price:null, priceAmbiguous:true, context:'1 000 DH Appartement... Prix 650 DH' },
  ]).status,
  'unresolved'
);

console.log('mubawab-price-resolver-v2 tests: OK');
