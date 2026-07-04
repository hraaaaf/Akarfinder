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
  sale: { x: 62.3, y: 16.1 },     // accolée à Rabat (nord-est), espacée pour lisibilité
  temara: { x: 59.5, y: 19.5 },   // juste au sud de Rabat, espacée pour lisibilité
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

// MAP-EXPERIENCE-REDESIGN-MCP-1 — la carte de recherche représente des repères
// ville/zone, pas une densité d'annonces. Un seul style de repère uniforme,
// pas de tiering par volume de biens.
export type CityMarkerStyle = {
  color: string; // couleur du pin
  glow: string;  // couleur du halo
  text: string;  // couleur du chiffre/label
  size: number;  // diamètre px du pin
};

export const CITY_MARKER: CityMarkerStyle = {
  color: "#2563EB",
  glow: "rgba(37,99,235,0.35)",
  text: "#ffffff",
  size: 22,
};

export const CITY_MARKER_ACTIVE: CityMarkerStyle = {
  color: "#9B7838",
  glow: "rgba(155,120,56,0.45)",
  text: "#ffffff",
  size: 26,
};
