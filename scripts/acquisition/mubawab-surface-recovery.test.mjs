import assert from 'node:assert/strict';
import { extractSurfaceForListing, parseSurface } from './mubawab-surface-recovery.mjs';

assert.equal(parseSurface('Appartement 120m² 3 chambres'), 120, 'm² must be parsed');
assert.equal(parseSurface('Terrain 300 m2'), 300, 'm2 must be parsed');
assert.equal(parseSurface('Surface 55 m 2'), 55, 'm 2 must be parsed');

const html = `
<article>
  <a href="https://mubawab.ma/fr/a/8357837/villa-test">Villa test</a>
  <div>Illigh, Agadir 220m² 5 Pièces 3 Chambres</div>
  <p>Édifiée sur un terrain de 399 m2 avec 220 m2 habitables.</p>
</article>`;
const parsed = extractSurfaceForListing(html, '8357837');
assert.equal(parsed?.surface, 220, 'card primary surface must win over secondary description areas');

const neighbouring = `
<section>
  <article><a href="/fr/a/8368521/depot">Dépôt</a><div>Hay Rahma, Salé 300m² 1 Salle de bain</div><p>Deux appartements de 150 m² et terrasse 300 m².</p></article>
  <article><a href="/fr/a/9999999/cafe">Cafe</a><div>Hay Rahma, Salé 60m²</div></article>
</section>`;
assert.equal(extractSurfaceForListing(neighbouring, '8368521')?.surface, 300, 'surface must stay scoped to the target card');

console.log('mubawab-surface-recovery tests: PASS');
