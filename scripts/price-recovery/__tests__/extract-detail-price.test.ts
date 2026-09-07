import assert from 'node:assert/strict';
import test from 'node:test';
import { extractDetailPrice } from '../extract-detail-price';

test('Agenz monthly rent extracts current price and ignores crossed-out old price', () => {
  const html = `
    <html><body>
      <div class="listing-price"><s>15 000 DH</s><strong>14 000 DH / mois</strong></div>
      <div>Appartement à louer 102 m²</div>
    </body></html>`;
  const r = extractDetailPrice('agenz.ma', html, 'rent');
  assert.equal(r.currentPriceMad, 14000);
  assert.equal(r.oldPriceMad, 15000);
  assert.equal(r.period, 'month');
  assert.equal(r.currency, 'MAD');
});

test('Mubawab sale extracts total price', () => {
  const html = `
    <html><body>
      <div class="price">25,000,000 DH</div>
      <h1>Fabulous house for sale in Anfa Supérieur</h1>
      <p>Price 25,000,000 DH. Area 781 m².</p>
    </body></html>`;
  const r = extractDetailPrice('mubawab.ma', html, 'sale');
  assert.equal(r.currentPriceMad, 25000000);
  assert.equal(r.period, 'sale_total');
});

test('price per m2 is kept separate and never promoted to total price', () => {
  const html = `
    <html><body>
      <div class="price">10 000 DH/m²</div>
      <h1>Local commercial à vendre</h1>
    </body></html>`;
  const r = extractDetailPrice('mubawab.ma', html, 'sale');
  assert.equal(r.currentPriceMad, null);
  assert.equal(r.pricePerM2Mad, 10000);
});

test('nightly price is not treated as monthly rent', () => {
  const html = `
    <html><body>
      <div class="price">800 DH par nuit</div>
      <h1>Appartement location vacances</h1>
    </body></html>`;
  const r = extractDetailPrice('agenz.ma', html, 'rent');
  assert.equal(r.currentPriceMad, 800);
  assert.equal(r.period, 'night');
});

test('unsupported source is rejected', () => {
  const r = extractDetailPrice('masaken.ma', '<html><body>800 DH</body></html>', 'rent');
  assert.equal(r.currentPriceMad, null);
  assert.deepEqual(r.rejected, ['unsupported_source']);
});
