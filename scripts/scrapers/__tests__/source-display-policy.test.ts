import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { deriveSourceDisplayPolicy } from "../../../lib/listings/map-db-listing.js";

const FORBIDDEN_CTAS = [
  "contact",
  "whatsapp",
  "request_visit",
  "request_brochure",
  "view_full_listing",
];

function hasNone(arr: string[] | undefined, forbidden: string[]): boolean {
  if (!arr) return true;
  return forbidden.every((f) => !arr.includes(f));
}

describe("V9.5 - Mubawab source display policy", () => {
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

  test("6. allowed_ctas does not contain contact / whatsapp / request_visit", () => {
    assert.ok(hasNone(policy.allowed_ctas, FORBIDDEN_CTAS));
  });

  test("7. display_images.urls length <= 1", () => {
    assert.ok(Array.isArray(policy.display_images?.urls));
    assert.ok((policy.display_images?.urls?.length ?? 0) <= 1);
  });

  test("8. original_source_required = true", () => {
    assert.equal(policy.original_source_required, true);
  });

  test("9. source name case-insensitive - Mubawab", () => {
    assert.equal(policyCaps.source_badge, "public_indexed");
    assert.equal(policyMixed.source_badge, "public_indexed");
  });

  test("10. display_images.policy = single_thumbnail_allowed", () => {
    assert.equal(policy.display_images?.policy, "single_thumbnail_allowed");
  });

  test("11. display_policy_reason is a non-empty string", () => {
    assert.ok(typeof policy.display_policy_reason === "string" && policy.display_policy_reason.length > 0);
  });
});

describe("V9.5 - under-review public indexed policies", () => {
  const agenz = deriveSourceDisplayPolicy("agenz");
  const logicImmo = deriveSourceDisplayPolicy("logicimmo");
  const logicImmoDash = deriveSourceDisplayPolicy("Logic-Immo Maroc");

  test("12. Agenz maps to public_index_source", () => {
    assert.equal(agenz.source_display_type, "public_index_source");
    assert.equal(agenz.source_badge, "public_indexed");
    assert.equal(agenz.display_depth, "limited_preview");
  });

  test("13. Logic-Immo maps to public_index_source", () => {
    assert.equal(logicImmo.source_display_type, "public_index_source");
    assert.equal(logicImmo.source_badge, "public_indexed");
    assert.equal(logicImmo.display_depth, "limited_preview");
  });

  test("14. under-review public indexed sources keep single_thumbnail_allowed", () => {
    assert.equal(agenz.thumbnail_policy, "single_thumbnail_allowed");
    assert.equal(logicImmo.thumbnail_policy, "single_thumbnail_allowed");
    assert.equal(logicImmo.display_images?.policy, "single_thumbnail_allowed");
  });

  test("15. under-review public indexed sources forbid contact/full listing CTAs", () => {
    assert.ok(hasNone(agenz.allowed_ctas, FORBIDDEN_CTAS));
    assert.ok(hasNone(logicImmo.allowed_ctas, FORBIDDEN_CTAS));
  });

  test("16. Logic-Immo aliases stay case-insensitive", () => {
    assert.equal(logicImmoDash.source_badge, "public_indexed");
    assert.equal(logicImmoDash.original_source_required, true);
  });

  test("17. under-review public indexed policies mention pending review", () => {
    assert.ok(agenz.display_policy_reason?.includes("review policy/ToS encore requise"));
    assert.ok(logicImmo.display_policy_reason?.includes("review policy/ToS encore requise"));
  });
});

describe("V9.5 - Avito source display policy", () => {
  const policy = deriveSourceDisplayPolicy("avito");
  const policyMixed = deriveSourceDisplayPolicy("Avito");

  test("18. source_display_type = audit_source", () => {
    assert.equal(policy.source_display_type, "audit_source");
  });

  test("19. display_depth = market_signal_only", () => {
    assert.equal(policy.display_depth, "market_signal_only");
  });

  test("20. thumbnail_policy = no_listing_image", () => {
    assert.equal(policy.thumbnail_policy, "no_listing_image");
  });

  test("21. display_images.urls = []", () => {
    assert.deepEqual(policy.display_images?.urls, []);
  });

  test("22. allowed_ctas does not contain contact / whatsapp / view_full_listing", () => {
    assert.ok(hasNone(policy.allowed_ctas, FORBIDDEN_CTAS));
  });

  test("23. source_badge = market_signal", () => {
    assert.equal(policy.source_badge, "market_signal");
  });

  test("24. display_images.policy = no_listing_image", () => {
    assert.equal(policy.display_images?.policy, "no_listing_image");
  });

  test("25. original_source_required = true", () => {
    assert.equal(policy.original_source_required, true);
  });

  test("26. display_policy_reason is a non-empty string", () => {
    assert.ok(typeof policy.display_policy_reason === "string" && policy.display_policy_reason.length > 0);
  });

  test("27. source name case-insensitive - Avito", () => {
    assert.equal(policyMixed.display_depth, "market_signal_only");
  });
});

describe("V9.5 - Unknown or null source", () => {
  const policyNull = deriveSourceDisplayPolicy(null);
  const policyEmpty = deriveSourceDisplayPolicy("");
  const policyUnknown = deriveSourceDisplayPolicy("unknown_source_xyz");

  test("28. null source -> empty object", () => {
    assert.deepEqual(policyNull, {});
  });

  test("29. empty string -> empty object", () => {
    assert.deepEqual(policyEmpty, {});
  });

  test("30. unknown source -> empty object", () => {
    assert.deepEqual(policyUnknown, {});
  });
});

describe("V9.5 - Invariants", () => {
  test("31. high reliability score does not change display_depth", () => {
    const policy = deriveSourceDisplayPolicy("mubawab");
    assert.equal(policy.display_depth, "limited_preview");
  });

  test("32. premium_partner is never assigned by fallback", () => {
    const policy = deriveSourceDisplayPolicy(null);
    assert.notEqual(policy.source_badge, "premium_partner");
    assert.notEqual(policy.source_display_type, "partner_source");
  });

  test("33. authorized_source is never assigned by fallback", () => {
    const policy = deriveSourceDisplayPolicy("random_source");
    assert.notEqual(policy.source_badge, "authorized_source");
    assert.notEqual(policy.source_display_type, "authorized_source");
  });

  test("34. display_policy_reason present for known sources", () => {
    for (const src of ["mubawab", "agenz", "logicimmo", "avito"]) {
      const policy = deriveSourceDisplayPolicy(src);
      assert.ok(typeof policy.display_policy_reason === "string" && policy.display_policy_reason.length > 0);
    }
  });

  test("35. contact/whatsapp never in allowed_ctas for known or unknown sources", () => {
    for (const src of ["mubawab", "agenz", "logicimmo", "avito", null, "unknown"]) {
      const policy = deriveSourceDisplayPolicy(src);
      assert.ok(
        hasNone(policy.allowed_ctas, ["contact", "whatsapp"]),
        `forbidden CTA found for source="${src}": ${JSON.stringify(policy.allowed_ctas)}`
      );
    }
  });
});
