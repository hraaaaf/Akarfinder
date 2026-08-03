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
const sellerPage = readFileSync("components/vendre/VendrePageShell.tsx", "utf8");
const sellerForm = readFileSync("components/vendre/SellerPropertyDraftForm.tsx", "utf8");

const OPTION_A_TYPES = ["Appartement", "Villa", "Terrain", "Studio", "Riad", "Bureau"];

test("Option A taxonomy exposes the six approved property categories", () => {
  for (const propertyType of OPTION_A_TYPES) {
    assert.match(presentation, new RegExp(`value: "${propertyType}"`));
  }
  assert.match(presentation, /export const OPTION_A_PROPERTY_TYPES/);
});

test("premium artwork contains a dedicated motif for every approved category", () => {
  assert.match(artwork, /ApartmentArtwork/);
  assert.match(artwork, /VillaArtwork/);
  assert.match(artwork, /TerrainArtwork/);
  assert.match(artwork, /StudioArtwork/);
  assert.match(artwork, /RiadArtwork/);
  assert.match(artwork, /OfficeArtwork/);
  assert.match(artwork, /Visuel|Illustration premium/);
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

test("external fallbacks only render from a normalized recognized property type", () => {
  assert.match(externalCard, /isListingPropertyType\(result\.normalized_property_type\)/);
  assert.match(externalCard, /safeFallbackPropertyType/);
  assert.match(externalCard, /PropertyTypeArtwork kind=\{safeFallbackPropertyType\}/);
});

test("seller journey reuses the same approved visual taxonomy", () => {
  assert.match(sellerPage, /OPTION_A_PROPERTY_TYPES\.map/);
  assert.match(sellerPage, /vendre\/dossier\?property_type=/);
  assert.match(sellerForm, /PropertyTypeVisualSelector/);
  assert.match(sellerForm, /initialPropertyType/);
});
