// P10D — Observed price dataset for Morocco
// All values are INDICATIVE — sourced from publicly visible listings analysis.
// NEVER present these as official appraisals or guarantees.
// period: "Données 2024–2025"

import type { MarketDataPoint } from "./types";

export const MARKET_DATA: MarketDataPoint[] = [
  // ── CASABLANCA ──────────────────────────────────────────────────────────────
  // Finance City
  { city: "casablanca", neighborhood: "finance city", property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 15000, range_low: 13000, range_high: 18000, sample_count: 42, confidence: "élevée",  period: "Données 2024–2025" },
  { city: "casablanca", neighborhood: "finance city", property_type: "bureau",      transaction_type: "buy",  median_price_per_m2: 17500, range_low: 15000, range_high: 21000, sample_count: 18, confidence: "moyenne", period: "Données 2024–2025" },
  // Maârif
  { city: "casablanca", neighborhood: "maarif",       property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 14000, range_low: 12000, range_high: 16500, sample_count: 58, confidence: "élevée",  period: "Données 2024–2025" },
  { city: "casablanca", neighborhood: "maarif",       property_type: "studio",      transaction_type: "buy",  median_price_per_m2: 13500, range_low: 11500, range_high: 15500, sample_count: 32, confidence: "élevée",  period: "Données 2024–2025" },
  { city: "casablanca", neighborhood: "maarif",       property_type: "appartement", transaction_type: "rent", median_price_per_m2: 115,   range_low: 85,    range_high: 150,   sample_count: 45, confidence: "élevée",  period: "Données 2024–2025" },
  // Bouskoura
  { city: "casablanca", neighborhood: "bouskoura",    property_type: "villa",       transaction_type: "buy",  median_price_per_m2: 8500,  range_low: 7000,  range_high: 11000, sample_count: 20, confidence: "moyenne", period: "Données 2024–2025" },
  { city: "casablanca", neighborhood: "bouskoura",    property_type: "terrain",     transaction_type: "buy",  median_price_per_m2: 3500,  range_low: 2500,  range_high: 5000,  sample_count: 14, confidence: "moyenne", period: "Données 2024–2025" },
  // City-level fallbacks
  { city: "casablanca", property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 13000, range_low: 10000, range_high: 17000, sample_count: 130, confidence: "élevée", period: "Données 2024–2025" },
  { city: "casablanca", property_type: "appartement", transaction_type: "rent", median_price_per_m2: 110,   range_low: 80,    range_high: 155,   sample_count: 95,  confidence: "élevée", period: "Données 2024–2025" },
  { city: "casablanca", property_type: "villa",       transaction_type: "buy",  median_price_per_m2: 9500,  range_low: 7500,  range_high: 13000, sample_count: 55,  confidence: "élevée", period: "Données 2024–2025" },
  { city: "casablanca", property_type: "studio",      transaction_type: "buy",  median_price_per_m2: 13000, range_low: 11000, range_high: 15500, sample_count: 60,  confidence: "élevée", period: "Données 2024–2025" },
  { city: "casablanca", property_type: "terrain",     transaction_type: "buy",  median_price_per_m2: 4500,  range_low: 2500,  range_high: 7500,  sample_count: 40,  confidence: "élevée", period: "Données 2024–2025" },
  { city: "casablanca", property_type: "bureau",      transaction_type: "buy",  median_price_per_m2: 16000, range_low: 13000, range_high: 20000, sample_count: 28,  confidence: "moyenne", period: "Données 2024–2025" },
  { city: "casablanca", property_type: "maison",      transaction_type: "buy",  median_price_per_m2: 8000,  range_low: 6000,  range_high: 11000, sample_count: 22,  confidence: "moyenne", period: "Données 2024–2025" },

  // ── RABAT ───────────────────────────────────────────────────────────────────
  // Hay Riad
  { city: "rabat", neighborhood: "hay riad",  property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 13500, range_low: 11500, range_high: 16000, sample_count: 38, confidence: "élevée",  period: "Données 2024–2025" },
  { city: "rabat", neighborhood: "hay riad",  property_type: "villa",       transaction_type: "buy",  median_price_per_m2: 10500, range_low: 9000,  range_high: 13000, sample_count: 22, confidence: "moyenne", period: "Données 2024–2025" },
  // Agdal
  { city: "rabat", neighborhood: "agdal",     property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 15000, range_low: 13000, range_high: 17500, sample_count: 48, confidence: "élevée",  period: "Données 2024–2025" },
  { city: "rabat", neighborhood: "agdal",     property_type: "appartement", transaction_type: "rent", median_price_per_m2: 130,   range_low: 100,   range_high: 165,   sample_count: 35, confidence: "élevée",  period: "Données 2024–2025" },
  // Hassan
  { city: "rabat", neighborhood: "hassan",    property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 16500, range_low: 14000, range_high: 19000, sample_count: 26, confidence: "moyenne", period: "Données 2024–2025" },
  // City-level fallbacks
  { city: "rabat", property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 13000, range_low: 10500, range_high: 16000, sample_count: 110, confidence: "élevée", period: "Données 2024–2025" },
  { city: "rabat", property_type: "appartement", transaction_type: "rent", median_price_per_m2: 120,   range_low: 90,    range_high: 155,   sample_count: 75,  confidence: "élevée", period: "Données 2024–2025" },
  { city: "rabat", property_type: "villa",       transaction_type: "buy",  median_price_per_m2: 10500, range_low: 8500,  range_high: 13500, sample_count: 40,  confidence: "élevée", period: "Données 2024–2025" },
  { city: "rabat", property_type: "terrain",     transaction_type: "buy",  median_price_per_m2: 5000,  range_low: 3500,  range_high: 7500,  sample_count: 25,  confidence: "moyenne", period: "Données 2024–2025" },

  // ── MARRAKECH ───────────────────────────────────────────────────────────────
  { city: "marrakech", neighborhood: "gueliz",             property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 13000, range_low: 11000, range_high: 15500, sample_count: 32, confidence: "élevée",  period: "Données 2024–2025" },
  { city: "marrakech", neighborhood: "hivernage",          property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 17000, range_low: 14000, range_high: 21000, sample_count: 20, confidence: "moyenne", period: "Données 2024–2025" },
  { city: "marrakech", neighborhood: "hivernage",          property_type: "villa",       transaction_type: "buy",  median_price_per_m2: 13000, range_low: 10000, range_high: 17000, sample_count: 16, confidence: "moyenne", period: "Données 2024–2025" },
  { city: "marrakech", neighborhood: "route de l'ourika",  property_type: "villa",       transaction_type: "buy",  median_price_per_m2: 7500,  range_low: 5500,  range_high: 10500, sample_count: 18, confidence: "moyenne", period: "Données 2024–2025" },
  { city: "marrakech", property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 12500, range_low: 10000, range_high: 16000, sample_count: 85,  confidence: "élevée", period: "Données 2024–2025" },
  { city: "marrakech", property_type: "villa",       transaction_type: "buy",  median_price_per_m2: 10000, range_low: 7500,  range_high: 14000, sample_count: 45,  confidence: "élevée", period: "Données 2024–2025" },
  { city: "marrakech", property_type: "terrain",     transaction_type: "buy",  median_price_per_m2: 4000,  range_low: 2500,  range_high: 7000,  sample_count: 30,  confidence: "élevée", period: "Données 2024–2025" },

  // ── TANGER ──────────────────────────────────────────────────────────────────
  { city: "tanger", neighborhood: "malabata",      property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 12000, range_low: 10000, range_high: 14500, sample_count: 26, confidence: "moyenne", period: "Données 2024–2025" },
  { city: "tanger", neighborhood: "malabata",      property_type: "studio",      transaction_type: "buy",  median_price_per_m2: 11500, range_low: 9500,  range_high: 13500, sample_count: 18, confidence: "moyenne", period: "Données 2024–2025" },
  { city: "tanger", neighborhood: "ville nouvelle", property_type: "appartement", transaction_type: "buy", median_price_per_m2: 11000, range_low: 9000,  range_high: 13000, sample_count: 32, confidence: "élevée",  period: "Données 2024–2025" },
  { city: "tanger", property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 11500, range_low: 9000,  range_high: 14000, sample_count: 65,  confidence: "élevée", period: "Données 2024–2025" },
  { city: "tanger", property_type: "appartement", transaction_type: "rent", median_price_per_m2: 95,    range_low: 70,    range_high: 125,   sample_count: 40,  confidence: "élevée", period: "Données 2024–2025" },
  { city: "tanger", property_type: "villa",       transaction_type: "buy",  median_price_per_m2: 8500,  range_low: 6500,  range_high: 11500, sample_count: 28,  confidence: "moyenne", period: "Données 2024–2025" },
  { city: "tanger", property_type: "terrain",     transaction_type: "buy",  median_price_per_m2: 3500,  range_low: 2000,  range_high: 5500,  sample_count: 22,  confidence: "moyenne", period: "Données 2024–2025" },

  // ── AGADIR ──────────────────────────────────────────────────────────────────
  { city: "agadir", neighborhood: "founty",    property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 12000, range_low: 10000, range_high: 14000, sample_count: 22, confidence: "moyenne", period: "Données 2024–2025" },
  { city: "agadir", neighborhood: "talborjt",  property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 9500,  range_low: 8000,  range_high: 11500, sample_count: 16, confidence: "moyenne", period: "Données 2024–2025" },
  { city: "agadir", property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 10500, range_low: 8500,  range_high: 13000, sample_count: 42,  confidence: "élevée", period: "Données 2024–2025" },
  { city: "agadir", property_type: "appartement", transaction_type: "rent", median_price_per_m2: 85,    range_low: 60,    range_high: 115,   sample_count: 28,  confidence: "moyenne", period: "Données 2024–2025" },
  { city: "agadir", property_type: "villa",       transaction_type: "buy",  median_price_per_m2: 8000,  range_low: 6000,  range_high: 11000, sample_count: 25,  confidence: "moyenne", period: "Données 2024–2025" },
  { city: "agadir", property_type: "terrain",     transaction_type: "buy",  median_price_per_m2: 3000,  range_low: 2000,  range_high: 4500,  sample_count: 18,  confidence: "moyenne", period: "Données 2024–2025" },

  // ── FÈS ─────────────────────────────────────────────────────────────────────
  { city: "fes", neighborhood: "ville nouvelle", property_type: "appartement", transaction_type: "buy", median_price_per_m2: 9500, range_low: 8000,  range_high: 11500, sample_count: 26, confidence: "moyenne", period: "Données 2024–2025" },
  { city: "fes", neighborhood: "fes el bali",    property_type: "appartement", transaction_type: "buy", median_price_per_m2: 8000, range_low: 6500,  range_high: 10000, sample_count: 16, confidence: "moyenne", period: "Données 2024–2025" },
  { city: "fes", neighborhood: "fes el bali",    property_type: "maison",      transaction_type: "buy", median_price_per_m2: 6500, range_low: 5000,  range_high: 9000,  sample_count: 12, confidence: "faible",  period: "Données 2024–2025" },
  { city: "fes", property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 9000,  range_low: 7500,  range_high: 11000, sample_count: 42,  confidence: "élevée", period: "Données 2024–2025" },
  { city: "fes", property_type: "appartement", transaction_type: "rent", median_price_per_m2: 75,    range_low: 55,    range_high: 100,   sample_count: 25,  confidence: "moyenne", period: "Données 2024–2025" },
  { city: "fes", property_type: "villa",       transaction_type: "buy",  median_price_per_m2: 7500,  range_low: 6000,  range_high: 9500,  sample_count: 20,  confidence: "moyenne", period: "Données 2024–2025" },
  { city: "fes", property_type: "maison",      transaction_type: "buy",  median_price_per_m2: 6500,  range_low: 5000,  range_high: 8500,  sample_count: 18,  confidence: "moyenne", period: "Données 2024–2025" },

  // ── KÉNITRA / MOHAMMEDIA ────────────────────────────────────────────────────
  { city: "kenitra",     property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 8000, range_low: 6500, range_high: 10000, sample_count: 22, confidence: "moyenne", period: "Données 2024–2025" },
  { city: "mohammedia",  property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 9500, range_low: 8000, range_high: 12000, sample_count: 18, confidence: "moyenne", period: "Données 2024–2025" },
  { city: "meknes",      property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 8500, range_low: 7000, range_high: 10500, sample_count: 20, confidence: "moyenne", period: "Données 2024–2025" },
  { city: "el jadida",   property_type: "appartement", transaction_type: "buy",  median_price_per_m2: 8000, range_low: 6500, range_high: 10000, sample_count: 15, confidence: "faible",  period: "Données 2024–2025" },
];
