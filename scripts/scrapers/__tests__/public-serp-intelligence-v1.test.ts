import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAkarInfoPassportForListing } from "../../../lib/akarinfo/akarinfo-passport.js";
import {
  attachPublicSerpIntelligenceToListing,
  buildPublicSerpIntelligenceForListing,
} from "../../../lib/intelligence/public-serp-intelligence-v1.js";
import { getPublicSerpIntelligenceFromListing } from "../../../lib/intelligence/public-serp-intelligence-carrier.js";
import type { Listing } from "../../../lib/listings/types.js";

const NOW = "2026-07-21T22:30:00.000Z";

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "serp-intelligence-1",
    title: "Appartement structuré à Casablanca",
    city: "Casablanca",
    neighborhood: "Maârif",
    district: "Maârif",
    price: 1_000_000,
    price_mad: 1_000_000,
    currency: "DH",
    surface_m2: 100,
    price_per_m2: 10_000,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 2,
    bedrooms_count: 2,
    bathrooms: 1,
    bathrooms_count: 1,
    rooms_count: 3,
    freshness_label: "Mise à jour récente",
    source_type: "Agence",
    reliability_label: "Informations complètes",
    reliability_score: 80,
    reliability_available: true,
    is_mre_friendly: false,
    description: "Appartement structuré avec informations utiles.",
    description_snippet: "Appartement structuré avec informations utiles.",
    image_url: "",
    reliability_explanation: "Information structurée.",
    source_name: "akarfinder",
    listing_url: "https://akarfinder.example/listings/1",
    display_depth: "full",
    can_show_result: true,
    production_allowed: true,
    ...overrides,
  };
}

describe("#18 public SERP intelligence V1", () => {
  it("projects the #11-#17 canonical pipeline into a compact public summary for first-party listings", () => {
    const summary = buildPublicSerpIntelligenceForListing(listing(), {
      source_name: "akarfinder",
      observed_at: NOW,
      generated_at: NOW,
    });

    assert.ok(summary);
    assert.equal(summary?.version, "1.0");
    assert.equal(summary?.status, "available");
    assert.ok(summary?.score != null);
    assert.ok(Number(summary?.score) >= 0 && Number(summary?.score) <= 100);
    assert.match(summary?.coverage_label ?? "", /dimensions documentaires disponibles/);
    assert.ok((summary?.signals.length ?? 0) <= 3);
  });

  it("never exposes the structured intelligence projection on external web results", () => {
    const external = listing({
      source_name: "mubawab",
      display_depth: "limited_preview",
      source_badge: "external_web_result",
      original_source_required: true,
    });

    const summary = buildPublicSerpIntelligenceForListing(external, {
      source_name: "mubawab",
      observed_at: NOW,
      generated_at: NOW,
    });
    const attached = attachPublicSerpIntelligenceToListing(external, {
      source_name: "mubawab",
      observed_at: NOW,
      generated_at: NOW,
    });

    assert.equal(summary, null);
    assert.equal(getPublicSerpIntelligenceFromListing(attached), undefined);
    assert.equal(buildAkarInfoPassportForListing(attached).intelligence, undefined);
  });

  it("allows partner-authorized listings without changing their source semantics", () => {
    const partner = listing({ source_name: "partner_csv", source_access_level: "partner_full" });
    const attached = attachPublicSerpIntelligenceToListing(partner, {
      source_name: "partner_csv",
      observed_at: NOW,
      generated_at: NOW,
    });
    const summary = getPublicSerpIntelligenceFromListing(attached);
    const passport = buildAkarInfoPassportForListing(attached);

    assert.ok(summary);
    assert.equal(passport.kind, "partner_authorized");
    assert.equal(passport.intelligence?.version, "1.0");
    assert.equal(passport.intelligence?.score, summary?.score);
  });

  it("omits unavailable market context instead of fabricating a neutral or zero signal", () => {
    const unsupported = listing({
      property_type: "Terrain",
      price_per_m2: null,
    });
    const summary = buildPublicSerpIntelligenceForListing(unsupported, {
      source_name: "akarfinder",
      observed_at: NOW,
      generated_at: NOW,
    });

    assert.ok(summary);
    assert.equal(summary?.signals.some((signal) => signal.code === "market_context"), false);
    assert.equal(summary?.signals.some((signal) => /0\/100/.test(signal.label)), false);
  });

  it("keeps internal engine fields and unsafe semantics out of the public payload", () => {
    const summary = buildPublicSerpIntelligenceForListing(listing(), {
      source_name: "akarfinder",
      observed_at: NOW,
      generated_at: NOW,
    });
    assert.ok(summary);

    const serialized = JSON.stringify(summary).toLowerCase();
    for (const forbidden of [
      "anomaly_score",
      "duplicate_score",
      "gap_percent",
      "evidence_ref",
      "market_reference_id",
      "association_evidence_count",
      "certifié",
      "certifie",
      "garanti",
      "fiable à 100",
    ]) {
      assert.equal(serialized.includes(forbidden), false, `public summary leaked forbidden token: ${forbidden}`);
    }
  });

  it("carries only the sanitized projection into the AkarInfo passport", () => {
    const attached = attachPublicSerpIntelligenceToListing(listing(), {
      source_name: "akarfinder",
      observed_at: NOW,
      generated_at: NOW,
    });
    const passport = buildAkarInfoPassportForListing(attached);
    const serialized = JSON.stringify(passport);

    assert.equal(passport.kind, "structured_internal");
    assert.ok(passport.intelligence);
    assert.equal(serialized.includes("anomaly_score"), false);
    assert.equal(serialized.includes("duplicate_score"), false);
    assert.equal(serialized.includes("gap_percent"), false);
  });
});
