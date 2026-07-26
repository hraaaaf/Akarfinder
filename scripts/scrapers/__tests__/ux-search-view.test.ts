import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  SEARCH_VIEW_ORDER,
  getSearchViewLayout,
  searchViewFromLabel,
  searchViewLabel,
} from "../../../lib/ux/search-view";

test("List, Split and Map expose one canonical layout contract", () => {
  assert.deepEqual(SEARCH_VIEW_ORDER, ["list", "split", "map"]);
  assert.deepEqual(getSearchViewLayout("list"), {
    mode: "list",
    label: "Liste",
    showList: true,
    showMap: false,
  });
  assert.deepEqual(getSearchViewLayout("split"), {
    mode: "split",
    label: "Mixte",
    showList: true,
    showMap: true,
  });
  assert.deepEqual(getSearchViewLayout("map"), {
    mode: "map",
    label: "Carte",
    showList: false,
    showMap: true,
  });
});

test("view labels round-trip without changing search or ranking state", () => {
  for (const mode of SEARCH_VIEW_ORDER) {
    assert.equal(searchViewFromLabel(searchViewLabel(mode)), mode);
  }
});

test("LightZillowSearchShell consumes the canonical switcher and layout contract", () => {
  const source = readFileSync(
    resolve(process.cwd(), "components/search/LightZillowSearchShell.tsx"),
    "utf8",
  );

  assert.match(source, /<SearchViewSwitcher value=\{view\} onChange=\{setView\}/);
  assert.match(source, /const viewLayout = getSearchViewLayout\(view\)/);
  assert.match(source, /viewLayout\.showList/);
  assert.match(source, /viewLayout\.showMap/);
  assert.match(source, /setView\(snapshot\.view\)/);
  assert.doesNotMatch(source, /type ActiveTab/);
  assert.doesNotMatch(source, /setActiveTab/);
});

test("view presentation remains downstream from the unchanged ranking pipeline", () => {
  const source = readFileSync(
    resolve(process.cwd(), "components/search/LightZillowSearchShell.tsx"),
    "utf8",
  );

  const rankingIndex = source.indexOf("return sortListings(clientFiltered, sortBy)");
  const layoutIndex = source.indexOf("const viewLayout = getSearchViewLayout(view)");
  const switcherIndex = source.indexOf("<SearchViewSwitcher value={view} onChange={setView}");

  assert.ok(rankingIndex >= 0, "the existing ranking call must remain present");
  assert.ok(layoutIndex >= 0, "the canonical layout adapter must remain present");
  assert.ok(switcherIndex >= 0, "the canonical switcher must remain rendered");
  assert.equal(
    (source.match(/sortListings\(clientFiltered, sortBy\)/g) ?? []).length,
    1,
    "List, Split and Map must share exactly one ranking call",
  );
  assert.doesNotMatch(source, /view[^\n]*sortListings|sortListings[^\n]*view/);
});
