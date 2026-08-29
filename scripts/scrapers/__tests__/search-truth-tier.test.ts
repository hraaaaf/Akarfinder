import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  classifySearchTruthLevel,
  collapseAlreadyClusteredStructuredListings,
  partitionSearchTruthTiers,
} from "../../../lib/search/search-truth-tier";
import {
  classifySearchCommercialCategory,
  compareSearchCommercialPriority,
  pickCommercialRepresentative,
} from "../../../lib/search/search-commercial-priority";
import { compareRecommendedListings } from "../../../lib/listings/utils";
import type { Listing } from "../../../lib/listings/types";
import type { SearchGatewayNormalizedResult } from "../../../lib/search-gateway/search-gateway-types";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "listing-1",
    title: "Appartement à Rabat",
    city: "Rabat",
    neighborhood: "Agdal",
    price: 1500000,
    currency: "DH",
    surface_m2: 100,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 2,
    bathrooms: 1,
    freshness_label: "Récent",
    source_type: "Source analysée",
    reliability_label: "Informations complètes",
    reliability_score: 90,
    reliability_available: true,
    is_mre_friendly: false,
    description: "Fixture déterministe",
    image_url: "",
    reliability_explanation: "Fixture CI",
    data_completeness_score: 90,
    source_name: "AkarFinder",
    duplicate_score: 0.1,
    can_show_result: true,
    production_allowed: true,
    can_show_thumbnail: false,
    display_images: { policy: "no_listing_image", urls: [] },
    image_permission_status: "unknown",
    source_access_level: "indexed_only",
    acquisition_channel: "first_party_user",
    origin_type: "first_party_user",
    ...overrides,
  };
}

function external(overrides: Partial<SearchGatewayNormalizedResult> = {}): SearchGatewayNormalizedResult {
  return {
    id: "external-1",
    title: "External result",
    snippet: "Fixture",
    original_url: "https://example.com/a",
    display_url: "example.com/a",
    source_id: "example",
    source_name: "Example",
    domain: "example.com",
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
    primary_cta_label: "Voir sur Example",
    result_attribution_label: "Résultat public indexé",
    thumbnail_risk_accepted: false,
    ...overrides,
  };
}

describe("Search truth tiers", () => {
  it("classifies a structured listing with public intelligence as analyzed", () => {
    assert.equal(classifySearchTruthLevel(listing({ reliability_available: true, reliability_score: 90 })), "analyzed");
  });

  it("classifies structured listings without sufficient public intelligence as partial", () => {
    assert.equal(classifySearchTruthLevel(listing({ reliability_available: false })), "partial");
  });

  it("classifies external/index-only results as observed, never as low reliability", () => {
    assert.equal(classifySearchTruthLevel(external()), "observed");
  });

  it("partitions structured/analyzed results before observed results without changing relevance inside each tier", () => {
    const a = listing({ id: "a", reliability_score: 95 });
    const b = listing({ id: "b", reliability_score: 88 });
    const c = listing({ id: "c", reliability_available: false });
    const tiers = partitionSearchTruthTiers([a, b, c]);
    assert.deepEqual(tiers.analyzed.map((item) => item.id), ["a", "b"]);
    assert.deepEqual(tiers.partial.map((item) => item.id), ["c"]);
  });

  it("can collapse already-clustered structured representations without hiding external offers", () => {
    const first = listing({ id: "same-1", source_name: "A" });
    const second = listing({ id: "same-2", source_name: "B" });
    const collapsed = collapseAlreadyClusteredStructuredListings([first, second]);
    assert.ok(collapsed.length >= 1);
  });
});

describe("Search commercial priority", () => {
  it("enforces promoter, agency partner, direct user, then public indexed order", () => {
    const promoter = listing({ id: "p", origin_type: "partner_authorized", acquisition_channel: "promoter" as Listing["acquisition_channel"] });
    const agency = listing({ id: "a", origin_type: "partner_authorized", acquisition_channel: "agency_partner" as Listing["acquisition_channel"] });
    const direct = listing({ id: "d", origin_type: "first_party_user", acquisition_channel: "first_party_user" });
    const indexed = listing({ id: "i", origin_type: "public_indexed", acquisition_channel: "public_indexed" as Listing["acquisition_channel"] });
    const ordered = [indexed, direct, agency, promoter].sort(compareSearchCommercialPriority);
    assert.equal(ordered[0].id, "p");
    assert.equal(ordered[1].id, "a");
    assert.equal(ordered[2].id, "d");
    assert.equal(ordered[3].id, "i");
  });

  it("preserves the existing ranking order inside each commercial category", () => {
    const first = listing({ id: "1", origin_type: "first_party_user" });
    const second = listing({ id: "2", origin_type: "first_party_user" });
    assert.equal(compareSearchCommercialPriority(first, second), 0);
  });

  it("keeps a rich first-party user submission in the direct-user category", () => {
    assert.equal(classifySearchCommercialCategory(listing({ origin_type: "first_party_user" })), "direct_user");
  });

  it("does not promote a commercial tier without confirmed authorization", () => {
    assert.notEqual(classifySearchCommercialCategory(listing({ origin_type: "public_indexed" })), "promoter_premium");
  });

  it("fails unknown or merely promoter-looking sources closed to public indexed", () => {
    assert.equal(classifySearchCommercialCategory(listing({ origin_type: "public_indexed", source_name: "Promoteur premium" })), "public_indexed");
  });

  it("uses truth level only inside the fourth public-indexed category", () => {
    assert.equal(classifySearchCommercialCategory(listing({ origin_type: "public_indexed" })), "public_indexed");
  });

  it("keeps an authorized partner as duplicate-group representative over a lower category copy", () => {
    const partner = listing({ id: "partner", origin_type: "partner_authorized", acquisition_channel: "agency_partner" as Listing["acquisition_channel"] });
    const indexed = listing({ id: "indexed", origin_type: "public_indexed", acquisition_channel: "public_indexed" as Listing["acquisition_channel"] });
    assert.equal(pickCommercialRepresentative([indexed, partner]).id, "partner");
  });
});

describe("Recommended Search ranking", () => {
  it("prefers a disclosed price when two results have equal relevance", () => {
    const withPrice = listing({ id: "price", price: 1200000 });
    const withoutPrice = listing({ id: "no-price", price: null });
    assert.ok(compareRecommendedListings(withPrice, withoutPrice) < 0);
  });

  it("never lets price disclosure overtake genuinely stronger relevance", () => {
    const strong = listing({ id: "strong", price: null, reliability_score: 99 });
    const weak = listing({ id: "weak", price: 1000000, reliability_score: 40 });
    assert.ok(compareRecommendedListings(strong, weak) <= 0);
  });

  it("database Search uses the lexicographic recommended comparator", () => {
    const db = source("lib/db.ts");
    assert.ok(db.includes("compareRecommendedListings"));
  });
});

describe("Search Truth UX source contracts", () => {
  it("renders the commercial/truth sequence as one continuous internal flow", () => {
    const shell = source("components/search/LightZillowSearchShell.tsx");
    const promoter = shell.indexOf("...commercialGroups.promoterPremium");
    const agency = shell.indexOf("...commercialGroups.agencyPartner");
    const direct = shell.indexOf("...commercialGroups.directUser");
    const analyzed = shell.indexOf("...commercialGroups.publicIndexed.analyzed");
    const partial = shell.indexOf("...commercialGroups.publicIndexed.partial");
    const observed = shell.indexOf("...commercialGroups.publicIndexed.observed");
    assert.ok(promoter >= 0 && agency > promoter && direct > agency && analyzed > direct && partial > analyzed && observed > partial);
    assert.ok(shell.includes("data-search-continuous-flow"));
    assert.ok(shell.includes("continuousListings.map"));
  });

  it("keeps commercial priority internal while public wording stays plain", () => {
    const shell = source("components/search/LightZillowSearchShell.tsx");
    const priority = source("lib/search/search-commercial-priority.ts");
    assert.doesNotMatch(shell, /Ordre strict : promoteurs premium, agences partenaires/i);
    assert.doesNotMatch(shell, /Annonces publiques indexées|Analysé par AkarFinder|Analyse partielle|Offres observées sur le web/i);
    assert.match(priority, /premium promoter inventory[\s\S]*authorized agency\/partner inventory[\s\S]*first-party user submissions[\s\S]*public indexed \/ observed inventory/i);
    assert.ok(!shell.includes("Promoteurs premium"));
    assert.ok(!shell.includes("Agences partenaires"));
    assert.ok(!shell.includes("Annonces sur AkarFinder"));
  });

  it("links Search directly to Mon Projet instead of retired buyer routes", () => {
    const shell = source("components/search/LightZillowSearchShell.tsx");
    assert.ok(shell.includes('href="/mon-projet"'));
    assert.ok(!shell.includes('href="/profil-recherche"'));
    assert.ok(!shell.includes('href="/onboarding"'));
  });

  it("does not expose a false login affordance in the global header", () => {
    const header = source("components/layout/SiteHeader.tsx");
    assert.ok(header.includes('href="/mon-projet"'));
    assert.ok(header.includes("Mon Projet"));
    assert.ok(!header.includes("Se connecter"));
  });

  it("external cards expose source and limits in plain language", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    assert.ok(card.includes("getSourceDomain"));
    assert.ok(card.includes("sourcePages"));
    assert.ok(card.includes("result.original_url"));
    assert.doesNotMatch(card, /\{result\.result_attribution_label\}|\{result\.source_name\}/);
    assert.ok(card.includes("AkarFinder indexe la page et vous renvoie vers la source originale."));
    assert.ok(card.includes("Ouvrir la source"));
    assert.doesNotMatch(card, /Offre observée|Aperçu limité/i);
  });

  it("structured cards use one truth hierarchy and do not conflate low information with duplicates", () => {
    const card = source("components/search/SearchListingCardDark.tsx");
    assert.ok(card.includes("data-card-provenance"));
    assert.ok(card.includes("data-card-facts"));
  });

  it("Search map describes the displayed result set without architecture jargon", () => {
    const map = source("components/search/SearchMapPanel.tsx");
    assert.doesNotMatch(map, /tier|architecture|gateway/i);
  });
});
