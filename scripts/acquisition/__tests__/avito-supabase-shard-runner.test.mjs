import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractAvitoListingsFromHtml,
  isAvitoShardUrl,
  loadAvitoRowsFromSupabase,
  runAvitoShardManifest,
  selectAvitoShardManifest,
} from '../avito-supabase-shard-runner.mjs';

test('shard selector keeps public Avito immobilier discovery pages only', () => {
  assert.equal(isAvitoShardUrl('https://avito.ma/fr/tanger/californie/immobilier'), true);
  assert.equal(isAvitoShardUrl('https://avito.ma/sp/immobilier/villa-charaf-agadir'), true);
  assert.equal(isAvitoShardUrl('https://avito.ma/fr/casa/appartements/A_58482580.htm'), false);
  assert.equal(isAvitoShardUrl('https://example.com/fr/casa/immobilier'), false);
  const selected = selectAvitoShardManifest([
    { canonical_url: 'https://avito.ma/fr/tanger/californie/immobilier' },
    { canonical_url: 'https://avito.ma/fr/tanger/californie/immobilier' },
    { canonical_url: 'https://avito.ma/sp/immobilier/villa-charaf-agadir' },
  ]);
  assert.equal(selected.length, 2);
});

test('HTML extractor returns only real-estate listings and deduplicates IDs', () => {
  const html = `<a href="/fr/casa/appartements/A_58482580.htm">A</a><a href="https://avito.ma/fr/rabat/terrains_et_fermes/T_58482581.htm">T</a><a href="/fr/casa/voitures_d_occasion/C_58482582.htm">C</a><a href="/fr/casa/appartements/Duplicate_58482580.htm">D</a>`;
  const listings = extractAvitoListingsFromHtml(html);
  assert.equal(listings.length, 2);
});

test('Supabase loader paginates source-domain rows without writes', async () => {
  let calls = 0;
  const fetchImpl = async (url, options) => {
    calls += 1;
    assert.match(String(url), /source_domain=eq\.avito\.ma/);
    assert.equal(options.headers.range, calls === 1 ? '0-1' : '2-3');
    return { ok: true, status: 200, json: async () => calls === 1 ? [
      { canonical_url: 'https://avito.ma/fr/tanger/californie/immobilier' },
      { canonical_url: 'https://avito.ma/sp/immobilier/villa-charaf-agadir' },
    ] : [{ canonical_url: 'https://avito.ma/fr/rabat/immobilier' }] };
  };
  const report = await loadAvitoRowsFromSupabase({ supabaseUrl: 'https://x.supabase.co', serviceRoleKey: 'secret', fetchImpl, pageSize: 2 });
  assert.equal(report.zeroDbWrites, true);
  assert.equal(report.sourceRowCount, 3);
  assert.equal(report.shardUrls.length, 3);
});

test('bounded shard replay remains zero-write and stops on 429', async () => {
  let dbCalls = 0;
  let htmlCalls = 0;
  const fetchImpl = async (url) => {
    const value = String(url);
    if (value.includes('/rest/v1/discovery_candidates')) {
      dbCalls += 1;
      return { ok: true, status: 200, json: async () => dbCalls === 1 ? [
        { canonical_url: 'https://avito.ma/fr/a/immobilier' },
        { canonical_url: 'https://avito.ma/fr/b/immobilier' },
      ] : [] };
    }
    htmlCalls += 1;
    return {
      status: htmlCalls === 2 ? 429 : 200,
      url: value,
      text: async () => '<a href="/fr/casa/appartements/A_58482580.htm">A</a>',
    };
  };
  const report = await runAvitoShardManifest({ supabaseUrl: 'https://x.supabase.co', serviceRoleKey: 'secret', fetchImpl, manifestLimit: 2 });
  assert.equal(report.zeroDbWrites, true);
  assert.equal(report.uniqueRealEstateListingCount, 1);
  assert.equal(report.stoppedEarly, 'http_429');
  assert.equal(report.requestCount, 2);
});
