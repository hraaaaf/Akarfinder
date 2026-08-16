import test from "node:test";
import assert from "node:assert/strict";
import { buildProConversionModel } from "@/lib/listings/pro-conversion";
import type { Listing } from "@/lib/listings/types";

const base: Listing = {
  id: "l11",
  title: "QA",
  city: "Rabat",
  neighborhood: "Agdal",
  price: 1_000_000,
  currency: "DH",
  surface_m2: 100,
  price_per_m2: 10_000,
  property_type: "Appartement",
  transaction_type: "buy",
  bedrooms: 2,
  bathrooms: 1,
  freshness_label: "QA",
  source_type: "Agence",
  reliability_label: "Informations complètes",
  reliability_score: 90,
  is_mre_friendly: false,
  description: "",
  image_url: "",
  reliability_explanation: "QA",
};

function listing(overrides: Partial<Listing> = {}): Listing {
  return { ...base, ...overrides };
}

test("partner_full + explicit CTA matrix enables visit and WhatsApp only", () => {
  const model = buildProConversionModel(listing({
    source_access_level: "partner_full",
    can_show_contact: true,
    allowed_ctas: ["visit", "whatsapp", "view_original"],
    whatsapp: "+212600000000",
    listing_url: "https://example.com/a",
  }));
  assert.equal(model.actions.visit, true);
  assert.equal(model.actions.whatsapp.enabled, true);
  assert.equal(model.actions.whatsapp.phone, "+212600000000");
  assert.equal(model.actions.phone.enabled, false);
  assert.equal(model.actions.sourceOriginal.enabled, true);
});

test("contact fails closed when can_show_contact is absent", () => {
  const model = buildProConversionModel(listing({
    source_access_level: "partner_full",
    allowed_ctas: ["visit", "whatsapp"],
    whatsapp: "+212600000000",
  }));
  assert.equal(model.contactAuthorized, false);
  assert.equal(model.actions.visit, false);
  assert.equal(model.actions.whatsapp.enabled, false);
});

test("indexed sources never receive direct contact even if raw values are present", () => {
  const model = buildProConversionModel(listing({
    source_access_level: "indexed_only",
    can_show_contact: true,
    allowed_ctas: ["visit", "whatsapp", "view_original"],
    whatsapp: "+212600000000",
    listing_url: "https://example.com/source",
  }));
  assert.equal(model.actions.visit, false);
  assert.equal(model.actions.whatsapp.enabled, false);
  assert.equal(model.actions.sourceOriginal.enabled, true);
});

test("WhatsApp requires both explicit permission and an explicit number", () => {
  const noPermission = buildProConversionModel(listing({
    source_access_level: "partner_full",
    can_show_contact: true,
    allowed_ctas: ["visit"],
    whatsapp: "+212600000000",
  }));
  const noNumber = buildProConversionModel(listing({
    source_access_level: "partner_full",
    can_show_contact: true,
    allowed_ctas: ["whatsapp"],
  }));
  assert.equal(noPermission.actions.whatsapp.enabled, false);
  assert.equal(noNumber.actions.whatsapp.enabled, false);
});

test("commercial badge requires active + confirmed + validated authority", () => {
  const approved = buildProConversionModel(listing({
    source_access_level: "partner_full",
    can_show_contact: true,
    partner_type: "agency",
    partner_tier: "agency_premium",
    commercial_tier: "gold",
    partner_activation_status: "active",
    source_authorization_status: "confirmed",
    partner_validation_status: "validated",
  }));
  const pending = buildProConversionModel(listing({
    partner_type: "agency",
    commercial_tier: "gold",
    partner_activation_status: "pending",
    source_authorization_status: "confirmed",
    partner_validation_status: "validated",
  }));
  assert.equal(approved.professional.badgeLabel, "Agence Gold");
  assert.equal(pending.professional.badgeLabel, null);
});

test("phone CTA stays unavailable because no dedicated authorized phone field exists", () => {
  const model = buildProConversionModel(listing({
    source_access_level: "partner_full",
    can_show_contact: true,
    allowed_ctas: ["phone", "whatsapp"],
    whatsapp: "+212600000000",
  }));
  assert.deepEqual(model.actions.phone, { enabled: false, phone: null });
});
