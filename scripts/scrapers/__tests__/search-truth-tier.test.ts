import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { attachPublicSerpIntelligenceSummary } from "../../../lib/intelligence/public-serp-intelligence-carrier.js";
import { mockListings } from "../../../lib/listings/mock-listings.js";
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

describe("Search Truth UX source contracts", () => {
  it("renders analyzed, partial, then observed sections in that order", () => {
    const shell = source("components/search/LightZillowSearchShell.tsx");
    const analyzed = shell.indexOf('<StructuredTruthSection kind="analyzed"');
    const partial = shell.indexOf('<StructuredTruthSection kind="partial"');
    const observed = shell.indexOf("<ObservedResultsSection");
    assert.ok(analyzed >= 0 && partial > analyzed && observed > partial);
  });

  it("keeps relevance-first ranking explanation and explicit analyzed disclaimer", () => {
    const shell = source("components/search/LightZillowSearchShell.tsx");
    assert.match(shell, /pertinence de la recherche d’abord/i);
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
