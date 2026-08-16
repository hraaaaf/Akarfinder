import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildPropertyCoreModel } from "@/lib/listings/property-core";
import type { Listing } from "@/lib/listings/types";

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "ann-l3-test",
    title: "Appartement familial à Agdal",
    city: "Rabat",
    neighborhood: "Agdal",
    price: 2_450_000,
    currency: "DH",
    surface_m2: 132,
    price_per_m2: 18_560,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 3,
    bathrooms: 2,
    freshness_label: "Récent",
    source_type: "Source analysée",
    reliability_label: "Informations complètes",
    reliability_score: 90,
    reliability_available: true,
    is_mre_friendly: false,
    description: "Test",
    image_url: "",
    reliability_explanation: "Test",
    source_name: "AkarFinder",
    garage_spaces: 1,
    image_permission_status: "unknown",
    source_access_level: "indexed_only",
    can_show_gallery: false,
    can_show_contact: false,
    can_show_thumbnail: false,
    production_allowed: false,
    ...overrides,
  };
}

describe("ANN-L3 Property Core model", () => {
  it("orders transaction, price, title, location and the four essential facts deterministically", () => {
    const value = buildPropertyCoreModel(listing());
    assert.equal(value.transactionLabel, "Vente");
    assert.equal(value.priceLabel, "2 450 000 DH");
    assert.equal(value.priceAvailable, true);
    assert.equal(value.title, "Appartement familial à Agdal");
    assert.equal(value.location, "Agdal, Rabat");
    assert.deepEqual(value.facts.map((fact) => fact.key), ["surface", "bedrooms", "bathrooms", "garage"]);
  });

  it("renders an undisclosed price honestly and never turns it into zero", () => {
    const value = buildPropertyCoreModel(listing({ price: null, price_per_m2: null }));
    assert.equal(value.priceAvailable, false);
    assert.equal(value.priceLabel, "Prix non communiqué");
    assert.doesNotMatch(value.priceLabel, /0\s*DH/);
  });

  it("hides zero or absent core facts instead of printing placeholder metrics", () => {
    const value = buildPropertyCoreModel(listing({
      surface_m2: 58,
      bedrooms: 0,
      bathrooms: 0,
      garage_spaces: undefined,
    }));
    assert.deepEqual(value.facts.map((fact) => fact.key), ["surface"]);
    assert.equal(value.facts[0]?.value, "58 m²");
  });

  it("does not duplicate the location and uses explicit missing states", () => {
    assert.equal(buildPropertyCoreModel(listing({ city: "Rabat", neighborhood: "Rabat" })).location, "Rabat");
    assert.equal(buildPropertyCoreModel(listing({ city: "", neighborhood: "" })).location, "Localisation non renseignée");
    assert.equal(buildPropertyCoreModel(listing({ title: "   " })).title, "Titre non renseigné");
  });

  it("keeps transaction labels truthful for rent and new", () => {
    assert.equal(buildPropertyCoreModel(listing({ transaction_type: "rent" })).transactionLabel, "Location");
    assert.equal(buildPropertyCoreModel(listing({ transaction_type: "new" })).transactionLabel, "Neuf");
  });
});

describe("ANN-L3 production composition", () => {
  it("separates property identity from media while preserving one H1", () => {
    const detail = readFileSync("components/listings/PropertyDetailV2.tsx", "utf8");
    const core = readFileSync("components/listings/PropertyCore.tsx", "utf8");
    const media = readFileSync("components/listings/PropertyMediaGallery.tsx", "utf8");

    assert.match(detail, /<PropertyMediaGallery listing=\{listing\} \/>/);
    assert.match(detail, /<PropertyCore listing=\{listing\} \/>/);
    assert.match(core, /data-announcement-property-core="ann-l3"/);
    assert.equal((core.match(/<h1\b/g) ?? []).length, 1);
    assert.equal((detail.match(/<h1\b/g) ?? []).length, 0);
    assert.doesNotMatch(media, /HeroLabels/);
    assert.doesNotMatch(media, /priceLabel:\s*string|transactionLabel:\s*string|location:\s*string/);
  });

  it("removes the old four-card metric strip without removing detailed facts or provenance", () => {
    const detail = readFileSync("components/listings/PropertyDetailV2.tsx", "utf8");
    assert.doesNotMatch(detail, /formatSurface/);
    assert.doesNotMatch(detail, /rounded-2xl bg-\[#fff8eb\]/);
    assert.match(detail, /detail\.facts\.essential/);
    assert.match(detail, /data-detail-provenance/);
    assert.match(detail, /data-property-characteristics-group/);
    assert.match(detail, /ProvenanceBadge/);
  });

  it("ships a progressive accessible description instead of a permanently long wall of text", () => {
    const description = readFileSync("components/listings/ExpandablePropertyDescription.tsx", "utf8");
    assert.match(description, /aria-expanded=\{expanded\}/);
    assert.match(description, /aria-controls=\{contentId\}/);
    assert.match(description, /min-h-11/);
    assert.match(description, /Voir plus/);
    assert.match(description, /Voir moins/);
  });

  it("provides deterministic noindex fixtures for missing price, long title, sparse and dense facts", () => {
    const qa = readFileSync("app/visual-qa/announcement-page-core/page.tsx", "utf8");
    assert.match(qa, /robots:\s*\{ index: false, follow: false \}/);
    for (const state of ["no-price", "long-title", "sparse", "dense"]) {
      assert.match(qa, new RegExp(state));
    }
    assert.match(qa, /price: null/);
    assert.match(qa, /surface_m2: 58/);
    assert.match(qa, /has_pool: true/);
    assert.match(qa, /production_allowed: false/);
  });
});
