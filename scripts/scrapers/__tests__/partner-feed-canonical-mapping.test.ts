import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PROPERTY_SCHEMA_VERSION } from "../../../lib/property-schema/core.js";
import { prepareSellerPropertyDraft } from "../../../lib/seller/seller-property-draft.js";
import { calculateSellerReadiness } from "../../../lib/seller/readiness.js";
import { mapPartnerFeedRow } from "../../partner-feeds/canonical-mapping.js";

const completePartnerRow = {
  reference: "AG-0001",
  vente_location: "vente",
  type_bien: "Appartement",
  ville: "Rabat",
  quartier: "Agdal",
  superficie: "112",
  prix: "1850000",
  chambres: "3",
  salles_de_bain: "2",
  etat: "Bon état",
  description: "Appartement lumineux avec deux façades, séjour spacieux, cuisine rénovée et proximité immédiate des écoles et commerces.",
  telephone: "0612345678",
  photos: "https://agency.ma/1.jpg|https://agency.ma/2.jpg|https://agency.ma/3.jpg|https://agency.ma/4.jpg|https://agency.ma/5.jpg|https://agency.ma/6.jpg",
};

describe("B3.4.3 canonical mapping reuses AkarFinder listing identity", () => {
  it("maps partner aliases to Property Schema V1 declared facts", () => {
    const mapped = mapPartnerFeedRow(completePartnerRow);
    assert.equal(mapped.canonical_payload.schema_version, PROPERTY_SCHEMA_VERSION);
    assert.equal(mapped.canonical_payload.source_kind, "partner_declared");
    assert.equal(mapped.canonical_payload.declared_facts["classification.property_type"], "apartment");
    assert.equal(mapped.canonical_payload.declared_facts["offer.transaction_type"], "sale");
    assert.equal(mapped.canonical_payload.declared_facts["location.city"], "Rabat");
    assert.equal(mapped.canonical_payload.declared_facts["surfaces.surface_total_m2"], 112);
    assert.equal(mapped.canonical_payload.declared_facts["layout.bathrooms_count"], 2);
    assert.equal(mapped.publication_eligible, false);
  });

  it("produces the same core facts and readiness as the owner funnel", () => {
    const mapped = mapPartnerFeedRow(completePartnerRow);
    const owner = prepareSellerPropertyDraft({
      city: "Rabat",
      neighborhood: "Agdal",
      propertyType: "Appartement",
      surface: 112,
      price: 1_850_000,
      bedrooms: 3,
      condition: "Bon état",
    });
    for (const path of [
      "classification.property_type",
      "offer.transaction_type",
      "location.city",
      "location.neighborhood",
      "surfaces.surface_total_m2",
      "offer.price_amount",
      "layout.bedrooms_count",
      "condition.condition",
    ]) {
      assert.equal(mapped.canonical_payload.declared_facts[path], owner.declared_facts[path]);
    }

    const readiness = calculateSellerReadiness({
      city: "Rabat",
      neighborhood: "Agdal",
      propertyType: "Appartement",
      surface: 112,
      bedrooms: 3,
      condition: "Bon état",
      price: 1_850_000,
      description: completePartnerRow.description,
      phone: completePartnerRow.telephone,
      photoCount: 6,
      acceptedPhotoCount: 6,
    });
    assert.equal(mapped.canonical_payload.listing_readiness.score, readiness.score);
    assert.equal(mapped.canonical_payload.listing_readiness.label, readiness.label);
  });

  it("keeps incomplete rows in quarantine with explicit blocking issues", () => {
    const mapped = mapPartnerFeedRow({ reference: "AG-2", transaction: "vente", ville: "Rabat" });
    assert.equal(mapped.row_status, "invalid");
    assert.ok(mapped.validation_summary.blocking_count >= 2);
    assert.ok(mapped.validation_summary.issues.some((item) => item.field === "classification.property_type"));
    assert.ok(mapped.validation_summary.issues.some((item) => item.field === "surfaces.surface_total_m2"));
    assert.equal(mapped.canonical_payload.structurally_useful, false);
    assert.equal(mapped.canonical_payload.publication_eligible, false);
  });

  it("accepts rental transaction without changing the owner sale contract", () => {
    const mapped = mapPartnerFeedRow({ ...completePartnerRow, vente_location: "location" });
    assert.equal(mapped.canonical_payload.declared_facts["offer.transaction_type"], "rent");
    const owner = prepareSellerPropertyDraft({ city: "Rabat", propertyType: "Appartement", surface: 112 });
    assert.equal(owner.declared_facts["offer.transaction_type"], "sale");
  });

  it("uses warnings rather than invented values for missing optional information", () => {
    const mapped = mapPartnerFeedRow({
      external_reference: "AG-3",
      transaction_type: "sale",
      property_type: "villa",
      city: "Casablanca",
      surface_m2: "300",
    });
    assert.equal(mapped.row_status, "warning");
    assert.equal(mapped.canonical_payload.declared_facts["offer.price_amount"], undefined);
    assert.equal(mapped.canonical_payload.photo_count, 0);
    assert.ok(mapped.validation_summary.issues.some((item) => item.code === "price_missing"));
    assert.ok(mapped.validation_summary.issues.some((item) => item.code === "photo_count_low"));
  });
});
