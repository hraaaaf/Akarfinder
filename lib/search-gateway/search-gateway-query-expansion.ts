// SEARCH-GATEWAY-COVERAGE-EXPANSION-1
// Controlled query expansion: derive a transaction intent from the free-text
// query, then build a small set of intent-consistent variants (2 max) used
// only as a backfill round when the primary round returns too few results.
// Rules: never mix buy/rent, never mix new/classic unless compatible, cap
// the number of variants to protect provider cost and latency.

import type { SearchGatewaySourceConfig } from "./search-gateway-types";
import type { SearchGatewayQuery } from "./search-gateway-types";

export type GatewayQueryTransaction = "rent" | "new" | "land" | "buy";

const RENT_WORDS = ["location", "louer", "à louer", "a louer", "for rent"];
const NEW_WORDS = ["neuf", "neuve", "programme neuf", "résidence neuve", "residence neuve", "projet immobilier"];
const LAND_WORDS = ["terrain", "lot de terrain", "lotissement"];
const BUY_WORDS = ["vente", "à vendre", "a vendre", "acheter", "achat", "for sale"];

function includesWord(q: string, words: ReadonlyArray<string>): boolean {
  return words.some((w) => q.includes(w));
}

/** Detect the transaction intent carried by a free-text query. */
export function detectQueryTransaction(q: string): GatewayQueryTransaction {
  const lower = q.toLowerCase();
  if (includesWord(lower, RENT_WORDS)) return "rent";
  if (includesWord(lower, NEW_WORDS)) return "new";
  if (includesWord(lower, LAND_WORDS)) return "land";
  if (includesWord(lower, BUY_WORDS)) return "buy";
  // No explicit transaction — treated as buy-leaning generic search.
  return "buy";
}

/** Strip transaction keywords so variants can re-attach them cleanly. */
function stripTransactionWords(q: string): string {
  let core = ` ${q.toLowerCase()} `;
  const allWords = [...RENT_WORDS, ...NEW_WORDS, ...BUY_WORDS, "programme", "immobilier"];
  // Longest first so "à louer" is removed before "louer".
  for (const word of [...allWords].sort((a, b) => b.length - a.length)) {
    core = core.split(` ${word} `).join(" ");
  }
  return core.replace(/\s+/g, " ").trim();
}

/**
 * Build up to 2 intent-consistent query variants (excluding the original).
 * rent → rental phrasings only; new → new-build phrasings only;
 * land/buy → sale phrasings only. Never crosses transaction intents.
 */
export function buildQueryVariants(q: string): string[] {
  const original = q.trim();
  if (!original) return [];

  const transaction = detectQueryTransaction(original);
  const core = stripTransactionWords(original) || original.toLowerCase();

  let candidates: string[];
  switch (transaction) {
    case "rent":
      candidates = [`${core} à louer`, `location ${core}`];
      break;
    case "new":
      candidates = [`immobilier neuf ${core}`, `appartement neuf ${core}`];
      break;
    case "land":
      candidates = [`${core} à vendre`, `vente ${core}`];
      break;
    case "buy":
    default:
      candidates = [`${core} à vendre`, `achat ${core}`];
      break;
  }

  const originalLower = original.toLowerCase();
  const seen = new Set<string>([originalLower]);
  const variants: string[] = [];
  for (const candidate of candidates) {
    const cleaned = candidate.replace(/\s+/g, " ").trim();
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    variants.push(cleaned);
    if (variants.length >= 2) break;
  }
  return variants;
}

/**
 * Build the backfill (expansion) query round: at most one variant query per
 * source, variants spread across sources, hard-capped to keep the total
 * provider calls per search bounded.
 */
export function buildExpansionQueries(
  q: string,
  sources: ReadonlyArray<SearchGatewaySourceConfig>,
  usedQueries: ReadonlySet<string>,
  maxResultsPerQuery: number,
  maxExpansionQueries = 6,
): SearchGatewayQuery[] {
  const variants = buildQueryVariants(q);
  if (variants.length === 0) return [];

  const queries: SearchGatewayQuery[] = [];
  const localUsed = new Set(usedQueries);

  sources.forEach((source, index) => {
    if (queries.length >= maxExpansionQueries) return;
    const variant = variants[index % variants.length];
    const query = `site:${source.domain} ${variant}`;
    if (localUsed.has(query)) return;
    localUsed.add(query);
    queries.push({
      source_id: source.source_id,
      query,
      max_results: maxResultsPerQuery,
    });
  });

  return queries;
}
