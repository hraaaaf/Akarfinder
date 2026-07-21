import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  commercialCapabilitiesForOrganization,
  commercialTierAffectsSearchRanking,
} from "../../../lib/professional/commercial-activation.js";
import {
  PARTNER_ONBOARDING_STEPS,
  computePartnerOnboardingCompleteness,
  getVisiblePartnerOnboardingFields,
} from "../../../lib/professional/partner-property-onboarding.js";
import { sanitizePartnerDeclaredFacts } from "../../../lib/professional/commercial-validation.js";

describe("#19C Partner Commercial Activation V1", () => {
  it("keeps the canonical seven-stage partner property onboarding", () => {
    assert.equal(PARTNER_ONBOARDING_STEPS.length, 7);
    assert.deepEqual(PARTNER_ONBOARDING_STEPS.map((step) => step.label), [
      "Identité du bien",
      "Usage & potentiel",
      "Localisation & environnement",
      "Caractéristiques & mode de vie",
      "Investissement & coûts",
      "Médias & projection",
      "Transparence, vérification & publication",
    ]);
  });

  it("never displays every schema field and hides derived values from partner entry", () => {
    for (let step = 1; step <= 7; step += 1) {
      const fields = getVisiblePartnerOnboardingFields(step as 1|2|3|4|5|6|7, "apartment", {});
      assert.ok(fields.length <= 10, `step ${step} exposes too many fields`);
      assert.equal(fields.some((field) => field.category === "derived"), false);
    }
  });

  it("weights essential missing facts more than optional valued facts", () => {
    const sparse = computePartnerOnboardingCompleteness("apartment", {
      "classification.property_type": "apartment",
      "offer.transaction_type": "sale",
      "features.has_balcony": true,
      "features.has_terrace": true,
      "offer.negotiable_declared": true,
    });
    assert.ok(sparse.score < 50);
    assert.ok(sparse.required_missing.includes("offer.price_amount"));
    assert.ok(sparse.required_missing.includes("location.city"));
  });

  it("rejects calculated/inferred fields from partner-declared payload", () => {
    assert.equal(sanitizePartnerDeclaredFacts({ "intelligence.price_per_m2": 12345 }), null);
    assert.equal(sanitizePartnerDeclaredFacts({ "legal.documents_verified_count": 3 }), null);
    assert.deepEqual(sanitizePartnerDeclaredFacts({ "offer.title": "Appartement test" }), { "offer.title": "Appartement test" });
  });

  it("allows onboarding drafts before live activation but blocks live capabilities", () => {
    const onboarding = commercialCapabilitiesForOrganization({
      validation_status: "pending",
      commercial_tier: "none",
      activation_status: "onboarding",
      source_authorization_status: "pending",
    });
    assert.ok(onboarding.includes("submissions.manage"));
    assert.ok(onboarding.includes("media.manage"));
    assert.equal(onboarding.includes("leads.receive"), false);
    assert.equal(onboarding.includes("publication.request"), false);
  });

  it("requires validated + active + confirmed authorization for publication and leads", () => {
    const live = commercialCapabilitiesForOrganization({
      validation_status: "validated",
      commercial_tier: "gold",
      activation_status: "active",
      source_authorization_status: "confirmed",
    });
    assert.ok(live.includes("publication.request"));
    assert.ok(live.includes("leads.receive"));
    assert.ok(live.includes("stats.advanced"));
  });

  it("commercial tier never affects search ranking", () => {
    assert.equal(commercialTierAffectsSearchRanking("none"), false);
    assert.equal(commercialTierAffectsSearchRanking("partner"), false);
    assert.equal(commercialTierAffectsSearchRanking("gold"), false);
    assert.equal(commercialTierAffectsSearchRanking("premium"), false);
  });

  it("migration enables tenant RLS and explicit media rights", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260722003000_partner_commercial_activation_v1.sql"), "utf8").toLowerCase();
    assert.ok(sql.includes("professional_property_submissions enable row level security"));
    assert.ok(sql.includes("professional_media_assets enable row level security"));
    assert.ok(sql.includes("source_authorization_status"));
    assert.ok(sql.includes("publication_permission"));
    assert.ok(sql.includes("rights_status"));
  });

  it("retires the legacy query-token leads inbox", () => {
    const page = readFileSync(join(process.cwd(), "app/pro/leads/page.tsx"), "utf8");
    assert.equal(page.includes("LEADS_ADMIN_TOKEN"), false);
    assert.equal(page.includes("searchParams"), false);
    assert.equal(page.includes("?token="), false);
  });

  it("staff authorization is based on app_metadata, never user-editable metadata", () => {
    const auth = readFileSync(join(process.cwd(), "lib/professional/auth.ts"), "utf8");
    assert.ok(auth.includes("data.user.app_metadata"));
    assert.equal(/data\.user\.(user_metadata|raw_user_meta_data)/.test(auth), false);
  });
});
