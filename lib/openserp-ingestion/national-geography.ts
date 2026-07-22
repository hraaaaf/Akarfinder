// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — section 10.
// NATIONAL-MASS-ACQUISITION-ALL-MOROCCO-V1
//
// National city/district taxonomy for the query planner.
// Tier 1 keeps the historical high-priority 15-city set byte-for-byte.
// TIER_2_CITIES also remains unchanged for backward compatibility with legacy
// V1 query identities. ACQUISITION_EXPANSION_CITIES is additive and is used by
// Query Universe V2 only, so existing query ids/history are never rewritten.
//
// District-level expansion stays conservative: only already-vetted district
// dictionaries are used. New acquisition cities receive city-level queries
// only until a separate evidence-backed district taxonomy exists.

export const TIER_1_CITIES: readonly string[] = [
  "Casablanca",
  "Rabat",
  "Salé",
  "Témara",
  "Marrakech",
  "Tanger",
  "Agadir",
  "Fès",
  "Meknès",
  "Kénitra",
  "El Jadida",
  "Oujda",
  "Tétouan",
  "Nador",
  "Mohammedia",
];

// Legacy V1/V2-compatible secondary set. Keep order stable.
export const TIER_2_CITIES: readonly string[] = ["Essaouira"];

// Additive national acquisition coverage. These are objective Moroccan urban
// and regional centres used only to generate discovery queries. No district,
// price or market attribute is inferred from membership in this list.
export const ACQUISITION_EXPANSION_CITIES: readonly string[] = [
  "Safi",
  "Béni Mellal",
  "Khouribga",
  "Settat",
  "Berrechid",
  "El Kelaa des Sraghna",
  "Youssoufia",
  "Ben Guerir",
  "Larache",
  "Ksar El Kebir",
  "Chefchaouen",
  "Al Hoceima",
  "Taza",
  "Taounate",
  "Sefrou",
  "Ifrane",
  "Azrou",
  "Berkane",
  "Taourirt",
  "Errachidia",
  "Midelt",
  "Ouarzazate",
  "Tinghir",
  "Taroudant",
  "Tiznit",
  "Guelmim",
  "Laâyoune",
  "Dakhla",
  "Sidi Kacem",
  "Sidi Slimane",
  "Khemisset",
  "Bouznika",
  "Skhirat",
  "Benslimane",
  "Ouezzane",
  "Fnideq",
  "Martil",
];

export const ALL_CITIES: readonly string[] = [...TIER_1_CITIES, ...TIER_2_CITIES];
export const ALL_ACQUISITION_CITIES: readonly string[] = [
  ...TIER_1_CITIES,
  ...TIER_2_CITIES,
  ...ACQUISITION_EXPANSION_CITIES,
];

// Reused verbatim from lib/geo/district-dictionary.ts (LISTING-DISTRICT-RECOVERY-1)
// — the only district-level data this project has ever vetted.
export const TIER_3_DISTRICTS: Readonly<Record<string, readonly string[]>> = {
  Rabat: [
    "Agdal", "Hay Riad", "Souissi", "Hassan", "Océan",
    "Les Orangers", "Aviation", "Akkari", "Yacoub El Mansour", "Medina",
  ],
  Casablanca: [
    "Maarif", "Gauthier", "Racine", "Bourgogne", "Anfa", "Californie",
    "Ain Diab", "Sidi Maarouf", "Oasis", "Palmier", "Finance City",
    "CIL", "Beauséjour", "Derb Ghallef", "Belvédère", "Ain Sebaa", "Roches Noires",
  ],
  Marrakech: [
    "Guéliz", "Hivernage", "Palmeraie", "Targa", "Route de l'Ourika",
    "Route de Fès", "Majorelle", "Agdal", "Mhamid", "Massira", "Medina",
  ],
  Agadir: [
    "Founty", "Talborjt", "Haut Founty", "Hay Mohammadi", "Dakhla",
    "Sonaba", "Charaf", "Cité Suisse", "Bensergao",
  ],
  Tanger: [
    "Malabata", "Iberia", "Nejma", "Centre-ville", "Marshan",
    "Californie", "Val Fleuri", "Moujahidine", "Boubana", "Achakar",
  ],
  Fès: [
    "Agdal", "Ville Nouvelle", "Saiss", "Narjis", "Atlas",
    "Route d'Imouzzer", "Medina", "Champs de Course",
  ],
};

export const TIER_3_CITIES_WITHOUT_DISTRICT_DATA: readonly string[] = [
  "Salé",
  "Témara",
  "Meknès",
  "Kénitra",
];

// Standard Arabic city names used only to generate Arabic discovery queries.
export const CITY_ARABIC_NAMES: Readonly<Record<string, string>> = {
  Casablanca: "الدار البيضاء",
  Rabat: "الرباط",
  "Salé": "سلا",
  "Témara": "تمارة",
  Marrakech: "مراكش",
  Tanger: "طنجة",
  Agadir: "أكادير",
  "Fès": "فاس",
  "Meknès": "مكناس",
  "Kénitra": "القنيطرة",
  "El Jadida": "الجديدة",
  Oujda: "وجدة",
  "Tétouan": "تطوان",
  Nador: "الناظور",
  Mohammedia: "المحمدية",
  Essaouira: "الصويرة",
  Safi: "آسفي",
  "Béni Mellal": "بني ملال",
  Khouribga: "خريبكة",
  Settat: "سطات",
  Berrechid: "برشيد",
  "El Kelaa des Sraghna": "قلعة السراغنة",
  Youssoufia: "اليوسفية",
  "Ben Guerir": "بن جرير",
  Larache: "العرائش",
  "Ksar El Kebir": "القصر الكبير",
  Chefchaouen: "شفشاون",
  "Al Hoceima": "الحسيمة",
  Taza: "تازة",
  Taounate: "تاونات",
  Sefrou: "صفرو",
  Ifrane: "إفران",
  Azrou: "أزرو",
  Berkane: "بركان",
  Taourirt: "تاوريرت",
  Errachidia: "الرشيدية",
  Midelt: "ميدلت",
  Ouarzazate: "ورزازات",
  Tinghir: "تنغير",
  Taroudant: "تارودانت",
  Tiznit: "تزنيت",
  Guelmim: "كلميم",
  "Laâyoune": "العيون",
  Dakhla: "الداخلة",
  "Sidi Kacem": "سيدي قاسم",
  "Sidi Slimane": "سيدي سليمان",
  Khemisset: "الخميسات",
  Bouznika: "بوزنيقة",
  Skhirat: "الصخيرات",
  Benslimane: "بنسليمان",
  Ouezzane: "وزان",
  Fnideq: "الفنيدق",
  Martil: "مرتيل",
};

export const PROPERTY_TYPE_ARABIC_NAMES: Readonly<Record<string, string>> = {
  "appartement": "شقة",
  "studio": "استوديو",
  "villa": "فيلا",
  "maison": "منزل",
  "terrain": "أرض",
  "riad": "رياض",
  "bureau": "مكتب",
  "local commercial": "محل تجاري",
  "magasin": "متجر",
  "ferme": "مزرعة",
  "immeuble": "عمارة",
  "duplex": "دوبلكس",
};

export function getDistrictsForCity(city: string): readonly string[] {
  return TIER_3_DISTRICTS[city] ?? [];
}

export function getCityTier(city: string): 1 | 2 | 3 | null {
  if (TIER_1_CITIES.includes(city)) return 1;
  if (TIER_2_CITIES.includes(city)) return 2;
  if (ACQUISITION_EXPANSION_CITIES.includes(city)) return 2;
  return null;
}

export function isRecognizedCity(city: string): boolean {
  return ALL_CITIES.includes(city);
}

export function isAcquisitionCity(city: string): boolean {
  return ALL_ACQUISITION_CITIES.includes(city);
}