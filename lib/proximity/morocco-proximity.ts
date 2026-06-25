// P10C — Static indicative proximity dataset for Moroccan cities/neighborhoods.
// All data is indicative and derived from OpenStreetMap public data.
// Never use this for navigation or real-time decisions.

import type { ProximityPoint } from "@/lib/proximity/types";

const OSM_SOURCE = "OpenStreetMap — données indicatives";

// ─────────────────────────────────────────────────────────────────
// CASABLANCA
// ─────────────────────────────────────────────────────────────────

const casablancaFinanceCity: ProximityPoint[] = [
  { category: "marche_souk",  label: "Marché Belvédère",          distance_minutes: 18, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "supermarche",  label: "Carrefour Sidi Maârouf",    distance_minutes: 12, mode: "en voiture",  confidence: "moyen",     source: OSM_SOURCE },
  { category: "hanout",       label: "Épicerie quartier CFC",      distance_minutes:  3, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis Sidi Maârouf", distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "transport",    label: "Bus ligne CFC — Centre",     distance_minutes:  4, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie Bouskoura",        distance_minutes:  8, mode: "en voiture",  confidence: "moyen",     source: OSM_SOURCE },
  { category: "ecole",        label: "Groupe scolaire CFC",        distance_minutes:  7, mode: "en voiture",  confidence: "moyen",     source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée Sidi Maârouf",       distance_minutes:  6, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "clinique",     label: "Clinique Badr Bouskoura",    distance_minutes: 14, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "banque",       label: "Attijariwafa Bank CFC",      distance_minutes:  4, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "parking",      label: "Parking CFC Tour",           distance_minutes:  2, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "cafe",         label: "Café Paul CFC",              distance_minutes:  5, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "espace_vert",  label: "Parc CFC — allée centrale",  distance_minutes:  6, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
];

const casablancaMaarif: ProximityPoint[] = [
  { category: "marche_souk",  label: "Marché Maârif",              distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "supermarche",  label: "Marjane Maârif",             distance_minutes: 10, mode: "en voiture",  confidence: "élevé",     source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout rue Oum Errabia",     distance_minutes:  2, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis Maârif",       distance_minutes:  4, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "transport",    label: "Tram T1 — Maârif",           distance_minutes:  6, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie bd Zerktouni",     distance_minutes:  3, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "ecole",        label: "Lycée Moulay Youssef",       distance_minutes:  8, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée Maârif",             distance_minutes:  4, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "clinique",     label: "Clinique Atlas Maârif",      distance_minutes:  9, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "banque",       label: "CIH Bank Maârif",            distance_minutes:  4, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "parking",      label: "Parking bd Zerktouni",       distance_minutes:  5, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "cafe",         label: "Café Maârif",                distance_minutes:  3, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "espace_vert",  label: "Parc Maârif",                distance_minutes: 10, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
];

const casablancaBouskoura: ProximityPoint[] = [
  { category: "marche_souk",  label: "Souk hebdomadaire Bouskoura", distance_minutes:  7, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "supermarche",  label: "Carrefour Bouskoura",          distance_minutes: 10, mode: "en voiture",  confidence: "moyen",     source: OSM_SOURCE },
  { category: "hanout",       label: "Épicerie Bouskoura centre",    distance_minutes:  5, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis Bouskoura",      distance_minutes:  6, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "transport",    label: "Bus CTM Casablanca — Bouskoura", distance_minutes: 8, mode: "à pied",     confidence: "indicatif", source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie Bouskoura",          distance_minutes:  8, mode: "en voiture",  confidence: "moyen",     source: OSM_SOURCE },
  { category: "ecole",        label: "École primaire Bouskoura",     distance_minutes:  9, mode: "en voiture",  confidence: "moyen",     source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée principale Bouskoura", distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "clinique",     label: "Clinique Badr Bouskoura",      distance_minutes: 12, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "banque",       label: "Banque Populaire Bouskoura",   distance_minutes:  9, mode: "en voiture",  confidence: "moyen",     source: OSM_SOURCE },
  { category: "parking",      label: "Parking Bouskoura Centre",     distance_minutes:  5, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "cafe",         label: "Café Bouskoura centre",        distance_minutes:  6, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "espace_vert",  label: "Golf Royal Bouskoura",         distance_minutes: 10, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
];

// ─────────────────────────────────────────────────────────────────
// RABAT
// ─────────────────────────────────────────────────────────────────

const rabatHayRiad: ProximityPoint[] = [
  { category: "marche_souk",  label: "Marché Hay Riad",            distance_minutes:  7, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "supermarche",  label: "Marjane Hay Riad",           distance_minutes:  8, mode: "en voiture",  confidence: "élevé",     source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout résidence Hay Riad",  distance_minutes:  2, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis Hay Riad",     distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "transport",    label: "Bus RATC — Hay Riad",        distance_minutes:  4, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie Hay Riad",         distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "ecole",        label: "École Al Amal Hay Riad",     distance_minutes:  8, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée Hay Riad",           distance_minutes:  4, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "clinique",     label: "Clinique Hay Riad",          distance_minutes: 10, mode: "en voiture",  confidence: "moyen",     source: OSM_SOURCE },
  { category: "banque",       label: "Attijariwafa Hay Riad",      distance_minutes:  6, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "parking",      label: "Parking Hay Riad Centre",    distance_minutes:  4, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "cafe",         label: "Café Hay Riad",              distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "espace_vert",  label: "Parc Hay Riad",              distance_minutes:  9, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
];

const rabatAgdal: ProximityPoint[] = [
  { category: "marche_souk",  label: "Marché Agdal",               distance_minutes:  6, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "supermarche",  label: "Label'Vie Agdal",            distance_minutes:  7, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout Agdal",               distance_minutes:  2, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis Agdal",        distance_minutes:  4, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "transport",    label: "Tramway Agdal",              distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie Agdal",            distance_minutes:  3, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "ecole",        label: "Lycée Descartes Agdal",      distance_minutes:  8, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée Agdal",              distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "clinique",     label: "Clinique Agdal",             distance_minutes:  9, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "banque",       label: "BMCE Bank Agdal",            distance_minutes:  4, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "parking",      label: "Parking Agdal",              distance_minutes:  5, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "cafe",         label: "Café Agdal",                 distance_minutes:  3, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "espace_vert",  label: "Jardin d'Essais Agdal",      distance_minutes: 12, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
];

const rabatHassan: ProximityPoint[] = [
  { category: "marche_souk",  label: "Marché Central Hassan",      distance_minutes:  8, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "supermarche",  label: "Acima Hassan",               distance_minutes:  9, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout quartier Hassan",     distance_minutes:  2, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis Hassan",       distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "transport",    label: "Tramway Hassan",             distance_minutes:  6, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie Hassan II",        distance_minutes:  4, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "ecole",        label: "École primaire Hassan",      distance_minutes:  7, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "mosquee",      label: "Tour Hassan — Mosquée",      distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "clinique",     label: "Clinique Hassan",            distance_minutes: 11, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "banque",       label: "Banque Populaire Hassan",    distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "parking",      label: "Parking Hassan",             distance_minutes:  6, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "cafe",         label: "Café Hassan",                distance_minutes:  3, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "espace_vert",  label: "Jardins du Triangle de Vue", distance_minutes:  8, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
];

// ─────────────────────────────────────────────────────────────────
// TANGER
// ─────────────────────────────────────────────────────────────────

const tangerMalabata: ProximityPoint[] = [
  { category: "marche_souk",  label: "Souk Malabata",              distance_minutes: 10, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "supermarche",  label: "Marjane Malabata",           distance_minutes: 12, mode: "en voiture",  confidence: "élevé",     source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout bord de mer",         distance_minutes:  3, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis Malabata",     distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "transport",    label: "Bus centre-ville Tanger",    distance_minutes:  7, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie Malabata",         distance_minutes:  6, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "ecole",        label: "École Malabata",             distance_minutes:  9, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée Malabata",           distance_minutes:  7, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "clinique",     label: "Clinique Malabata",          distance_minutes: 14, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "banque",       label: "BMCE Malabata",              distance_minutes:  8, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "parking",      label: "Parking Malabata Plage",     distance_minutes:  4, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "cafe",         label: "Café bord de mer Malabata",  distance_minutes:  3, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "espace_vert",  label: "Corniche Malabata",          distance_minutes:  2, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
];

const tangerVilleNouvelle: ProximityPoint[] = [
  { category: "marche_souk",  label: "Marché Central Tanger",      distance_minutes:  8, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "supermarche",  label: "Label'Vie Tanger",           distance_minutes: 10, mode: "en voiture",  confidence: "élevé",     source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout Ville Nouvelle",      distance_minutes:  2, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis Ville Nouvelle", distance_minutes: 4, mode: "à pied",     confidence: "élevé",     source: OSM_SOURCE },
  { category: "transport",    label: "Bus réseau Alsa Tanger",     distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie Ville Nouvelle",   distance_minutes:  4, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "ecole",        label: "Lycée Razi Tanger",          distance_minutes:  9, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée Ville Nouvelle",     distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "clinique",     label: "Clinique Ville Nouvelle",    distance_minutes: 11, mode: "en voiture",  confidence: "moyen",     source: OSM_SOURCE },
  { category: "banque",       label: "Attijariwafa Tanger Centre", distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "parking",      label: "Parking Tanger Centre",      distance_minutes:  6, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "cafe",         label: "Café Central Tanger",        distance_minutes:  3, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "espace_vert",  label: "Parc Perdicaris",            distance_minutes: 15, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
];

// ─────────────────────────────────────────────────────────────────
// MARRAKECH
// ─────────────────────────────────────────────────────────────────

const marrakechGueliz: ProximityPoint[] = [
  { category: "marche_souk",  label: "Marché Central Guéliz",      distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "supermarche",  label: "Marjane Guéliz",             distance_minutes: 10, mode: "en voiture",  confidence: "élevé",     source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout Guéliz",              distance_minutes:  2, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis Guéliz",       distance_minutes:  4, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "transport",    label: "Bus ALSA Marrakech",         distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie Guéliz",           distance_minutes:  3, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "ecole",        label: "École Victor Hugo Guéliz",   distance_minutes:  8, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée Guéliz",             distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "clinique",     label: "Clinique Guéliz",            distance_minutes:  9, mode: "en voiture",  confidence: "moyen",     source: OSM_SOURCE },
  { category: "banque",       label: "Attijariwafa Guéliz",        distance_minutes:  4, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "parking",      label: "Parking Guéliz",             distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "cafe",         label: "Café Guéliz",                distance_minutes:  3, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "espace_vert",  label: "Jardin Majorelle",           distance_minutes: 10, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
];

const marrakechHivernage: ProximityPoint[] = [
  { category: "marche_souk",  label: "Djemaa El-Fna — souk",       distance_minutes: 12, mode: "en voiture",  confidence: "élevé",     source: OSM_SOURCE },
  { category: "supermarche",  label: "Acima Hivernage",            distance_minutes: 10, mode: "en voiture",  confidence: "moyen",     source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout Hivernage",           distance_minutes:  3, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis Hivernage",    distance_minutes:  4, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "transport",    label: "Bus Hivernage — Centre",     distance_minutes:  6, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie Hivernage",        distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "ecole",        label: "École française Hivernage",  distance_minutes:  9, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée Hivernage",          distance_minutes:  6, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "clinique",     label: "Clinique Hivernage",         distance_minutes: 11, mode: "en voiture",  confidence: "moyen",     source: OSM_SOURCE },
  { category: "banque",       label: "BMCE Hivernage",             distance_minutes:  5, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "parking",      label: "Parking Hivernage Hôtels",   distance_minutes:  3, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "cafe",         label: "Café Hivernage",             distance_minutes:  3, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "espace_vert",  label: "Koutoubia Garden",           distance_minutes:  8, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
];

const marrakechRouteOurika: ProximityPoint[] = [
  { category: "marche_souk",  label: "Souk Route de l'Ourika",     distance_minutes: 15, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "supermarche",  label: "Supermarché Route Ourika",   distance_minutes: 12, mode: "en voiture",  confidence: "moyen",     source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout local",               distance_minutes:  5, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis Route Ourika", distance_minutes:  8, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "transport",    label: "Bus Route de l'Ourika",      distance_minutes: 10, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie Route Ourika",     distance_minutes: 12, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "ecole",        label: "École Route de l'Ourika",    distance_minutes: 10, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée Route Ourika",       distance_minutes:  7, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "clinique",     label: "Hôpital Ibn Tofail Marrakech", distance_minutes: 20, mode: "en voiture", confidence: "indicatif", source: OSM_SOURCE },
  { category: "banque",       label: "ATM Route Ourika",           distance_minutes: 10, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "parking",      label: "Parking privé route Ourika", distance_minutes:  3, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "cafe",         label: "Café local route Ourika",    distance_minutes:  6, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "espace_vert",  label: "Montagne Atlas — panorama",  distance_minutes: 25, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
];

// ─────────────────────────────────────────────────────────────────
// AGADIR
// ─────────────────────────────────────────────────────────────────

const agadirFounty: ProximityPoint[] = [
  { category: "marche_souk",  label: "Souk Al Had Agadir",         distance_minutes: 15, mode: "en voiture",  confidence: "moyen",     source: OSM_SOURCE },
  { category: "supermarche",  label: "Marjane Founty",             distance_minutes:  8, mode: "en voiture",  confidence: "élevé",     source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout Founty",              distance_minutes:  4, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis Founty",       distance_minutes:  6, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "transport",    label: "Bus RATAG Founty",           distance_minutes:  8, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie Founty",           distance_minutes:  6, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "ecole",        label: "École Founty",               distance_minutes:  9, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée Founty",             distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "clinique",     label: "Clinique Founty",            distance_minutes: 12, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "banque",       label: "Attijariwafa Founty",        distance_minutes:  7, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "parking",      label: "Parking Founty Plage",       distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "cafe",         label: "Café bord de mer Founty",    distance_minutes:  4, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "espace_vert",  label: "Plage de Founty",            distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
];

const agadirTalborjt: ProximityPoint[] = [
  { category: "marche_souk",  label: "Souk Al Had Agadir",         distance_minutes: 10, mode: "en voiture",  confidence: "élevé",     source: OSM_SOURCE },
  { category: "supermarche",  label: "Acima Talborjt",             distance_minutes:  9, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout Talborjt",            distance_minutes:  2, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis Talborjt",     distance_minutes:  4, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "transport",    label: "Bus RATAG Talborjt",         distance_minutes:  5, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie Talborjt",         distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "ecole",        label: "Lycée Talborjt",             distance_minutes:  7, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée Talborjt",           distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "clinique",     label: "Polyclinique Sud Agadir",    distance_minutes: 12, mode: "en voiture",  confidence: "moyen",     source: OSM_SOURCE },
  { category: "banque",       label: "CIH Talborjt",               distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "parking",      label: "Parking Talborjt",           distance_minutes:  5, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "cafe",         label: "Café Talborjt",              distance_minutes:  3, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "espace_vert",  label: "Plage d'Agadir — accès",     distance_minutes: 10, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
];

// ─────────────────────────────────────────────────────────────────
// FÈS
// ─────────────────────────────────────────────────────────────────

const fesVilleNouvelle: ProximityPoint[] = [
  { category: "marche_souk",  label: "Marché Fès Ville Nouvelle",  distance_minutes:  7, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "supermarche",  label: "Marjane Fès",                distance_minutes: 12, mode: "en voiture",  confidence: "élevé",     source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout Ville Nouvelle Fès",  distance_minutes:  2, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis Fès VN",       distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "transport",    label: "Bus RATF Fès",               distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie Ville Nouvelle Fès", distance_minutes: 4, mode: "à pied",     confidence: "élevé",     source: OSM_SOURCE },
  { category: "ecole",        label: "Lycée Moulay Driss Fès",     distance_minutes:  8, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée Ville Nouvelle Fès", distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "clinique",     label: "CHU Hassan II Fès",          distance_minutes: 12, mode: "en voiture",  confidence: "moyen",     source: OSM_SOURCE },
  { category: "banque",       label: "Banque Populaire Fès",       distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "parking",      label: "Parking Ville Nouvelle Fès", distance_minutes:  5, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "cafe",         label: "Café central Fès",           distance_minutes:  3, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "espace_vert",  label: "Parc Jnane Sbil Fès",        distance_minutes: 15, mode: "en voiture",  confidence: "moyen",     source: OSM_SOURCE },
];

const fesFesElBali: ProximityPoint[] = [
  { category: "marche_souk",  label: "Souk Seffarine Fès el Bali", distance_minutes:  3, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "supermarche",  label: "Marjane Fès (proche médina)", distance_minutes: 18, mode: "en voiture", confidence: "indicatif", source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout Bab Bou Jeloud",      distance_minutes:  2, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "taxi",         label: "Taxis Bab Guissa",           distance_minutes:  7, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "transport",    label: "Bus médina Fès",             distance_minutes: 10, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie Bab Boujloud",     distance_minutes:  5, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "ecole",        label: "Medersa Bou Inania",         distance_minutes:  4, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée Karaouiyine",        distance_minutes:  6, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "clinique",     label: "Hôpital Al Ghassani Fès",    distance_minutes: 20, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "banque",       label: "Banque Talaa Kbira",         distance_minutes:  5, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "parking",      label: "Parking Bab Boujloud",       distance_minutes:  5, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "cafe",         label: "Café Bab Boujloud",          distance_minutes:  3, mode: "à pied",      confidence: "élevé",     source: OSM_SOURCE },
  { category: "espace_vert",  label: "Jardin Batha Fès",           distance_minutes:  8, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
];

// ─────────────────────────────────────────────────────────────────
// City-level fallbacks (used when no neighborhood match is found)
// ─────────────────────────────────────────────────────────────────

const casablancaCity: ProximityPoint[] = [
  { category: "marche_souk",  label: "Marché local Casablanca",    distance_minutes: 10, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "supermarche",  label: "Grande surface Casablanca",  distance_minutes: 12, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout de quartier",         distance_minutes:  4, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis",              distance_minutes:  6, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "transport",    label: "Transport en commun",        distance_minutes:  7, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie locale",           distance_minutes:  8, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée du quartier",        distance_minutes:  6, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "banque",       label: "Agence bancaire",            distance_minutes:  8, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "cafe",         label: "Café du quartier",           distance_minutes:  5, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
];

const rabatCity: ProximityPoint[] = [
  { category: "marche_souk",  label: "Marché local Rabat",         distance_minutes: 10, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "supermarche",  label: "Grande surface Rabat",       distance_minutes: 12, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout de quartier",         distance_minutes:  4, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis",              distance_minutes:  6, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "transport",    label: "Tramway Rabat",              distance_minutes:  8, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie locale",           distance_minutes:  7, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée du quartier",        distance_minutes:  6, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "banque",       label: "Agence bancaire",            distance_minutes:  7, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "cafe",         label: "Café du quartier",           distance_minutes:  5, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
];

const tangerCity: ProximityPoint[] = [
  { category: "marche_souk",  label: "Marché local Tanger",        distance_minutes: 10, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "supermarche",  label: "Grande surface Tanger",      distance_minutes: 12, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout de quartier",         distance_minutes:  4, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis",              distance_minutes:  6, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "transport",    label: "Bus Tanger",                 distance_minutes:  7, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie locale",           distance_minutes:  7, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée du quartier",        distance_minutes:  6, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "banque",       label: "Agence bancaire",            distance_minutes:  7, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "cafe",         label: "Café du quartier",           distance_minutes:  5, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
];

const marrakechCity: ProximityPoint[] = [
  { category: "marche_souk",  label: "Souk local Marrakech",       distance_minutes:  8, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "supermarche",  label: "Grande surface Marrakech",   distance_minutes: 12, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout de quartier",         distance_minutes:  3, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis",              distance_minutes:  5, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "transport",    label: "Bus ALSA Marrakech",         distance_minutes:  7, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie locale",           distance_minutes:  6, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée du quartier",        distance_minutes:  5, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "banque",       label: "Agence bancaire",            distance_minutes:  6, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "cafe",         label: "Café du quartier",           distance_minutes:  4, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
];

const agadirCity: ProximityPoint[] = [
  { category: "marche_souk",  label: "Souk Al Had Agadir",         distance_minutes: 12, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "supermarche",  label: "Grande surface Agadir",      distance_minutes: 12, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout de quartier",         distance_minutes:  4, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis",              distance_minutes:  6, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "transport",    label: "Bus RATAG Agadir",           distance_minutes:  7, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie locale",           distance_minutes:  7, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée du quartier",        distance_minutes:  6, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "banque",       label: "Agence bancaire",            distance_minutes:  7, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "cafe",         label: "Café du quartier",           distance_minutes:  5, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "espace_vert",  label: "Plage d'Agadir",             distance_minutes: 12, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
];

const fesCity: ProximityPoint[] = [
  { category: "marche_souk",  label: "Souk Fès",                   distance_minutes:  8, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "supermarche",  label: "Grande surface Fès",         distance_minutes: 12, mode: "en voiture",  confidence: "indicatif", source: OSM_SOURCE },
  { category: "hanout",       label: "Hanout de quartier",         distance_minutes:  3, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "taxi",         label: "Station taxis",              distance_minutes:  6, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "transport",    label: "Bus RATF Fès",               distance_minutes:  7, mode: "à pied",      confidence: "moyen",     source: OSM_SOURCE },
  { category: "pharmacie",    label: "Pharmacie locale",           distance_minutes:  6, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "mosquee",      label: "Mosquée du quartier",        distance_minutes:  5, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "banque",       label: "Agence bancaire",            distance_minutes:  6, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
  { category: "cafe",         label: "Café du quartier",           distance_minutes:  4, mode: "à pied",      confidence: "indicatif", source: OSM_SOURCE },
];

// ─────────────────────────────────────────────────────────────────
// Index: neighborhood key → ProximityPoint[]
// Keys are lowercase, accent-stripped (normalized externally)
// ─────────────────────────────────────────────────────────────────

export const NEIGHBORHOOD_PROXIMITY: Record<string, ProximityPoint[]> = {
  // Casablanca neighborhoods
  "finance city":       casablancaFinanceCity,
  "financecity":        casablancaFinanceCity,
  "maarif":             casablancaMaarif,
  "maârif":             casablancaMaarif,
  "bouskoura":          casablancaBouskoura,

  // Rabat neighborhoods
  "hay riad":           rabatHayRiad,
  "hayriad":            rabatHayRiad,
  "agdal":              rabatAgdal,
  "hassan":             rabatHassan,

  // Tanger neighborhoods
  "malabata":           tangerMalabata,
  "ville nouvelle tanger": tangerVilleNouvelle,
  "villenouvelle":      tangerVilleNouvelle,

  // Marrakech neighborhoods
  "gueliz":             marrakechGueliz,
  "guéliz":             marrakechGueliz,
  "hivernage":          marrakechHivernage,
  "route de l'ourika":  marrakechRouteOurika,
  "route ourika":       marrakechRouteOurika,
  "routeourika":        marrakechRouteOurika,

  // Agadir neighborhoods
  "founty":             agadirFounty,
  "talborjt":           agadirTalborjt,

  // Fès neighborhoods
  "ville nouvelle fes": fesVilleNouvelle,
  "ville nouvelle fès": fesVilleNouvelle,
  "villenouvellefes":   fesVilleNouvelle,
  "fes el bali":        fesFesElBali,
  "fès el bali":        fesFesElBali,
  "fesel bali":         fesFesElBali,
};

// Index: city key → ProximityPoint[] (fallback when no neighborhood match)
export const CITY_PROXIMITY: Record<string, ProximityPoint[]> = {
  "casablanca": casablancaCity,
  "rabat":      rabatCity,
  "tanger":     tangerCity,
  "marrakech":  marrakechCity,
  "agadir":     agadirCity,
  "fes":        fesCity,
  "fès":        fesCity,
};
