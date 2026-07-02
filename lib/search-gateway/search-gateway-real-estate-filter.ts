// SEARCH-GATEWAY-REAL-ESTATE-ONLY-FILTER-1
// Ensures Search Gateway results are limited to real estate content.
// Prevents vehicle listings (e.g. Avito cars) from appearing in /search.

// Signals that confirm a result is real estate.
// Restricted to terms that are unambiguous real-estate identifiers —
// "vente", "location", "acheter" are excluded because they also apply to vehicles.
export const REAL_ESTATE_SIGNALS: ReadonlyArray<string> = [
  "appartement",
  "apartment",
  "villa",
  "maison",
  "terrain",
  "studio",
  "duplex",
  "penthouse",
  "loft",
  "bureau",
  "local commercial",
  "immobilier",
  "résidence",
  "residence",
  "m²",
  "m2",
  "chambre",
  "salon",
  "salle de bain",
  "pièce",
  "piece",
  "propriété",
  "propriete",
  "immeuble",
  "promoteur",
];

// Signals that identify a vehicle listing.
// Excludes: "auto" (too short), "moto" (matches "promotion"), "moteur"
// (matches "promoteur"), "essence" (common French word), "hybride" (architectural).
export const VEHICLE_SIGNALS: ReadonlyArray<string> = [
  "voiture",
  "automobile",
  "scooter",
  "camion",
  "utilitaire",
  "carrosserie",
  "kilométrage",
  "kilometrage",
  "boîte automatique",
  "boite automatique",
  "diesel",
  "renault",
  "dacia",
  "peugeot",
  "citroën",
  "citroen",
  "volkswagen",
  "mercedes",
  "bmw",
  "audi",
  "hyundai",
  "toyota",
  "kia",
  "ford",
];

// Avito.ma URL path segments that identify vehicle category pages.
// Documented from avito.ma URL structure — do not add patterns not observed.
// Real estate paths use: /appartements/, /villas/, /terrains/, /immobilier/
export const VEHICLE_URL_SEGMENTS: ReadonlyArray<string> = [
  "/voitures/",
  "/voitures-",
  "/voiture-",
  "/motos/",
  "/motos-",
  "/moto-",
  "/camions/",
  "/utilitaires/",
];

/**
 * Returns true if the result is likely a real estate listing.
 *
 * Decision logic:
 * 1. URL matches a vehicle category pattern → reject
 * 2. Vehicle keywords present AND no real estate keywords → reject
 * 3. Real estate keywords present → accept
 * 4. No signal either way → accept (benefit of the doubt; queries already
 *    target real-estate-specific sites and terms)
 *
 * "garage", "parking", "local commercial", "terrain", "bureau" are NOT
 * in VEHICLE_SIGNALS, so they are never accidentally rejected.
 */
export function isRealEstateGatewayResult(
  title: string,
  snippet: string | undefined,
  url: string
): boolean {
  const urlLower = url.toLowerCase();

  // 1. Hard reject: URL contains a known vehicle category segment
  for (const segment of VEHICLE_URL_SEGMENTS) {
    if (urlLower.includes(segment)) {
      return false;
    }
  }

  const text = `${title} ${snippet ?? ""}`.toLowerCase();

  const hasVehicleSignal = VEHICLE_SIGNALS.some((kw) => text.includes(kw));
  const hasRealEstateSignal = REAL_ESTATE_SIGNALS.some((kw) => text.includes(kw));

  // 2. Vehicle signal without any real estate counter-signal → reject
  if (hasVehicleSignal && !hasRealEstateSignal) {
    return false;
  }

  // 3. Real estate signal present (vehicle signal irrelevant) → accept
  // 4. No signal → accept
  return true;
}
