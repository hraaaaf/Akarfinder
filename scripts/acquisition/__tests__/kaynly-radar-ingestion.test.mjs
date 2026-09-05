import test from 'node:test';
import assert from 'node:assert/strict';
import {
  avitoIdFromUrl,
  normalizeAvitoListingUrl,
  candidateFromKaynlyRecord,
  buildManifest,
  diffAgainstExisting,
  runIngestion,
} from '../kaynly-radar-ingestion.mjs';

const record = {
  avitoId: '59206034',
  occurrences: 2,
  urls: ['https://www.avito.ma/fr/ain_sebaa/appartements/Appartement___vendre___Casablanca_59206034.htm?foo=1#x'],
  discoveries: [
    { source: 'saleCityNeighbourhood', page: 'https://www.kaynly.com/vente/casablanca/ain-sebaa', transaction: 'vente', city: 'Casablanca' },
    { source: 'saleCity', page: 'https://www.kaynly.com/vente/casablanca', transaction: 'vente', city: 'Casablanca' },
  ],
};

test('normalizes Avito listing identity and strips tracking', () => {
  const raw = record.urls[0];
  assert.equal(avitoIdFromUrl(raw), '59206034');
  assert.equal(normalizeAvitoListingUrl(raw), 'https://avito.ma/fr/ain_sebaa/appartements/Appartement___vendre___Casablanca_59206034.htm');
});

test('maps Kaynly evidence to a canonical discovery candidate', () => {
  const row = candidateFromKaynlyRecord(record);
  assert.equal(row.provider, 'kaynly');
  assert.equal(row.source_domain, 'avito.ma');
  assert.equal(row.metadata.avito_id, '59206034');
  assert.deepEqual(row.metadata.transactions, ['vente']);
  assert.deepEqual(row.metadata.cities, ['Casablanca']);
  assert.equal(row.metadata.kaynly_pages.length, 2);
  assert.match(row.query_hash, /^[a-f0-9]{64}$/);
});

test('accepts the current Kaynly radar artifact schema', () => {
  const current = {
    source_id: '58589037',
    avito_url: 'https://www.avito.ma/fr/californie/appartements/Studio_meuble_58589037.htm',
    discovered_via: 'kaynly',
    control_pages: ['https://kaynly.com/location/casablanca', 'https://kaynly.com/location/casablanca/californie'],
    transaction: 'rent',
    city_slug: 'casablanca',
    first_observed_at: '2026-09-05T07:45:29.896Z',
  };
  const row = candidateFromKaynlyRecord(current);
  assert.equal(row.metadata.avito_id, '58589037');
  assert.deepEqual(row.metadata.transactions, ['rent']);
  assert.deepEqual(row.metadata.cities, ['casablanca']);
  assert.equal(row.metadata.kaynly_pages.length, 2);
  assert.equal(row.metadata.first_observed_at, current.first_observed_at);
});

test('deduplicates the Kaynly input by Avito ID', () => {
  const duplicate = { ...record, urls: ['https://avito.ma/fr/x/appartements/x_59206034.htm'] };
  const manifest = buildManifest({ records: [record, duplicate, { avitoId: 'bad', urls: [] }] });
  assert.equal(manifest.inputCount, 3);
  assert.equal(manifest.acceptedCount, 1);
  assert.equal(manifest.rejectedCount, 1);
  assert.equal(manifest.duplicateInputCount, 1);
});

test('diffs against DB rows by Avito ID, not provider/query hash', () => {
  const second = {
    avitoId: '59206035',
    urls: ['https://www.avito.ma/fr/rabat/appartements/X_59206035.htm'],
    discoveries: [{ source: 'saleCity', page: 'https://www.kaynly.com/vente/rabat', transaction: 'vente', city: 'Rabat' }],
  };
  const manifest = buildManifest({ records: [record, second] });
  const diff = diffAgainstExisting(manifest, [{ canonical_url: 'https://avito.ma/fr/anything/appartements/old_59206034.htm' }]);
  assert.equal(diff.existingCount, 1);
  assert.equal(diff.novelCount, 1);
  assert.equal(diff.novel[0].metadata.avito_id, '59206035');
});

test('dry-run preflight performs zero DB writes', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET' });
    return {
      ok: true,
      status: 200,
      json: async () => [],
      text: async () => '',
    };
  };
  const report = await runIngestion({
    payload: { records: [record] },
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'secret' },
    fetchImpl,
  });
  assert.equal(report.mode, 'dry-run');
  assert.equal(report.zeroDbWrites, true);
  assert.equal(report.novelCount, 1);
  assert.deepEqual(calls.map((c) => c.method), ['GET']);
});
