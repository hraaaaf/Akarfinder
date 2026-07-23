import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  buildSellerDeclaredFacts,
  prepareSellerPropertyDraft,
} from "../../../lib/seller/seller-property-draft.js";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("AF-AUDIT-P1-049 — seller property draft contract", () => {
  it("maps seller declarations into Property Schema V1 paths without derived facts", () => {
    const facts = buildSellerDeclaredFacts({
      city: "Rabat",
      neighborhood: "Agdal",
      propertyType: "Appartement",
      surface: 112,
      price: 1_850_000,
      bedrooms: 3,
      condition: "Bon état",
    });

    assert.equal(facts["classification.property_type"], "apartment");
    assert.equal(facts["offer.transaction_type"], "sale");
    assert.equal(facts["location.city"], "Rabat");
    assert.equal(facts["surfaces.surface_total_m2"], 112);
    assert.equal(facts["offer.price_amount"], 1_850_000);
    assert.equal(Object.keys(facts).some((key) => key.startsWith("intelligence.")), false);
  });

  it("refuses to call a seller draft structurally useful without city, type, and surface", () => {
    const incomplete = prepareSellerPropertyDraft({ city: "Rabat" });
    assert.equal(incomplete.structurally_useful, false);
    assert.ok(incomplete.required_missing.includes("classification.property_type"));
    assert.ok(incomplete.required_missing.includes("surfaces.surface_total_m2"));

    const complete = prepareSellerPropertyDraft({ city: "Rabat", propertyType: "Villa", surface: 300 });
    assert.equal(complete.structurally_useful, true);
    assert.equal(complete.required_missing.length, 0);
  });
});

describe("AF-AUDIT-P1-049 — lead and property dataset remain separate", () => {
  const route = source("app/api/leads/route.ts");
  const migration = source("supabase/migrations/20260723050000_seller_property_draft_v1.sql");
  const page = source("app/vendre/dossier/page.tsx");
  const form = source("components/vendre/SellerPropertyDraftForm.tsx");

  it("persists a distinct seller_property_drafts row linked to the contact lead", () => {
    assert.ok(route.includes('.from("buyer_leads")'));
    assert.ok(route.includes('.from("seller_property_drafts")'));
    assert.ok(route.includes("lead_id: data.id"));
    assert.ok(route.includes("publication_eligible: false"));
    assert.ok(route.includes("sellerDraft.structurally_useful"));
  });

  it("keeps the seller draft internal and impossible to publish directly", () => {
    assert.ok(migration.includes("publication_eligible boolean not null default false"));
    assert.ok(migration.includes("check (publication_eligible = false)"));
    assert.ok(migration.includes("enable row level security"));
    assert.ok(migration.includes("revoke all on table public.seller_property_drafts from anon, authenticated"));
    assert.ok(migration.includes("to service_role"));
  });

  it("uses the structured draft UI and explains declared-vs-verified truth", () => {
    assert.ok(page.includes("SellerPropertyDraftForm"));
    assert.ok(form.includes("faits déclarés"));
    assert.ok(form.includes("ni une publication"));
    assert.ok(form.includes("form.city.trim()"));
    assert.ok(form.includes("form.propertyType"));
    assert.ok(form.includes("Number(form.surface) > 0"));
    assert.ok(form.includes("Voir les offres comparables"));
  });
});
