import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ownerListingsSearchEnabled } from "../../../lib/seller/owner-listing-projection";

const migration = readFileSync("supabase/migrations/20260805203000_owner_listing_integration_v1.sql", "utf8");
const triggers = readFileSync("supabase/migrations/20260805203100_owner_listing_integration_triggers_v1.sql", "utf8");
const publicationRoute = readFileSync("app/api/seller-drafts/[draftId]/publication/route.ts", "utf8");
const ownerSearch = readFileSync("lib/search-gateway/public-search-with-owner.ts", "utf8");
const apiSearch = readFileSync("app/api/search/route.ts", "utf8");
const searchPage = readFileSync("app/search/page.tsx", "utf8");
const detailPage = readFileSync("app/listings/[id]/page.tsx", "utf8");

test("owner search is fail closed unless explicitly enabled", () => {
  assert.equal(ownerListingsSearchEnabled({}), false);
  assert.equal(ownerListingsSearchEnabled({ OWNER_LISTINGS_PUBLIC_SEARCH_ENABLED: "false" }), false);
  assert.equal(ownerListingsSearchEnabled({ OWNER_LISTINGS_PUBLIC_SEARCH_ENABLED: "true" }), true);
});

test("projection is idempotent and keeps explicit owner provenance", () => {
  assert.match(migration, /draft_id uuid not null unique/);
  assert.match(migration, /publication_id uuid not null unique/);
  assert.match(migration, /on conflict \(draft_id\) do update/);
  assert.match(migration, /owner_declared/);
  assert.match(migration, /Annonce publiée par son propriétaire/);
});

test("eligibility remains fail closed across review, quality and lifecycle", () => {
  assert.match(migration, /review_status <> 'approved'/);
  assert.match(migration, /required_information_missing/);
  assert.match(migration, /photo_required/);
  assert.match(migration, /owner_paused/);
  assert.match(migration, /owner_withdrawn/);
  assert.match(migration, /lifecycle_status = 'live'/);
  assert.match(migration, /display_eligibility in \('eligible_primary','eligible_secondary'\)/);
});

test("dedupe, quality and property graph keys are deterministic", () => {
  assert.match(migration, /dedupe_fingerprint text not null/);
  assert.match(migration, /canonical_cluster_key text not null/);
  assert.match(migration, /digest\(lower\(concat_ws/);
  assert.match(migration, /quality_score integer not null/);
  assert.match(migration, /Q3_intelligence_ready/);
  assert.match(migration, /price_per_m2_mad/);
});

test("publication and draft changes synchronize projection automatically", () => {
  assert.match(triggers, /after insert or update of status/);
  assert.match(triggers, /after update of declared_facts/);
  assert.match(triggers, /sync_owner_listing_representation_v1/);
  assert.match(publicationRoute, /syncOwnerListingProjection/);
  assert.match(publicationRoute, /projection_synced: true/);
});

test("owner representations enter both public search surfaces behind the flag", () => {
  assert.match(ownerSearch, /searchOwnerListings/);
  assert.match(ownerSearch, /if \(input.cursor\) return base/);
  assert.match(ownerSearch, /new Map/);
  assert.match(apiSearch, /searchOdm: searchPublicRepresentationsWithOwner/);
  assert.match(searchPage, /searchOdm: searchPublicRepresentationsWithOwner/);
});

test("owner search results resolve to a real internal detail page", () => {
  assert.match(detailPage, /id\.startsWith\("owner-"\)/);
  assert.match(detailPage, /queryOwnerListingDetail/);
  assert.match(detailPage, /buildPublicPropertyDetailV2/);
});

test("database and RPC access stay private", () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table .* from anon, authenticated/);
  assert.match(migration, /grant all on table .* to service_role/);
  assert.match(migration, /revoke all on function .* from public, anon, authenticated/);
});
