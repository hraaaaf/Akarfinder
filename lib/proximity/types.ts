// P10C — Proximity types for "Vie autour du bien"

export type ProximityCategory =
  | "marche_souk"
  | "supermarche"
  | "hanout"
  | "taxi"
  | "transport"
  | "pharmacie"
  | "ecole"
  | "mosquee"
  | "clinique"
  | "banque"
  | "parking"
  | "cafe"
  | "espace_vert";

export type ProximityMode = "à pied" | "en voiture";
export type ProximityConfidence = "élevé" | "moyen" | "indicatif";

export type ProximityPoint = {
  category: ProximityCategory;
  label: string;
  distance_minutes: number;
  mode: ProximityMode;
  confidence: ProximityConfidence;
  source: string;
};
