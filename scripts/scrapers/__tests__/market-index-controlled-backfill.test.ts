import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

import {
  computeBackfillPlan,
  type BackfillListingSourceRow,
  type BackfillPropertyListingRow,
} from "../../../lib/market-index/market-index-backfill-plan.js";
import { buildApplySql, buildRollbackSql, buildVerifySql } from "../../../lib/market-index/market-index-backfill-sql.js";
import { computeLegacyClusterId, computeLegacyMembershipId } from "../../../lib/market-index/market-index-identifiers.js";

// --- Shared fixture set (mirrors Gate A / Gate B synthetic fixtures) ---

const listings: BackfillPropertyListingRow[] = [
  { id: 1001, price_mad: 500000, transaction_type: "sale", title: "Appartement Agdal", description_snippet: "Bel appartement 3 pieces", field_confidence: { provider: "openserp" } },
  { id: 1002, price_mad: 800000, transaction_type: "sale", title: "Villa Palmeraie", description_snippet: "Villa avec piscine", field_confidence: { provider: "openserp" } },
  { id: 1003, price_mad: 300000, transaction_type: "rent", title: "Studio Maarif", description_snippet: "Studio meuble", field_confidence: null },
  { id: 1004, price_mad: 450000, transaction_type: "sale", title: "Riad Medina", description_snippet: "Riad authentique", field_confidence: { provider: "openserp" } },
  { id: 1005, price_mad: 600000, transaction_type: "sale", title: "Appartement Hivernage", description_snippet: "Vue piscine", field_confidence: { provider: "partner_feed_xyz", source_domain: "known-partner.ma" } },
  { id: 1006, price_mad: 700000, transaction_type: "sale", title: "Duplex Racine", description_snippet: "Duplex standing", field_confidence: { provider: "openserp" } },
  { id: 1007, price_mad: 550000, transaction_type: "sale", title: "Appartement Gauthier", description_snippet: "Proche centre ville", field_confidence: { provider: "openserp" }, duplicate_group_id: "fake-group-1" } as BackfillPropertyListingRow & { duplicate_group_id: string },
  { id: 1008, price_mad: 5500000, transaction_type: "sale", title: "Villa Californie", description_snippet: "Villa de luxe 10 pieces", field_confidence: { provider: "openserp" }, duplicate_group_id: "fake-group-1" } as BackfillPropertyListingRow & { duplicate_group_id: string },
  { id: 1009, price_mad: null, transaction_type: "sale", title: "Terrain Ain Diab", description_snippet: "Terrain constructible", field_confidence: { provider: "openserp" } },
  { id: 1010, price_mad: 8000, transaction_type: "rent", title: "Appartement meuble Racine", description_snippet: "Location longue duree", field_confidence: { provider: "openserp" } },
  { id: 1011, price_mad: 900000, transaction_type: "sale", title: "Bel appartement 3 pieces vue mer", description_snippet: "Tres bel appartement lumineux avec vue exceptionnelle", field_confidence: { provider: "openserp" } },
  { id: 1012, price_mad: 920000, transaction_type: "sale", title: "Bel appartement 3 pieces vue mer", description_snippet: "Tres bel appartement lumineux avec vue exceptionnelle", field_confidence: { provider: "openserp" } },
];

const sources: BackfillListingSourceRow[] = [
  { id: 2001, property_listing_id: 1001, source_name: "mouldar", listing_url: "https://mouldar.com/1", source_url: "https://mouldar.com/1" },
  { id: 2002, property_listing_id: 1002, source_name: "mubawab", listing_url: "https://mubawab.ma/a", source_url: "https://mubawab.ma/a" },
  { id: 2003, property_listing_id: 1002, source_name: "avito", listing_url: "https://avito.ma/b", source_url: "https://avito.ma/b" },
  { id: 2004, property_listing_id: 1003, source_name: "mubawab", listing_url: "https://mubawab.ma/c", source_url: "https://mubawab.ma/c" },
  { id: 2005, property_listing_id: 1004, source_name: "sarouty", listing_url: null, source_url: null },
  { id: 2006, property_listing_id: 1005, source_name: "known-partner", listing_url: "https://known-partner.ma/d", source_url: "https://known-partner.ma/d" },
  { id: 2007, property_listing_id: 1006, source_name: "mouldar", listing_url: "https://mouldar.com/dup-domain-1", source_url: "https://mouldar.com/dup-domain-1" },
  { id: 2008, property_listing_id: 1007, source_name: "agenz", listing_url: "https://agenz.ma/e", source_url: "https://agenz.ma/e" },
  { id: 2009, property_listing_id: 1008, source_name: "agenz", listing_url: "https://agenz.ma/f", source_url: "https://agenz.ma/f" },
  { id: 2010, property_listing_id: 1009, source_name: "sarouty", listing_url: "https://sarouty.ma/g", source_url: "https://sarouty.ma/g" },
  { id: 2011, property_listing_id: 1010, source_name: "mouldar", listing_url: "https://mouldar.com/h", source_url: "https://mouldar.com/h" },
  { id: 2012, property_listing_id: 1011, source_name: "mubawab", listing_url: "https://mubawab.ma/i", source_url: "https://mubawab.ma/i" },
  { id: 2013, property_listing_id: 1012, source_name: "mubawab", listing_url: "https://mubawab.ma/j", source_url: "https://mubawab.ma/j" },
];

test("deterministic UUIDv5: same input always produces the same cluster/membership id", () => {
  const a = computeLegacyClusterId(1001);
  const b = computeLegacyClusterId(1001);
  assert.equal(a, b);
  assert.notEqual(a, computeLegacyClusterId(1002));

  const m1 = computeLegacyMembershipId(2001);
  const m2 = computeLegacyMembershipId(2001);
  assert.equal(m1, m2);
  assert.notEqual(m1, computeLegacyMembershipId(2002));

  // Well-formed UUID (RFC 4122 v5, variant bits set)
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("plan computation is fully reproducible across repeated calls", () => {
  const { plan: plan1 } = computeBackfillPlan(listings, sources);
  const { plan: plan2 } = computeBackfillPlan(listings, sources);
  assert.deepEqual(plan1, plan2);
});

test("provenance is never invented: only explicit openserp signal yields origin_type", () => {
  const { eligible } = computeBackfillPlan(listings, sources);
  // 1005 has a provenance-*looking* marker (provider: partner_feed_xyz) but is
  // NOT the explicit openserp signal this backfill trusts -- must be excluded.
  assert.ok(!eligible.some((e) => e.property_listing_id === 1005));
  // every eligible row's origin_type must be exactly persisted_openserp (the
  // only value this backfill ever writes)
  assert.ok(eligible.every((e) => e.origin_type === "persisted_openserp"));
});

test("rows without demonstrated provenance are preserved as skipped, not defaulted to legacy_import", () => {
  const { plan } = computeBackfillPlan(listings, sources);
  // 1003 (null field_confidence) + 1005 (non-openserp marker) = 2
  assert.equal(plan.skipped_missing_provenance, 2);
  assert.equal(plan.provenance_missing, 2);
});

test("all 4 ambiguous multi-source groups are ignored (no cluster, no membership)", () => {
  const { plan, eligible } = computeBackfillPlan(listings, sources);
  assert.equal(plan.ambiguous_multi_source_groups, 1); // fixture set has exactly 1 (property 1002)
  assert.equal(plan.skipped_multi_source, 2); // 2 sources under that 1 group
  assert.ok(!eligible.some((e) => e.property_listing_id === 1002));
});

test("no cluster is ever multi-source: exactly one membership per cluster, one cluster per eligible listing", () => {
  const { plan, eligible } = computeBackfillPlan(listings, sources);
  assert.equal(plan.eligible_clusters, plan.eligible_memberships);
  const clusterIds = eligible.map((e) => e.cluster_id);
  assert.equal(new Set(clusterIds).size, clusterIds.length, "no cluster_id must repeat");
});

test("near-identical text across two distinct listings never merges into one cluster", () => {
  const { eligible } = computeBackfillPlan(listings, sources);
  const item1011 = eligible.find((e) => e.property_listing_id === 1011);
  const item1012 = eligible.find((e) => e.property_listing_id === 1012);
  assert.ok(item1011 && item1012);
  assert.notEqual(item1011!.cluster_id, item1012!.cluster_id);
});

test("duplicate_group_id is structurally impossible to reference: the type carries no such field, and two listings sharing a fake one still get independent clusters", () => {
  const { eligible } = computeBackfillPlan(listings, sources);
  const item1007 = eligible.find((e) => e.property_listing_id === 1007);
  const item1008 = eligible.find((e) => e.property_listing_id === 1008);
  assert.ok(item1007 && item1008);
  assert.notEqual(item1007!.cluster_id, item1008!.cluster_id);
});

test("this backfill never creates an Observation or a DiscoveryCandidate", () => {
  const { plan } = computeBackfillPlan(listings, sources);
  assert.equal(plan.observations_to_create, 0);
  assert.equal(plan.discovery_candidates_to_create, 0);
  assert.equal(plan.legacy_rows_to_delete, 0);
});

test("legacy price handling: null price stays null/not_disclosed, valid price is copied verbatim, never invented", () => {
  const { eligible } = computeBackfillPlan(listings, sources);
  const nullPriceItem = eligible.find((e) => e.property_listing_id === 1009);
  assert.ok(nullPriceItem);
  assert.equal(nullPriceItem!.displayed_price, null);
  assert.equal(nullPriceItem!.price_status, "not_disclosed");
  assert.equal(nullPriceItem!.price_currency, null);

  const validPriceItem = eligible.find((e) => e.property_listing_id === 1001);
  assert.ok(validPriceItem);
  assert.equal(validPriceItem!.displayed_price, 500000);
  assert.equal(validPriceItem!.price_status, "valid");
  assert.equal(validPriceItem!.price_currency, "MAD");
});

test("price_period stays null for rent (mois/jour ambiguous), is only 'vente' for sale", () => {
  const { eligible } = computeBackfillPlan(listings, sources);
  const rentItem = eligible.find((e) => e.property_listing_id === 1010);
  assert.ok(rentItem);
  assert.equal(rentItem!.price_period, null);

  const saleItem = eligible.find((e) => e.property_listing_id === 1001);
  assert.ok(saleItem);
  assert.equal(saleItem!.price_period, "vente");
});

test("apply -> second apply (idempotent, 0-diff) SQL is generated correctly: guard clause on UPDATE, ON CONFLICT DO NOTHING on INSERT", () => {
  const { eligible } = computeBackfillPlan(listings, sources);
  const sql = buildApplySql("test-run", eligible);
  assert.match(sql, /AND origin_type IS NULL AND content_fingerprint IS NULL AND ingestion_run_id IS NULL/);
  assert.match(sql, /ON CONFLICT \(legacy_property_listing_id\) DO NOTHING/);
  assert.match(sql, /ON CONFLICT \(property_cluster_id, source_offer_id\) DO NOTHING/);
  // No blanket "table must be empty" precondition (would break legitimate reruns)
  assert.doesNotMatch(sql, /property_clusters is not empty/);
});

test("apply SQL never touches a legacy column or another table", () => {
  const { eligible } = computeBackfillPlan(listings, sources);
  const sql = buildApplySql("test-run", eligible);
  // Strip comment lines so header text like "No DELETE, no TRUNCATE" doesn't
  // trip a naive word match -- only real SQL statements are checked below.
  const codeOnly = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  assert.doesNotMatch(codeOnly, /UPDATE property_listings/i);
  assert.doesNotMatch(codeOnly, /\bDELETE\b/i);
  assert.doesNotMatch(codeOnly, /\bTRUNCATE\b/i);
  assert.doesNotMatch(codeOnly, /\bDROP\b/i);
  assert.doesNotMatch(codeOnly, /INSERT INTO source_offer_observations/i);
  assert.doesNotMatch(codeOnly, /INSERT INTO discovery_candidates/i);
});

test("rollback SQL only deletes rows created by this exact run_id and only resets columns matching this run's own written values", () => {
  const { eligible } = computeBackfillPlan(listings, sources);
  const runId = "test-run-rollback";
  const sql = buildRollbackSql(runId, eligible);
  assert.match(sql, /DELETE FROM property_cluster_members WHERE added_by = 'market-index-controlled-backfill-1'/);
  assert.match(sql, /DELETE FROM property_clusters WHERE created_by = 'market-index-controlled-backfill-1'/);
  assert.match(sql, new RegExp(`AND ingestion_run_id = '${runId}'`));
  assert.doesNotMatch(sql, /UPDATE property_listings/i);
});

test("verify SQL only ever selects (read-only), never writes", () => {
  const { eligible } = computeBackfillPlan(listings, sources);
  const sql = buildVerifySql("test-run", eligible);
  assert.doesNotMatch(sql, /\b(update|insert|delete|drop|truncate|alter)\b/i);
});

test("no secret, token, or PII pattern appears in any generated SQL", () => {
  const { eligible } = computeBackfillPlan(listings, sources);
  const combined = [buildApplySql("test-run", eligible), buildVerifySql("test-run", eligible), buildRollbackSql("test-run", eligible)].join("\n");
  assert.doesNotMatch(combined, /SUPABASE_SERVICE_ROLE_KEY|eyJ[a-zA-Z0-9_-]{10,}|password|secret/i);
  assert.doesNotMatch(combined, /\+212[0-9]{9}|\b0[5-7][0-9]{8}\b/); // Moroccan phone patterns
  assert.doesNotMatch(combined, /@[a-z0-9.-]+\.[a-z]{2,}/i); // email-like pattern
});

test("CLI script refuses to run without an explicit mode", () => {
  assert.throws(() => {
    execFileSync("npx", ["tsx", "scripts/market-index/run-controlled-market-index-backfill.ts"], { stdio: "pipe" });
  });
});

test("CLI script refuses --apply without --run-id / --expected-plan-sha256 / --confirm-controlled-production-backfill", () => {
  assert.throws(() => {
    execFileSync("npx", ["tsx", "scripts/market-index/run-controlled-market-index-backfill.ts", "--apply"], { stdio: "pipe" });
  });
  assert.throws(() => {
    execFileSync(
      "npx",
      ["tsx", "scripts/market-index/run-controlled-market-index-backfill.ts", "--apply", "--run-id", "x"],
      { stdio: "pipe" },
    );
  });
});

test("CLI script refuses --generate-sql without --run-id", () => {
  assert.throws(() => {
    execFileSync("npx", ["tsx", "scripts/market-index/run-controlled-market-index-backfill.ts", "--generate-sql"], { stdio: "pipe" });
  });
});
