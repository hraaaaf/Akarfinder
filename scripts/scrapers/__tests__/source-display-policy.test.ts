import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { deriveSourceDisplayPolicy } from "../../../lib/listings/map-db-listing.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FORBIDDEN_CTAS = ["contact", "whatsapp", "request_visit", "request_brochure", "view_full_listing"];

function hasNone(arr: string[] | undefined, forbidden: string[]): boolean {
  if (!arr) return true;
  return forbidden.every((f) => !arr.includes(f));
}

// ─── Mubawab ─────────────────────────────────────────────────────────────────

describe("V9.5 — Mubawab source display policy", () => {
  const policy = deriveSourceDisplayPolicy("mubawab");
  const policyCaps = deriveSourceDisplayPolicy("Mubawab");
  const policyMixed = deriveSourceDisplayPolicy("MUBAWAB");

  test("1. source_display_type = public_index_source", () => {
    assert.equal(policy.source_display_type, "public_index_source");
  });

  test("2. source_badge = public_indexed", () => {
    assert.equal(policy.source_badge, "public_indexed");
  });

  test("3. display_depth = limited_preview", () => {
    assert.equal(policy.display_depth, "limited_preview");
  });

  test("4. thumbnail_policy = single_thumbnail_allowed", () => {
    assert.equal(policy.thumbnail_policy, "single_thumbnail_allowed");
  });

  test("5. allowed_ctas contains view_original, view_source, compare", () => {
    assert.ok(policy.allowed_ctas?.includes("view_original"), "missing view_original");
    assert.ok(policy.allowed_ctas?.includes("view_source"), "missing view_source");
    assert.ok(policy.allowed_ctas?.includes("compare"), "missing compare");
  });

  test("6. allowed_ctas does NOT contain contact / whatsapp / request_visit", () => {
    assert.ok(hasNone(policy.allowed_ctas, FORBIDDEN_CTAS), `forbidden CTA found in ${JSON.stringify(policy.allowed_ctas)}`);
  });

  test("7. display_images.urls length <= 1", () => {
    assert.ok(Array.isArray(policy.display_images?.urls), "display_images.urls must be array");
    assert.ok((policy.display_images?.urls?.length ?? 0) <= 1, "must have at most 1 image");
  });

  test("8. original_source_required = true", () => {
    assert.equal(policy.original_source_required, true);
  });

  test("source name case-insensitive — Mubawab", () => {
    assert.equal(policyCaps.source_badge, "public_indexed");
  });

  test("source name case-insensitive — MUBAWAB", () => {
    assert.equal(policyMixed.source_badge, "public_indexed");
  });

  test("display_images.policy = single_thumbnail_allowed", () => {
    assert.equal(policy.display_images?.policy, "single_thumbnail_allowed");
  });

  test("display_policy_reason is a non-empty string", () => {
    assert.ok(typeof policy.display_policy_reason === "string" && policy.display_policy_reason.length > 0);
  });
});

// ─── Avito ───────────────────────────────────────────────────────────────────

describe("V9.5 — Avito source display policy", () => {
  const policy = deriveSourceDisplayPolicy("avito");
  const policyMixed = deriveSourceDisplayPolicy("Avito");

  test("9. source_display_type = audit_source", () => {
    assert.equal(policy.source_display_type, "audit_source");
  });

  test("10. display_depth = market_signal_only", () => {
    assert.equal(policy.display_depth, "market_signal_only");
  });

  test("11. thumbnail_policy = no_listing_image", () => {
    assert.equal(policy.thumbnail_policy, "no_listing_image");
  });

  test("12. display_images.urls = []", () => {
    assert.deepEqual(policy.display_images?.urls, []);
  });

  test("13. allowed_ctas does NOT contain contact / whatsapp / view_full_listing", () => {
    assert.ok(hasNone(policy.allowed_ctas, FORBIDDEN_CTAS), `forbidden CTA found in ${JSON.stringify(policy.allowed_ctas)}`);
  });

  test("source_badge is defined (market_signal or sensitive_source)", () => {
    assert.ok(
      policy.source_badge === "market_signal" || policy.source_badge === "sensitive_source",
      `unexpected badge: ${policy.source_badge}`
    );
  });

  test("display_images.policy = no_listing_image", () => {
    assert.equal(policy.display_images?.policy, "no_listing_image");
  });

  test("original_source_required = true", () => {
    assert.equal(policy.original_source_required, true);
  });

  test("display_policy_reason is a non-empty string", () => {
    assert.ok(typeof policy.display_policy_reason === "string" && policy.display_policy_reason.length > 0);
  });

  test("source name case-insensitive — Avito", () => {
    assert.equal(policyMixed.display_depth, "market_signal_only");
  });
});

// ─── Unknown / null source ───────────────────────────────────────────────────

describe("V9.5 — Unknown or null source", () => {
  const policyNull = deriveSourceDisplayPolicy(null);
  const policyEmpty = deriveSourceDisplayPolicy("");
  const policyUnknown = deriveSourceDisplayPolicy("unknown_source_xyz");

  test("14. null source → empty object (no badge, no CTA)", () => {
    assert.deepEqual(policyNull, {});
  });

  test("empty string → empty object", () => {
    assert.deepEqual(policyEmpty, {});
  });

  test("unknown source → empty object", () => {
    assert.deepEqual(policyUnknown, {});
  });
});

// ─── Invariants ──────────────────────────────────────────────────────────────

describe("V9.5 — Invariants: score never changes display rights", () => {
  test("15. high reliability score does not change display_depth (Mubawab stays limited_preview)", () => {
    // deriveSourceDisplayPolicy has no score param — this confirms the invariant by design.
    const policy = deriveSourceDisplayPolicy("mubawab");
    assert.equal(policy.display_depth, "limited_preview",
      "display_depth must remain limited_preview regardless of reliability score");
  });

  test("16. premium_partner is never assigned by fallback (null source)", () => {
    const policy = deriveSourceDisplayPolicy(null);
    assert.notEqual(policy.source_badge, "premium_partner");
    assert.notEqual(policy.source_display_type, "partner_source");
  });

  test("17. authorized_source is never assigned by fallback (unknown source)", () => {
    const policy = deriveSourceDisplayPolicy("random_source");
    assert.notEqual(policy.source_badge, "authorized_source");
    assert.notEqual(policy.source_display_type, "authorized_source");
  });

  test("18. display_policy_reason present for Mubawab (known source)", () => {
    const policy = deriveSourceDisplayPolicy("mubawab");
    assert.ok(
      typeof policy.display_policy_reason === "string" && policy.display_policy_reason.length > 0,
      "display_policy_reason must be a non-empty string for known sources"
    );
  });

  test("display_policy_reason present for Avito (known source)", () => {
    const policy = deriveSourceDisplayPolicy("avito");
    assert.ok(
      typeof policy.display_policy_reason === "string" && policy.display_policy_reason.length > 0,
      "display_policy_reason must be a non-empty string for known sources"
    );
  });

  test("contact/whatsapp never in allowed_ctas for any known source", () => {
    for (const src of ["mubawab", "avito", null, "unknown"]) {
      const policy = deriveSourceDisplayPolicy(src);
      assert.ok(hasNone(policy.allowed_ctas, ["contact", "whatsapp"]),
        `forbidden CTA found for source="${src}": ${JSON.stringify(policy.allowed_ctas)}`);
    }
  });
});
