import assert from "node:assert/strict";
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
