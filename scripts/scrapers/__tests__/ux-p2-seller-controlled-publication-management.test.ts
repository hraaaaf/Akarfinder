import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { nextSellerPublicationStatus } from "../../../lib/seller/publication";

const migration = readFileSync("supabase/migrations/20260805190000_seller_controlled_publication_management_v1.sql", "utf8");
const route = readFileSync("app/api/seller-drafts/[draftId]/publication/route.ts", "utf8");
const panel = readFileSync("components/vendre/SellerPublicationPanel.tsx", "utf8");

test("publication transitions remain explicit and owner controlled", () => {
  assert.equal(nextSellerPublicationStatus(null, "publish"), "live");
  assert.equal(nextSellerPublicationStatus("live", "pause"), "paused");
  assert.equal(nextSellerPublicationStatus("paused", "resume"), "live");
  assert.equal(nextSellerPublicationStatus("live", "withdraw"), "withdrawn");
  assert.equal(nextSellerPublicationStatus("withdrawn", "resume"), null);
});

test("database refuses publication before approval and closes public access", () => {
  assert.match(migration, /draft_status <> 'approved'/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all .* anon, authenticated/);
  assert.match(migration, /published|paused|resumed|withdrawn/);
});

test("endpoint requires owner token, explicit confirmation and approved review", () => {
  assert.match(route, /authorizeSellerDraftUpload/);
  assert.match(route, /confirmation !== true/);
  assert.match(route, /review_status !== "approved"/);
  assert.match(route, /seller_listing_publication_events/);
});

test("seller UI uses plain language and accessible feedback", () => {
  assert.match(panel, /Mettre mon annonce en ligne/);
  assert.match(panel, /Mettre en pause/);
  assert.match(panel, /Remettre en ligne/);
  assert.match(panel, /Retirer l’annonce/);
  assert.match(panel, /aria-live="polite"/);
  assert.match(panel, /role="alert"/);
  assert.doesNotMatch(panel, /pipeline|publication_eligible|review_status/i);
});
