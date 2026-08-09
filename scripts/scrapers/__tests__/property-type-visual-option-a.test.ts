import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const presentation = readFileSync("lib/property-types/presentation.ts", "utf8");
const artwork = readFileSync("components/property-types/PropertyTypeArtwork.tsx", "utf8");
const selector = readFileSync("components/property-types/PropertyTypeVisualSelector.tsx", "utf8");
const intentHub = readFileSync("components/intent/IntentHubV2.tsx", "utf8");
const quickFilters = readFileSync("components/search/QuickFilters.tsx", "utf8");
const searchCard = readFileSync("components/search/SearchListingCardDark.tsx", "utf8");
const externalCard = readFileSync("components/search/ExternalIndexedResultCard.tsx", "utf8");
const contextualArtwork = readFileSync("components/search/ContextualListingArtwork.tsx", "utf8");
const sellerPage = readFileSync("components/vendre/VendrePageShell.tsx", "utf8");
const sellerForm = readFileSync("components/vendre/SellerPropertyDraftForm.tsx", "utf8");

const OPTION_A_TYPES = ["Appartement", "Villa", "Terrain", "Studio", "Riad", "Bureau"];
const EXACT_PREMIUM_ASSETS = [
  "/images/property-types-premium/appartement.svg",
  "/images/property-types-premium/villa.svg",
  "/images/property-types-premium/terrain.webp",
  "/images/property-types-premium/studio.webp",
  "/images/property-types-premium/riad.webp",
  "/images/property-types-premium/bureau.webp",
];

test("Option A taxonomy exposes the six approved property categories", () => {
  for (const propertyType of OPTION_A_TYPES) {
    assert.match(presentation, new RegExp(`value: "${propertyType}"`));
  }
  assert.match(presentation, /export const OPTION_A_PROPERTY_TYPES/);
});

test("premium artwork uses the six exact approved local image assets", () => {
  for (const asset of EXACT_PREMIUM_ASSETS) {
    assert.ok(artwork.includes(asset), `missing exact approved asset: ${asset}`);
  }
  assert.match(artwork, /PREMIUM_PROPERTY_TYPE_IMAGES/);
  assert.match(artwork, /Illustration premium/);
  assert.doesNotMatch(artwork, /https?:\/\//);
  assert.doesNotMatch(artwork, /ApartmentArtwork|VillaArtwork|TerrainArtwork|StudioArtwork|RiadArtwork|OfficeArtwork/);
});

test("visual selection remains continuous from intent pages into search", () => {
  assert.match(intentHub, /OPTION_A_PROPERTY_TYPES\.map/);
  assert.match(intentHub, /PropertyTypeArtwork/);
  assert.match(quickFilters, /PropertyTypeVisualSelector/);
  assert.match(quickFilters, /propertyType\s*\}/);
  assert.match(selector, /aria-pressed=\{active\}/);
  assert.match(selector, /Tous les biens/);
});

test("listing fallbacks use Option A without replacing authorized real images", () => {
  assert.match(searchCard, /imageMode === "db_provider_thumbnail"/);
  assert.match(searchCard, /imageMode !== "fallback_visual"/);
  assert.match(searchCard, /PropertyTypeArtwork kind=\{listing\.property_type\}/);
  assert.match(searchCard, /Visuel illustratif/);
});

test("external fallbacks only pass normalized recognized property types into Option A", () => {
  assert.match(externalCard, /isListingPropertyType\(result\.normalized_property_type\)/);
  assert.match(externalCard, /safeFallbackPropertyType/);
  assert.match(externalCard, /propertyType=\{safeFallbackPropertyType\}/);
  assert.match(contextualArtwork, /if \(propertyType\)/);
  assert.match(contextualArtwork, /<PropertyTypeArtwork/);
  assert.match(contextualArtwork, /kind=\{propertyType\}/);
});

test("seller journey reuses the same approved visual taxonomy", () => {
  assert.match(sellerPage, /OPTION_A_PROPERTY_TYPES\.map/);
  assert.match(sellerPage, /vendre\/dossier\?property_type=/);
  assert.match(sellerForm, /PropertyTypeVisualSelector/);
  assert.match(sellerForm, /initialPropertyType/);
});
