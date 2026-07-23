import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  canonicalizeCityName,
  canonicalizeNeighborhoodName,
  getValidatedMapNeighborhoods,
  getValidatedSeoCities,
  resolveCityEntity,
  resolveNeighborhoodEntity,
} from "../../../lib/geo/geo-entity-registry.js";
import { NEIGHBORHOOD_POINTS } from "../../../lib/map/canonical-neighborhood-data.js";
import { evaluatePhase1SearchReleaseGate } from "../../../lib/release/phase1-search-release-gate.js";
import { canPublishStructuredListing } from "../../../lib/sources/source-access-registry.js";
import { deriveSourceDisplayPolicy } from "../../../lib/listings/map-db-listing.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("Phase 1 P0 — canonical geo identity", () => {
  it("canonicalizes known city accent/transliteration aliases", () => {
    assert.equal(canonicalizeCityName("Temara"), "Témara");
    assert.equal(canonicalizeCityName("Meknes"), "Meknès");
    assert.equal(canonicalizeCityName("Sale"), "Salé");
    assert.equal(canonicalizeCityName("Tetouan"), "Tétouan");
    assert.equal(canonicalizeCityName("Fes"), "Fès");
    assert.equal(canonicalizeCityName("Kenitra"), "Kénitra");
  });

  it("canonicalizes known neighborhood aliases", () => {
    assert.equal(canonicalizeNeighborhoodName("Marrakech", "Gueliz"), "Guéliz");
    assert.equal(canonicalizeNeighborhoodName("Rabat", "Ocean"), "Océan");
    assert.equal(canonicalizeNeighborhoodName("Casablanca", "Maarif"), "Maârif");
    assert.equal(canonicalizeNeighborhoodName("Rabat", "Hay Ryad"), "Hay Riad");
  });

  it("every canonical map point resolves to the shared city and neighborhood registry", () => {
    for (const point of NEIGHBORHOOD_POINTS) {
      const city = resolveCityEntity(point.city);
      const district = resolveNeighborhoodEntity(point.city, point.neighborhood);
      assert.ok(city, `Missing canonical city for map point ${point.city}`);
      assert.ok(district, `Missing canonical neighborhood for ${point.city}/${point.neighborhood}`);
      assert.equal(point.city, city.canonical_name);
      assert.equal(point.citySlug, city.slug);
      assert.equal(point.neighborhood, district.canonical_name);
      assert.equal(point.neighborhoodSlug, district.slug);
    }
  });

  it("SEO consumes the canonical adapter and Quartiers is either canonical or redirect-only", () => {
    const seoData = source("lib/seo-neighborhood-pages/neighborhood-seo-data.ts");
    const quartiers = source("app/quartiers/page.tsx");
    assert.ok(seoData.includes("@/lib/map/canonical-neighborhood-data"));
    const canonicalDirectory = quartiers.includes("@/lib/map/canonical-neighborhood-data");
    const canonicalRedirect = quartiers.includes('permanentRedirect("/immobilier")');
    assert.ok(canonicalDirectory || canonicalRedirect);
  });

  it("SEO eligibility remains an explicit subset of the canonical graph", () => {
    const seoCities = getValidatedSeoCities();
    const mapNeighborhoods = getValidatedMapNeighborhoods();
    assert.ok(seoCities.length > 0);
    assert.ok(mapNeighborhoods.length > 0);
    assert.ok(seoCities.every((city) => city.validation_status === "validated" && city.seo_eligible));
    assert.ok(mapNeighborhoods.some((district) => district.seo_eligible === false));
  });
});

describe("Phase 1 P0 — result regime separation", () => {
  it("public external sources cannot silently become structured partner listings", () => {
    assert.equal(canPublishStructuredListing("mubawab"), false);
    assert.equal(canPublishStructuredListing("avito"), false);
    assert.equal(canPublishStructuredListing("partner_csv"), true);
    assert.equal(canPublishStructuredListing("akarfinder"), true);
  });

  it("public indexed policy requires original-source navigation", () => {
    const external = deriveSourceDisplayPolicy("mubawab");
    assert.equal(external.original_source_required, true);
    assert.ok(external.allowed_ctas?.includes("view_original"));
    assert.notEqual(external.source_badge, "premium_partner");
  });

  it("Search keeps structured and external regimes explicitly separated", () => {
    const searchShell = source("components/search/LightZillowSearchShell.tsx");
    const truthTier = source("lib/search/search-truth-tier.ts");
    assert.ok(searchShell.includes("Analysé par AkarFinder"));
    assert.ok(searchShell.includes("Analyse partielle"));
    assert.ok(searchShell.includes("Offres observées sur le web"));
    assert.ok(searchShell.includes("partitionStructuredListings"));
    assert.ok(truthTier.includes('source_display_type === "external_web_result"'));
    assert.ok(truthTier.includes('source_badge === "external_web_result"'));
    assert.ok(truthTier.includes('tier: "observed"'));
  });
});

describe("Phase 1 P0 — single buyer journey", () => {
  it("legacy search-profile route is redirect-only to Companion", () => {
    const profile = source("app/profil-recherche/page.tsx");
    assert.ok(profile.includes('redirect("/compagnon")'));
    assert.ok(!profile.includes("SearchProfileWizard"));
  });

  it("legacy buyer onboarding no longer owns a second buyer flow", () => {
    const onboarding = source("app/onboarding/page.tsx");
    assert.ok(onboarding.includes("legacy_onboarding"));
    assert.ok(onboarding.includes("/compagnon?"));
    assert.ok(!onboarding.includes("BuyerOnboardingFlow"));
  });
});

describe("Phase 1 P0 — public truth and Pro dead-end cleanup", () => {
  it("Search main code identifies itself as a search engine, not a marketplace", () => {
    const searchShell = source("components/search/LightZillowSearchShell.tsx");
    assert.ok(searchShell.includes("Moteur de recherche immobilier"));
    assert.ok(!searchShell.includes("Marketplace immobilier AkarFinder"));
  });

  it("public Pro landing contains no CTA to retired /pro/leads", () => {
    const proPage = source("app/pro/page.tsx");
    assert.ok(!proPage.includes('href="/pro/leads"'));
    assert.ok(!proPage.includes("InboxCTA"));
  });

  it("legacy /pro/leads route is compatibility redirect only", () => {
    const legacyProLeads = source("app/pro/leads/page.tsx");
    assert.ok(legacyProLeads.includes('redirect("/pro#contact")'));
  });
});

describe("Phase 1 P0 — end-of-phase release preflight", () => {
  it("fails closed when production search configuration is implicit", () => {
    const result = evaluatePhase1SearchReleaseGate({});
    assert.equal(result.ok, false);
    assert.ok(result.checks.some((check) => check.id === "database_provider_supabase" && !check.ok));
    assert.ok(result.checks.some((check) => check.id === "public_search_discovery_lane_explicit" && !check.ok));
  });

  it("passes when Supabase and at least one public discovery lane are explicit", () => {
    const result = evaluatePhase1SearchReleaseGate({
      DATABASE_PROVIDER: "supabase",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-key",
      NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED: "true",
      PERSISTED_OPENSERP_LISTINGS_ENABLED: "false",
    });
    assert.equal(result.ok, true, JSON.stringify(result.checks, null, 2));
  });

  it("keeps persisted OpenSERP publication explicit opt-in", () => {
    const result = evaluatePhase1SearchReleaseGate({
      DATABASE_PROVIDER: "supabase",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-key",
      NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED: "false",
      PERSISTED_OPENSERP_LISTINGS_ENABLED: "true",
    });
    assert.equal(result.ok, true, JSON.stringify(result.checks, null, 2));
  });
});
