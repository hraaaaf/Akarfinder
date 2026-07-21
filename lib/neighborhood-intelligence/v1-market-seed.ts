// Retained AkarFinder V1 market reference imported into the V2 model.
// Source: "Bilan national marocain des prix au m² au Maroc par ville et par quartier".
// Do not add lifestyle scores here: V1 only supports market facts + explicit urban-use analysis.

export type V1CityMarketRow = {
  city: string;
  apartment_m2: number;
  villa_m2: number;
  official_price_trend_pct: number | null;
  official_transactions_trend_pct: number | null;
};

export type V1NeighborhoodMarketRow = {
  city: string;
  neighborhood: string;
  apartment_m2: number | null;
  villa_m2: number | null;
  standing_raw: string;
  usage_raw: string;
  market_source: "agenz" | "dakimmo";
};

export const V1_CITY_MARKET_ROWS: readonly V1CityMarketRow[] = [
  { city: "Casablanca", apartment_m2: 12503, villa_m2: 16458, official_price_trend_pct: -2.7, official_transactions_trend_pct: -37.8 },
  { city: "Rabat", apartment_m2: 12392, villa_m2: 13066, official_price_trend_pct: -4.7, official_transactions_trend_pct: -55.4 },
  { city: "Marrakech", apartment_m2: 8885, villa_m2: 10138, official_price_trend_pct: -1.5, official_transactions_trend_pct: -51.5 },
  { city: "Salé", apartment_m2: 8210, villa_m2: 10351, official_price_trend_pct: null, official_transactions_trend_pct: null },
  { city: "Tanger", apartment_m2: 8029, villa_m2: 11762, official_price_trend_pct: -3.9, official_transactions_trend_pct: -36.4 },
  { city: "Agadir", apartment_m2: 7935, villa_m2: 10093, official_price_trend_pct: -0.3, official_transactions_trend_pct: -51.4 },
  { city: "El Jadida", apartment_m2: 7101, villa_m2: 9461, official_price_trend_pct: -1.0, official_transactions_trend_pct: -30.7 },
  { city: "Kénitra", apartment_m2: 6590, villa_m2: 9082, official_price_trend_pct: -0.8, official_transactions_trend_pct: -43.1 },
  { city: "Fès", apartment_m2: 6578, villa_m2: 7667, official_price_trend_pct: -2.3, official_transactions_trend_pct: -34.9 },
  { city: "Meknès", apartment_m2: 6501, villa_m2: 7336, official_price_trend_pct: -2.9, official_transactions_trend_pct: -34.6 },
  { city: "Nador", apartment_m2: 5901, villa_m2: 7517, official_price_trend_pct: null, official_transactions_trend_pct: null },
  { city: "Safi", apartment_m2: 5832, villa_m2: 6386, official_price_trend_pct: null, official_transactions_trend_pct: null },
  { city: "Oujda", apartment_m2: 5780, villa_m2: 7332, official_price_trend_pct: 0.2, official_transactions_trend_pct: -34.8 },
] as const;

export const V1_NEIGHBORHOOD_MARKET_ROWS: readonly V1NeighborhoodMarketRow[] = [
  { city:"Casablanca", neighborhood:"Casa Finance City", apartment_m2:28000, villa_m2:null, standing_raw:"Prestige", usage_raw:"Commercial / mixte", market_source:"dakimmo" },
  { city:"Casablanca", neighborhood:"Anfa Supérieur", apartment_m2:26000, villa_m2:48000, standing_raw:"Prestige", usage_raw:"Résidentiel prime", market_source:"dakimmo" },
  { city:"Casablanca", neighborhood:"Ain Diab", apartment_m2:22000, villa_m2:45000, standing_raw:"Prestige", usage_raw:"Touristique / résidentiel", market_source:"dakimmo" },
  { city:"Casablanca", neighborhood:"Gauthier", apartment_m2:19500, villa_m2:null, standing_raw:"Premium", usage_raw:"Mixte / tertiaire", market_source:"dakimmo" },
  { city:"Casablanca", neighborhood:"Maarif", apartment_m2:18000, villa_m2:32000, standing_raw:"Premium", usage_raw:"Commercial / mixte", market_source:"dakimmo" },
  { city:"Casablanca", neighborhood:"Sidi Maârouf", apartment_m2:13500, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Tertiaire / mixte", market_source:"dakimmo" },
  { city:"Casablanca", neighborhood:"Ain Chock", apartment_m2:9500, villa_m2:null, standing_raw:"Accessible", usage_raw:"Résidentiel / volume", market_source:"dakimmo" },

  { city:"Rabat", neighborhood:"Hay Riad", apartment_m2:19500, villa_m2:32000, standing_raw:"Prestige", usage_raw:"Résidentiel / tertiaire", market_source:"dakimmo" },
  { city:"Rabat", neighborhood:"Agdal", apartment_m2:17500, villa_m2:null, standing_raw:"Premium", usage_raw:"Mixte / commercial", market_source:"dakimmo" },
  { city:"Rabat", neighborhood:"Océan", apartment_m2:16000, villa_m2:null, standing_raw:"Premium", usage_raw:"Résidentiel / mixte", market_source:"dakimmo" },
  { city:"Rabat", neighborhood:"Aviation / Orangers", apartment_m2:15500, villa_m2:27000, standing_raw:"Premium", usage_raw:"Résidentiel / institutionnel", market_source:"dakimmo" },
  { city:"Rabat", neighborhood:"Hassan", apartment_m2:15000, villa_m2:null, standing_raw:"Premium", usage_raw:"Administratif / commercial", market_source:"dakimmo" },
  { city:"Rabat", neighborhood:"Souissi", apartment_m2:null, villa_m2:28000, standing_raw:"Prestige", usage_raw:"Résidentiel diplomatique", market_source:"dakimmo" },
  { city:"Rabat", neighborhood:"Quartier des Ambassadeurs", apartment_m2:null, villa_m2:34000, standing_raw:"Prestige", usage_raw:"Institutionnel / diplomatique", market_source:"dakimmo" },

  { city:"Marrakech", neighborhood:"Hivernage", apartment_m2:18500, villa_m2:null, standing_raw:"Prestige", usage_raw:"Touristique / affaires", market_source:"dakimmo" },
  { city:"Marrakech", neighborhood:"Majorelle", apartment_m2:17000, villa_m2:null, standing_raw:"Prestige", usage_raw:"Touristique / résidentiel", market_source:"dakimmo" },
  { city:"Marrakech", neighborhood:"Guéliz", apartment_m2:15500, villa_m2:null, standing_raw:"Premium", usage_raw:"Commercial / mixte", market_source:"dakimmo" },
  { city:"Marrakech", neighborhood:"Agdal Marrakech", apartment_m2:11000, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Résidentiel / touristique", market_source:"dakimmo" },
  { city:"Marrakech", neighborhood:"Palmeraie", apartment_m2:null, villa_m2:22000, standing_raw:"Prestige", usage_raw:"Touristique / luxe", market_source:"dakimmo" },
  { city:"Marrakech", neighborhood:"Médina / Riads", apartment_m2:null, villa_m2:14000, standing_raw:"Premium", usage_raw:"Touristique / patrimonial", market_source:"dakimmo" },
  { city:"Marrakech", neighborhood:"Amelkis", apartment_m2:null, villa_m2:17500, standing_raw:"Prestige", usage_raw:"Golf / résidentiel fermé", market_source:"dakimmo" },

  { city:"Tanger", neighborhood:"Malabata", apartment_m2:16500, villa_m2:24000, standing_raw:"Prestige", usage_raw:"Touristique / résidentiel MRE", market_source:"dakimmo" },
  { city:"Tanger", neighborhood:"Centre-ville historique", apartment_m2:14000, villa_m2:null, standing_raw:"Premium", usage_raw:"Commercial / mixte", market_source:"dakimmo" },
  { city:"Tanger", neighborhood:"Iberia", apartment_m2:13000, villa_m2:null, standing_raw:"Premium", usage_raw:"Résidentiel / commercial", market_source:"dakimmo" },
  { city:"Tanger", neighborhood:"Branes", apartment_m2:10500, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Résidentiel", market_source:"dakimmo" },
  { city:"Tanger", neighborhood:"Ziaten", apartment_m2:9000, villa_m2:null, standing_raw:"Accessible", usage_raw:"Résidentiel / volume", market_source:"dakimmo" },
  { city:"Tanger", neighborhood:"Mghogha", apartment_m2:8500, villa_m2:null, standing_raw:"Accessible", usage_raw:"Péri-urbain / nouveaux programmes", market_source:"dakimmo" },
  { city:"Tanger", neighborhood:"Achakar", apartment_m2:null, villa_m2:19000, standing_raw:"Prestige", usage_raw:"Touristique / villas", market_source:"dakimmo" },

  { city:"Agadir", neighborhood:"Taghazout Bay", apartment_m2:20000, villa_m2:null, standing_raw:"Prestige", usage_raw:"Touristique / investissement locatif", market_source:"dakimmo" },
  { city:"Agadir", neighborhood:"Founty", apartment_m2:17000, villa_m2:null, standing_raw:"Prestige", usage_raw:"Touristique premium / résidentiel", market_source:"dakimmo" },
  { city:"Agadir", neighborhood:"Centre-ville", apartment_m2:12500, villa_m2:null, standing_raw:"Premium", usage_raw:"Commercial / mixte", market_source:"dakimmo" },
  { city:"Agadir", neighborhood:"Dakhla", apartment_m2:10000, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Résidentiel", market_source:"dakimmo" },
  { city:"Agadir", neighborhood:"Anza", apartment_m2:9500, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Littoral / résidentiel", market_source:"dakimmo" },
  { city:"Agadir", neighborhood:"Hay Mohammadi", apartment_m2:8500, villa_m2:null, standing_raw:"Accessible", usage_raw:"Résidentiel / programmes neufs", market_source:"dakimmo" },
  { city:"Agadir", neighborhood:"Aït Melloul", apartment_m2:7000, villa_m2:null, standing_raw:"Accessible", usage_raw:"Résidentiel / industriel", market_source:"dakimmo" },

  { city:"Fès", neighborhood:"Fes City Center", apartment_m2:8049, villa_m2:null, standing_raw:"Premium", usage_raw:"Commercial / mixte", market_source:"agenz" },
  { city:"Fès", neighborhood:"Hay Moulay El Kamel", apartment_m2:7712, villa_m2:null, standing_raw:"Premium", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"Fès", neighborhood:"Mourabitine", apartment_m2:7180, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"Fès", neighborhood:"Nouvelle Ville", apartment_m2:6872, villa_m2:9371, standing_raw:"Cœur de marché", usage_raw:"Mixte / tertiaire", market_source:"agenz" },
  { city:"Fès", neighborhood:"Oued Fes", apartment_m2:6342, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Résidentiel / mixte", market_source:"agenz" },

  { city:"Meknès", neighborhood:"Zahwa", apartment_m2:7283, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"Meknès", neighborhood:"El Menzeh", apartment_m2:7235, villa_m2:8362, standing_raw:"Cœur de marché", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"Meknès", neighborhood:"Avenue des F.A.R", apartment_m2:7151, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Commercial / mixte", market_source:"agenz" },
  { city:"Meknès", neighborhood:"Hamria", apartment_m2:6835, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Commercial / mixte", market_source:"agenz" },
  { city:"Meknès", neighborhood:"Ouislane", apartment_m2:5560, villa_m2:null, standing_raw:"Accessible", usage_raw:"Résidentiel / volume", market_source:"agenz" },

  { city:"Oujda", neighborhood:"Hay Rabat", apartment_m2:8857, villa_m2:null, standing_raw:"Premium", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"Oujda", neighborhood:"Hay salam", apartment_m2:7353, villa_m2:null, standing_raw:"Premium", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"Oujda", neighborhood:"El Qods", apartment_m2:7119, villa_m2:7923, standing_raw:"Premium", usage_raw:"Résidentiel / mixte", market_source:"agenz" },
  { city:"Oujda", neighborhood:"Lazaret", apartment_m2:6942, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Mixte", market_source:"agenz" },
  { city:"Oujda", neighborhood:"Agdal", apartment_m2:6272, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Résidentiel / commercial", market_source:"agenz" },

  { city:"Safi", neighborhood:"Mstari", apartment_m2:8240, villa_m2:null, standing_raw:"Premium", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"Safi", neighborhood:"Oued Abdellah Ben Moussa", apartment_m2:7671, villa_m2:null, standing_raw:"Premium", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"Safi", neighborhood:"Saada", apartment_m2:7323, villa_m2:null, standing_raw:"Premium", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"Safi", neighborhood:"Tantaoui", apartment_m2:7246, villa_m2:null, standing_raw:"Premium", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"Safi", neighborhood:"Sania Al Abidinie", apartment_m2:6260, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Mixte", market_source:"agenz" },

  { city:"El Jadida", neighborhood:"Al Boustane", apartment_m2:8438, villa_m2:null, standing_raw:"Premium", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"El Jadida", neighborhood:"Centre Ville", apartment_m2:8138, villa_m2:10536, standing_raw:"Cœur de marché supérieur", usage_raw:"Commercial / mixte", market_source:"agenz" },
  { city:"El Jadida", neighborhood:"Hay Riad", apartment_m2:7583, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"El Jadida", neighborhood:"Narjiss", apartment_m2:7143, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"El Jadida", neighborhood:"Hay Essalam", apartment_m2:6888, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Résidentiel", market_source:"agenz" },

  { city:"Nador", neighborhood:"Wad Benouserdoune", apartment_m2:7560, villa_m2:null, standing_raw:"Premium", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"Nador", neighborhood:"Hay Al Matar", apartment_m2:6261, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Mixte", market_source:"agenz" },
  { city:"Nador", neighborhood:"Al Boustane", apartment_m2:6181, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"Nador", neighborhood:"Nador", apartment_m2:6103, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Commercial / mixte", market_source:"agenz" },
  { city:"Nador", neighborhood:"Mediterranée", apartment_m2:5565, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Littoral / mixte", market_source:"agenz" },

  { city:"Kénitra", neighborhood:"Bir Rami Est", apartment_m2:8419, villa_m2:6758, standing_raw:"Premium", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"Kénitra", neighborhood:"Maamora", apartment_m2:8249, villa_m2:5860, standing_raw:"Premium", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"Kénitra", neighborhood:"Mimosa", apartment_m2:8047, villa_m2:null, standing_raw:"Premium", usage_raw:"Résidentiel / mixte", market_source:"agenz" },
  { city:"Kénitra", neighborhood:"Ville Haute", apartment_m2:7803, villa_m2:13437, standing_raw:"Premium", usage_raw:"Commercial / mixte", market_source:"agenz" },
  { city:"Kénitra", neighborhood:"Mehdia", apartment_m2:7237, villa_m2:7555, standing_raw:"Cœur de marché", usage_raw:"Touristique / résidentiel", market_source:"agenz" },

  { city:"Salé", neighborhood:"Plage des nations", apartment_m2:16427, villa_m2:null, standing_raw:"Prestige", usage_raw:"Touristique / résidentiel secondaire", market_source:"agenz" },
  { city:"Salé", neighborhood:"Salé El Jadiia", apartment_m2:9346, villa_m2:11462, standing_raw:"Cœur de marché supérieur", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"Salé", neighborhood:"Hssaine", apartment_m2:9123, villa_m2:null, standing_raw:"Cœur de marché", usage_raw:"Résidentiel", market_source:"agenz" },
  { city:"Salé", neighborhood:"Btana", apartment_m2:8705, villa_m2:11259, standing_raw:"Cœur de marché", usage_raw:"Mixte", market_source:"agenz" },
  { city:"Salé", neighborhood:"Bab lakhmiss", apartment_m2:8370, villa_m2:9701, standing_raw:"Cœur de marché", usage_raw:"Commercial / mixte", market_source:"agenz" },
] as const;
