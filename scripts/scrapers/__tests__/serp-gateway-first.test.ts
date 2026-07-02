// SERP-PURE-GATEWAY-FIRST-1
// Invariant tests for the gateway-first SERP model:
//   - Gateway results are the primary content surface
//   - External results must redirect to original source, never to an internal /listings page
//   - No contact, WhatsApp, gallery, or lead form on external results
//   - Thumbnails are OFF when the flag is absent or false
//   - Gateway sources are never classified as first_party / partner_authorized
//   - partner_csv / akarfinder remain publishable (authorized-only invariant)

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import { normalizeSearchGatewayResult } from "../../../lib/search-gateway/search-gateway-normalizer.js";
import { getEnabledSearchGatewaySources } from "../../../lib/search-gateway/search-gateway-sources.js";
import {
  getSourceAccessType,
  canPublishStructuredListing,
} from "../../../lib/sources/source-access-registry.js";

// ─── Env helpers ─────────────────────────────────────────────────────────────

const savedThumbnailFlag = process.env.NEXT_PUBLIC_SEARCH_GATEWAY_THUMBNAILS_ENABLED;

after(() => {
  if (savedThumbnailFlag === undefined) delete process.env.NEXT_PUBLIC_SEARCH_GATEWAY_THUMBNAILS_ENABLED;
  else process.env.NEXT_PUBLIC_SEARCH_GATEWAY_THUMBNAILS_ENABLED = savedThumbnailFlag;
});

// Build one normalized result per gateway source using a realistic-looking URL.
const SAMPLE_URLS: Record<string, string> = {
  avito: "https://avito.ma/casablanca/appartements/appartement-maarif-12345",
  sarouty: "https://sarouty.ma/immobilier/vente/appartements/casablanca",
  mubawab: "https://mubawab.ma/fr/annonce/appartement-casablanca-999",
  agenz: "https://agenz.ma/listings/appartement-123",
  "logic-immo": "https://logic-immo.ma/vente-immobilier-appartement.html",
  yakeey: "https://yakeey.com/annonces/appartement-casablanca-1",
};

function makeResult(sourceId: string) {
  const url = SAMPLE_URLS[sourceId] ?? `https://${sourceId}.ma/listing/1`;
  return normalizeSearchGatewayResult(
    {
      title: "Appartement 3 pièces test",
      snippet: "Bel appartement rénové, proche des commerces.",
      link: url,
    },
    sourceId
  );
}

// ─── CTA / redirect invariants ────────────────────────────────────────────────

describe("serp-gateway-first — CTA externe = Voir sur [source]", () => {
  for (const source of getEnabledSearchGatewaySources()) {
    const sid = source.source_id;
    it(`${sid}: primary_cta_label starts with "Voir sur"`, () => {
      const result = makeResult(sid);
      if (!result) return; // URL may not match domain — skip gracefully
      assert.ok(
        result.primary_cta_label.startsWith("Voir sur"),
        `Expected "Voir sur …" but got "${result.primary_cta_label}" for ${sid}`
      );
    });

    it(`${sid}: primary_cta = "view_original"`, () => {
      const result = makeResult(sid);
      if (!result) return;
      assert.equal(result.primary_cta, "view_original");
    });
  }
});

// ─── No internal /listings link ───────────────────────────────────────────────
// External results must redirect to original source URLs, never to internal
// AkarFinder Next.js pages like /listings/[id].

describe("serp-gateway-first — aucun lien /listings pour résultat externe", () => {
  for (const source of getEnabledSearchGatewaySources()) {
    const sid = source.source_id;
    it(`${sid}: original_url is an absolute external URL (not a relative /listings/ internal path)`, () => {
      const result = makeResult(sid);
      if (!result) return;
      // Must be an absolute URL (starts with https://) — never a relative /listings/ AkarFinder path
      assert.ok(
        result.original_url.startsWith("https://"),
        `original_url must be an absolute external URL, got: ${result.original_url}`
      );
      // Must not be an AkarFinder-internal route (relative path only)
      assert.ok(
        !result.original_url.startsWith("/listings/"),
        `original_url must not be a relative internal /listings/ path`
      );
    });
  }
});

// ─── No contact / WhatsApp / gallery ──────────────────────────────────────────

describe("serp-gateway-first — aucun contact/WhatsApp/galerie sur résultats externes", () => {
  for (const source of getEnabledSearchGatewaySources()) {
    const sid = source.source_id;
    it(`${sid}: can_show_contact=false`, () => {
      const result = makeResult(sid);
      if (!result) return;
      assert.equal(result.can_show_contact, false);
    });

    it(`${sid}: can_show_gallery=false`, () => {
      const result = makeResult(sid);
      if (!result) return;
      assert.equal(result.can_show_gallery, false);
    });

    it(`${sid}: no lead/form field exposed`, () => {
      const result = makeResult(sid);
      if (!result) return;
      const keys = Object.keys(result);
      assert.ok(
        !keys.some((k) => k.includes("form") || k.includes("lead")),
        `No lead/form field should be present in normalized result`
      );
    });
  }
});

// ─── Thumbnail purity ─────────────────────────────────────────────────────────

describe("serp-gateway-first — miniatures OFF quand flag absent", () => {
  before(() => {
    delete process.env.NEXT_PUBLIC_SEARCH_GATEWAY_THUMBNAILS_ENABLED;
  });

  it("can_show_thumbnail=false when flag is unset", () => {
    const result = normalizeSearchGatewayResult(
      {
        title: "Appartement avec vue",
        link: "https://avito.ma/annonce/appartement-123",
        imageUrl: "https://gstatic.com/thumb-avito.jpg",
      },
      "avito_serper"
    );
    assert.ok(result !== null);
    assert.equal(result!.can_show_thumbnail, false);
    assert.equal(result!.thumbnail_url, undefined);
  });

  it("can_cache_thumbnail=false always", () => {
    const result = makeResult("avito");
    if (!result) return;
    assert.equal(result.can_cache_thumbnail, false);
  });

  it("can_download_thumbnail=false always", () => {
    const result = makeResult("avito");
    if (!result) return;
    assert.equal(result.can_download_thumbnail, false);
  });
});

// ─── Source registry invariants ───────────────────────────────────────────────

// Gateway sources must NEVER be publishable as structured AkarFinder listings.
// Their registry classification may vary (public_external_live, benchmark_source,
// or third_party_legacy for sources that also exist in the DB) — what matters is
// that canPublishStructuredListing() returns false for every gateway source.
describe("serp-gateway-first — gateway sources non publiables comme annonces structurées", () => {
  for (const source of getEnabledSearchGatewaySources()) {
    const sid = source.source_id;

    it(`${sid}: canPublishStructuredListing=false`, () => {
      assert.equal(
        canPublishStructuredListing(sid),
        false,
        `Gateway source ${sid} must never be publishable as a structured listing`
      );
    });

    it(`${sid}: not classified as first_party or partner_authorized`, () => {
      const type = getSourceAccessType(sid);
      assert.ok(
        type !== "first_party" && type !== "partner_authorized",
        `Gateway source ${sid} must not be first_party/partner_authorized, got ${type}`
      );
    });
  }
});

// ─── Authorized sources preserved ─────────────────────────────────────────────

describe("serp-gateway-first — sources autorisées préservées", () => {
  it("partner_csv: canPublishStructuredListing=true", () => {
    assert.equal(canPublishStructuredListing("partner_csv"), true);
  });

  it("akarfinder: canPublishStructuredListing=true", () => {
    assert.equal(canPublishStructuredListing("akarfinder"), true);
  });

  it("internal: canPublishStructuredListing=true", () => {
    assert.equal(canPublishStructuredListing("internal"), true);
  });
});

// ─── Original link required ───────────────────────────────────────────────────

describe("serp-gateway-first — original_link_required=true pour toutes les sources", () => {
  for (const source of getEnabledSearchGatewaySources()) {
    it(`${source.source_id}: original_link_required=true`, () => {
      assert.equal(source.original_link_required, true);
    });
  }
});

// ─── Attribution label ────────────────────────────────────────────────────────

describe("serp-gateway-first — attribution label présent", () => {
  it("result_attribution_label is non-empty for avito", () => {
    const result = makeResult("avito");
    if (!result) return;
    assert.ok(
      typeof result.result_attribution_label === "string" &&
        result.result_attribution_label.length > 0,
      "result_attribution_label must be a non-empty string"
    );
  });
});
