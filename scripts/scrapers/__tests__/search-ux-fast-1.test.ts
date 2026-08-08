import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const searchPage = readFileSync("app/search/page.tsx", "utf8");
const shell = readFileSync("components/search/LightZillowSearchShell.tsx", "utf8");
const filters = readFileSync("components/search/QuickFilters.tsx", "utf8");

test("search result path has no project banner before the SERP", () => {
  assert.doesNotMatch(searchPage, /ActiveProjectBanner/);
  assert.match(searchPage, /SearchMapNavigationBridge/);
  assert.match(searchPage, /LightZillowSearchShell/);
});

test("search shell removes the old pre-result hero and explanatory noise", () => {
  assert.doesNotMatch(shell, /Moteur de recherche immobilier/);
  assert.doesNotMatch(shell, /Trouvez votre bien au Maroc/);
  assert.doesNotMatch(shell, /Catégorie de publication explicite/);
  assert.doesNotMatch(shell, /Besoin de clarifier vos priorités/);
  assert.doesNotMatch(shell, /Ordre strict : promoteurs premium/);
});

test("compact controls precede the listing stream", () => {
  const filtersPosition = shell.indexOf("<QuickFilters");
  const resultCountPosition = shell.indexOf("résultat${displayedCount");
  const listingStreamPosition = shell.indexOf("<CommercialListingSection");

  assert.ok(filtersPosition >= 0, "QuickFilters must remain visible");
  assert.ok(resultCountPosition > filtersPosition, "result count must follow filters");
  assert.ok(listingStreamPosition > resultCountPosition, "listing stream must follow the compact result toolbar");
  assert.match(shell, /<SearchViewSwitcher value=\{view\} onChange=\{setView\}/);
  assert.match(shell, /aria-label="Trier les résultats"/);
});

test("Option A remains available only through the expandable filters path", () => {
  assert.match(filters, /PropertyTypeVisualSelector/);
  assert.match(filters, /const propertyTypeSelector/);
  assert.match(filters, /id="advanced-search-filters"/);
  assert.match(filters, /\{propertyTypeSelector\}/);
  assert.match(filters, /showFilters \? \(/);
  assert.match(filters, /Voir les résultats/);

  const visibleControlsStart = filters.indexOf("return (");
  const advancedFiltersStart = filters.indexOf('id="advanced-search-filters"');
  const directSelectorInVisibleControls = filters
    .slice(visibleControlsStart, advancedFiltersStart)
    .includes("<PropertyTypeVisualSelector");
  assert.equal(directSelectorInVisibleControls, false, "visual property selector must not sit in the always-visible pre-result controls");
});

test("mobile controls stay compact and advanced criteria remain reachable", () => {
  assert.match(filters, /grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(filters, />Acheter</);
  assert.match(filters, />Louer</);
  assert.match(filters, />Neuf</);
  assert.match(filters, />Filtres</);
  assert.match(filters, /aria-label="Ville"/);
  assert.match(filters, /aria-label="Budget minimum"/);
  assert.match(filters, /aria-label="Budget maximum"/);
  assert.match(filters, /aria-label="Surface minimum"/);
  assert.match(filters, /aria-label="Type de bien"/);
});
