import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseCsvFeed, parseJsonFeed, parseXmlFeed } from "../../../lib/feeds/parsers.js";
import { isValidationError, validateFeedRow } from "../../../lib/feeds/schema.js";
import { validatedFeedRowToPartnerListingV2 } from "../../../lib/feeds/partner-v2-bridge.js";
import { adaptPartnerListingV2, validatePartnerListingV2 } from "../../../lib/partners/partner-listing-v2.js";

const NOW = "2026-08-24T10:10:00.000Z";
const CONTEXT = {
  partner_id: "agence-atlas",
  partner_type: "agency" as const,
  partner_tier: "agency_partner" as const,
  source_authorization_note: "Feed partenaire autorisé (fixture, sans licence réelle).",
  authorization_evidence: { verified: true, reference: "synthetic:authorisation-test-only" },
  media_rights_evidence: { verified: true, reference: "synthetic:media-rights-test-only" },
  acquisition_channel: "partner_feed" as const,
  neighborhood_context_allowed: true,
};

function validatedFromCsv(csv: string) {
  const raw = parseCsvFeed(csv)[0];
  const validated = validateFeedRow(raw, 0);
  assert.equal(isValidationError(validated), false);
  if (isValidationError(validated)) throw new Error(validated.reason);
  return validated;
}

describe("Direct feed → PartnerListingV2 bridge", () => {
  it("bridges a CSV partner row into canonical V2 with stable external identity", () => {
    const csv = [
      "external_id,source_name,source_url,transaction_type,property_type,title,description,city,district,price_mad,surface_m2,bedrooms_count,lat,lng,image_urls,images_rights_confirmed,updated_at_source",
      "ATLAS-42,agence-atlas,https://atlas.ma/a/42,sale,apartment,Appartement Maarif,Appartement lumineux,Casablanca,Maârif,1850000,110,3,33.585,-7.632,https://cdn.atlas.ma/1.jpg|https://cdn.atlas.ma/2.jpg,true,2026-08-24T09:45:00.000Z",
    ].join("\n");
    const validated = validatedFromCsv(csv);
    const bridged = validatedFeedRowToPartnerListingV2(validated, CONTEXT, NOW);
    assert.equal(bridged.ok, true);
    if (!bridged.ok || bridged.kind !== "listing") throw new Error("listing V2 attendue");

    assert.equal(bridged.listing.partner_listing_id, "ATLAS-42");
    assert.equal(bridged.listing.district, "Maârif");
    assert.equal(bridged.listing.availability_status, "unknown", "un simple timestamp source ne prouve pas disponible");
    assert.equal(bridged.listing.media?.length, 2);
    assert.equal(validatePartnerListingV2(bridged.listing).valid, true);

    const canonical = adaptPartnerListingV2(bridged.listing, NOW);
    assert.equal(canonical.offers[0].external_offer_id, "ATLAS-42");
    assert.equal(canonical.offers[0].price_amount.value, 1_850_000);
    assert.equal(canonical.facts.surfaces.surface_total_m2?.value, 110);
    assert.equal(canonical.facts.location.district?.value, "Maârif");
    assert.equal(canonical.media.length, 2);
  });

  it("uses the same bridge for JSON transport", () => {
    const raw = parseJsonFeed(JSON.stringify({ listings: [{
      external_id: "JSON-1",
      source_name: "agence-atlas",
      source_url: "https://atlas.ma/a/json-1",
      transaction_type: "rent",
      property_type: "apartment",
      title: "Appartement Agdal",
      city: "Rabat",
      district: "Agdal",
      price_mad: 9000,
      surface_m2: 80,
      bedrooms_count: 2,
      image_urls: [],
      images_rights_confirmed: false,
      updated_at_source: "2026-08-24T09:45:00.000Z"
    }] }))[0];
    const validated = validateFeedRow(raw, 0);
    assert.equal(isValidationError(validated), false);
    if (isValidationError(validated)) throw new Error(validated.reason);
    const bridged = validatedFeedRowToPartnerListingV2(validated, CONTEXT, NOW);
    assert.equal(bridged.ok, true);
    if (!bridged.ok || bridged.kind !== "listing") throw new Error("listing V2 attendue");
    assert.equal(bridged.listing.transaction_type, "rent");
    assert.equal(bridged.listing.price_amount, 9000);
  });

  it("uses the same bridge for XML transport", () => {
    const xml = `<feed><listing>
      <external_id>XML-1</external_id><source_name>agence-atlas</source_name>
      <source_url>https://atlas.ma/a/xml-1</source_url><transaction_type>sale</transaction_type>
      <property_type>villa</property_type><title>Villa Souissi</title><city>Rabat</city><district>Souissi</district>
      <price_mad>5200000</price_mad><surface_m2>420</surface_m2><bedrooms_count>5</bedrooms_count>
      <updated_at_source>2026-08-24T09:45:00.000Z</updated_at_source>
    </listing></feed>`;
    const validated = validateFeedRow(parseXmlFeed(xml)[0], 0);
    assert.equal(isValidationError(validated), false);
    if (isValidationError(validated)) throw new Error(validated.reason);
    const bridged = validatedFeedRowToPartnerListingV2(validated, CONTEXT, NOW);
    assert.equal(bridged.ok, true);
    if (!bridged.ok || bridged.kind !== "listing") throw new Error("listing V2 attendue");
    assert.equal(bridged.listing.property_type, "villa");
    assert.equal(bridged.listing.surface_m2, 420);
  });

  it("converts minimal delete/unpublish rows into identity-only lifecycle events", () => {
    const csv = [
      "external_id,source_name,source_url,update_signal,updated_at_source",
      "ATLAS-42,agence-atlas,https://atlas.ma/a/42,delete,2026-08-24T09:50:00.000Z",
    ].join("\n");
    const validated = validatedFromCsv(csv);
    const bridged = validatedFeedRowToPartnerListingV2(validated, CONTEXT, NOW);
    assert.equal(bridged.ok, true);
    if (!bridged.ok || bridged.kind !== "lifecycle") throw new Error("lifecycle attendu");
    assert.equal(bridged.event.partner_listing_id, "ATLAS-42");
    assert.equal(bridged.event.availability_status, "withdrawn");
    assert.equal(bridged.event.reason, "delete");
  });

  it("fails closed when legacy URL fallback has no stable partner external id", () => {
    const csv = [
      "external_id,source_name,source_url,transaction_type,property_type,title,city,district,price_mad,surface_m2,images_rights_confirmed",
      ",agence-atlas,https://atlas.ma/a/no-id,sale,apartment,Appartement Gauthier,Casablanca,Gauthier,1500000,90,false",
    ].join("\n");
    const validated = validatedFromCsv(csv);
    const bridged = validatedFeedRowToPartnerListingV2(validated, CONTEXT, NOW);
    assert.equal(bridged.ok, false);
    if (bridged.ok) throw new Error("rejet attendu");
    assert.match(bridged.reason, /external_id/);
  });

  it("does not resurrect image URLs when feed rights are not confirmed", () => {
    const csv = [
      "external_id,source_name,source_url,transaction_type,property_type,title,city,district,price_mad,surface_m2,image_urls,images_rights_confirmed,updated_at_source",
      "ATLAS-99,agence-atlas,https://atlas.ma/a/99,sale,apartment,Appartement Racine,Casablanca,Racine,1700000,100,https://cdn.atlas.ma/private.jpg,false,2026-08-24T09:45:00.000Z",
    ].join("\n");
    const validated = validatedFromCsv(csv);
    assert.equal(validated.image_urls.length, 0);
    const bridged = validatedFeedRowToPartnerListingV2(validated, CONTEXT, NOW);
    assert.equal(bridged.ok, true);
    if (!bridged.ok || bridged.kind !== "listing") throw new Error("listing attendue");
    assert.equal(bridged.listing.media?.length, 0);
    assert.equal(bridged.listing.photos_authorized, false);
  });
  it("rejects an unverified partner grant instead of marking partner_authorized", () => {
    const validated = validatedFromCsv([
      "external_id,source_name,source_url,transaction_type,property_type,title,city,district,price_mad,surface_m2,updated_at_source",
      "ATLAS-201,agence-atlas,https://atlas.ma/a/201,sale,apartment,Appartement Agdal,Rabat,Agdal,1000000,75,2026-08-24T09:40:00.000Z",
    ].join("\n"));
    for (const context of [
      { ...CONTEXT, authorization_evidence: undefined },
      { ...CONTEXT, authorization_evidence: { verified: false, reference: "synthetic:unverified" } },
      { ...CONTEXT, source_authorization_note: "" },
    ]) {
      const result = validatedFeedRowToPartnerListingV2(validated, context, NOW);
      assert.equal(result.ok, false);
      if (!result.ok) assert.match(result.reason, /autorisation/i);
    }
  });

  it("does not fabricate source freshness when updated_at_source is missing, invalid or future", () => {
    const validated = validatedFromCsv([
      "external_id,source_name,source_url,transaction_type,property_type,title,city,district,price_mad,surface_m2,updated_at_source",
      "ATLAS-202,agence-atlas,https://atlas.ma/a/202,sale,apartment,Appartement Agdal,Rabat,Agdal,1000000,75,2026-08-24T09:40:00.000Z",
    ].join("\n"));
    for (const date of [null, "invalid", "2026-08-25T09:40:00.000Z"]) {
      const result = validatedFeedRowToPartnerListingV2({ ...validated, updated_at_source: date }, CONTEXT, NOW);
      assert.equal(result.ok, false);
      if (!result.ok) assert.match(result.reason, /updated_at_source/);
    }
  });

  it("keeps status unknown without positive recent activity evidence, and requires <=48h", () => {
    const validated = validatedFromCsv([
      "external_id,source_name,source_url,transaction_type,property_type,title,city,district,price_mad,surface_m2,updated_at_source",
      "ATLAS-203,agence-atlas,https://atlas.ma/a/203,sale,apartment,Appartement Agdal,Rabat,Agdal,1000000,75,2026-08-24T09:40:00.000Z",
    ].join("\n"));
    const cases = [
      { ctx: CONTEXT, expected: "unknown" },
      { ctx: { ...CONTEXT, activity_evidence: {status: "available" as const, verified: false, checked_at: NOW, reference: "synthetic:fake" } }, expected: "unknown" },
      { ctx: { ...CONTEXT, activity_evidence: {status: "available" as const, verified: true, checked_at: "2026-08-21T10:10:00.000Z", reference: "synthetic:stale" } }, expected: "unknown" },
      { ctx: { ...CONTEXT, activity_evidence: {status: "available" as const, verified: true, checked_at: "2026-08-24T10:00:00.000Z", reference: "synthetic:fresh" } }, expected: "available" },
    ];
    for (const { ctx, expected } of cases) {
      const result = validatedFeedRowToPartnerListingV2(validated, ctx, NOW);
      assert.equal(result.ok, true);
      if (result.ok && result.kind === "listing") assert.equal(result.listing.availability_status, expected);
    }
  });

  it("does not assert photo rights from feed's boolean alone", () => {
    const validated = validatedFromCsv([
      "external_id,source_name,source_url,transaction_type,property_type,title,city,district,price_mad,surface_m2,image_urls,images_rights_confirmed,updated_at_source",
      "ATLAS-204,agence-atlas,https://atlas.ma/a/204,sale,apartment,Appartement Agdal,Rabat,Agdal,1000000,75,https://cdn.atlas.ma/photo.jpg,true,2026-08-24T09:40:00.000Z",
    ].join("\n"));
    assert.equal(validated.image_urls.length, 1, "fixture must contain an image URL");
    const result = validatedFeedRowToPartnerListingV2(validated, { ...CONTEXT, media_rights_evidence: undefined }, NOW);
    assert.equal(result.ok, true);
    if (result.ok && result.kind === "listing") {
      assert.equal(result.listing.photos_authorized, false);
      assert.deepEqual(result.listing.media, []);
    }
  });

  it("rejects mismatched source identity before creating or withdrawing a listing", () => {
    const validated = validatedFromCsv([
      "external_id,source_name,source_url,transaction_type,property_type,title,city,district,price_mad,surface_m2,updated_at_source",
      "ATLAS-205,agence-atlas,https://atlas.ma/a/205,sale,apartment,Appartement Agdal,Rabat,Agdal,1000000,75,2026-08-24T09:40:00.000Z",
    ].join("\n"));
    const result = validatedFeedRowToPartnerListingV2(validated, { ...CONTEXT, partner_id: "other-agency" }, NOW);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /mismatch/);
  });

});
