import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { attachPublicSerpIntelligenceSummary } from "../../../lib/intelligence/public-serp-intelligence-carrier.js";
import { mockListings } from "../../../lib/listings/mock-listings.js";
import { compareRecommendedListings } from "../../../lib/search/ranking.js";
import {
  getSearchCommercialTier,
  partitionCommercialSearchListings,
  prioritizeCommercialSearchListings,
} from "../../../lib/search/search-commercial-priority.js";
import {
  collapseStructuredDuplicateGroups,
  getSearchTruthPresentation,
  partitionStructuredListings,
} from "../../../lib/search/search-truth-tier.js";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

function structuredBase(id: string) {
  return {
    ...mockListings[0],
    id,
    source_name: "partner_csv",
    source_badge: "premium_partner",
    source_display_type: "partner_source",
    original_source_required: false,
    can_show_contact: true,
    search_result_display_mode: "full_partner_listing",
  };
}

describe("Search truth tiers", () => {
  it("classifies a structured listing with public intelligence as analyzed", () => {
    const listing = attachPublicSerpIntelligenceSummary(structuredBase("analyzed"), {
      version: "1.0",
      status: "available",
      score: 82,
      score_label: "Lecture documentaire solide",
      coverage_label: "4/5 dimensions documentaires disponibles",
      signals: [],
      attention_label: null,
      disclaimer: "Indicatif",
    });
    const truth = getSearchTruthPresentation(listing);
    assert.equal(truth.tier, "analyzed");
    assert.equal(truth.label, "Analysé par AkarFinder");
    assert.match(truth.explanation, /ne signifie pas.*vérifié.*certifié.*garanti/i);
  });

  it("classifies structured listings without sufficient public intelligence as partial", () => {
    const truth = getSearchTruthPresentation(structuredBase("partial"));
    assert.equal(truth.tier, "partial");
    assert.equal(truth.label, "Analyse partielle");
  });

  it("classifies external/index-only results as observed, never as low reliability", () => {
    const listing = {
      ...mockListings[0],
      id: "observed",
      source_badge: "external_web_result",
      source_display_type: "external_web_result",
      original_source_required: true,
      can_show_contact: false,
      search_result_display_mode: "thin_indexed_result",
    };
    const truth = getSearchTruthPresentation(listing);
    assert.equal(truth.tier, "observed");
    assert.equal(truth.label, "Offre observée");
    assert.equal(truth.informationLabel, "Aperçu limité");
    assert.doesNotMatch(`${truth.label} ${truth.explanation}`, /peu fiable|faible fiabilité/i);
  });

  it("partitions structured/analyzed results before observed results without changing relevance inside each tier", () => {
    const analyzed = attachPublicSerpIntelligenceSummary(structuredBase("a"), {
      version: "1.0",
      status: "available",
      score: 75,
      score_label: "Lecture documentaire",
      coverage_label: "4/5 dimensions documentaires disponibles",
      signals: [],
      attention_label: null,
      disclaimer: "Indicatif",
    });
    const partial = structuredBase("b");
    const observed = {
      ...structuredBase("c"),
      source_badge: "external_web_result",
      source_display_type: "external_web_result",
      original_source_required: true,
      can_show_contact: false,
    };
    const groups = partitionStructuredListings([partial, observed, analyzed]);
    assert.deepEqual(groups.analyzed.map((item) => item.id), ["a"]);
    assert.deepEqual(groups.partial.map((item) => item.id), ["b"]);
    assert.deepEqual(groups.observed.map((item) => item.id), ["c"]);
  });

  it("can collapse already-clustered structured representations without hiding external offers", () => {
    const first = { ...structuredBase("a"), duplicate_group_id: "cluster-1" };
    const duplicate = { ...structuredBase("b"), duplicate_group_id: "cluster-1" };
    const observed = {
      ...structuredBase("c"),
      duplicate_group_id: "cluster-1",
      source_badge: "external_web_result",
      source_display_type: "external_web_result",
      original_source_required: true,
      can_show_contact: false,
    };
    const collapsed = collapseStructuredDuplicateGroups([first, duplicate, observed]);
    assert.deepEqual(collapsed.listings.map((item) => item.id), ["a", "c"]);
    assert.equal(collapsed.groupedRepresentations, 1);
    assert.equal(collapsed.groupedCountsByRepresentativeId.a, 2);
  });
});

describe("Search commercial priority", () => {
  it("enforces promoter, agency partner, direct user, then public indexed order", () => {
    const publicIndexed = {
      ...mockListings[0],
      id: "public",
      source_name: "mubawab",
      source_access_level: "indexed_only" as const,
    };
    const directUser = {
      ...mockListings[0],
      id: "direct",
      source_name: "akarfinder",
      acquisition_channel: "first_party_user",
    };
    const agencyPartner = {
      ...structuredBase("agency"),
      source_type: "Agence" as const,
      partner_tier: "agency_premium" as const,
    };
    const promoterPremium = {
      ...structuredBase("promoter"),
      source_type: "Promoteur" as const,
      partner_tier: "promoter_partner" as const,
    };

    const ordered = prioritizeCommercialSearchListings([
      publicIndexed,
      directUser,
      agencyPartner,
      promoterPremium,
    ]);

    assert.deepEqual(ordered.map((item) => item.id), [
      "promoter",
      "agency",
      "direct",
      "public",
    ]);
  });

  it("preserves the existing ranking order inside each commercial category", () => {
    const agencyA = { ...structuredBase("agency-a"), source_type: "Agence" as const };
    const agencyB = { ...structuredBase("agency-b"), source_type: "Agence" as const };
    const publicA = { ...mockListings[0], id: "public-a", source_name: "mubawab" };
    const publicB = { ...mockListings[0], id: "public-b", source_name: "mubawab" };

    const ordered = prioritizeCommercialSearchListings([publicA, agencyA, publicB, agencyB]);
    assert.deepEqual(ordered.map((item) => item.id), [
      "agency-a",
      "agency-b",
      "public-a",
      "public-b",
    ]);
  });

  it("keeps a rich first-party user submission in the direct-user category", () => {
    const firstPartyRich = {
      ...mockListings[0],
      id: "direct-rich",
      source_name: "akarfinder",
      source_access_level: "partner_full" as const,
      search_result_display_mode: "full_partner_listing",
      original_source_required: false,
      can_show_contact: true,
    };

    assert.equal(getSearchCommercialTier(firstPartyRich), "direct_user");
  });

  it("does not promote a commercial tier without confirmed authorization", () => {
    const unconfirmedGoldAgency = {
      ...mockListings[0],
      id: "gold-unconfirmed",
      source_type: "Agence" as const,
      commercial_tier: "gold" as const,
      partner_activation_status: "active" as const,
      source_authorization_status: "pending" as const,
      partner_validation_status: "validated" as const,
    };
    const confirmedGoldAgency = {
      ...unconfirmedGoldAgency,
      id: "gold-confirmed",
      source_authorization_status: "confirmed" as const,
    };

    assert.equal(getSearchCommercialTier(unconfirmedGoldAgency), "public_indexed");
    assert.equal(getSearchCommercialTier(confirmedGoldAgency), "agency_partner");
  });

  it("fails unknown or merely promoter-looking sources closed to public indexed", () => {
    const unknown = { ...mockListings[0], id: "unknown", source_name: "mystery-source" };
    const publicPromoterSite = {
      ...mockListings[0],
      id: "promoter-site",
      source_type: "Promoteur" as const,
      source_badge: "promoter_site",
      source_access_level: "indexed_only" as const,
    };

    assert.equal(getSearchCommercialTier(unknown), "public_indexed");
    assert.equal(getSearchCommercialTier(publicPromoterSite), "public_indexed");
  });

  it("uses truth level only inside the fourth public-indexed category", () => {
    const publicAnalyzed = attachPublicSerpIntelligenceSummary(
      { ...mockListings[0], id: "public-analyzed", source_name: "mubawab" },
      {
        version: "1.0",
        status: "available",
        score: 74,
        score_label: "Lecture documentaire",
        coverage_label: "4/5 dimensions documentaires disponibles",
        signals: [],
        attention_label: null,
        disclaimer: "Indicatif",
      },
    );
    const publicPartial = { ...mockListings[0], id: "public-partial", source_name: "mubawab" };
    const observed = {
      ...mockListings[0],
      id: "observed-public",
      source_badge: "external_web_result",
      source_display_type: "external_web_result",
      original_source_required: true,
      can_show_contact: false,
    };
    const promoter = {
      ...structuredBase("promoter-first"),
      source_type: "Promoteur" as const,
      partner_tier: "promoter_partner" as const,
    };

    const groups = partitionCommercialSearchListings([
      publicPartial,
      observed,
      promoter,
      publicAnalyzed,
    ]);

    assert.deepEqual(groups.promoterPremium.map((item) => item.id), ["promoter-first"]);
    assert.deepEqual(groups.publicIndexed.analyzed.map((item) => item.id), ["public-analyzed"]);
    assert.deepEqual(groups.publicIndexed.partial.map((item) => item.id), ["public-partial"]);
    assert.deepEqual(groups.publicIndexed.observed.map((item) => item.id), ["observed-public"]);
  });

  it("keeps an authorized partner as duplicate-group representative over a lower category copy", () => {
    const publicCopy = {
      ...mockListings[0],
      id: "public-copy",
      source_name: "mubawab",
      duplicate_group_id: "same-property",
    };
    const agencyCopy = {
      ...structuredBase("agency-copy"),
      source_type: "Agence" as const,
      duplicate_group_id: "same-property",
    };

    const groups = partitionCommercialSearchListings([publicCopy, agencyCopy]);
    assert.deepEqual(groups.agencyPartner.map((item) => item.id), ["agency-copy"]);
    assert.equal(groups.publicIndexed.partial.length, 0);
    assert.equal(groups.groupedRepresentations, 1);
  });
});

describe("Recommended Search ranking", () => {
  it("prefers a disclosed price when two results have equal relevance", () => {
    const priced = {
      ...structuredBase("priced"),
      city: "Casablanca",
      district: "Maarif",
      price: 1_450_000,
      reliability_score: 55,
      description_snippet: "",
    };
    const unpricedButRicher = {
      ...structuredBase("unpriced"),
      city: "Casablanca",
      district: "Maarif",
      price: null,
      reliability_score: 100,
      description_snippet: "Appartement lumineux avec plusieurs informations complémentaires",
    };

    assert.ok(
      compareRecommendedListings(priced, unpricedButRicher, { city: "Casablanca" }) < 0,
      "equal-relevance result with a disclosed price should rank first",
    );
  });

  it("never lets price disclosure overtake genuinely stronger relevance", () => {
    const relevantWithoutPrice = {
      ...structuredBase("relevant-unpriced"),
      district: "Maarif",
      price: null,
      title: "Bien à découvrir",
      description_snippet: "",
    };
    const lessRelevantWithPrice = {
      ...structuredBase("less-relevant-priced"),
      district: "Agdal",
      price: 900_000,
      title: "Bien à découvrir",
      description_snippet: "",
    };

    assert.ok(
      compareRecommendedListings(relevantWithoutPrice, lessRelevantWithPrice, { q: "Maarif" }) < 0,
      "a materially more relevant result must remain ahead even without a disclosed price",
    );
  });

  it("database Search uses the lexicographic recommended comparator", () => {
    const databaseSearch = source("lib/search/database-search.ts");
    assert.ok(databaseSearch.includes("compareRecommendedListings"));
    assert.ok(!databaseSearch.includes("scoreB - scoreA"));
  });
});

describe("Search Truth UX source contracts", () => {
  it("renders the four commercial categories in strict order", () => {
    const shell = source("components/search/LightZillowSearchShell.tsx");
    const promoter = shell.indexOf('tier="promoter_premium"');
    const agency = shell.indexOf('tier="agency_partner"');
    const direct = shell.indexOf('tier="direct_user"');
    const indexed = shell.indexOf("<PublicIndexedResultsSection");
    assert.ok(promoter >= 0 && agency > promoter && direct > agency && indexed > direct);
  });

  it("keeps commercial priority internal while preserving the analyzed truth disclaimer", () => {
    const shell = source("components/search/LightZillowSearchShell.tsx");
    const priority = source("lib/search/search-commercial-priority.ts");
    assert.doesNotMatch(shell, /Ordre strict : promoteurs premium, agences partenaires/i);
    assert.match(priority, /premium promoter inventory[\s\S]*authorized agency\/partner inventory[\s\S]*first-party user submissions[\s\S]*public indexed \/ observed inventory/i);
    assert.match(shell, /Analysé ne signifie pas vérifié, certifié ni garanti/i);
  });

  it("links Search directly to Companion instead of legacy buyer routes", () => {
    const shell = source("components/search/LightZillowSearchShell.tsx");
    assert.ok(shell.includes('href="/compagnon"'));
    assert.ok(!shell.includes('href="/profil-recherche"'));
    assert.ok(!shell.includes('href="/onboarding"'));
  });

  it("does not expose a false login affordance in the global header", () => {
    const header = source("components/layout/SiteHeader.tsx");
    assert.ok(header.includes('href="/mon-projet"'));
    assert.ok(header.includes("Mon projet"));
    assert.ok(!header.includes("Se connecter"));
  });

  it("external cards are explicitly observed limited previews", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    assert.ok(card.includes("Offre observée"));
    assert.ok(card.includes("Aperçu limité"));
    assert.match(card, /sans être nécessairement le même bien/i);
  });

  it("structured cards use one truth hierarchy and do not conflate low information with duplicates", () => {
    const card = source("components/search/SearchListingCardDark.tsx");
    assert.ok(card.includes("getSearchTruthPresentation"));
    assert.ok(!card.includes("function reliabilityStyle"));
    assert.ok(!card.includes("PackageBadge"));
    assert.equal((card.match(/Doublon possible/g) ?? []).length, 1);
  });

  it("Search map describes the displayed result set instead of implying total market density", () => {
    const map = source("components/search/SearchMapPanel.tsx");
    assert.ok(map.includes("Zones des résultats affichés"));
    assert.match(map, /fiches indexées actuellement affichées/i);
    assert.match(map, /n'est pas une estimation du volume total du marché/i);
    assert.ok(map.includes("aria-pressed={isActive}"));
  });
});
