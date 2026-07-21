// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#8/10) -- Direct Feeds Ingestion
// Capability. End-to-end tests against the REAL fixture files (agency CSV,
// promoter JSON, agency-update XML) covering every required scenario:
// agency, promoter, update, duplicate, missing price, malformed,
// delete/unpublish signal. No DB access, no network -- pure parse/validate/
// stage pipeline only.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsvFeed, parseJsonFeed, parseXmlFeed } from "../../../lib/feeds/parsers.js";
import { validateFeedRow, isValidationError } from "../../../lib/feeds/schema.js";
import { stageFeed, computeFeedIdentityKey } from "../../../lib/feeds/staging.js";

const FIXTURES_DIR = join(process.cwd(), "data/imports/fixtures");

// ---------------------------------------------------------------------
// CSV: agency feed
// ---------------------------------------------------------------------

test("parseCsvFeed reads the real agency-feed.csv fixture into 3 raw rows", () => {
  const content = readFileSync(join(FIXTURES_DIR, "agency-feed.csv"), "utf8");
  const rows = parseCsvFeed(content);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].external_id, "AG-1001");
  assert.equal(rows[0].title, "Appartement 3 chambres Agdal Rabat");
});

test("agency CSV: missing price_mad (villa AG-1002) is VALID -- nullable price, never coerced to 0 (doctrine invariant #11)", () => {
  const content = readFileSync(join(FIXTURES_DIR, "agency-feed.csv"), "utf8");
  const rows = parseCsvFeed(content);
  const villa = rows.find((r) => r.external_id === "AG-1002")!;
  const validated = validateFeedRow(villa, 1);
  assert.equal(isValidationError(validated), false);
  if (!isValidationError(validated)) {
    assert.equal(validated.price_mad, null, "must be null, not 0 and not rejected");
  }
});

test("agency CSV: coordinates and image_urls parse correctly for AG-1001", () => {
  const content = readFileSync(join(FIXTURES_DIR, "agency-feed.csv"), "utf8");
  const rows = parseCsvFeed(content);
  const first = rows.find((r) => r.external_id === "AG-1001")!;
  assert.deepEqual(first.coordinates, { lat: 34.0021, lng: -6.8497 });
  assert.deepEqual(first.image_urls, ["https://cdn.example.ma/1001-a.jpg", "https://cdn.example.ma/1001-b.jpg"]);
});

// ---------------------------------------------------------------------
// JSON: promoter feed (duplicate, malformed, delete signal)
// ---------------------------------------------------------------------

test("parseJsonFeed reads the real promoter-feed.json fixture into 4 raw rows", () => {
  const content = readFileSync(join(FIXTURES_DIR, "promoter-feed.json"), "utf8");
  const rows = parseJsonFeed(content);
  assert.equal(rows.length, 4);
});

test("promoter JSON: a within-feed duplicate (same external_id twice) is staged as duplicate_skipped, not double-created", () => {
  const content = readFileSync(join(FIXTURES_DIR, "promoter-feed.json"), "utf8");
  const rows = parseJsonFeed(content);
  const result = stageFeed(rows);
  const a12Rows = result.staged.filter((s) => s.row.external_id === "PROMO-77-A12");
  assert.equal(a12Rows.length, 2);
  assert.equal(a12Rows.filter((s) => s.action === "create").length, 1);
  assert.equal(a12Rows.filter((s) => s.action === "duplicate_skipped").length, 1);
});

test("promoter JSON: malformed row (title 'Ré', 2 chars) is rejected with a clear reason, never silently dropped", () => {
  const content = readFileSync(join(FIXTURES_DIR, "promoter-feed.json"), "utf8");
  const rows = parseJsonFeed(content);
  const result = stageFeed(rows);
  const rejection = result.rejected_rows.find((r) => r.external_id === "PROMO-77-A13");
  assert.ok(rejection, "PROMO-77-A13 must appear in rejected_rows");
  assert.match(rejection!.reason, /title/i);
});

test("promoter JSON: update_signal='delete' (PROMO-77-A14) is staged with action='delete', not create/update", () => {
  const content = readFileSync(join(FIXTURES_DIR, "promoter-feed.json"), "utf8");
  const rows = parseJsonFeed(content);
  const result = stageFeed(rows);
  const deleted = result.staged.find((s) => s.row.external_id === "PROMO-77-A14");
  assert.ok(deleted);
  assert.equal(deleted!.action, "delete");
});

test("promoter JSON: images_rights_confirmed=true keeps the provided image URLs; images_rights_confirmed=false always yields an empty array", () => {
  const content = readFileSync(join(FIXTURES_DIR, "promoter-feed.json"), "utf8");
  const rows = parseJsonFeed(content);
  const withRights = validateFeedRow(rows[0], 0); // images_rights_confirmed: true, has a URL
  assert.ok(!isValidationError(withRights));
  if (!isValidationError(withRights)) assert.deepEqual(withRights.image_urls, ["https://cdn.example.ma/anfa-a12-1.jpg"]);

  const withoutRights = validateFeedRow({ ...rows[0], images_rights_confirmed: false }, 1);
  assert.ok(!isValidationError(withoutRights));
  if (!isValidationError(withoutRights)) assert.deepEqual(withoutRights.image_urls, []);
});

// ---------------------------------------------------------------------
// XML: agency update feed (update, unpublish, create, malformed)
// ---------------------------------------------------------------------

test("parseXmlFeed reads the real agency-feed-update.xml fixture into 4 raw rows", () => {
  const content = readFileSync(join(FIXTURES_DIR, "agency-feed-update.xml"), "utf8");
  const rows = parseXmlFeed(content);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].external_id, "AG-1001");
});

test("XML update: AG-1001 with a KNOWN prior identity key is staged as action='update', not 'create'", () => {
  const content = readFileSync(join(FIXTURES_DIR, "agency-feed-update.xml"), "utf8");
  const rows = parseXmlFeed(content);
  const ag1001 = rows.find((r) => r.external_id === "AG-1001")!;
  const validated = validateFeedRow(ag1001, 0);
  assert.ok(!isValidationError(validated));
  const identityKey = computeFeedIdentityKey(validated as Exclude<typeof validated, { reason: string }>);
  const result = stageFeed(rows, new Set([identityKey!]));
  const staged = result.staged.find((s) => s.row.external_id === "AG-1001");
  assert.equal(staged!.action, "update");
});

test("XML update: AG-1004 with NO known prior identity key is staged as action='create'", () => {
  const content = readFileSync(join(FIXTURES_DIR, "agency-feed-update.xml"), "utf8");
  const rows = parseXmlFeed(content);
  const result = stageFeed(rows, new Set());
  const staged = result.staged.find((s) => s.row.external_id === "AG-1004");
  assert.equal(staged!.action, "create");
});

test("XML update: AG-1002 with update_signal='unpublish' is staged as action='unpublish'", () => {
  const content = readFileSync(join(FIXTURES_DIR, "agency-feed-update.xml"), "utf8");
  const rows = parseXmlFeed(content);
  const result = stageFeed(rows);
  const staged = result.staged.find((s) => s.row.external_id === "AG-1002");
  assert.equal(staged!.action, "unpublish");
});

// Regression: the real AG-1002 fixture (a villa unpublish signal) has no
// <surface_m2> tag at all -- villas normally REQUIRE surface_m2. The first
// version of validateFeedRow ran full descriptive validation even for
// delete/unpublish signals and rejected this legitimate unpublish request.
// A partner sending "stop showing this" will often not resend the full
// property payload for something they're taking down.
test("a delete/unpublish signal is accepted even when normally-required descriptive fields (surface_m2 for a villa) are absent", () => {
  const content = readFileSync(join(FIXTURES_DIR, "agency-feed-update.xml"), "utf8");
  const rows = parseXmlFeed(content);
  const ag1002 = rows.find((r) => r.external_id === "AG-1002")!;
  assert.equal(ag1002.surface_m2, null, "sanity: the fixture genuinely omits surface_m2");
  const validated = validateFeedRow(ag1002, 0);
  assert.equal(isValidationError(validated), false);
});

test("a normal (non-signal) villa row WITHOUT surface_m2 is still rejected -- the relaxation is delete/unpublish-only", () => {
  const content = readFileSync(join(FIXTURES_DIR, "agency-feed-update.xml"), "utf8");
  const rows = parseXmlFeed(content);
  const ag1002 = rows.find((r) => r.external_id === "AG-1002")!;
  const withoutSignal = { ...ag1002, update_signal: null };
  const validated = validateFeedRow(withoutSignal, 0);
  assert.ok(isValidationError(validated));
  assert.match((validated as { reason: string }).reason, /surface_m2/);
});

test("XML: malformed row (property_type='chateau', not in VALID_PROPERTY_TYPES) is rejected", () => {
  const content = readFileSync(join(FIXTURES_DIR, "agency-feed-update.xml"), "utf8");
  const rows = parseXmlFeed(content);
  const result = stageFeed(rows);
  const rejection = result.rejected_rows.find((r) => r.external_id === "AG-1005");
  assert.ok(rejection);
  assert.match(rejection!.reason, /property_type/i);
});

// ---------------------------------------------------------------------
// Identity key discipline: never title alone
// ---------------------------------------------------------------------

test("computeFeedIdentityKey never uses title -- two rows with identical titles but different external_id get different keys", () => {
  const content = readFileSync(join(FIXTURES_DIR, "agency-feed.csv"), "utf8");
  const rows = parseCsvFeed(content);
  const a = validateFeedRow({ ...rows[0], external_id: "X-1", title: "Meme titre" }, 0);
  const b = validateFeedRow({ ...rows[0], external_id: "X-2", title: "Meme titre" }, 1);
  assert.ok(!isValidationError(a) && !isValidationError(b));
  if (!isValidationError(a) && !isValidationError(b)) {
    assert.notEqual(computeFeedIdentityKey(a), computeFeedIdentityKey(b));
  }
});

test("a row with NEITHER external_id NOR source_url is rejected (never falls back to title alone)", () => {
  const content = readFileSync(join(FIXTURES_DIR, "agency-feed.csv"), "utf8");
  const rows = parseCsvFeed(content);
  const noIdentity = { ...rows[0], external_id: null, source_url: null };
  const validated = validateFeedRow(noIdentity, 0);
  assert.ok(isValidationError(validated));
  assert.match((validated as { reason: string }).reason, /identite/i);
});

// ---------------------------------------------------------------------
// PII guard reuse
// ---------------------------------------------------------------------

test("a title containing a phone number is rejected", () => {
  const content = readFileSync(join(FIXTURES_DIR, "agency-feed.csv"), "utf8");
  const rows = parseCsvFeed(content);
  const withPhone = { ...rows[0], title: "Appartement a vendre, appelez 0612345678" };
  const validated = validateFeedRow(withPhone, 0);
  assert.ok(isValidationError(validated));
  assert.match((validated as { reason: string }).reason, /PII/);
});

// ---------------------------------------------------------------------
// Full-pipeline summary sanity check
// ---------------------------------------------------------------------

test("full agency CSV feed stages 3/3 rows with 0 rejections and 0 duplicates", () => {
  const content = readFileSync(join(FIXTURES_DIR, "agency-feed.csv"), "utf8");
  const rows = parseCsvFeed(content);
  const result = stageFeed(rows);
  assert.equal(result.total_input_rows, 3);
  assert.equal(result.staged_rows, 3);
  assert.equal(result.rejected_rows.length, 0);
  assert.equal(result.duplicate_count, 0);
  assert.equal(result.action_counts.create, 3);
});
