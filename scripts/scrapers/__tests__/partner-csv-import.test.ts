// Unit tests: partner CSV import pipeline.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  parseCsv,
  normalizePartnerCsvListing,
  validatePartnerCsvListing,
  buildPartnerFingerprint,
  computePartnerCompletenessScore,
  containsPii,
  REQUIRED_HEADERS,
  ALL_EXPECTED_HEADERS,
} from "../../import-partner-csv.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function baseRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    title: "Appartement 3 pièces Casablanca Gauthier",
    price_mad: "1200000",
    city: "Casablanca",
    district: "Gauthier",
    property_type: "apartment",
    transaction_type: "sale",
    surface_m2: "95",
    rooms_count: "3",
    bedrooms_count: "2",
    bathrooms_count: "1",
    description_snippet: "Bel appartement bien exposé",
    seller_name: "Agence Atlas",
    source_name: "agence_test",
    source_url: "https://agence-test.ma/annonce/123",
    ...overrides,
  };
}

function baseListing(overrides = {}) {
  return normalizePartnerCsvListing(baseRow(), "agence_test");
}

// ─── parseCsv ─────────────────────────────────────────────────────────────────

describe("parseCsv", () => {
  it("parses a simple CSV with header + 1 data row", () => {
    const csv = "title,price_mad,city\nAppart test,500000,Rabat";
    const rows = parseCsv(csv);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], ["title", "price_mad", "city"]);
    assert.deepEqual(rows[1], ["Appart test", "500000", "Rabat"]);
  });

  it("handles quoted fields with embedded commas", () => {
    const csv = `title,description\n"Appart, Casablanca","Belle vue, lumineux"`;
    const rows = parseCsv(csv);
    assert.equal(rows[1][0], "Appart, Casablanca");
    assert.equal(rows[1][1], "Belle vue, lumineux");
  });

  it("handles escaped quotes inside quoted fields", () => {
    const csv = `title\n"L'""Océan"" Residence"`;
    const rows = parseCsv(csv);
    assert.equal(rows[1][0], `L'"Océan" Residence`);
  });

  it("removes trailing empty rows", () => {
    const csv = "title,city\nAppart,Rabat\n\n";
    const rows = parseCsv(csv);
    assert.equal(rows.length, 2);
  });

  it("returns header-only for empty CSV", () => {
    const csv = "title,city";
    const rows = parseCsv(csv);
    assert.equal(rows.length, 1);
  });
});

// ─── normalizePartnerCsvListing ───────────────────────────────────────────────

describe("normalizePartnerCsvListing", () => {
  it("trims all string fields", () => {
    const row = baseRow({ title: "  Appart  ", city: " Rabat " });
    const l = normalizePartnerCsvListing(row);
    assert.equal(l.title, "Appart");
    assert.equal(l.city, "Rabat");
  });

  it("converts price_mad to number", () => {
    const l = normalizePartnerCsvListing(baseRow({ price_mad: "1 200 000" }));
    assert.equal(l.price_mad, 1200000);
  });

  it("converts surface_m2 to number", () => {
    const l = normalizePartnerCsvListing(baseRow({ surface_m2: "120" }));
    assert.equal(l.surface_m2, 120);
  });

  it("normalises property_type: appartement → apartment", () => {
    const l = normalizePartnerCsvListing(baseRow({ property_type: "appartement" }));
    assert.equal(l.property_type, "apartment");
  });

  it("normalises property_type: terrain → land", () => {
    const l = normalizePartnerCsvListing(baseRow({ property_type: "terrain" }));
    assert.equal(l.property_type, "land");
  });

  it("normalises transaction_type: vente → sale", () => {
    const l = normalizePartnerCsvListing(baseRow({ transaction_type: "vente" }));
    assert.equal(l.transaction_type, "sale");
  });

  it("normalises transaction_type: location → rent", () => {
    const l = normalizePartnerCsvListing(baseRow({ transaction_type: "location" }));
    assert.equal(l.transaction_type, "rent");
  });

  it("sets rooms_count to null for empty string", () => {
    const l = normalizePartnerCsvListing(baseRow({ rooms_count: "" }));
    assert.equal(l.rooms_count, null);
  });

  it("uses fallbackSource when source_name empty", () => {
    const l = normalizePartnerCsvListing(baseRow({ source_name: "" }), "fallback_src");
    assert.equal(l.source_name, "fallback_src");
  });

  it("sets source_url to null when empty", () => {
    const l = normalizePartnerCsvListing(baseRow({ source_url: "" }));
    assert.equal(l.source_url, null);
  });
});

// ─── validatePartnerCsvListing ────────────────────────────────────────────────

describe("validatePartnerCsvListing", () => {
  it("accepts a valid listing", () => {
    const err = validatePartnerCsvListing(baseListing(), 2);
    assert.equal(err, null);
  });

  it("rejects title absent", () => {
    const l = normalizePartnerCsvListing(baseRow({ title: "" }));
    const err = validatePartnerCsvListing(l, 2);
    assert.ok(err);
    assert.ok(err.reason.includes("title absent"));
  });

  it("rejects title too short (< 5 chars)", () => {
    const l = normalizePartnerCsvListing(baseRow({ title: "Apt" }));
    const err = validatePartnerCsvListing(l, 2);
    assert.ok(err);
    assert.ok(err.reason.includes("trop court"));
  });

  it("rejects price_mad absent (0)", () => {
    const l = normalizePartnerCsvListing(baseRow({ price_mad: "" }));
    const err = validatePartnerCsvListing(l, 2);
    assert.ok(err);
    assert.ok(err.reason.includes("price_mad absent"));
  });

  it("rejects price_mad < 1000", () => {
    const l = normalizePartnerCsvListing(baseRow({ price_mad: "500" }));
    const err = validatePartnerCsvListing(l, 2);
    assert.ok(err);
    assert.ok(err.reason.includes("< 1000"));
  });

  it("rejects city absente", () => {
    const l = normalizePartnerCsvListing(baseRow({ city: "" }));
    const err = validatePartnerCsvListing(l, 2);
    assert.ok(err);
    assert.ok(err.reason.includes("city absente"));
  });

  it("rejects invalid property_type", () => {
    const l = normalizePartnerCsvListing(baseRow({ property_type: "duplex" }));
    const err = validatePartnerCsvListing(l, 2);
    assert.ok(err);
    assert.ok(err.reason.includes("property_type invalide"));
  });

  it("rejects invalid transaction_type", () => {
    const l = normalizePartnerCsvListing(baseRow({ transaction_type: "echange" }));
    const err = validatePartnerCsvListing(l, 2);
    assert.ok(err);
    assert.ok(err.reason.includes("transaction_type invalide"));
  });

  it("rejects apartment with missing surface", () => {
    const l = normalizePartnerCsvListing(baseRow({ surface_m2: "" }));
    const err = validatePartnerCsvListing(l, 2);
    assert.ok(err);
    assert.ok(err.reason.includes("surface_m2 obligatoire pour apartment"));
  });

  it("rejects apartment with surface < 15", () => {
    const l = normalizePartnerCsvListing(baseRow({ surface_m2: "10" }));
    const err = validatePartnerCsvListing(l, 2);
    assert.ok(err);
    assert.ok(err.reason.includes("< 15 m²"));
  });

  it("allows land without surface", () => {
    const l = normalizePartnerCsvListing(
      baseRow({ property_type: "land", surface_m2: "" })
    );
    const err = validatePartnerCsvListing(l, 2);
    assert.equal(err, null);
  });

  it("rejects description_snippet with phone number", () => {
    const l = normalizePartnerCsvListing(
      baseRow({ description_snippet: "Contactez 0661234567 pour info" })
    );
    const err = validatePartnerCsvListing(l, 2);
    assert.ok(err);
    assert.ok(err.reason.includes("description_snippet contient PII"));
  });

  it("rejects description_snippet with email", () => {
    const l = normalizePartnerCsvListing(
      baseRow({ description_snippet: "info@agence.ma pour contact" })
    );
    const err = validatePartnerCsvListing(l, 2);
    assert.ok(err);
    assert.ok(err.reason.includes("description_snippet contient PII"));
  });

  it("rejects description_snippet with WhatsApp mention", () => {
    const l = normalizePartnerCsvListing(
      baseRow({ description_snippet: "Disponible sur WhatsApp" })
    );
    const err = validatePartnerCsvListing(l, 2);
    assert.ok(err);
    assert.ok(err.reason.includes("description_snippet contient PII"));
  });

  it("rejects seller_name with phone number", () => {
    const l = normalizePartnerCsvListing(
      baseRow({ seller_name: "Agence 0661234567" })
    );
    const err = validatePartnerCsvListing(l, 2);
    assert.ok(err);
    assert.ok(err.reason.includes("seller_name contient téléphone/email"));
  });

  it("rejects source_url absent for non-internal source", () => {
    const l = normalizePartnerCsvListing(
      baseRow({ source_url: "", source_name: "agence_inconnue" })
    );
    const err = validatePartnerCsvListing(l, 2);
    assert.ok(err);
    assert.ok(err.reason.includes("source_url obligatoire"));
  });

  it("includes line number in rejection", () => {
    const l = normalizePartnerCsvListing(baseRow({ title: "" }));
    const err = validatePartnerCsvListing(l, 42);
    assert.ok(err);
    assert.equal(err.line, 42);
  });
});

// ─── containsPii ─────────────────────────────────────────────────────────────

describe("containsPii", () => {
  it("detects Moroccan phone format 06XXXXXXXX", () => {
    assert.ok(containsPii("0661234567"));
  });

  it("detects +212 international format", () => {
    assert.ok(containsPii("+212661234567"));
  });

  it("detects email address", () => {
    assert.ok(containsPii("contact@agence.ma"));
  });

  it("detects WhatsApp mention", () => {
    assert.ok(containsPii("Disponible sur WhatsApp"));
  });

  it("passes clean text", () => {
    assert.equal(containsPii("Bel appartement lumineux proche centre"), false);
  });
});

// ─── buildPartnerFingerprint ──────────────────────────────────────────────────

describe("buildPartnerFingerprint", () => {
  it("produces a stable fingerprint", () => {
    const fp1 = buildPartnerFingerprint(baseListing());
    const fp2 = buildPartnerFingerprint(baseListing());
    assert.equal(fp1, fp2);
  });

  it("re-importing same row does not change fingerprint", () => {
    const row = baseRow();
    const l1 = normalizePartnerCsvListing(row);
    const l2 = normalizePartnerCsvListing(row);
    assert.equal(buildPartnerFingerprint(l1), buildPartnerFingerprint(l2));
  });

  it("different city → different fingerprint", () => {
    const l1 = normalizePartnerCsvListing(baseRow({ city: "Casablanca" }));
    const l2 = normalizePartnerCsvListing(baseRow({ city: "Rabat" }));
    assert.notEqual(buildPartnerFingerprint(l1), buildPartnerFingerprint(l2));
  });

  it("different property_type → different fingerprint", () => {
    const l1 = normalizePartnerCsvListing(baseRow({ property_type: "apartment" }));
    const l2 = normalizePartnerCsvListing(
      baseRow({ property_type: "villa", surface_m2: "250" })
    );
    assert.notEqual(buildPartnerFingerprint(l1), buildPartnerFingerprint(l2));
  });

  it("different source_name with same content → same fingerprint (dedup by content)", () => {
    const l1 = normalizePartnerCsvListing(
      baseRow({ source_name: "agence_a", source_url: "https://a.ma/1" })
    );
    const l2 = normalizePartnerCsvListing(
      baseRow({ source_name: "agence_b", source_url: "https://b.ma/1" })
    );
    // Fingerprint is content-based, not source-based — same property should merge
    assert.equal(buildPartnerFingerprint(l1), buildPartnerFingerprint(l2));
  });

  it("price within same bucket (50k) → same fingerprint", () => {
    const l1 = normalizePartnerCsvListing(baseRow({ price_mad: "1195000" }));
    const l2 = normalizePartnerCsvListing(baseRow({ price_mad: "1205000" }));
    assert.equal(buildPartnerFingerprint(l1), buildPartnerFingerprint(l2));
  });

  it("price in different buckets → different fingerprint", () => {
    const l1 = normalizePartnerCsvListing(baseRow({ price_mad: "1100000" }));
    const l2 = normalizePartnerCsvListing(baseRow({ price_mad: "1300000" }));
    assert.notEqual(buildPartnerFingerprint(l1), buildPartnerFingerprint(l2));
  });
});

// ─── computePartnerCompletenessScore ─────────────────────────────────────────

describe("computePartnerCompletenessScore", () => {
  it("full row scores 100", () => {
    const score = computePartnerCompletenessScore(baseListing());
    assert.ok(score >= 90, `Expected >= 90, got ${score}`);
  });

  it("minimal row (title+price+city+type+tx) scores > 0", () => {
    const l = normalizePartnerCsvListing({
      title: "Appart Casablanca",
      price_mad: "800000",
      city: "Casablanca",
      property_type: "land",
      transaction_type: "sale",
      source_name: "test",
      source_url: "https://test.ma/1",
      district: "",
      surface_m2: "",
      rooms_count: "",
      bedrooms_count: "",
      bathrooms_count: "",
      description_snippet: "",
      seller_name: "",
    });
    const score = computePartnerCompletenessScore(l);
    assert.ok(score > 0, `Expected > 0, got ${score}`);
  });
});
