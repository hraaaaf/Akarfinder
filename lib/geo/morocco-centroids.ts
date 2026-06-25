/**
 * Static approximate centroids for Moroccan cities and neighborhoods.
 *
 * These are city/district-level centroids, NOT exact addresses.
 * They are used as fallback coordinates when no scraped position is available.
 * Always paired with geo_precision = "city_centroid" or "neighborhood_centroid".
 *
 * Sources: OpenStreetMap Nominatim lookups + approximate geographic knowledge.
 * Do NOT use these as exact locations for navigation or legal documents.
 */

export type GeoPoint = {
  lat: number;
  lng: number;
};

// ─── City centroids ────────────────────────────────────────────────────────────

export const CITY_CENTROIDS: Record<string, GeoPoint> = {
  casablanca:   { lat: 33.5731, lng: -7.5898 },
  rabat:        { lat: 34.0209, lng: -6.8416 },
  tanger:       { lat: 35.7595, lng: -5.8340 },
  marrakech:    { lat: 31.6295, lng: -7.9811 },
  agadir:       { lat: 30.4278, lng: -9.5981 },
  fes:          { lat: 34.0181, lng: -5.0078 },
  fès:          { lat: 34.0181, lng: -5.0078 },
  meknes:       { lat: 33.8935, lng: -5.5473 },
  meknès:       { lat: 33.8935, lng: -5.5473 },
  kenitra:      { lat: 34.2610, lng: -6.5802 },
  kénitra:      { lat: 34.2610, lng: -6.5802 },
  mohammedia:   { lat: 33.6866, lng: -7.3833 },
  "el jadida":  { lat: 33.2316, lng: -8.5007 },
};

// ─── Neighborhood centroids ────────────────────────────────────────────────────
// Only for neighborhoods already present in mock/demo listings.
// Key format: "city::neighborhood" (both lowercase, accents preserved for matching).

export const NEIGHBORHOOD_CENTROIDS: Record<string, GeoPoint> = {
  // Casablanca
  "casablanca::finance city":      { lat: 33.5638, lng: -7.6288 },
  "casablanca::maârif":            { lat: 33.5839, lng: -7.6290 },
  "casablanca::maâmora":           { lat: 33.6100, lng: -7.5600 },
  "casablanca::bouskoura":         { lat: 33.4700, lng: -7.6500 },
  "casablanca::ain chkef":         { lat: 33.5350, lng: -7.6100 },
  // Rabat
  "rabat::hay riad":               { lat: 33.9500, lng: -6.8300 },
  "rabat::agdal":                  { lat: 33.9897, lng: -6.8541 },
  "rabat::hassan":                 { lat: 34.0128, lng: -6.8285 },
  // Marrakech
  "marrakech::route de l'ourika":  { lat: 31.5980, lng: -8.0019 },
  "marrakech::guéliz":             { lat: 31.6340, lng: -8.0040 },
  "marrakech::hivernage":          { lat: 31.6260, lng: -8.0100 },
  // Tanger
  "tanger::malabata":              { lat: 35.7904, lng: -5.7836 },
  "tanger::ville nouvelle":        { lat: 35.7686, lng: -5.8183 },
  // Agadir
  "agadir::founty":                { lat: 30.4086, lng: -9.5947 },
  "agadir::talborjt":              { lat: 30.4181, lng: -9.5926 },
  // Fès
  "fes::ville nouvelle":           { lat: 34.0007, lng: -4.9817 },
  "fès::ville nouvelle":           { lat: 34.0007, lng: -4.9817 },
  "fes::fès el bali":              { lat: 34.0641, lng: -4.9755 },
  // Kénitra
  "kenitra::maâmora":              { lat: 34.2700, lng: -6.4500 },
  "kénitra::maâmora":              { lat: 34.2700, lng: -6.4500 },
};

// ─── Lookup helpers ────────────────────────────────────────────────────────────

/**
 * Normalize a string for centroid lookup: lowercase + trim.
 * Does NOT strip accents — keys are stored with accents for better matching.
 */
function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** Return the city centroid for a given city name, or null if unknown. */
export function getCityCentroid(city: string): GeoPoint | null {
  return CITY_CENTROIDS[normalize(city)] ?? null;
}

/** Return the neighborhood centroid for a city+neighborhood pair, or null. */
export function getNeighborhoodCentroid(
  city: string,
  neighborhood: string
): GeoPoint | null {
  const key = `${normalize(city)}::${normalize(neighborhood)}`;
  return NEIGHBORHOOD_CENTROIDS[key] ?? null;
}
