import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSourceDomain,
  projectExistingListingRepresentation,
  type ExistingListingProjectionInput,
} from "../minimal-listing-projection";

const future = "2099-01-01T00:00:00.000Z";
const policy = {
  source_domain: "example.ma",
  authorization_status: "limited_public_facts",
  acquisition_mode: "public_sitemap_canonical_link",
  machine_gate: "canonical_link_only",
  ingestion_gate: "canonical_link_only",
  display_policy: "canonical_link_only",
  policy_expires_at: future,
};

const base: ExistingListingProjectionInput = {
  sourceKind: "listing_source",
  propertyListingId: 10,
  sourceOfferId: 20,
  listingUrl: "https://www.example.ma/annonce/10",
  title: "Appartement Agdal",
  propertyType: "apartment",
  city: "Rabat",
  district: "Agdal",
  priceMad: 1800000,
  surfaceM2: 92,
  thumbnailUrl: "https://cdn.example.ma/a.jpg",
  descriptionSnippet: "Appartement lumineux",
};

test("normalizes only the URL host used as provenance", () => {
  assert.equal(normalizeSourceDomain("https://www.Example.ma/a"), "example.ma");
  assert.equal(normalizeSourceDomain("not-a-url"), null);
});

test("projects an existing listing_source under an explicit positive policy", () => {
  const out = projectExistingListingRepresentation(base, policy, new Date("2026-08-13T00:00:00Z"));
  assert.equal(out.propertyListingId, 10);
  assert.equal(out.sourceOfferId, 20);
  assert.equal(out.canonicalUrl, base.listingUrl);
  assert.equal(out.sourceDomain, "example.ma");
  assert.equal(out.titleOrStructuralSignal, "Appartement Agdal");
  assert.equal(out.geography, "Agdal");
  assert.equal(out.price, 1800000);
  assert.equal(out.surface, 92);
});

test("uses stored property type as structural signal when title is absent", () => {
  const out = projectExistingListingRepresentation(
    { ...base, title: null, propertyType: "villa", district: null },
    policy,
    new Date("2026-08-13T00:00:00Z"),
  );
  assert.equal(out.titleOrStructuralSignal, "villa");
  assert.equal(out.geography, "Rabat");
});

test("never invents optional fields", () => {
  const out = projectExistingListingRepresentation(
    {
      ...base,
      district: null,
      city: null,
      priceMad: null,
      surfaceM2: null,
      thumbnailUrl: null,
      descriptionSnippet: null,
    },
    policy,
    new Date("2026-08-13T00:00:00Z"),
  );
  assert.equal(out.geography, null);
  assert.equal(out.price, null);
  assert.equal(out.surface, null);
  assert.equal(out.photoUrl, null);
  assert.equal(out.description, null);
});

test("fails closed when policy is not admissible", () => {
  assert.throws(
    () => projectExistingListingRepresentation(base, { ...policy, authorization_status: "permission_required" }),
    /SOURCE_POLICY_NOT_ADMISSIBLE/,
  );
});

test("seed-only material cannot be promoted through the projector", () => {
  assert.throws(
    () => projectExistingListingRepresentation(
      { ...base, sourceKind: "seed_only" as never },
      policy,
    ),
    /LISTING_SOURCE_REQUIRED/,
  );
});

test("source provenance must match the policy domain", () => {
  assert.throws(
    () => projectExistingListingRepresentation(
      { ...base, listingUrl: "https://other.ma/annonce/10" },
      policy,
    ),
    /SOURCE_PROVENANCE_REQUIRED/,
  );
});
