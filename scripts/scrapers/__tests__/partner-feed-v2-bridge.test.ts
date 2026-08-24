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
  source_authorization_note: "Feed partenaire autorisé.",
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
      "external_id,source_name,source_url,transaction_type,property_type,title,city,district,price_mad,surface_m2,image_urls,images_rights_confirmed",
      "ATLAS-99,agence-atlas,https://atlas.ma/a/99,sale,apartment,Appartement Racine,Casablanca,Racine,1700000,100,https://cdn.atlas.ma/private.jpg,false",
    ].join("\n");
    const validated = validatedFromCsv(csv);
    assert.equal(validated.image_urls.length, 0);
    const bridged = validatedFeedRowToPartnerListingV2(validated, CONTEXT, NOW);
    assert.equal(bridged.ok, true);
    if (!bridged.ok || bridged.kind !== "listing") throw new Error("listing attendue");
    assert.equal(bridged.listing.media?.length, 0);
    assert.equal(bridged.listing.photos_authorized, false);
  });
});
