import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  deriveGatewayPublicAttribution,
  deriveListingPublicAttribution,
} from "@/lib/search/public-attribution";

describe("DETERMINISTIC-ATTRIBUTION-1 — gateway", () => {
  test("known source id resolves the canonical public brand", () => {
    const attribution = deriveGatewayPublicAttribution({
      source_id: "mubawab_serper",
      result_origin: "search_api",
    });

    assert.equal(attribution.kind, "external_web");
    assert.equal(attribution.typeLabel, "Résultat web externe");
    assert.equal(attribution.sourceLabel, "Mubawab");
    assert.equal(attribution.primaryCtaLabel, "Voir sur Mubawab");
    assert.equal(attribution.badge, "external_web_result");
  });

  test("unknown gateway source fails closed without echoing arbitrary text", () => {
    const attribution = deriveGatewayPublicAttribution({
      source_id: "unknown_untrusted_source",
      result_origin: "search_api",
    });

    assert.equal(attribution.sourceLabel, "Source originale");
    assert.equal(attribution.primaryCtaLabel, "Voir la source originale");
    assert.equal(attribution.combinedLabel.includes("unknown_untrusted_source"), false);
  });

  test("indexed origins keep an indexed attribution independent of display copy", () => {
    const attribution = deriveGatewayPublicAttribution({
      source_id: "agenz",
      result_origin: "public_sitemap",
    });

    assert.equal(attribution.kind, "public_index");
    assert.equal(attribution.typeLabel, "Source publique indexée");
    assert.equal(attribution.sourceLabel, "Agenz");
  });
});

describe("DETERMINISTIC-ATTRIBUTION-1 — persisted/structured listing", () => {
  test("first-party aliases resolve to AkarFinder", () => {
    const attribution = deriveListingPublicAttribution({
      source_name: "internal",
    });

    assert.equal(attribution.kind, "first_party");
    assert.equal(attribution.combinedLabel, "AkarFinder");
  });

  test("public indexed source uses policy + canonical allowlist label", () => {
    const attribution = deriveListingPublicAttribution({
      source_name: "MUBAWAB",
      source_display_type: "public_index_source",
      source_badge: "public_indexed",
    });

    assert.equal(attribution.kind, "public_index");
    assert.equal(attribution.typeLabel, "Source publique indexée");
    assert.equal(attribution.sourceLabel, "Mubawab");
  });

  test("external OpenSERP-style source resolves from structured policy", () => {
    const attribution = deriveListingPublicAttribution({
      source_name: "agenz",
      source_display_type: "external_web_result",
      source_badge: "external_web_result",
      result_origin: "direct_source",
    });

    assert.equal(attribution.kind, "external_web");
    assert.equal(attribution.sourceLabel, "Agenz");
  });

  test("partner authorization never promotes an arbitrary raw name into public copy", () => {
    const attribution = deriveListingPublicAttribution({
      source_name: "partner_csv",
      source_access_level: "partner_full",
      source_authorization_status: "confirmed",
    });

    assert.equal(attribution.kind, "partner_authorized");
    assert.equal(attribution.sourceLabel, "Partenaire autorisé");
    assert.equal(attribution.combinedLabel.includes("partner_csv"), false);
  });

  test("unknown raw source fails closed instead of being echoed", () => {
    const attribution = deriveListingPublicAttribution({
      source_name: "Fake Premium Partner <script>",
    });

    assert.equal(attribution.kind, "unknown");
    assert.equal(attribution.sourceLabel, "Origine à confirmer");
    assert.equal(attribution.combinedLabel.includes("Fake Premium"), false);
  });
});
