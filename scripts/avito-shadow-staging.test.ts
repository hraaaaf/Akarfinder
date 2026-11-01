import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildAvitoShadowStage } from "./avito-shadow-staging.js";

const qualification = JSON.parse(readFileSync("docs/handovers/avito-qualification-results.json", "utf8"));

test("handles all 20 existing qualification rows and retains source identity", () => {
  const result = buildAvitoShadowStage(qualification);
  assert.equal(result.rows.length, 20);
  assert.equal(result.rows.filter((r) => r.staging.status === "staged_offline" || r.staging.status === "rejected").length, 20);
  for (const row of result.rows) {
    const source = qualification.results.find((r: { id: string }) => r.id === row.source.external_id);
    assert.ok(source);
    assert.equal(row.source.source_url, source.url);
    assert.equal(row.source.external_id, source.id);
  }
});

test("strict completeness is exactly 11 and IDs are retained", () => {
  const result = buildAvitoShadowStage(qualification);
  assert.equal(result.report.strict_four_fields_count, 11);
  assert.deepEqual(result.report.strict_four_fields_ids, [
    "54879803", "58509254", "58626767", "58683280", "58684263", "58685536",
    "58705742", "58707942", "58714484", "58716556", "58780919",
  ]);
});

test("missing values remain null and do not get inferred from URL or title", () => {
  const result = buildAvitoShadowStage(qualification);
  for (const id of ["58600152", "58791823"]) {
    const row = result.rows.find((x) => x.source.external_id === id)!;
    assert.equal(row.facts.price_mad, null);
    assert.equal(row.facts.surface_m2, null);
    assert.equal(row.facts.district, null);
  }
  const rejectedWithKnownPrice = result.rows.find((x) => x.source.external_id === "58599879")!;
  assert.equal(rejectedWithKnownPrice.staging.status, "rejected");
  assert.equal(rejectedWithKnownPrice.facts.price_mad, 6500);
  assert.equal(rejectedWithKnownPrice.facts.surface_m2, null);
  assert.equal(result.rows.find((x) => x.source.external_id === "58600152")!.facts.reported_published_or_updated, null);
});

test("suspected physical duplicate is signaled without merging", () => {
  const result = buildAvitoShadowStage(qualification);
  assert.deepEqual(result.report.suspected_physical_duplicate_groups, [["58685536", "58707942"]]);
  const pair = result.rows.filter((x) => ["58685536", "58707942"].includes(x.source.external_id));
  assert.equal(pair.length, 2);
  assert.ok(pair.every((x) => x.duplicate_review.auto_merged === false));
  assert.notDeepEqual(pair[0].facts.photo_count_observed, null);
  assert.ok(pair.every((x) => x.facts.property_type === "villa" && x.facts.transaction_type === "sale"));
});

test("photos and descriptions are counted separately without retaining photo URLs", () => {
  const result = buildAvitoShadowStage(qualification);
  assert.equal(result.report.descriptions_present, 20);
  assert.equal(result.report.photos_present, 17);
  for (const row of result.rows) {
    assert.equal(row.guardrails.images_rights_confirmed, false);
    if (row.staging.status === "staged_offline") assert.deepEqual(row.staging.validated_image_urls, []);
    assert.equal(row.facts.photo_urls_retained, false);
  }
  assert.equal(JSON.stringify(result).includes("content.avito.ma/classifieds/images/"), false);
});

test("freshness is unknown where no source date exists", () => {
  const result = buildAvitoShadowStage(qualification);
  assert.equal(result.report.freshness_verified_count, 0);
  assert.equal(result.report.freshness_unknown_count, 20);
  assert.ok(result.rows.every((r) => r.qualification.freshness_status === "unknown"));
});

test("physical fingerprints are idempotent, not a merge operation", () => {
  const first = buildAvitoShadowStage(qualification);
  const second = buildAvitoShadowStage(qualification);
  assert.deepEqual(first, second);
  assert.equal(first.source_payload_sha256, null);
  assert.equal(first.report.physical_duplicates_merged, 0);
});

test("every record remains unauthorized, unconfirmed, image-unlicensed, and non-publishable", () => {
  const result = buildAvitoShadowStage(qualification);
  assert.equal(result.report.publishable_count, 0);
  assert.equal(result.report.commercial_reuse_confirmed_count, 0);
  assert.equal(result.report.images_rights_confirmed_count, 0);
  for (const row of result.rows) {
    assert.equal(row.guardrails.commercial_reuse, "not_verified");
    assert.equal(row.guardrails.availability_status, "unconfirmed");
    assert.equal(row.guardrails.publishable, false);
    assert.equal(row.guardrails.images_rights_confirmed, false);
    assert.equal(row.staging.authorization_status, null);
  }
  assert.equal(JSON.stringify(result).includes("partner_authorized"), false);
  assert.equal(result.report.network_requests, 0);
  assert.equal(result.report.photo_downloads, 0);
  assert.equal(result.report.database_writes, 0);
  assert.equal(result.report.partner_v2_bridge_calls, 0);
});
