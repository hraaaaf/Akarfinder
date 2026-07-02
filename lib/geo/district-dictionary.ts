// LISTING-DISTRICT-RECOVERY-1 — Dictionnaire de quartiers marocains
// Utilisé pour matching déterministe depuis les champs existants (title, description, source_url)
// Aucun scraping, aucune API externe

export type CityDistricts = {
  [city: string]: string[];
};

export const MOROCCO_DISTRICTS: CityDistricts = {
  Rabat: [
    "Agdal",
    "Hay Riad",
    "Souissi",
    "Hassan",
    "Océan",
    "Les Orangers",
    "Aviation",
    "Akkari",
    "Yacoub El Mansour",
    "Medina",
  ],
  Casablanca: [
    "Maarif",
    "Gauthier",
    "Racine",
    "Bourgogne",
    "Anfa",
    "Californie",
    "Ain Diab",
    "Sidi Maarouf",
    "Oasis",
    "Palmier",
    "Finance City",
    "CIL",
    "Beauséjour",
    "Derb Ghallef",
    "Belvédère",
    "Ain Sebaa",
    "Roches Noires",
  ],
  Marrakech: [
    "Guéliz",
    "Hivernage",
    "Palmeraie",
    "Targa",
    "Route de l'Ourika",
    "Route de Fès",
    "Majorelle",
    "Agdal",
    "Mhamid",
    "Massira",
    "Medina",
  ],
  Agadir: [
    "Founty",
    "Talborjt",
    "Haut Founty",
    "Hay Mohammadi",
    "Dakhla",
    "Sonaba",
    "Charaf",
    "Cité Suisse",
    "Bensergao",
  ],
  Tanger: [
    "Malabata",
    "Iberia",
    "Nejma",
    "Centre-ville",
    "Marshan",
    "Californie",
    "Val Fleuri",
    "Moujahidine",
    "Boubana",
    "Achakar",
  ],
  Fès: [
    "Agdal",
    "Ville Nouvelle",
    "Saiss",
    "Narjis",
    "Atlas",
    "Route d'Imouzzer",
    "Medina",
    "Champs de Course",
  ],
};

export function getDistrictsForCity(city: string | null): string[] {
  if (!city) return [];
  const normalized = city.trim();
  return MOROCCO_DISTRICTS[normalized] || [];
}

export function getAllDistricts(): string[] {
  return Object.values(MOROCCO_DISTRICTS).flat();
}
