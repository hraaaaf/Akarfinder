import type { SearchViewMode } from "@/lib/ux/contracts";

export type SearchViewLabel = "Liste" | "Mixte" | "Carte";

export type SearchViewLayout = {
  mode: SearchViewMode;
  label: SearchViewLabel;
  showList: boolean;
  showMap: boolean;
};

const SEARCH_VIEW_LAYOUTS: Record<SearchViewMode, SearchViewLayout> = {
  list: {
    mode: "list",
    label: "Liste",
    showList: true,
    showMap: false,
  },
  split: {
    mode: "split",
    label: "Mixte",
    showList: true,
    showMap: true,
  },
  map: {
    mode: "map",
    label: "Carte",
    showList: false,
    showMap: true,
  },
};

export const SEARCH_VIEW_ORDER: readonly SearchViewMode[] = ["list", "split", "map"];

export function getSearchViewLayout(mode: SearchViewMode): SearchViewLayout {
  return SEARCH_VIEW_LAYOUTS[mode];
}

export function searchViewFromLabel(label: SearchViewLabel): SearchViewMode {
  if (label === "Carte") return "map";
  if (label === "Mixte") return "split";
  return "list";
}

export function searchViewLabel(mode: SearchViewMode): SearchViewLabel {
  return SEARCH_VIEW_LAYOUTS[mode].label;
}
