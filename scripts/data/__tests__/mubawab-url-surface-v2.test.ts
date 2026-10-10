import test from 'node:test'; import assert from 'node:assert/strict'; import {extractMubawabStrictSurfaceFromUrl} from '../mubawab-url-surface-v2.js';
test('explicit m2 slug',()=>assert.equal(extractMubawabStrictSurfaceFromUrl('https://mubawab.ma/fr/a/8275483/terrain-958-m%C2%B2-22-m-facade')?.value,958));
test('m2 spelling',()=>assert.equal(extractMubawabStrictSurfaceFromUrl('https://mubawab.ma/fr/a/1/appartement-120m2-a-vendre')?.value,120));
test('no unit rejected',()=>assert.equal(extractMubawabStrictSurfaceFromUrl('https://mubawab.ma/fr/a/1/appartement-120-a-vendre'),null));
test('multiple surfaces rejected',()=>assert.equal(extractMubawabStrictSurfaceFromUrl('https://mubawab.ma/fr/a/1/terrain-500-m2-maison-120-m2'),null));
test('non detail rejected',()=>assert.equal(extractMubawabStrictSurfaceFromUrl('https://mubawab.ma/fr/is/appartement-120-m2'),null));
