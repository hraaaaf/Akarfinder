import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(path, "utf8");
}

test("listing detail keeps one canonical decision flow through the shared announcement shell", () => {
  const page = source("app/listings/[id]/page.tsx");
  const shell = source("components/listings/AnnouncementPageShell.tsx");
  const detail = source("components/listings/PropertyDetailV2.tsx");
  const core = source("components/listings/PropertyCore.tsx");

  assert.ok(page.includes("<AnnouncementPageShell"));
  assert.ok(page.includes("listing={listing}"));
  assert.ok(page.includes("detail={detail}"));
  assert.ok(shell.includes("<PropertyDetailV2"));
  assert.ok(shell.includes("listing={listing}"));
  assert.ok(shell.includes("detail={detail}"));
  assert.ok(shell.includes("buildProConversionModel(listing)"));
  assert.ok(shell.includes("proConversion={proConversion}"));
  assert.ok(shell.includes("<MobilePropertyDecisionBar listing={listing} model={proConversion} />"));
  assert.ok(!shell.includes("PropertyDecisionHeader"), "legacy pre-detail decision hero must not reintroduce a second H1");
  assert.ok(detail.includes("<PropertyCore listing={listing} />"), "the active listing detail body must delegate identity to PropertyCore");

  const h1Count = (detail.match(/<h1\b/g) ?? []).length + (core.match(/<h1\b/g) ?? []).length;
  assert.equal(h1Count, 1, "the active listing detail composition must expose exactly one H1 source");
  assert.ok(core.includes("data-property-core-title"), "PropertyCore must remain the canonical public title boundary");
});

test("decision actions preserve canonical project, favorite and comparison flows while contact uses one authority", () => {
  const bar = source("components/listings/MobilePropertyDecisionBar.tsx");
  const detail = source("components/listings/PropertyDetailV2.tsx");
  const pro = source("components/listings/ProfessionalConversionCard.tsx");

  assert.ok(bar.includes('href="/mon-projet"'));
  assert.ok(bar.includes("Mon Projet"));
  assert.ok(bar.includes("FavoriteToggleButton"));
  assert.ok(bar.includes('variant="icon"'));
  assert.ok(bar.includes("model.actions.visit"));
  assert.ok(bar.includes("model.actions.whatsapp"));

  assert.ok(detail.includes("ProfessionalConversionCard"));
  assert.ok(detail.includes("proConversion"));
  assert.ok(!detail.includes("canShowContactActions"));
  assert.ok(pro.includes('href="/mon-projet"'));
  assert.ok(pro.includes("Mon Projet"));
  assert.ok(pro.includes("FavoriteToggleButton"));
  assert.ok(pro.includes("CompareToggleButton"));
  assert.ok(pro.includes("model.actions.visit"));
  assert.ok(pro.includes("model.actions.whatsapp"));

  assert.ok(!bar.includes("/profil-recherche"));
  assert.ok(!bar.includes("/onboarding"));
  assert.ok(!pro.includes("/profil-recherche"));
  assert.ok(!pro.includes("/onboarding"));
});

test("decision surface remains evidence-safe after the intelligence consolidation", () => {
  const detail = source("components/listings/PropertyDetailV2.tsx");
  const insight = source("components/listings/AkarInsightCard.tsx");
  const model = source("lib/property-detail/akar-insight.ts");
  const shell = source("components/listings/AnnouncementPageShell.tsx");

  assert.ok(detail.includes("detail.provenance"));
  assert.ok(detail.includes("<AkarInsightCard detail={detail} />"));
  assert.ok(model.includes("detail.conclusion"));
  assert.ok(model.includes("detail.market"));
  assert.ok(model.includes("detail.multisource"));
  assert.ok(insight.includes("data-akar-intelligence-version"));
  assert.ok(shell.includes("ui.pageLight"));
  assert.ok(!detail.includes("bien vérifié"));
  assert.ok(!detail.includes("meilleure affaire"));
});
