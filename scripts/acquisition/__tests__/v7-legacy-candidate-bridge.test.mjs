import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptLegacyReport, adaptLegacyReports, CANDIDATE_SCHEMA, REUSED_ENUMERATORS,
  MAX_URLS_PER_REPORT,
} from '../v7_multisource/legacy_candidate_bridge.mjs';

const samples = Object.freeze({
  'agenz.ma': 'https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/246810',
  'avito.ma': 'https://www.avito.ma/fr/casablanca/appartements/test_12345678.htm',
  'sarouty.ma': 'https://www.sarouty.ma/fr/plp/acheter/appartement-avec-balcon-123456.html',
  'mubawab.ma': 'https://www.mubawab.ma/fr/a/9961000/flat',
  'marocannonces.com': 'https://www.marocannonces.com/annonce/987654/appartement.html',
});
const good = (urls) => ({ zeroDbWrites: true, stoppedEarly: null, listingUrls: urls });

test('reuses five existing merged L8 URL validators, not a new scraper', () => {
  assert.equal(Object.keys(REUSED_ENUMERATORS).length, 5);
  for (const [source, url] of Object.entries(samples)) {
    const result = adaptLegacyReport(source, good([url]));
    assert.equal(result.url_only_count, 1, source);
    assert.equal(result.candidates[0].source_domain, source);
    assert.match(result.candidates[0].source_offer_id, /^\d+$/);
    assert.equal(result.candidates[0].schema_version, CANDIDATE_SCHEMA);
    assert.equal(result.candidates[0].record_kind, 'url_candidate_only');
    assert.equal(result.candidates[0].detail_observed, false);
    assert.equal(result.candidates[0].editorial_published_at, null);
    assert.equal(result.candidates[0].eligible_for_private_detail_staging, false);
    assert.equal(result.candidates[0].eligible_for_public_admission, false);
    assert.equal(result.db_writes_by_bridge, 0);
    assert.equal(result.network_requests_by_bridge, 0);
  }
});

test('legacy output stays URL-only; not five classified or fresh properties', () => {
  const reports = Object.fromEntries(Object.entries(samples)
    .map(([source, url]) => [source, good([url])]));
  const summary = adaptLegacyReports(reports);
  assert.equal(summary.candidate_urls, 5);
  assert.equal(summary.records.length, 5);
  assert.equal(summary.detailed_records, 0);
  assert.equal(summary.physical_unique_properties, null);
  assert.equal(summary.eligible_for_private_detail_staging, 0);
  assert.equal(summary.db_writes, 0);
  assert.equal(summary.source_fetches_by_bridge, 0);
});

test('recognizes newer Agenz regional listing identity via existing collector', () => {
  const url = 'https://agenz.ma/fr/annonces-achat/appartement/rabat-sale-kenitra/sale/tabriquet/appartement-a-vendre-259645';
  const result = adaptLegacyReport('agenz.ma', good([url]));
  assert.equal(result.url_only_count, 1);
  assert.equal(result.candidates[0].source_offer_id, '259645');
  assert.equal(result.candidates[0].eligible_for_private_detail_staging, false);
});

test('blocks FeenWay mirrors and unmerged Yakeey collector', () => {
  assert.throws(() => adaptLegacyReport('feenway.com', good([
    'https://www.feenway.com/immobilier/foo',
  ])), /SOURCE_NOT_WIRED/);
  assert.throws(() => adaptLegacyReport('yakeey.com', good([
    'https://yakeey.com/some-listing',
  ])), /SOURCE_NOT_WIRED/);
});

test('fails closed after legacy HTTP hard-block and unsafe reports', () => {
  for (const source of Object.keys(samples)) {
    const candidate = good([samples[source]]);
    for (const stoppedEarly of ['http_429', 'hard_block', 'robots_http_403', 'timeout']) {
      assert.throws(() => adaptLegacyReport(source, { ...candidate, stoppedEarly }),
        /UNSAFE_OR_INCOMPLETE_REPORT/);
    }
    assert.throws(() => adaptLegacyReport(source, { ...candidate, zeroDbWrites: false }),
      /UNSAFE_OR_INCOMPLETE_REPORT/);
    assert.throws(() => adaptLegacyReport(source, { ...candidate, listingUrls: null }),
      /UNSAFE_OR_INCOMPLETE_REPORT/);
  }
  assert.throws(() => adaptLegacyReport('agenz.ma',
    good(Array(MAX_URLS_PER_REPORT + 1).fill(samples['agenz.ma']))),
  /UNSAFE_OR_INCOMPLETE_REPORT/);
});

test('rejects unsafe authority, query, encoded path, list pages and wrong category', () => {
  const invalid = {
    'agenz.ma': [
      'https://evil-agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/246810',
      'https://agenz.ma:444/fr/annonces/immo-rabat/vente-appartements/agdal/246810',
      'https://agenz.ma:/fr/annonces/immo-rabat/vente-appartements/agdal/246810',
      'https://agenz.ma/fr/acheter/immo-rabat',
      'https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/%32246810',
      'https://agenz.ma/fr/annonces/immo-rabat/vente-appartements/agdal/246810?utm=x',
    ],
    'avito.ma': ['https://www.avito.ma/fr/casablanca/voitures/test_12345678.htm'],
    'sarouty.ma': [
      'https://www.sarouty.ma/property-details',
      'https://www.sarouty.ma/property-details?listing_id=123456&next=https://evil.example',
    ],
    'mubawab.ma': ['https://www.mubawab.ma/fr/cc/immobilier-a-vendre'],
    'marocannonces.com': ['https://www.marocannonces.com/categorie/315/Vente.html'],
  };
  for (const [source, urls] of Object.entries(invalid)) {
    for (const url of urls) {
      assert.throws(() => adaptLegacyReport(source, good([url])),
        undefined, source + ' ' + url);
    }
  }
});

test('duplicate same source offer ID with contradictory URL fails closed', () => {
  const first = samples['agenz.ma'];
  const changed = first.replace('/agdal/', '/autre/');
  assert.throws(() => adaptLegacyReport('agenz.ma', good([first, changed])),
    /SOURCE_ID_URL_COLLISION/);
  const same = adaptLegacyReport('agenz.ma', good([first, first]));
  assert.equal(same.url_only_count, 1);
});

test('bounded Sarouty query identity remains allowed, arbitrary query is refused', () => {
  const report = adaptLegacyReport('sarouty.ma',
    good(['https://www.sarouty.ma/property-details?listing_id=123456']));
  assert.equal(report.candidates[0].source_offer_id, '123456');
  assert.throws(() => adaptLegacyReport('sarouty.ma',
    good(['https://www.sarouty.ma/property-details?listing_id=123456&utm=x'])),
    /QUERY_NOT_ALLOWED/);
});
