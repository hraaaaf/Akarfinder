import assert from 'node:assert/strict';
import test from 'node:test';
import { extractMubawabListingId, validateMubawabFinalUrl } from '../mubawab-url-identity';

test('extracts stable Mubawab listing id', () => {
  assert.equal(extractMubawabListingId('https://www.mubawab.ma/fr/a/8050503/foo'), '8050503');
});

test('accepts same stable listing id after redirect', () => {
  assert.equal(
    validateMubawabFinalUrl('https://mubawab.ma/fr/a/8050503/old-slug', 'https://www.mubawab.ma/fr/a/8050503/new-slug'),
    'exact',
  );
});

test('rejects category redirect', () => {
  assert.equal(
    validateMubawabFinalUrl('https://www.mubawab.ma/fr/a/8217268/foo', 'https://www.mubawab.ma/fr/sd/rabat/hassan---centre-ville/villas-et-maisons-de-luxe-a-vendre'),
    'category_redirect',
  );
});

test('rejects redirect to a different listing id', () => {
  assert.equal(
    validateMubawabFinalUrl('https://www.mubawab.ma/fr/a/8050503/foo', 'https://www.mubawab.ma/fr/a/9999999/bar'),
    'listing_mismatch',
  );
});

test('rejects final URL without stable listing id', () => {
  assert.equal(
    validateMubawabFinalUrl('https://www.mubawab.ma/fr/a/8050503/foo', 'https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre'),
    'missing_listing_id',
  );
});
