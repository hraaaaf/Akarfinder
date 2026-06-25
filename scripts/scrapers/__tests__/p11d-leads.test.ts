// P11D / P11D-C — Lead validation, temperature, and visit-request tests
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateLeadPayload, normalizePhone, extractLeadPayload } from "../../../lib/leads/validate";
import { computeLeadTemperature } from "../../../lib/onboarding/lead-temperature";
import {
  normalizeVisitPhone,
  validateVisitRequestPayload,
  normalizeVisitRequestPayload,
  buildVisitLeadInsert,
} from "../../../lib/leads/visit-request";
import type { Listing } from "../../../lib/listings/types";

// ── validateLeadPayload ───────────────────────────────────────────────────────

describe("validateLeadPayload", () => {
  it("rejects null payload", () => {
    const r = validateLeadPayload(null);
    assert.equal(r.ok, false);
  });

  it("rejects missing profile", () => {
    const r = validateLeadPayload({ source_channel: "onboarding" });
    assert.equal(r.ok, false);
    assert.ok(r.ok === false && r.error.includes("Profil"));
  });

  it("rejects missing consentContact", () => {
    const r = validateLeadPayload({
      profile: { consentIndicatif: true, phone: "+212600000000" },
    });
    assert.equal(r.ok, false);
    assert.ok(r.ok === false && r.error.includes("consentContact"));
  });

  it("rejects missing consentIndicatif", () => {
    const r = validateLeadPayload({
      profile: { consentContact: true, phone: "+212600000000" },
    });
    assert.equal(r.ok, false);
    assert.ok(r.ok === false && r.error.includes("consentIndicatif"));
  });

  it("rejects missing phone", () => {
    const r = validateLeadPayload({
      profile: { consentContact: true, consentIndicatif: true },
    });
    assert.equal(r.ok, false);
    assert.ok(r.ok === false && r.error.toLowerCase().includes("téléphone"));
  });

  it("rejects phone shorter than 8 chars after normalization", () => {
    const r = validateLeadPayload({
      profile: { consentContact: true, consentIndicatif: true, phone: "1234" },
    });
    assert.equal(r.ok, false);
  });

  it("accepts valid payload with double consent and phone", () => {
    const r = validateLeadPayload({
      profile: {
        consentContact: true,
        consentIndicatif: true,
        phone: "+212600000000",
      },
      source_channel: "onboarding",
    });
    assert.equal(r.ok, true);
  });

  it("accepts valid payload without optional fields", () => {
    const r = validateLeadPayload({
      profile: {
        consentContact: true,
        consentIndicatif: true,
        phone: "0612345678",
      },
    });
    assert.equal(r.ok, true);
  });

  it("consentContact false prevents success", () => {
    const r = validateLeadPayload({
      profile: {
        consentContact: false,
        consentIndicatif: true,
        phone: "+212600000000",
      },
    });
    assert.equal(r.ok, false);
  });

  it("consentIndicatif false prevents success", () => {
    const r = validateLeadPayload({
      profile: {
        consentContact: true,
        consentIndicatif: false,
        phone: "+212600000000",
      },
    });
    assert.equal(r.ok, false);
  });
});

// ── normalizePhone ────────────────────────────────────────────────────────────

describe("normalizePhone", () => {
  it("strips spaces", () => {
    assert.equal(normalizePhone("+212 6 00 00 00 00"), "+212600000000");
  });

  it("strips dashes", () => {
    assert.equal(normalizePhone("06-12-34-56-78"), "0612345678");
  });

  it("strips parentheses and dots", () => {
    assert.equal(normalizePhone("(06) 12.34.56.78"), "0612345678");
  });

  it("preserves + prefix", () => {
    assert.ok(normalizePhone("+33612345678").startsWith("+"));
  });
});

// ── extractLeadPayload ────────────────────────────────────────────────────────

describe("extractLeadPayload", () => {
  it("returns null for non-object", () => {
    assert.equal(extractLeadPayload("string"), null);
    assert.equal(extractLeadPayload(42), null);
    assert.equal(extractLeadPayload(null), null);
  });

  it("returns null for missing profile", () => {
    assert.equal(extractLeadPayload({ source_channel: "onboarding" }), null);
  });

  it("extracts payload with defaults", () => {
    const result = extractLeadPayload({
      profile: { phone: "+212600000000" },
    });
    assert.ok(result !== null);
    assert.equal(result.source_channel, "onboarding");
    assert.equal(result.source_page, undefined);
    assert.equal(result.listing_id, undefined);
  });

  it("extracts listing_id when present", () => {
    const result = extractLeadPayload({
      profile: { phone: "+212600000000" },
      listing_id: "42",
    });
    assert.ok(result !== null);
    assert.equal(result.listing_id, "42");
  });
});

// ── Lead temperature (re-check from P11D perspective) ────────────────────────

describe("lead temperature — P11D scenarios", () => {
  it("chaud requires phone + consent + hot timing + budget", () => {
    const r = computeLeadTemperature({
      timing: "urgent",
      budgetTotal: 1200000,
      phone: "+212600000000",
      consentContact: true,
      city: "Casablanca",
    });
    assert.equal(r.temperature, "chaud");
    assert.ok(r.label.length > 0);
    assert.ok(r.reason.length > 0);
  });

  it("missing phone prevents chaud even with hot timing + budget", () => {
    const r = computeLeadTemperature({
      timing: "urgent",
      budgetTotal: 1200000,
      consentContact: true,
      city: "Casablanca",
    });
    assert.notEqual(r.temperature, "chaud");
  });

  it("missing consent prevents chaud", () => {
    const r = computeLeadTemperature({
      timing: "1-3mois",
      budgetTotal: 900000,
      phone: "+212600000000",
      consentContact: false,
      city: "Rabat",
    });
    assert.notEqual(r.temperature, "chaud");
  });

  it("3-6mois with budget → tiède", () => {
    const r = computeLeadTemperature({
      timing: "3-6mois",
      budgetTotal: 800000,
    });
    assert.equal(r.temperature, "tiède");
  });

  it("veille → froid", () => {
    const r = computeLeadTemperature({ timing: "veille" });
    assert.equal(r.temperature, "froid");
  });

  it("empty profile → froid", () => {
    const r = computeLeadTemperature({});
    assert.equal(r.temperature, "froid");
  });
});

// ── P11D-C — visit request validation ────────────────────────────────────────

const MOCK_LISTING: Listing = {
  id: "listing-abc",
  title: "Appartement Maarif",
  city: "Casablanca",
  neighborhood: "Maarif",
  price: 1_200_000,
  currency: "MAD",
  property_type: "apartment",
  surface_m2: 80,
  bedrooms: 2,
  transaction_type: "sale",
  listing_url: "https://example.ma/listing/abc",
  source_access_level: "indexed_only",
  image_permission_status: "unknown",
} as unknown as Listing;

describe("normalizeVisitPhone", () => {
  it("adds +212 prefix for local 06 number", () => {
    assert.equal(normalizeVisitPhone("0612345678"), "+212612345678");
  });

  it("adds + for 212 number without plus", () => {
    assert.equal(normalizeVisitPhone("212612345678"), "+212612345678");
  });

  it("leaves international number unchanged", () => {
    assert.equal(normalizeVisitPhone("+33600000000"), "+33600000000");
  });

  it("strips spaces and dashes", () => {
    assert.equal(normalizeVisitPhone("06 12-34-56-78"), "+212612345678");
  });
});

describe("validateVisitRequestPayload", () => {
  it("rejects null payload", () => {
    const r = validateVisitRequestPayload(null);
    assert.equal(r.ok, false);
  });

  it("rejects missing listing_id", () => {
    const body = normalizeVisitRequestPayload({
      listing_id: "",
      full_name: "Ahmed",
      phone_whatsapp: "+212600000000",
      consent_contact: true,
      visit_preferred_daypart: "Matin",
    });
    const r = validateVisitRequestPayload(body);
    assert.equal(r.ok, false);
    assert.ok(r.ok === false && r.error.includes("Annonce"));
  });

  it("rejects missing name", () => {
    const body = normalizeVisitRequestPayload({
      listing_id: "listing-abc",
      full_name: "A",
      phone_whatsapp: "+212600000000",
      consent_contact: true,
      visit_preferred_daypart: "Matin",
    });
    const r = validateVisitRequestPayload(body);
    assert.equal(r.ok, false);
    assert.ok(r.ok === false && r.error.includes("Nom"));
  });

  it("rejects missing phone", () => {
    const body = normalizeVisitRequestPayload({
      listing_id: "listing-abc",
      full_name: "Ahmed Benali",
      phone_whatsapp: "",
      consent_contact: true,
      visit_preferred_daypart: "Matin",
    });
    const r = validateVisitRequestPayload(body);
    assert.equal(r.ok, false);
    assert.ok(r.ok === false && r.error.toLowerCase().includes("téléphone"));
  });

  it("rejects missing consent", () => {
    const body = normalizeVisitRequestPayload({
      listing_id: "listing-abc",
      full_name: "Ahmed Benali",
      phone_whatsapp: "+212600000000",
      consent_contact: false,
      visit_preferred_daypart: "Matin",
    });
    const r = validateVisitRequestPayload(body);
    assert.equal(r.ok, false);
    assert.ok(r.ok === false && r.error.toLowerCase().includes("consentement"));
  });

  it("rejects no availability signal at all", () => {
    const body = normalizeVisitRequestPayload({
      listing_id: "listing-abc",
      full_name: "Ahmed Benali",
      phone_whatsapp: "+212600000000",
      consent_contact: true,
    });
    const r = validateVisitRequestPayload(body);
    assert.equal(r.ok, false);
    assert.ok(r.ok === false && r.error.includes("créneau"));
  });

  it("accepts valid payload with daypart", () => {
    const body = normalizeVisitRequestPayload({
      listing_id: "listing-abc",
      full_name: "Ahmed Benali",
      phone_whatsapp: "+212600000000",
      consent_contact: true,
      visit_preferred_daypart: "Matin",
    });
    const r = validateVisitRequestPayload(body);
    assert.equal(r.ok, true);
  });

  it("accepts valid payload with message only", () => {
    const body = normalizeVisitRequestPayload({
      listing_id: "listing-abc",
      full_name: "Fatima Alaoui",
      phone_whatsapp: "+212612345678",
      consent_contact: true,
      visit_message: "Disponible samedi matin",
    });
    const r = validateVisitRequestPayload(body);
    assert.equal(r.ok, true);
  });
});

describe("buildVisitLeadInsert — temperature always chaud", () => {
  it("sets lead_temperature to chaud for visit request", () => {
    const payload = normalizeVisitRequestPayload({
      listing_id: "listing-abc",
      full_name: "Ahmed Benali",
      phone_whatsapp: "+212600000000",
      consent_contact: true,
      visit_preferred_daypart: "Après-midi",
    })!;
    const row = buildVisitLeadInsert(payload, MOCK_LISTING);
    assert.equal(row.lead_temperature, "chaud");
  });

  it("sets lead_type to visit_request", () => {
    const payload = normalizeVisitRequestPayload({
      listing_id: "listing-abc",
      full_name: "Ahmed Benali",
      phone_whatsapp: "+212600000000",
      consent_contact: true,
      visit_preferred_daypart: "Matin",
    })!;
    const row = buildVisitLeadInsert(payload, MOCK_LISTING);
    assert.equal(row.lead_type, "visit_request");
  });

  it("sets visit_status to pending", () => {
    const payload = normalizeVisitRequestPayload({
      listing_id: "listing-abc",
      full_name: "Nadia Tazi",
      phone_whatsapp: "+212612345678",
      consent_contact: true,
      visit_message: "Samedi matin si possible",
    })!;
    const row = buildVisitLeadInsert(payload, MOCK_LISTING);
    assert.equal(row.visit_status, "pending");
  });

  it("captures listing snapshot (title, city, price)", () => {
    const payload = normalizeVisitRequestPayload({
      listing_id: "listing-abc",
      full_name: "Ahmed Benali",
      phone_whatsapp: "+212600000000",
      consent_contact: true,
      visit_preferred_daypart: "Matin",
    })!;
    const row = buildVisitLeadInsert(payload, MOCK_LISTING);
    assert.equal(row.listing_title, "Appartement Maarif");
    assert.equal(row.listing_city, "Casablanca");
    assert.equal(row.listing_price, 1_200_000);
  });

  it("hardcodes double consent to true", () => {
    const payload = normalizeVisitRequestPayload({
      listing_id: "listing-abc",
      full_name: "Ahmed Benali",
      phone_whatsapp: "+212600000000",
      consent_contact: true,
      visit_preferred_daypart: "Matin",
    })!;
    const row = buildVisitLeadInsert(payload, MOCK_LISTING);
    assert.equal(row.consent_contact, true);
    assert.equal(row.consent_indicative, true);
  });
});

describe("P11D-C — forbidden wording in visit lead reasons", () => {
  const FORBIDDEN = ["préqualifié", "crédit garanti", "accord bancaire", "capacité certifiée", "banque partenaire"];
  const payload = normalizeVisitRequestPayload({
    listing_id: "listing-abc",
    full_name: "Ahmed Benali",
    phone_whatsapp: "+212600000000",
    consent_contact: true,
    visit_preferred_daypart: "Matin",
  })!;
  const row = buildVisitLeadInsert(payload, MOCK_LISTING);
  const combined = row.lead_reasons.join(" ").toLowerCase();

  for (const word of FORBIDDEN) {
    it(`visit lead reasons do not contain "${word}"`, () => {
      assert.ok(!combined.includes(word), `Found forbidden wording "${word}" in: "${combined}"`);
    });
  }
});

// ── Forbidden banking wording check ──────────────────────────────────────────

describe("forbidden wording — not present in temperature labels", () => {
  const FORBIDDEN = [
    "préqualifié",
    "crédit garanti",
    "accord bancaire",
    "capacité certifiée",
    "vous pouvez acheter",
  ];

  const scenarios = [
    { timing: "urgent", budgetTotal: 1000000, phone: "+212600000000", consentContact: true },
    { timing: "3-6mois", budgetTotal: 500000 },
    { timing: "veille" },
    {},
  ];

  for (const profile of scenarios) {
    const r = computeLeadTemperature(profile);
    const combined = `${r.label} ${r.reason}`.toLowerCase();
    for (const word of FORBIDDEN) {
      it(`temperature result for ${JSON.stringify(profile)} does not contain "${word}"`, () => {
        assert.ok(!combined.includes(word), `Found forbidden wording "${word}" in: "${combined}"`);
      });
    }
  }
});
