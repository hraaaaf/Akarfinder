// MAP-NEIGHBORHOOD-INTELLIGENCE-1
// Source de données statique pour la carte /map.
// Ne contient PAS d'annonces, PAS de reliability_score.
// Données : villes, quartiers, coordonnées GPS, confidence benchmark, highlights proximité.
// Sources : OpenStreetMap (indicatif) + données marché observées 2024-2025.
// DISCLAIMER : repères indicatifs uniquement, à confirmer avant toute décision.

import { MARKET_DATA } from "@/lib/market/morocco-market-prices";

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Niveau de confiance des données benchmark pour un quartier */
export type DataConfidence = "élevée" | "moyenne" | "faible" | "en_preparation";

/** Un highlight de proximité affiché dans la fiche quartier */
export type NeighborhoodHighlight = {
  icon: string;    // emoji
  label: string;
};

/** Repère prix indicatif — provient uniquement de benchmark_source existant */
export type PriceBenchmark = {
  /** Prix médian observé au m² (achat appartement) — null si données insuffisantes */
  median_buy_appt: number | null;
  /** Label affiché si données insuffisantes */
  fallback_label: string;
  /** Niveau de confiance de ce repère */
  confidence: DataConfidence;
  /** Période de référence */
  period: string;
};

/** Un point quartier affiché sur la carte */
export type NeighborhoodPoint = {
  /** Identifiant unique slug */
  id: string;
  /** Ville d'appartenance */
  city: string;
  /** Nom du quartier (null = fiche ville) */
  neighborhood: string | null;
  /** Latitude GPS (centroïde approximatif) */
  lat: number;
  /** Longitude GPS (centroïde approximatif) */
  lng: number;
  /** Niveau de confiance global des données de ce point */
  dataConfidence: DataConfidence;
  /** Repère prix benchmark (issu de MARKET_DATA existant) */
  benchmark: PriceBenchmark;
  /** Highlights proximité affichés dans la fiche */
  highlights: NeighborhoodHighlight[];
  /** CTA vers /search pré-filtré sur cette ville/quartier */
  searchHref: string;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findMarketBenchmark(
  city: string,
  neighborhood: string | null
): { median_buy_appt: number | null; confidence: DataConfidence; fallback_label: string } {
  const normCity = normalize(city);
  const normNeighborhood = neighborhood ? normalize(neighborhood) : null;

  const neighborhoodMatch = normNeighborhood
    ? MARKET_DATA.find(
        (entry) =>
          normalize(entry.city) === normCity &&
          entry.neighborhood !== undefined &&
          normalize(entry.neighborhood) === normNeighborhood &&
          entry.property_type === "appartement" &&
          entry.transaction_type === "buy"
      )
    : undefined;

  if (neighborhoodMatch) {
    return {
      median_buy_appt: neighborhoodMatch.median_price_per_m2,
      confidence: neighborhoodMatch.confidence === "élevée" ? "élevée" : neighborhoodMatch.confidence === "moyenne" ? "moyenne" : "faible",
      fallback_label: "",
    };
  }

  const cityMatch = MARKET_DATA.find(
    (entry) =>
      normalize(entry.city) === normCity &&
      entry.neighborhood === undefined &&
      entry.property_type === "appartement" &&
      entry.transaction_type === "buy"
  );

  if (cityMatch) {
    return {
      median_buy_appt: cityMatch.median_price_per_m2,
      confidence: cityMatch.confidence === "élevée" ? "élevée" : cityMatch.confidence === "moyenne" ? "moyenne" : "faible",
      fallback_label: "",
    };
  }

  return {
    median_buy_appt: null,
    confidence: "en_preparation",
    fallback_label: "Repère indicatif bientôt disponible",
  };
}

function makeBenchmark(city: string, neighborhood: string | null): PriceBenchmark {
  const benchmark = findMarketBenchmark(city, neighborhood);
  return {
    median_buy_appt: benchmark.median_buy_appt,
    confidence: benchmark.confidence,
    fallback_label: benchmark.fallback_label,
    period: "Données 2024–2025",
  };
}

// ─── Dataset ───────────────────────────────────────────────────────────────────
// Coordonnées GPS : approximations cartographiques ±500m. Source OSM.
// Prix : observations 2024-2025 depuis MARKET_DATA (benchmark_source).
// Ne pas afficher comme prix de vente garantis.

export const NEIGHBORHOOD_POINTS: NeighborhoodPoint[] = [

  // ══════════════════════════════════════════════════════════════════════════════
  // CASABLANCA
  // ══════════════════════════════════════════════════════════════════════════════

  {
    id: "casablanca-finance-city",
    city: "Casablanca",
    neighborhood: "Finance City",
    lat: 33.5646,
    lng: -7.6293,
    dataConfidence: "élevée",
    benchmark: makeBenchmark("Casablanca", "Finance City"),
    highlights: [
      { icon: "🏦", label: "Attijariwafa Bank CFC" },
      { icon: "☕", label: "Café Paul CFC" },
      { icon: "🌳", label: "Parc CFC" },
      { icon: "🚌", label: "Bus ligne CFC — Centre" },
      { icon: "🕌", label: "Mosquée Sidi Maârouf" },
    ],
    searchHref: "/search?city=Casablanca&q=Finance+City",
  },

  {
    id: "casablanca-maarif",
    city: "Casablanca",
    neighborhood: "Maârif",
    lat: 33.5898,
    lng: -7.6440,
    dataConfidence: "élevée",
    benchmark: makeBenchmark("Casablanca", "Maârif"),
    highlights: [
      { icon: "🛒", label: "Marjane Maârif" },
      { icon: "🚋", label: "Tram T1 — Maârif" },
      { icon: "💊", label: "Pharmacie bd Zerktouni" },
      { icon: "☕", label: "Café Maârif" },
      { icon: "🏫", label: "Lycée Moulay Youssef" },
    ],
    searchHref: "/search?city=Casablanca&q=Maarif",
  },

  {
    id: "casablanca-bouskoura",
    city: "Casablanca",
    neighborhood: "Bouskoura",
    lat: 33.4547,
    lng: -7.6663,
    dataConfidence: "moyenne",
    benchmark: makeBenchmark("Casablanca", "Bouskoura"),
    highlights: [
      { icon: "⛳", label: "Golf Royal Bouskoura" },
      { icon: "🛒", label: "Carrefour Bouskoura" },
      { icon: "🕌", label: "Mosquée principale" },
      { icon: "🏫", label: "École primaire Bouskoura" },
    ],
    searchHref: "/search?city=Casablanca&q=Bouskoura",
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // RABAT
  // ══════════════════════════════════════════════════════════════════════════════

  {
    id: "rabat-hay-riad",
    city: "Rabat",
    neighborhood: "Hay Riad",
    lat: 33.9490,
    lng: -6.8833,
    dataConfidence: "élevée",
    benchmark: makeBenchmark("Rabat", "Hay Riad"),
    highlights: [
      { icon: "🛒", label: "Marjane Hay Riad" },
      { icon: "🚌", label: "Bus RATC — Hay Riad" },
      { icon: "💊", label: "Pharmacie Hay Riad" },
      { icon: "🌳", label: "Parc Hay Riad" },
      { icon: "🏦", label: "Attijariwafa Hay Riad" },
    ],
    searchHref: "/search?city=Rabat&q=Hay+Riad",
  },

  {
    id: "rabat-agdal",
    city: "Rabat",
    neighborhood: "Agdal",
    lat: 33.9959,
    lng: -6.8533,
    dataConfidence: "élevée",
    benchmark: makeBenchmark("Rabat", "Agdal"),
    highlights: [
      { icon: "🎓", label: "Université Mohammed V" },
      { icon: "☕", label: "Cafés bd Al Amir Fal" },
      { icon: "🚌", label: "Bus RATC — Agdal" },
      { icon: "🛒", label: "Supermarchés Agdal" },
      { icon: "💊", label: "Pharmacies Agdal" },
    ],
    searchHref: "/search?city=Rabat&q=Agdal",
  },

  {
    id: "rabat-hassan",
    city: "Rabat",
    neighborhood: "Hassan",
    lat: 34.0208,
    lng: -6.8415,
    dataConfidence: "moyenne",
    benchmark: makeBenchmark("Rabat", "Hassan"),
    highlights: [
      { icon: "🕌", label: "Tour Hassan" },
      { icon: "🏛️", label: "Mausolée Mohammed V" },
      { icon: "🌊", label: "Corniche de Rabat" },
      { icon: "🚌", label: "Transport centre-ville" },
    ],
    searchHref: "/search?city=Rabat&q=Hassan",
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // MARRAKECH
  // ══════════════════════════════════════════════════════════════════════════════

  {
    id: "marrakech-gueliz",
    city: "Marrakech",
    neighborhood: "Guéliz",
    lat: 31.6347,
    lng: -8.0128,
    dataConfidence: "élevée",
    benchmark: makeBenchmark("Marrakech", "Guéliz"),
    highlights: [
      { icon: "🛒", label: "Marjane Guéliz" },
      { icon: "☕", label: "Cafés avenue Mohammed V" },
      { icon: "🏥", label: "Polyclinique du Sud" },
      { icon: "🚌", label: "Bus urbain Guéliz" },
      { icon: "🏦", label: "Banques centre Guéliz" },
    ],
    searchHref: "/search?city=Marrakech&q=Gueliz",
  },

  {
    id: "marrakech-hivernage",
    city: "Marrakech",
    neighborhood: "Hivernage",
    lat: 31.6224,
    lng: -8.0067,
    dataConfidence: "moyenne",
    benchmark: makeBenchmark("Marrakech", "Hivernage"),
    highlights: [
      { icon: "🏨", label: "Hôtels 5 étoiles" },
      { icon: "🌳", label: "Jardins de l'Hivernage" },
      { icon: "🎭", label: "Palais des Congrès" },
      { icon: "🚕", label: "Taxis disponibles" },
    ],
    searchHref: "/search?city=Marrakech&q=Hivernage",
  },

  {
    id: "marrakech-route-ourika",
    city: "Marrakech",
    neighborhood: "Route de l'Ourika",
    lat: 31.5333,
    lng: -7.9833,
    dataConfidence: "moyenne",
    benchmark: makeBenchmark("Marrakech", "Route de l'Ourika"),
    highlights: [
      { icon: "🌄", label: "Vue Atlas" },
      { icon: "⛳", label: "Golf Royal" },
      { icon: "🏡", label: "Villas et domaines" },
      { icon: "🌿", label: "Cadre naturel" },
    ],
    searchHref: "/search?city=Marrakech&q=Ourika",
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // TANGER
  // ══════════════════════════════════════════════════════════════════════════════

  {
    id: "tanger-malabata",
    city: "Tanger",
    neighborhood: "Malabata",
    lat: 35.7800,
    lng: -5.8050,
    dataConfidence: "moyenne",
    benchmark: makeBenchmark("Tanger", "Malabata"),
    highlights: [
      { icon: "🌊", label: "Plage Malabata" },
      { icon: "🏨", label: "Hôtels vue mer" },
      { icon: "🚕", label: "Taxis Malabata" },
      { icon: "🛒", label: "Commerces de proximité" },
    ],
    searchHref: "/search?city=Tanger&q=Malabata",
  },

  {
    id: "tanger-ville-nouvelle",
    city: "Tanger",
    neighborhood: "Ville Nouvelle",
    lat: 35.7744,
    lng: -5.8067,
    dataConfidence: "élevée",
    benchmark: makeBenchmark("Tanger", "Ville Nouvelle"),
    highlights: [
      { icon: "🏪", label: "Centre commercial Tanger City" },
      { icon: "🏦", label: "Banques centre-ville" },
      { icon: "🚌", label: "Réseau bus CTM" },
      { icon: "🏥", label: "Cliniques Ville Nouvelle" },
      { icon: "🎓", label: "Universités à proximité" },
    ],
    searchHref: "/search?city=Tanger&q=Ville+Nouvelle",
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // AGADIR
  // ══════════════════════════════════════════════════════════════════════════════

  {
    id: "agadir-founty",
    city: "Agadir",
    neighborhood: "Founty",
    lat: 30.3770,
    lng: -9.5669,
    dataConfidence: "moyenne",
    benchmark: makeBenchmark("Agadir", "Founty"),
    highlights: [
      { icon: "🌊", label: "Plage d'Agadir" },
      { icon: "🛒", label: "Souk El Had" },
      { icon: "🏨", label: "Zone hôtelière" },
      { icon: "🌿", label: "Promenade bord de mer" },
    ],
    searchHref: "/search?city=Agadir&q=Founty",
  },

  {
    id: "agadir-talborjt",
    city: "Agadir",
    neighborhood: "Talborjt",
    lat: 30.4207,
    lng: -9.5989,
    dataConfidence: "moyenne",
    benchmark: makeBenchmark("Agadir", "Talborjt"),
    highlights: [
      { icon: "🕌", label: "Mosquée Talborjt" },
      { icon: "🛒", label: "Marché de quartier" },
      { icon: "🚌", label: "Bus urbain Agadir" },
      { icon: "🏫", label: "Écoles de quartier" },
    ],
    searchHref: "/search?city=Agadir&q=Talborjt",
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // FÈS
  // ══════════════════════════════════════════════════════════════════════════════

  {
    id: "fes-ville-nouvelle",
    city: "Fès",
    neighborhood: "Ville Nouvelle",
    lat: 34.0219,
    lng: -5.0077,
    dataConfidence: "moyenne",
    benchmark: makeBenchmark("Fès", "Ville Nouvelle"),
    highlights: [
      { icon: "🏦", label: "Banques bd Mohammed V" },
      { icon: "🛒", label: "Commerces centre-ville" },
      { icon: "🎓", label: "Université Sidi Mohammed" },
      { icon: "🚌", label: "Bus urbain Fès" },
    ],
    searchHref: "/search?city=Fes&q=Ville+Nouvelle",
  },

  {
    id: "fes-el-bali",
    city: "Fès",
    neighborhood: "Fès el-Bali",
    lat: 34.0656,
    lng: -4.9742,
    dataConfidence: "faible",
    benchmark: makeBenchmark("Fès", "Fès el-Bali"),
    highlights: [
      { icon: "🏛️", label: "Médina UNESCO" },
      { icon: "🕌", label: "Mosquée Karaouiyine" },
      { icon: "🛍️", label: "Souks artisanaux" },
      { icon: "🌿", label: "Jardins Jnane Sbil" },
    ],
    searchHref: "/search?city=Fes&q=Medina",
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // KÉNITRA
  // ══════════════════════════════════════════════════════════════════════════════

  {
    id: "kenitra-centre",
    city: "Kénitra",
    neighborhood: null,
    lat: 34.2610,
    lng: -6.5802,
    dataConfidence: "moyenne",
    benchmark: makeBenchmark("Kénitra", null),
    highlights: [
      { icon: "🏦", label: "Banques centre-ville" },
      { icon: "🛒", label: "Marché central" },
      { icon: "🚌", label: "Gare routière Kénitra" },
      { icon: "🎓", label: "Université Ibn Tofail" },
    ],
    searchHref: "/search?city=Kenitra",
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // MOHAMMEDIA
  // ══════════════════════════════════════════════════════════════════════════════

  {
    id: "mohammedia-centre",
    city: "Mohammedia",
    neighborhood: null,
    lat: 33.6866,
    lng: -7.3833,
    dataConfidence: "moyenne",
    benchmark: makeBenchmark("Mohammedia", null),
    highlights: [
      { icon: "🌊", label: "Plage Mohammedia" },
      { icon: "⛽", label: "Zone industrielle" },
      { icon: "🚂", label: "Gare Mohammedia" },
      { icon: "🛒", label: "Commerces centre" },
    ],
    searchHref: "/search?city=Mohammedia",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Retourne toutes les villes distinctes présentes dans le dataset */
export function getNeighborhoodCities(): string[] {
  return Array.from(new Set(NEIGHBORHOOD_POINTS.map((p) => p.city))).sort();
}

/** Filtre les points par ville (insensible à la casse) */
export function filterNeighborhoodsByCity(city: string): NeighborhoodPoint[] {
  if (city === "all") return NEIGHBORHOOD_POINTS;
  return NEIGHBORHOOD_POINTS.filter(
    (p) => p.city.toLowerCase() === city.toLowerCase()
  );
}

/** Retourne le label de confiance benchmark affiché à l'utilisateur */
export function getBenchmarkLabel(point: NeighborhoodPoint): string {
  const b = point.benchmark;
  if (b.median_buy_appt == null || b.confidence === "en_preparation") {
    return b.fallback_label || "Repère indicatif bientôt disponible";
  }
  return `~${b.median_buy_appt.toLocaleString("fr-FR")} DH/m²`;
}

/** Retourne un libellé court pour le niveau de confiance */
export function getConfidenceLabel(confidence: DataConfidence): string {
  switch (confidence) {
    case "élevée":      return "Données élevées";
    case "moyenne":     return "Données moyennes";
    case "faible":      return "Données faibles";
    case "en_preparation": return "En préparation";
  }
}
