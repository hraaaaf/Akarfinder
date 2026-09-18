import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";

import { adaptCollectionListing, type CollectionListing } from "../../../data-ingestion/collection-adapter.js";
import { Lot7SandboxStore } from "../../../data-ingestion/sandbox-store.js";
import { queryDbListings } from "../../../lib/listings/db-listings.js";
import { routePublicSearch } from "../../../lib/odm/odm-public-routing.js";
import type { PublicSearchInput, PublicSearchPage } from "../../../lib/search-gateway/public-search-cursor.js";
import type { SearchGatewayNormalizedResult } from "../../../lib/search-gateway/search-gateway-types.js";

const ROOT = resolve(process.cwd());

function fixture(): CollectionListing {
  return JSON.parse(
    readFileSync(resolve(ROOT, "data-ingestion", "samples", "listing.complete.json"), "utf8"),
  ) as CollectionListing;
}

function makeListing(index: number): CollectionListing {
  const base = structuredClone(fixture());
  const rent = index % 2 === 0;
  base.akar_id = null;
  base.source.name = "mubawab";
  base.source.source_id = `lot7-api-${index}`;
  base.source.url = `https://www.mubawab.ma/fr/a/lot7-api-${index}`;
  base.provenance.source_type = "portal";
  base.provenance.source_listing_url = base.source.url;
  base.provenance.retrieval_method = "crawl";
  base.transaction = rent ? "rent" : "sale";
  base.property_type = index % 3 === 0 ? "villa" : "apartment";
  base.location.city = index <= 6 ? "Casablanca" : "Rabat";
  base.price.amount = rent ? 8_000 + index * 100 : 1_200_000 + index * 100_000;
  base.price.period = rent ? "month" : "total";
  base.surface.total_m2 = 80 + index * 10;
  base.title = `${rent ? "Location" : "Vente"} Lot7 API ${index}`;
  base.source.content_hash = index.toString(16).padStart(64, "0");
  return base;
}

function odmAdapter(dbPath: string) {
  return async (input: PublicSearchInput): Promise<PublicSearchPage> => {
    const transaction = input.intent === "buy" ? "sale" : input.intent;
    const result = queryDbListings({
      city: input.city,
      property_type: input.propertyType,
      transaction_type: transaction,
      min_price: input.minPrice,
      max_price: input.maxPrice,
      min_surface: input.minSurface,
      max_surface: input.maxSurface,
      limit: input.limit ?? 50,
      offset: 0,
    }, dbPath);

    const rows: SearchGatewayNormalizedResult[] = result.listings.map((row) => ({
      id: String(row.id),
      title: row.title ?? "Bien immobilier",
      original_url: row.listing_url ?? row.source_url ?? `https://akarfinder.local/listing/${row.id}`,
      display_url: row.listing_url ?? row.source_url ?? `https://akarfinder.local/listing/${row.id}`,
      source_id: (row.source_name ?? "unknown").toLowerCase(),
      source_name: row.source_name ?? "Unknown",
      domain: "mubawab.ma",
      result_origin: "public_sitemap",
      search_result_display_mode: "thin_indexed_result",
      source_badge: "public_indexed",
      production_allowed: true,
      can_show_result: true,
      can_show_thumbnail: false,
      can_show_contact: false,
      can_show_gallery: false,
      can_cache_thumbnail: false,
      can_download_thumbnail: false,
      primary_cta: "view_original",
      primary_cta_label: "Voir l'annonce",
      result_attribution_label: "Source publique indexée",
      thumbnail_risk_accepted: false,
      normalized_city: row.city ?? undefined,
      normalized_property_type: row.property_type ?? undefined,
      normalized_intent: row.transaction_type === "sale" ? "buy" : row.transaction_type ?? undefined,
      normalized_price_mad: row.price_mad ?? undefined,
      normalized_surface_m2: row.surface_m2 ?? undefined,
      price_per_m2_mad: row.price_mad && row.surface_m2 ? Math.round(row.price_mad / row.surface_m2) : undefined,
      quality_tier: "Q2_comparable",
      quality_score: row.data_completeness_score,
      display_eligibility: "eligible_primary",
      display_eligibility_reason: "lot7 sandbox",
    }));

    return {
      results: rows,
      results_count: rows.length,
      total_count: result.total,
      has_more: false,
      next_cursor: null,
    };
  };
}

describe("Lot 7 API routing through real ODM public router", () => {
  it("routes a structured public search through the sandbox ODM dependency and never touches legacy/prod", async () => {
    const dir = mkdtempSync(join(tmpdir(), "akarfinder-lot7-api-"));
    const dbPath = join(dir, "lot7-api.db");
    const store = new Lot7SandboxStore(dbPath);

    try {
      for (let i = 1; i <= 12; i++) {
        store.importCanonical(adaptCollectionListing(makeListing(i), "lot7-api"));
      }

      let legacyCalled = false;
      const routed = await routePublicSearch({
        stableKey: "lot7-api-casablanca-villa-buy",
        publicQuery: {
          city: "Casablanca",
          property_type: "villa",
          transaction_type: "buy",
          min_price: 1_000_000,
          limit: 20,
        },
        surface: "api_search",
      }, {
        env: {
          ODM_PUBLIC_CANARY_ENABLED: "true",
          ODM_PUBLIC_CANARY_APPROVED: "true",
          ODM_PUBLIC_CANARY_PERCENT: "100",
          ODM_PUBLIC_CANARY_STOP: "false",
        },
        searchOdm: odmAdapter(dbPath),
        searchLegacy: async () => {
          legacyCalled = true;
          throw new Error("legacy_must_not_run_in_lot7_api_gate");
        },
        now: () => 1_000,
        logInfo: () => undefined,
        logWarn: () => undefined,
      });

      assert.equal(routed.lane, "odm");
      assert.equal(legacyCalled, false);
      assert.ok(routed.result.listings.length > 0);
      assert.ok(routed.result.listings.every((listing) => listing.city === "Casablanca"));
      assert.ok(routed.result.listings.every((listing) => listing.property_type === "Villa"));
      assert.ok(routed.result.listings.every((listing) => listing.transaction_type === "buy"));
      assert.ok(routed.result.listings.every((listing) => (listing.price ?? 0) >= 1_000_000));
      assert.equal(routed.result.total, routed.result.listings.length);
    } finally {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
