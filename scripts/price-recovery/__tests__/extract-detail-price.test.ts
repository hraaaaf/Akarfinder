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

test('Agenz structured data price wins when visible text omits price', () => {
  const html = `
    <html><body>
      <h1>Appartement à louer à Charaf</h1>
      <div data-id="8d2d4956-c374-4a19-a084-8712e6408420" data-prix="6500" data-price="6500" data-transaction-type="Location"></div>
      <div data-value="6500"></div>
    </body></html>`;
  const r = extractDetailPrice('agenz.ma', html, 'rent');
  assert.equal(r.currentPriceMad, 6500);
  assert.equal(r.period, 'month');
  assert.equal(r.priceStatus, 'available');
  assert.equal(r.confidence, 'high');
  assert.match(r.evidence ?? '', /^agenz:data-price:6500/);
});

test('Agenz structured sale price maps to sale_total', () => {
  const html = `
    <html><body>
      <h1>Villa à vendre à Californie</h1>
      <div data-id="56cd4d3e-85f9-4af0-9bb7-99f781c4a6f0" data-prix="4200000" data-transaction-type="Vente"></div>
    </body></html>`;
  const r = extractDetailPrice('agenz.ma', html, 'sale');
  assert.equal(r.currentPriceMad, 4200000);
  assert.equal(r.period, 'sale_total');
  assert.equal(r.confidence, 'high');
});

test('Agenz recovers sale price from title when body has no price block', () => {
  const html = `
    <html>
      <head>
        <title>Villa for sale 13 500 000 MAD 730 m², 6 rooms - Oasis</title>
        <meta property="og:title" content="Villa à vendre 13 500 000 DH 730 m² - Oasis" />
      </head>
      <body><h1>Villa for sale in Oasis</h1></body>
    </html>`;
  const r = extractDetailPrice('agenz.ma', html, 'sale');
  assert.equal(r.currentPriceMad, 13500000);
  assert.equal(r.period, 'sale_total');
  assert.equal(r.priceStatus, 'available');
  assert.equal(r.confidence, 'high');
});

test('Agenz recovers a bare primary-block sale price after the listing heading', () => {
  const html = `
    <html><body>
      <h1>Apartment for sale in Beauséjour</h1>
      <div>1 400 000 MAD</div>
      <div>Casablanca – Beauséjour</div>
      <div><span>Syndic fees :</span><strong>140 MAD / month</strong></div>
      <div>Ref. CMN-HA-1710</div>
      <section><h2>Similar listings</h2><div>2 900 000 MAD</div></section>
    </body></html>`;
  const r = extractDetailPrice('agenz.ma', html, 'sale');
  assert.equal(r.currentPriceMad, 1400000);
  assert.equal(r.period, 'sale_total');
  assert.equal(r.priceStatus, 'available');
  assert.match(r.evidence ?? '', /^agenz:primary-block:/);
});

test('Agenz primary-block rent price wins before syndic fees', () => {
  const html = `
    <html><body>
      <h1>Appartement à louer à Agdal</h1>
      <div>8 500 DH / mois</div>
      <div>Rabat – Agdal</div>
      <div><span>Syndic :</span><strong>900 DH / mois</strong></div>
      <div>Ref. RBT-101</div>
    </body></html>`;
  const r = extractDetailPrice('agenz.ma', html, 'rent');
  assert.equal(r.currentPriceMad, 8500);
  assert.equal(r.period, 'month');
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
