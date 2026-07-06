import type {
  CityReference,
  DistrictReference,
  ForbiddenPublicClaim,
  MethodologyNote,
  MoroccoReferenceDataset,
  SourceRegistryEntry,
} from "@/lib/market-reference/types";

export const MOROCCO_REFERENCE_VERSION = "v3" as const;

export const MOROCCO_REFERENCE_CITIES: CityReference[] = [
  {
    id: "ma-casablanca",
    city: "Casablanca",
    country: "MA",
    internal_only: true,
    buy_apartment_mad_m2_range: {
      low: 10000,
      high: 14500,
      confidence: "medium",
      public_safe: false,
    },
    rent_apartment_mad_m2_month_range: {
      low: 60,
      high: 90,
      confidence: "medium",
      public_safe: false,
    },
  },
  {
    id: "ma-rabat",
    city: "Rabat",
    country: "MA",
    internal_only: true,
    buy_apartment_mad_m2_range: {
      low: 12000,
      high: 15500,
      confidence: "medium",
      public_safe: false,
    },
    rent_apartment_mad_m2_month_range: {
      low: 70,
      high: 100,
      confidence: "medium",
      public_safe: false,
    },
  },
  {
    id: "ma-marrakech",
    city: "Marrakech",
    country: "MA",
    internal_only: true,
    buy_apartment_mad_m2_range: {
      low: 8500,
      high: 13000,
      confidence: "medium",
      public_safe: false,
    },
    rent_apartment_mad_m2_month_range: {
      low: 55,
      high: 90,
      confidence: "medium",
      public_safe: false,
    },
  },
  {
    id: "ma-tanger",
    city: "Tanger",
    country: "MA",
    internal_only: true,
    buy_apartment_mad_m2_range: {
      low: 7500,
      high: 11000,
      confidence: "medium",
      public_safe: false,
    },
    rent_apartment_mad_m2_month_range: {
      low: 50,
      high: 80,
      confidence: "medium",
      public_safe: false,
    },
  },
  {
    id: "ma-agadir",
    city: "Agadir",
    country: "MA",
    internal_only: true,
    buy_apartment_mad_m2_range: {
      low: 8000,
      high: 10500,
      confidence: "medium",
      public_safe: false,
    },
    rent_apartment_mad_m2_month_range: {
      low: 45,
      high: 75,
      confidence: "medium",
      public_safe: false,
    },
  },
];

export const MOROCCO_REFERENCE_DISTRICTS: DistrictReference[] = [
  {
    id: "ma-casablanca-maarif",
    city_id: "ma-casablanca",
    city: "Casablanca",
    district: "Maarif",
    aliases: ["Maârif", "Maarif Extension"],
    standing_level: "haut standing",
    urban_function: ["commerciale", "residentielle"],
    internal_only: true,
    public_disclaimer:
      "Reperes indicatifs bases sur des donnees disponibles et une revue interne. A confirmer avec les annonces disponibles et une verification terrain.",
    prices: [
      {
        metric_name: "repere indicatif de prix affiches",
        value_low: 13000,
        value_median: 15000,
        value_high: 17000,
        transaction_type: "buy",
        property_type: "apartment",
        source_type: "manual_review",
        source_url: null,
        evidence_ref:
          "internal/manual-review/2026-07-06/casablanca-maarif-buy-apartment",
        date_accessed: "2026-07-06",
        confidence: "medium",
        public_safe: false,
        internal_only: true,
      },
      {
        metric_name: "repere indicatif de prix affiches",
        value_low: 60,
        value_median: 75,
        value_high: 85,
        transaction_type: "rent",
        property_type: "apartment",
        source_type: "manual_review",
        source_url: null,
        evidence_ref:
          "internal/manual-review/2026-07-06/casablanca-maarif-rent-apartment",
        date_accessed: "2026-07-06",
        confidence: "medium",
        public_safe: false,
        internal_only: true,
      },
    ],
    lifestyle_indicators: {
      urban_calm: {
        label: "Animation elevee",
        confidence: "low",
        public_safe: true,
      },
    },
  },
  {
    id: "ma-rabat-agdal",
    city_id: "ma-rabat",
    city: "Rabat",
    district: "Agdal",
    aliases: ["Agdal Riyad"],
    standing_level: "haut standing",
    urban_function: ["universitaire", "commerciale", "residentielle"],
    internal_only: true,
    public_disclaimer:
      "Reperes indicatifs bases sur des donnees disponibles et une revue interne. A confirmer avec les annonces disponibles et une verification terrain.",
    prices: [
      {
        metric_name: "repere indicatif de prix affiches",
        value_low: 16000,
        value_median: 18000,
        value_high: 20000,
        transaction_type: "buy",
        property_type: "apartment",
        source_type: "manual_review",
        source_url: null,
        evidence_ref:
          "internal/manual-review/2026-07-06/rabat-agdal-buy-apartment",
        date_accessed: "2026-07-06",
        confidence: "medium",
        public_safe: false,
        internal_only: true,
      },
    ],
    lifestyle_indicators: {
      urban_calm: {
        label: "Quartier tres vivant",
        confidence: "low",
        public_safe: true,
      },
    },
  },
  {
    id: "ma-marrakech-gueliz",
    city_id: "ma-marrakech",
    city: "Marrakech",
    district: "Gueliz",
    aliases: ["Guéliz", "Centre Ville"],
    standing_level: "haut standing",
    urban_function: ["touristique", "commerciale", "residentielle"],
    internal_only: true,
    public_disclaimer:
      "Reperes indicatifs bases sur des donnees disponibles et une revue interne. A confirmer avec les annonces disponibles et une verification terrain.",
    prices: [
      {
        metric_name: "repere indicatif de prix affiches",
        value_low: 14000,
        value_median: 16500,
        value_high: 19000,
        transaction_type: "buy",
        property_type: "apartment",
        source_type: "portal_listing_prices",
        source_url: null,
        evidence_ref:
          "internal/portal-review/2026-07-06/marrakech-gueliz-buy-apartment",
        date_accessed: "2026-07-06",
        confidence: "low",
        public_safe: false,
        internal_only: true,
      },
    ],
    lifestyle_indicators: {
      urban_calm: {
        label: "Animation tres elevee, tourisme urbain",
        confidence: "medium",
        public_safe: true,
      },
    },
  },
];

export const MOROCCO_REFERENCE_SOURCE_REGISTRY: SourceRegistryEntry[] = [
  {
    source_id: "src_manual_review_2026_07_06",
    source_type: "manual_review",
    collection_method:
      "via sources autorisees, consultation documentee, exports partenaires ou collecte manuelle controlee",
    validation_required: true,
    public_safe: false,
  },
  {
    source_id: "src_portal_review_2026_07_06",
    source_type: "portal_listing_prices",
    collection_method:
      "revue interne de prix affiches sur portails publics, sans extraction massive ni reutilisation publique brute",
    validation_required: true,
    public_safe: false,
  },
  {
    source_id: "src_partner_exports_future",
    source_type: "partner_export",
    collection_method:
      "exports partenaires autorises, incluant potentiellement des evenements ou operations type Sakan Expo lorsque les donnees sont fournies avec autorisation",
    validation_required: true,
    public_safe: false,
  },
];

export const MOROCCO_REFERENCE_METHODOLOGY_NOTES: MethodologyNote[] = [
  { note: "Le referentiel est internal_only par defaut." },
  {
    note: "Les donnees de prix representent des reperes indicatifs de prix affiches, pas des prix de transaction.",
  },
  {
    note: "Les donnees ne doivent pas etre presentees comme prix de marche, prix reel, prix officiel ou prix certifie.",
  },
  {
    note: "Toute donnee de prix avec public_safe=false ne doit jamais etre exposee dans une API publique ou dans l'interface utilisateur.",
  },
  {
    note: "Toute donnee avec source_url=null et source_type=portal_listing_prices est plafonnee a confidence=low.",
  },
  {
    note: "Toute donnee avec source_url=null et source_type=manual_review est plafonnee a confidence=medium.",
  },
  {
    note: "Les indicateurs lifestyle peuvent etre affiches uniquement s'ils sont public_safe=true et sous forme de labels qualitatifs non chiffres.",
  },
  {
    note: "Les zones peripheriques et nouveaux lotissements necessitent une validation terrain complementaire.",
  },
  {
    note: "Le marche informel, les sous-declarations et les prix nets vendeurs ne sont pas captures par ce referentiel.",
  },
];

export const MOROCCO_REFERENCE_FORBIDDEN_PUBLIC_CLAIMS: ForbiddenPublicClaim[] = [
  { term: "prix de marche" },
  { term: "prix officiel" },
  { term: "prix reel" },
  { term: "prix certifie" },
  { term: "prix garanti" },
  { term: "meilleur quartier" },
  { term: "quartier sur" },
  { term: "quartier securise" },
  { term: "quartier dangereux" },
  { term: "sous le marche" },
  { term: "au-dessus du marche" },
  { term: "prix de reference" },
  { term: "bonne affaire garantie" },
  { term: "annonce verifiee" },
  { term: "annonce fiable" },
];

export const MOROCCO_REFERENCE_DATASET: MoroccoReferenceDataset = {
  version: MOROCCO_REFERENCE_VERSION,
  internal_only: true,
  cities: MOROCCO_REFERENCE_CITIES,
  district_reference: MOROCCO_REFERENCE_DISTRICTS,
  source_registry: MOROCCO_REFERENCE_SOURCE_REGISTRY,
  methodology_notes: MOROCCO_REFERENCE_METHODOLOGY_NOTES,
  forbidden_public_claims: MOROCCO_REFERENCE_FORBIDDEN_PUBLIC_CLAIMS,
};
