// SEARCH-RELOOKING-1 — coordonnées des villes pour la carte /search.
// Positions en % du conteneur de la carte (aligné sur /maps/morocco-official.svg,
// viewBox 2000×2000). Les 6 premières sont les coords VALIDÉES réutilisées de
// MoroccoOfficialMap / SignatureMapSection (home). Les suivantes sont estimées
// relativement à ces ancres, en respectant la géographie réelle du Maroc
// (Tanger nord-ouest, Marrakech intérieur sud, Agadir sud-ouest côte, Fès
// intérieur est, Oujda nord-est). Aucune position aberrante, aucun pin hors Maroc.

export type CityCoord = { x: number; y: number };

// Clés normalisées (sans accents, minuscules).
export const CITY_COORDS: Record<string, CityCoord> = {
  // ── Coords validées (home / MoroccoOfficialMap) ───────────────────────────
  casablanca: { x: 57.25, y: 20.1 },
  rabat: { x: 60.95, y: 17.65 },
  tanger: { x: 66.25, y: 7.75 },
  fes: { x: 70.25, y: 17.6 },
  marrakech: { x: 55.15, y: 31.25 },
  agadir: { x: 47.1, y: 38.15 },
  // ── Estimées (relatives aux ancres, géographie respectée) ─────────────────
  tetouan: { x: 69.0, y: 9.8 },   // nord, SE de Tanger
  meknes: { x: 66.8, y: 17.6 },   // intérieur, juste ouest de Fès
  sale: { x: 61.6, y: 16.7 },     // accolée à Rabat (nord-est)
  temara: { x: 60.2, y: 18.9 },   // juste au sud de Rabat
  oujda: { x: 86.0, y: 13.5 },    // nord-est, proche frontière orientale
  kenitra: { x: 60.0, y: 15.4 },  // côte, au nord de Rabat
  eljadida: { x: 53.0, y: 23.2 }, // côte, au sud-ouest de Casablanca
  essaouira: { x: 46.5, y: 31.5 },// côte ouest, sous Marrakech
};

// Retire les accents et met en minuscules pour matcher les clés.
export function normalizeCityKey(city: string): string {
  return city
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export function getCityCoord(city: string): CityCoord | null {
  return CITY_COORDS[normalizeCityKey(city)] ?? null;
}

// ── Tiering des clusters par volume ──────────────────────────────────────────
export type ClusterTier = {
  min: number;
  label: string;
  color: string; // couleur du pin
  glow: string;  // couleur du halo
  size: number;  // diamètre px du pin
};

// Ordre décroissant : on prend le premier dont count >= min.
export const CLUSTER_TIERS: ClusterTier[] = [
  { min: 30, label: "30+ biens", color: "#C2A368", glow: "rgba(194,163,104,0.55)", size: 34 },
  { min: 10, label: "10–30 biens", color: "#57a6ff", glow: "rgba(87,166,255,0.5)", size: 28 },
  { min: 5, label: "5–10 biens", color: "#34d399", glow: "rgba(52,211,153,0.5)", size: 24 },
  { min: 1, label: "1–5 biens", color: "#9fb4cc", glow: "rgba(159,180,204,0.45)", size: 20 },
];

export function getClusterTier(count: number): ClusterTier {
  for (const t of CLUSTER_TIERS) {
    if (count >= t.min) return t;
  }
  return CLUSTER_TIERS[CLUSTER_TIERS.length - 1];
}
