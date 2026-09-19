import type { VerifiedLandmarkEntry } from "./territory-landmark-registry";

export type LandmarkDisplayTier = "iconic" | "major" | "strong_local" | "contextual";

export type LandmarkPresentation = {
  artworkKey: string;
  tier: LandmarkDisplayTier;
  tierLabel: "Iconique" | "Majeur" | "Local fort" | "Contextuel";
  revealZoom: number;
  visualPriority: number;
};

const TARGET_PRESENTATION: Record<string, LandmarkPresentation> = {
  "landmark_casablanca_maarif_twin_center": {
    artworkKey: "twin-center",
    tier: "iconic",
    tierLabel: "Iconique",
    revealZoom: 10.2,
    visualPriority: 100,
  },
  "landmark_casablanca_maarif_stade_mohammed_v": {
    artworkKey: "stade-mohammed-v",
    tier: "iconic",
    tierLabel: "Iconique",
    revealZoom: 10.2,
    visualPriority: 99,
  },
  "landmark_casablanca_ain_diab_morocco_mall": {
    artworkKey: "morocco-mall",
    tier: "major",
    tierLabel: "Majeur",
    revealZoom: 10.35,
    visualPriority: 96,
  },
  "landmark_casablanca_finance_city_cfc_tower": {
    artworkKey: "cfc-first-tower",
    tier: "major",
    tierLabel: "Majeur",
    revealZoom: 10.35,
    visualPriority: 95,
  },
  "landmark_casablanca_finance_city_anfa_park": {
    artworkKey: "anfa-park",
    tier: "major",
    tierLabel: "Majeur",
    revealZoom: 10.85,
    visualPriority: 90,
  },
  "landmark_casablanca_bourgogne_lycee_lyautey": {
    artworkKey: "lycee-lyautey",
    tier: "strong_local",
    tierLabel: "Local fort",
    revealZoom: 11.05,
    visualPriority: 87,
  },
  "landmark_casablanca_racine_institut_juan_ramon_jimenez": {
    artworkKey: "institut-juan-ramon-jimenez",
    tier: "strong_local",
    tierLabel: "Local fort",
    revealZoom: 11.1,
    visualPriority: 85,
  },
  "landmark_casablanca_bouskoura_forest": {
    artworkKey: "foret-de-bouskoura",
    tier: "strong_local",
    tierLabel: "Local fort",
    revealZoom: 11.15,
    visualPriority: 83,
  },
  "landmark_mohammedia_centre_parc_villes_jumelees": {
    artworkKey: "parc-des-villes-jumelees",
    tier: "major",
    tierLabel: "Majeur",
    revealZoom: 11.0,
    visualPriority: 89,
  },
  "landmark_casablanca_bourgogne_casa_bourgogne_post": {
    artworkKey: "civic-building",
    tier: "contextual",
    tierLabel: "Contextuel",
    revealZoom: 12.2,
    visualPriority: 62,
  },
};

function fallbackPresentation(entry: VerifiedLandmarkEntry): LandmarkPresentation {
  const score = entry.entity.importance.score;
  if (entry.entity.importance.tier === "flagship" || score >= 95) {
    return {
      artworkKey: entry.entity.category,
      tier: "iconic",
      tierLabel: "Iconique",
      revealZoom: Math.max(10.5, entry.entity.visibility.minZoom - 3),
      visualPriority: score,
    };
  }
  if (entry.entity.importance.tier === "major" || score >= 80) {
    return {
      artworkKey: entry.entity.category,
      tier: "major",
      tierLabel: "Majeur",
      revealZoom: Math.max(10.85, entry.entity.visibility.minZoom - 2.8),
      visualPriority: score,
    };
  }
  if (entry.entity.importance.tier === "regional" || score >= 65) {
    return {
      artworkKey: entry.entity.category,
      tier: "strong_local",
      tierLabel: "Local fort",
      revealZoom: Math.max(11.25, entry.entity.visibility.minZoom - 2.5),
      visualPriority: score,
    };
  }
  return {
    artworkKey: entry.entity.category,
    tier: "contextual",
    tierLabel: "Contextuel",
    revealZoom: Math.max(11.8, entry.entity.visibility.minZoom - 2.2),
    visualPriority: score,
  };
}

export function getLandmarkPresentation(entry: VerifiedLandmarkEntry): LandmarkPresentation {
  return TARGET_PRESENTATION[entry.entity.id] ?? fallbackPresentation(entry);
}

export function getLandmarkVisualPriority(entry: VerifiedLandmarkEntry): number {
  const presentation = getLandmarkPresentation(entry);
  return presentation.visualPriority + (entry.entity.visibility.retainPriority ? 6 : 0);
}

export function getLandmarkRevealCapacity(zoom: number, viewportWidth: number): number {
  const mobile = viewportWidth < 640;
  const tablet = viewportWidth >= 640 && viewportWidth < 1024;
  if (zoom < 10.15) return 0;
  if (zoom < 10.55) return mobile ? 2 : tablet ? 3 : 4;
  if (zoom < 10.95) return mobile ? 3 : tablet ? 4 : 5;
  if (zoom < 11.3) return mobile ? 4 : tablet ? 5 : 7;
  if (zoom < 12.1) return mobile ? 4 : tablet ? 6 : 8;
  return mobile ? 5 : tablet ? 7 : 10;
}

export function selectLandmarksForCityView(
  entries: readonly VerifiedLandmarkEntry[],
  zoom: number,
  viewportWidth: number,
): VerifiedLandmarkEntry[] {
  const capacity = getLandmarkRevealCapacity(zoom, viewportWidth);
  if (capacity <= 0) return [];

  return entries
    .filter((entry) => zoom >= getLandmarkPresentation(entry).revealZoom)
    .sort((a, b) => getLandmarkVisualPriority(b) - getLandmarkVisualPriority(a))
    .slice(0, capacity);
}
