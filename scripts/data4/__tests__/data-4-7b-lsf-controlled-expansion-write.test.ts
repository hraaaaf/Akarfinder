import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const script = fs.readFileSync("scripts/audits/data-4-7b-lsf-controlled-expansion-write.ts", "utf8");

test("DATA-4.7B is bounded to one 250-row checkpoint", () => {
  for (const token of [
    'const BATCH_SIZE = 250',
    'const CHANNEL = "public_sitemap_presence"',
    'const RUN_ID = "data-4-7b-lsf-250-v1"',
    'DATA_4_7B_APPLY === "true"',
    'DATA_4_7B_CONFIRM_CURRENT_SITEMAP',
    'DATA_4_7B_CONFIRM_ROLLBACK_READY',
    'DATA_4_7B_CONFIRM_BOUNDED_WRITE',
    'BATCH_1_YES',
  ]) assert.ok(script.includes(token), `missing ${token}`);
});

test("DATA-4.7B prepares rollback before any apply path", () => {
  const rollbackManifest = script.indexOf('rollback-manifest.json');
  const dryRunBranch = script.indexOf('if (!APPLY)');
  const acknowledgementGate = script.lastIndexOf('requireApplyAcknowledgements();');
  const appliedArray = script.indexOf('const applied: PlanRow[] = []', acknowledgementGate);
  const applyPatch = script.indexOf('await patchSeed(row.canonicalUrl', appliedArray);
  assert.ok(rollbackManifest > 0);
  assert.ok(dryRunBranch > rollbackManifest);
  assert.ok(acknowledgementGate > dryRunBranch);
  assert.ok(appliedArray > acknowledgementGate);
  assert.ok(applyPatch > appliedArray);
  for (const token of [
    'compare-and-set state drift',
    'expectedStatus',
    'freshness_status',
    'await rollback(applied)',
    'rollbackWrites += 1',
  ]) assert.ok(script.includes(token), `missing rollback safety ${token}`);
});

test("DATA-4.7B preserves long-tail eligibility and conservative URL identity", () => {
  for (const token of [
    '["eligible_primary", "eligible_secondary"].includes',
    'function conservativeUrlIdentity',
    'decodeURIComponent(pathname).normalize("NFC")',
    'dbRows?.length === 1',
    'sourceRows?.length === 1',
    'publicSet.has(x.row.canonical_url)',
  ]) assert.ok(script.includes(token), `missing mass-tail gate ${token}`);
  assert.equal(script.includes('["A", "B"].includes'), false);
  assert.equal(script.includes('row.price_mad'), false);
});

test("DATA-4.7B source access is sitemap-only and detail-free", () => {
  for (const token of [
    'MAX_SOURCE_REQUESTS = 40',
    'https://${DOMAIN}/robots.txt',
    'sourceSiteDetailRequests: 0',
    'sitemap-only; no-detail-fetch',
  ]) assert.ok(script.includes(token), `missing source boundary ${token}`);
});

test("DATA-4.7B enforces one-shot run identity and current review date", () => {
  for (const token of [
    'next_review_at: string | null',
    'nextReview.getTime() > now.getTime()',
    'function metadataRunId',
    'metadataRunId(row.metadata) === RUN_ID',
    'one-shot run already applied',
  ]) assert.ok(script.includes(token), `missing one-shot guard ${token}`);
});
