import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canReviewerDecide,
  canSellerResubmit,
  normalizeSellerReviewReasons,
  sellerReviewReasonLabel,
} from "../../../lib/seller/moderation";

const migration = readFileSync("supabase/migrations/20260805170000_seller_moderation_correction_flow_v1.sql", "utf8");
const route = readFileSync("app/api/seller-drafts/[draftId]/review/route.ts", "utf8");

test("moderation states remain explicit and fail closed", () => {
  assert.match(migration, /needs_changes/);
  assert.match(migration, /resubmitted/);
  assert.match(migration, /approved/);
  assert.match(migration, /check \(publication_eligible = false\)/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all .* anon, authenticated/);
});

test("seller can only resubmit after corrections are requested", () => {
  assert.equal(canSellerResubmit("needs_changes"), true);
  assert.equal(canSellerResubmit("ready_for_review"), false);
  assert.equal(canSellerResubmit("approved"), false);
});

test("reviewer can only decide on submitted drafts", () => {
  assert.equal(canReviewerDecide("ready_for_review"), true);
  assert.equal(canReviewerDecide("resubmitted"), true);
  assert.equal(canReviewerDecide("draft"), false);
});

test("review reasons use a bounded plain-language vocabulary", () => {
  const reasons = normalizeSellerReviewReasons(["photo_quality", "photo_quality", "unknown"]);
  assert.deepEqual(reasons, ["photo_quality"]);
  assert.equal(sellerReviewReasonLabel("photo_quality"), "Remplacez ou complétez certaines photos");
});

test("review endpoint requires separate reviewer secret and never publishes", () => {
  assert.match(route, /SELLER_REVIEW_SECRET/);
  assert.match(route, /x-seller-review-secret/);
  assert.match(route, /publication_eligible: false/);
  assert.doesNotMatch(route, /publication_eligible: true/);
  assert.match(route, /review_status: "resubmitted"/);
  assert.match(route, /event_type: approved \? "approved" : "changes_requested"/);
});
