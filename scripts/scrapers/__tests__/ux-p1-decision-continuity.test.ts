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

  assert.ok(page.includes("<AnnouncementPageShell listing={listing} detail={detail} />"));
  assert.ok(shell.includes("<PropertyDetailV2 listing={listing} detail={detail} />"));
  assert.ok(shell.includes("<MobilePropertyDecisionBar listingId={listing.id} />"));
  assert.ok(!shell.includes("PropertyDecisionHeader"), "legacy pre-detail decision hero must not reintroduce a second H1");

  const h1Count = (detail.match(/<h1\b/g) ?? []).length;
  assert.equal(h1Count, 1, "the active listing detail body must expose exactly one H1 source");
});

test("decision actions preserve the canonical project, favorite and comparison flows on mobile and desktop", () => {
  const bar = source("components/listings/MobilePropertyDecisionBar.tsx");
  const detail = source("components/listings/PropertyDetailV2.tsx");

  assert.ok(bar.includes('href="/mon-projet"'));
  assert.ok(bar.includes("Continuer dans Mon Projet"));
  assert.ok(bar.includes("FavoriteToggleButton"));
  assert.ok(bar.includes("CompareToggleButton"));

  assert.ok(detail.includes('href="/mon-projet"'));
  assert.ok(detail.includes("Continuer dans Mon Projet"));
  assert.ok(detail.includes("lg:flex"), "desktop Mon Projet action must be visible from the sticky action rail");
  assert.ok(detail.includes("FavoriteToggleButton"));
  assert.ok(detail.includes("CompareToggleButton"));

  assert.ok(!bar.includes("/profil-recherche"));
  assert.ok(!bar.includes("/onboarding"));
  assert.ok(!detail.includes("/profil-recherche"));
  assert.ok(!detail.includes("/onboarding"));
});

test("decision surface remains evidence-safe after the shell migration", () => {
  const detail = source("components/listings/PropertyDetailV2.tsx");
  const shell = source("components/listings/AnnouncementPageShell.tsx");

  assert.ok(detail.includes("detail.provenance"));
  assert.ok(detail.includes("detail.conclusion"));
  assert.ok(shell.includes("ui.pageLight"));
  assert.ok(!detail.includes("bien vérifié"));
  assert.ok(!detail.includes("meilleure affaire"));
});
