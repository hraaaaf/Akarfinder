// SEARCH-RANKING-INTENT-2 — Ranking intelligent basé sur l'intention utilisateur
// Priorise ville, quartier, type, transaction, texte
// N'utilise PAS duplicate_score ni duplicate_group_id

import type { Listing } from "@/lib/listings/types";
import type { SearchQuery } from "./types";

const TEXT_STOP_WORDS = new Set([
  "a", "au", "aux", "de", "du", "des", "le", "la", "les",
  "en", "et", "ou", "un", "une", "par", "sur", "pour",
  "dh", "mad", "dirhams", "moins", "plus", "avec", "sans",
  "max", "maxi", "budget", "prix", "bien", "immobilier",
  "chambre", "salon", "surface", "m2", "m²", "maroc",
  "appartement", "vendre", "location", "louer",
]);

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function tokenize(text?: string): Set<string> {
  if (!text) return new Set();
  return new Set(
    normalize(text)
      .split(/\W+/)
      .filter((w) => w.length >= 3 && !TEXT_STOP_WORDS.has(w) && !/^\d+$/.test(w))
  );
}

function countMatchingTokens(text1: string | undefined, text2: string | undefined): number {
  if (!text1 || !text2) return 0;
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);
  let count = 0;
  for (const token of tokens1) {
    if (tokens2.has(token)) count++;
  }
  return count;
}

export function computeRankingScore(listing: Listing, query: SearchQuery): number {
  let score = 0;

  // 1. CITY MATCH (40 points) — Highest priority
  if (query.city && normalize(listing.city || "") === normalize(query.city)) {
    score += 40;
  }

  // 2. DISTRICT MATCH (35 points) — Second priority
  if (query.q && listing.district) {
    const qTokens = tokenize(query.q);
    const districtTokens = tokenize(listing.district);
    const matches = countMatchingTokens(listing.district, query.q);
    if (matches > 0) {
      score += 35;
    }
  }

  // 3. PROPERTY TYPE MATCH (20 points)
  if (query.property_type && listing.property_type) {
    const mapped = mapPropertyType(query.property_type);
    if (mapped && normalize(listing.property_type) === normalize(mapped)) {
      score += 20;
    }
  }

  // 4. TRANSACTION TYPE MATCH (15 points)
  if (query.transaction_type && listing.transaction_type) {
    const mapped = mapTransactionType(query.transaction_type);
    if (mapped && normalize(listing.transaction_type) === normalize(mapped)) {
      score += 15;
    }
  }

  // 5. TEXT RELEVANCE (up to 15 points)
  if (query.q) {
    const haystack = [
      listing.title,
      listing.description_snippet,
    ]
      .filter(Boolean)
      .join(" ");
    const matches = countMatchingTokens(haystack, query.q);
    score += Math.min(15, matches * 2); // 2 points per matching token, cap at 15
  }

  // 6. COMPLETENESS BONUS (up to 10 points)
  let completeFields = 0;
  if (listing.title) completeFields++;
  if (listing.price && listing.price > 0) completeFields++;
  if (listing.surface_m2 && listing.surface_m2 > 0) completeFields++;
  if (listing.city) completeFields++;
  if (listing.district) completeFields++;
  if (listing.description_snippet) completeFields++;
  // images would be completeFields++ if we had access to them
  score += completeFields; // 1 point per complete field, max 6

  // 7. RELIABILITY BONUS (up to 5 points) — Lowest priority
  if (listing.reliability_score) {
    // Only apply bonus if above 50%, max +5
    const bonusPoints = Math.max(0, Math.min(5, (listing.reliability_score - 50) / 10));
    score += bonusPoints;
  }

  // 8. FRESHNESS BONUS — Not implemented (no reliable date field)
  // Would add +5 for listings posted in last 30 days

  return score;
}

function mapPropertyType(raw?: string): string | undefined {
  if (!raw) return undefined;
  const n = raw.trim().toLowerCase();
  if (n === "apartment" || n === "appartement") return "Appartement";
  if (n === "villa") return "Villa";
  if (n === "land" || n === "terrain") return "Terrain";
  if (n === "office" || n === "bureau") return "Bureau";
  if (n === "studio") return "Studio";
  if (n === "maison") return "Maison";
  return raw;
}

function mapTransactionType(raw?: string): string | undefined {
  if (!raw) return undefined;
  const n = raw.trim().toLowerCase();
  if (n === "buy" || n === "sale" || n === "achat") return "buy";
  if (n === "rent" || n === "location") return "rent";
  if (n === "new" || n === "neuf") return "new";
  return raw;
}
