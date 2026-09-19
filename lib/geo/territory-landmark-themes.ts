import type {
  LandmarkCategory,
  LandmarkTerritoryEntity,
  LandmarkThemeTag,
} from "./territory-dictionary";

export const LANDMARK_THEME_LABELS_FR: Record<LandmarkThemeTag, string> = {
  stadiums: "Stades",
  "parks-gardens": "Parcs & jardins",
  "historic-monuments": "Monuments historiques",
  "stations-hubs": "Gares & hubs",
  "squares-esplanades": "Places & esplanades",
  "shopping-centers": "Centres commerciaux",
  "iconic-cafes": "Cafés & lieux iconiques",
  education: "Universités & écoles",
  "museums-culture": "Musées & culture",
  "beaches-corniches": "Plages & corniches",
  "lighthouses-forts-ramparts": "Phares, forts & remparts",
  religious: "Religieux",
  "business-towers": "Tours & pôles d’affaires",
  healthcare: "Santé",
  "major-roads": "Grands axes",
  "other-local-anchor": "Autres repères locaux",
};

const CATEGORY_DEFAULT_THEMES: Record<LandmarkCategory, readonly LandmarkThemeTag[]> = {
  sports: ["stadiums"],
  heritage: ["historic-monuments"],
  transport: ["stations-hubs"],
  park: ["parks-gardens"],
  beach: ["beaches-corniches"],
  retail: ["shopping-centers"],
  university: ["education"],
  hospital: ["healthcare"],
  major_road: ["major-roads"],
  civic: ["squares-esplanades"],
  business: ["business-towers"],
  worship: ["religious"],
  other: ["other-local-anchor"],
};

export const LANDMARK_THEME_OVERRIDES: Readonly<
  Partial<Record<string, readonly LandmarkThemeTag[]>>
> = {
  landmark_casablanca_maarif_stade_mohammed_v: ["stadiums"],
  landmark_kenitra_centre_ville_stade_municipal: ["stadiums"],
  landmark_tanger_marchan_cafe_hafa: ["iconic-cafes"],
  landmark_rabat_ocean_musee_national_photographie: [
    "museums-culture",
    "lighthouses-forts-ramparts",
  ],
  landmark_tanger_marchan_necropole_hafa: ["historic-monuments"],
  landmark_fes_el_bali_bab_bou_jeloud: [
    "historic-monuments",
    "lighthouses-forts-ramparts",
  ],
};

function uniqueThemes(themes: readonly LandmarkThemeTag[]): LandmarkThemeTag[] {
  return [...new Set(themes)];
}

export function getLandmarkThemeTags(
  landmark: LandmarkTerritoryEntity,
): LandmarkThemeTag[] {
  if (landmark.themeTags?.length) return uniqueThemes(landmark.themeTags);

  const override = LANDMARK_THEME_OVERRIDES[landmark.id];
  if (override?.length) return uniqueThemes(override);

  return [...CATEGORY_DEFAULT_THEMES[landmark.category]];
}

export function getLandmarkThemeLabelsFr(
  landmark: LandmarkTerritoryEntity,
): string[] {
  return getLandmarkThemeTags(landmark).map((theme) => LANDMARK_THEME_LABELS_FR[theme]);
}
