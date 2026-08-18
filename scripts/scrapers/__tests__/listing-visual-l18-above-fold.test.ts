import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const detail = readFileSync("components/listings/PropertyDetailV2.tsx", "utf8");
const core = readFileSync("components/listings/PropertyCore.tsx", "utf8");
const goal = readFileSync("docs/LISTING_VISUAL_L18_GOAL.md", "utf8");

function position(source: string, token: string) {
  const index = source.indexOf(token);
  assert.notEqual(index, -1, `Missing token: ${token}`);
  return index;
}

describe("LISTING-VISUAL L18 above-the-fold contract", () => {
  it("pins the honest mockup-convergence target and truth boundary", () => {
    assert.match(goal, /score de convergence honnête au mockup.*~6,8\/10/i);
    assert.match(goal, /aucune photo, agence, badge, disponibilité, délai, valeur, score ou caractéristique inventée/i);
    assert.match(goal, />= 9,2\/10/);
  });

  it("keeps the canonical desktop 70-30 gallery plus professional rail", () => {
    const primaryVisual = position(detail, 'data-announcement-primary-visual="ann-l18"');
    const gallery = position(detail, "<PropertyMediaGallery listing={listing} />");
    const pro = position(detail, "<ProfessionalConversionCard listing={listing} model={proConversion} />");
    assert.match(detail, /data-announcement-primary-visual="ann-l18"[\s\S]*lg:grid-cols-\[minmax\(0,1fr\)_340px\]/);
    assert.ok(primaryVisual < gallery && gallery < pro, "Gallery and professional rail must compose the primary desktop visual block");
  });

  it("surfaces professional identity before facts on mobile", () => {
    const identitySlot = position(core, "{afterIdentity ?");
    const facts = position(core, "data-property-core-facts");
    assert.ok(identitySlot < facts, "Professional/source identity slot must precede property facts");

    const pro = position(detail, "mobileIdentityOnly");
    const insight = position(detail, "<AkarInsightCard detail={detail} />");
    assert.ok(pro < insight, "Professional/source identity must precede Akar Intelligence");
    assert.equal(detail.match(/mobileIdentityOnly/g)?.length, 1, "Mobile professional identity must render exactly once");
  });

  it("keeps Akar Intelligence and Mon Projet after the core property block", () => {
    const coreBlock = position(detail, "<PropertyCore");
    const insight = position(detail, "<AkarInsightCard detail={detail} />");
    const project = position(detail, "<ProjectPersonalizationCard listing={listing} projectId={projectId} />");
    assert.ok(coreBlock < insight);
    assert.ok(insight < project);
  });

  it("preserves project and market support rail below the primary decision rail", () => {
    assert.match(detail, /compactRail/);
    assert.match(detail, /<MarketComparablesSummaryCard model=\{marketComparables\} \/>/);
    const pro = position(detail, "<ProfessionalConversionCard listing={listing} model={proConversion} />");
    const projectRail = position(detail, "compactRail");
    assert.ok(pro < projectRail, "Professional rail must lead before project and market support cards");
  });
});
