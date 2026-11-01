import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseCsvFeed, parseJsonFeed} from '../../../lib/feeds/parsers.js';
import {auditRows} from './audit.js';

test('old sample sources do not become fresh ready-to-publish inventory', () => {
  const rows = parseCsvFeed(readFileSync('data/imports/fixtures/agency-feed.csv','utf8'));
  const result=auditRows(rows,new Date('2026-11-01T15:00:00Z'));
  assert.equal(result.total_input_rows,3);
  assert.equal(result.source_timestamp_recent_candidates,0);
  assert.equal(result.ready_for_use,0);
  assert.equal(result.publication_eligible,false);
});

test('recent partner-supplied timestamp is not an active/rights proof', () => {
  const rows = parseJsonFeed(readFileSync('data/imports/fixtures/promoter-feed.json','utf8'));
  const example = {...rows[0],external_id:'shadow-test-123',updated_at_source:'2026-11-01T13:00:00Z'};
  const result=auditRows([example],new Date('2026-11-01T15:00:00Z'));
  assert.equal(result.staged_rows,1);
  assert.equal(result.source_timestamp_recent_candidates,1);
  assert.equal(result.active_status_verified,0);
  assert.equal(result.source_rights_verified,0);
  assert.equal(result.ready_for_use,0);
});

test('missing reliable identity is rejected even if all other fields present', () => {
  const rows = parseCsvFeed(readFileSync('data/imports/fixtures/agency-feed.csv','utf8'));
  const result=auditRows([{...rows[0],external_id:null,source_url:null}]);
  assert.equal(result.rejected_rows,1);
  assert.equal(result.ready_for_use,0);
});

test('duplicate identities within feed are not counted twice', () => {
  const rows=parseCsvFeed(readFileSync('data/imports/fixtures/agency-feed.csv','utf8'));
  const result=auditRows([rows[0],rows[0]]);
  assert.equal(result.duplicate_rows,1);
  assert.equal(result.ready_for_use,0);
});

test('future-dated source update is not recent proof', () => {
  const rows=parseCsvFeed(readFileSync('data/imports/fixtures/agency-feed.csv','utf8'));
  const result=auditRows([{...rows[0],updated_at_source:'2027-01-01T00:00:00Z'}],
    new Date('2026-11-01T15:00:00Z'));
  assert.equal(result.source_timestamp_recent_candidates,0);
  assert.equal(result.ready_for_use,0);
});
