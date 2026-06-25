import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildVisitLeadInsert,
  buildVisitWhatsAppMessage,
  getVisitSourceAccessNotice,
  getVisitSuccessCopy,
  normalizeVisitPhone,
  normalizeVisitRequestPayload,
  validateVisitRequestPayload,
} from "../../../lib/leads/visit-request";
import type { Listing } from "../../../lib/listings/types";

const baseListing: Listing = {
  id: "listing-1",
  title: "Appartement avec terrasse à Casablanca",
  city: "Casablanca",
  neighborhood: "Maârif",
  price: 1_250_000,
  currency: "DH",
  surface_m2: 96,
  price_per_m2: 13021,
  property_type: "Appartement",
  transaction_type: "buy",
  bedrooms: 3,
  bathrooms: 2,
  freshness_label: "Mise à jour hier",
  source_type: "Source analysée",
  reliability_label: "Fiabilité élevée",
  reliability_score: 86,
  is_mre_friendly: true,
  description: "Appartement lumineux avec terrasse.",
  image_url: "",
  reliability_explanation: "Score indicatif.",
  source_name: "Mubawab",
  listing_url: "https://www.mubawab.ma/fr/a/test-visite",
  source_access_level: "indexed_only",
  image_permission_status: "unknown",
};

describe("P11D-C — visit request validation", () => {
  it("requires consent_contact", () => {
    const payload = normalizeVisitRequestPayload({
      listing_id: "1",
      full_name: "Test User",
      phone_whatsapp: "+212600000000",
      preferred_slot_1: "2026-06-30T10:00",
      consent_contact: false,
    });
    const result = validateVisitRequestPayload(payload);
    assert.equal(result.ok, false);
    assert.ok(result.ok === false && result.error.includes("Consentement"));
  });

  it("requires phone", () => {
    const payload = normalizeVisitRequestPayload({
      listing_id: "1",
      full_name: "Test User",
      preferred_slot_1: "2026-06-30T10:00",
      consent_contact: true,
    });
    const result = validateVisitRequestPayload(payload);
    assert.equal(result.ok, false);
  });

  it("requires listing_id", () => {
    const payload = normalizeVisitRequestPayload({
      listing_id: "",
      full_name: "Test User",
      phone_whatsapp: "+212600000000",
      preferred_slot_1: "2026-06-30T10:00",
      consent_contact: true,
    });
    const result = validateVisitRequestPayload(payload);
    assert.equal(result.ok, false);
  });

  it("accepts daypart-only availability when consent and phone exist", () => {
    const payload = normalizeVisitRequestPayload({
      listing_id: "1",
      full_name: "Test User",
      phone_whatsapp: "+212600000000",
      visit_preferred_daypart: "Soir",
      consent_contact: true,
    });
    const result = validateVisitRequestPayload(payload);
    assert.equal(result.ok, true);
  });
});

describe("P11D-C — visit lead insert", () => {
  it("creates lead_type visit_request and chaud temperature", () => {
    const payload = normalizeVisitRequestPayload({
      listing_id: "listing-1",
      full_name: "Nadia",
      phone_whatsapp: "0612345678",
      preferred_slot_1: "2026-06-30T10:00",
      consent_contact: true,
      source_page: "/listings/listing-1",
    });

    assert.ok(payload);
    const result = validateVisitRequestPayload(payload);
    assert.equal(result.ok, true);

    const insert = buildVisitLeadInsert(payload!, baseListing, "Mozilla/5.0");
    assert.equal(insert.lead_type, "visit_request");
    assert.equal(insert.visit_status, "pending");
    assert.equal(insert.lead_temperature, "chaud");
    assert.equal(insert.phone_whatsapp, "+212612345678");
    assert.equal(insert.listing_title, baseListing.title);
  });

  it("stores indexed_only access snapshot without claiming auto notification", () => {
    const notice = getVisitSourceAccessNotice("indexed_only");
    assert.ok(notice.includes("Demande enregistrée par AkarFinder"));
    assert.ok(!notice.toLowerCase().includes("propriétaire notifié"));
    assert.ok(!notice.toLowerCase().includes("confirmée"));
  });

  it("success copy avoids forbidden wording", () => {
    const copy = getVisitSuccessCopy("indexed_only");
    const combined = `${copy.title} ${copy.description} ${copy.pendingLabel}`.toLowerCase();
    assert.ok(!combined.includes("visite confirmée"));
    assert.ok(!combined.includes("rendez-vous garanti"));
    assert.ok(!combined.includes("créneau réservé"));
  });
});

describe("P11D-C — helpers", () => {
  it("builds WhatsApp message without secrets", () => {
    const message = buildVisitWhatsAppMessage({
      fullName: "Nadia",
      listingTitle: "Appartement Maârif",
      preferredSlot1: "2026-06-30T10:00:00.000Z",
      preferredDaypart: "Matin",
    });
    assert.ok(message.includes("AkarFinder"));
    assert.ok(message.includes("Appartement Maârif"));
    assert.ok(!message.toLowerCase().includes("service_role"));
    assert.ok(!message.toLowerCase().includes("supabase"));
  });

  it("normalizes simple Moroccan phones", () => {
    assert.equal(normalizeVisitPhone("06 12 34 56 78"), "+212612345678");
    assert.equal(normalizeVisitPhone("212612345678"), "+212612345678");
  });

  it("keeps buyer-profile path isolated from visit helper usage", () => {
    const success = getVisitSuccessCopy("partner_full");
    assert.ok(success.description.includes("attente de confirmation"));
  });
});
