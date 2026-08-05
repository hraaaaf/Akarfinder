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
const panel = readFileSync("components/vendre/SellerReviewStatusPanel.tsx", "utf8");
const form = readFileSync("components/vendre/SellerSecurePublishForm.tsx", "utf8");

test("moderation states remain explicit and fail closed", () => {
  assert.match(migration, /needs_changes/);
  assert.match(migration, /resubmitted/);
  assert.match(migration, /approved/);
  assert.match(migration, /seller_property_draft_review_events/);
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
  assert.doesNotMatch([
    sellerReviewReasonLabel("missing_information"),
    sellerReviewReasonLabel("photo_quality"),
    sellerReviewReasonLabel("price_to_confirm"),
    sellerReviewReasonLabel("location_to_confirm"),
    sellerReviewReasonLabel("description_to_improve"),
  ].join(" "), /json|pipeline|mime|database|backend/i);
});

test("review endpoint requires separate reviewer secret and never publishes", () => {
  assert.match(route, /SELLER_REVIEW_SECRET/);
  assert.match(route, /x-seller-review-secret/);
  assert.match(route, /x-draft-upload-token/);
  assert.match(route, /publication_eligible: false/);
  assert.doesNotMatch(route, /publication_eligible: true/);
  assert.match(route, /review_status: "resubmitted"/);
  assert.match(route, /event_type: approved \? "approved" : "changes_requested"/);
});

test("seller receives actionable corrections and can resubmit", () => {
  assert.match(panel, /Suivi du dossier/);
  assert.match(panel, /Quelques corrections sont nécessaires/);
  assert.match(panel, /À améliorer/);
  assert.match(panel, /J’ai corrigé mon dossier/);
  assert.match(panel, /Corrections envoyées/);
  assert.match(panel, /Dossier validé/);
  assert.match(panel, /il n’est pas encore publié/);
  assert.match(form, /SellerReviewStatusPanel/);
  assert.match(form, /draftId: lead\.seller_property_draft_id/);
  assert.match(form, /uploadToken: lead\.seller_upload_token/);
});

test("mobile and accessibility feedback remain explicit", () => {
  assert.match(panel, /aria-labelledby="seller-review-title"/);
  assert.match(panel, /aria-label="Actualiser le suivi"/);
  assert.match(panel, /aria-live="polite"/);
  assert.match(panel, /role="alert"/);
  assert.match(panel, /h-11 w-11/);
  assert.match(panel, /motion-reduce:animate-none/);
});
