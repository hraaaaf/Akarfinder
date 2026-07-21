import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Listing } from "../../../lib/listings/types.js";
import { buildPublicPropertyDetailV2 } from "../../../lib/property-detail/public-property-detail-v2.js";

const NOW = "2026-07-21T23:30:00.000Z";

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "detail-v2-1",
    title: "Appartement structuré",
    city: "Casablanca",
    neighborhood: "Maârif",
    price: 1_200_000,
    price_mad: 1_200_000,
    currency: "DH",
    surface_m2: 100,
    price_per_m2: 12_000,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 3,
    bathrooms: 2,
    freshness_label: "Mise à jour récente",
    source_type: "Agence",
    reliability_label: "Informations complètes",
    reliability_score: 80,
    reliability_available: true,
    is_mre_friendly: false,
    description: "Description fournie.",
    image_url: "",
    reliability_explanation: "Information structurée.",
    source_name: "partner_csv",
    listing_url: "https://partner.example/listing/1",
    display_depth: "full",
    can_show_result: true,
    can_show_contact: true,
    production_allowed: true,
    ...overrides,
  };
}

describe("#19 Property Detail V2 public read model", () => {
  it("builds only for first-party or partner-authorized structured listings", () => {
    const partner = buildPublicPropertyDetailV2(listing(), {
      source_name: "partner_csv",
      observed_at: NOW,
      created_at: "2026-07-01T10:00:00.000Z",
      generated_at: NOW,
    });
    assert.ok(partner);

    const external = buildPublicPropertyDetailV2(
      listing({ source_name: "mubawab", display_depth: "limited_preview" }),
      { source_name: "mubawab", observed_at: NOW, generated_at: NOW },
    );
    assert.equal(external, null);
  });

  it("keeps AkarScore separate from personalized fit and never invents a Fit Score", () => {
    const detail = buildPublicPropertyDetailV2(listing(), {
      source_name: "partner_csv",
      observed_at: NOW,
      generated_at: NOW,
    });
    assert.ok(detail);
    assert.equal(detail?.fit.status, "not_calculated");
    assert.equal(detail?.fit.label, "Compatibilité personnalisée non calculée");
    assert.equal("score" in (detail?.fit ?? {}), false);
    assert.ok(detail?.conclusion.akar_score == null || Number.isFinite(detail.conclusion.akar_score));
  });

  it("marks source facts as declared for an authorized partner and computed price/m2 separately", () => {
    const detail = buildPublicPropertyDetailV2(listing(), {
      source_name: "partner_csv",
      observed_at: NOW,
      generated_at: NOW,
    });
    assert.ok(detail);

    const price = detail?.facts.essential.find((item) => item.key === "price");
    const pricePerM2 = detail?.facts.essential.find((item) => item.key === "price_per_m2");
    assert.equal(price?.provenance, "declared");
    assert.equal(pricePerM2?.provenance, "calculated");
    assert.notEqual(price?.provenance_label, pricePerM2?.provenance_label);
  });

  it("does not claim documentary verification when no verified-document evidence exists", () => {
    const detail = buildPublicPropertyDetailV2(listing(), {
      source_name: "partner_csv",
      observed_at: NOW,
      generated_at: NOW,
    });
    assert.ok(detail);
    assert.equal(detail?.provenance.verified_document_count, 0);
    assert.match(detail?.provenance.verified_document_label ?? "", /aucune/i);
    assert.equal(
      Object.values(detail?.facts ?? {})
        .flat()
        .some((item) => item.provenance === "verified_document"),
      false,
    );
  });

  it("uses only real observation timestamps for history and does not synthesize former prices", () => {
    const detail = buildPublicPropertyDetailV2(listing(), {
      source_name: "partner_csv",
      created_at: "2026-07-01T10:00:00.000Z",
      observed_at: NOW,
      generated_at: NOW,
    });
    assert.ok(detail);
    assert.ok((detail?.history.length ?? 0) >= 1);
    const serialized = JSON.stringify(detail);
    assert.equal(serialized.includes("initialPrice"), false);
    assert.equal(serialized.includes("priceChangePercent"), false);
  });

  it("keeps unknown costs explicit and omits fabricated neighborhood/proximity claims", () => {
    const detail = buildPublicPropertyDetailV2(
      listing({ nearby_places: undefined, neighborhood_summary: undefined }),
      { source_name: "partner_csv", observed_at: NOW, generated_at: NOW },
    );
    assert.ok(detail);
    assert.equal(detail?.costs.status, "not_provided");
    const serialized = JSON.stringify(detail).toLowerCase();
    for (const forbidden of ["supermarché", "mosquée", "clinique", "minutes", "gare"]) {
      assert.equal(serialized.includes(forbidden), false, `fabricated environment token leaked: ${forbidden}`);
    }
  });

  it("does not expose raw internal intelligence fields", () => {
    const detail = buildPublicPropertyDetailV2(listing(), {
      source_name: "partner_csv",
      observed_at: NOW,
      generated_at: NOW,
    });
    assert.ok(detail);
    const serialized = JSON.stringify(detail).toLowerCase();
    for (const forbidden of [
      "anomaly_score",
      "duplicate_score",
      "market_reference_id",
      "association_evidence_count",
      "evidence_ref",
    ]) {
      assert.equal(serialized.includes(forbidden), false, `internal field leaked: ${forbidden}`);
    }
  });
});
