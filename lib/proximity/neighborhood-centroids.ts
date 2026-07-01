// REAL-PROXIMITY-ENGINE-1 — Approximate GPS centroids for Moroccan neighborhoods.
// Accuracy: ±500m. Used to identify the closest neighborhood when a listing
// has exact GPS coordinates. NOT for navigation.
// Source: manual approximation from public cartographic references.

export type NeighborhoodCentroid = {
  city: string;          // Lowercase, normalized
  neighborhood: string;  // Lowercase, normalized — must match NEIGHBORHOOD_PROXIMITY key
  lat: number;
  lng: number;
};

export const NEIGHBORHOOD_CENTROIDS: NeighborhoodCentroid[] = [
  // ── Casablanca ─────────────────────────────────────────────────
  { city: "casablanca", neighborhood: "finance city", lat: 33.5646, lng: -7.6293 },
  { city: "casablanca", neighborhood: "maarif",       lat: 33.5898, lng: -7.6440 },
  { city: "casablanca", neighborhood: "bouskoura",    lat: 33.4547, lng: -7.6663 },

  // ── Rabat ──────────────────────────────────────────────────────
  { city: "rabat", neighborhood: "hay riad", lat: 33.9490, lng: -6.8833 },
  { city: "rabat", neighborhood: "agdal",    lat: 33.9959, lng: -6.8533 },
  { city: "rabat", neighborhood: "hassan",   lat: 34.0208, lng: -6.8415 },

  // ── Tanger ─────────────────────────────────────────────────────
  { city: "tanger", neighborhood: "malabata",       lat: 35.7800, lng: -5.8050 },
  { city: "tanger", neighborhood: "villenouvelle",  lat: 35.7744, lng: -5.8067 },

  // ── Marrakech ──────────────────────────────────────────────────
  { city: "marrakech", neighborhood: "gueliz",       lat: 31.6347, lng: -8.0128 },
  { city: "marrakech", neighborhood: "hivernage",    lat: 31.6224, lng: -8.0067 },
  { city: "marrakech", neighborhood: "routeourika",  lat: 31.5333, lng: -7.9833 },

  // ── Agadir ─────────────────────────────────────────────────────
  { city: "agadir", neighborhood: "founty",   lat: 30.3770, lng: -9.5669 },
  { city: "agadir", neighborhood: "talborjt", lat: 30.4207, lng: -9.5989 },

  // ── Fès ────────────────────────────────────────────────────────
  { city: "fes", neighborhood: "villenouvellefes", lat: 34.0219, lng: -5.0077 },
  { city: "fes", neighborhood: "fesel bali",       lat: 34.0656, lng: -4.9742 },
];
