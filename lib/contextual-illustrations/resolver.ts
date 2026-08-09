import {
  CONTEXTUAL_ILLUSTRATION_CATALOG,
  contextualKey,
  type ContextualIllustrationAsset,
  type ContextualIllustrationCatalog,
} from "./catalog";

export type ContextualIllustrationTier =
  | "district_type"
  | "district"
  | "city_type"
  | "city";

export type ContextualIllustrationInput = {
  stableListingId: string;
  normalizedCity?: string | null;
  normalizedDistrict?: string | null;
  normalizedPropertyType?: string | null;
};

export type ResolvedContextualIllustration = ContextualIllustrationAsset & {
  tier: ContextualIllustrationTier;
};

const HASH_VERSION = "contextual-illustration-v1";

function hash32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Rendezvous / Highest Random Weight selection.
 *
 * Unlike hash % N, this is order-independent and adding a new asset only
 * remaps seeds for which that new asset wins. Stable asset IDs are therefore
 * part of the public deterministic contract and must never be recycled.
 */
export function selectDeterministicAsset(
  candidates: readonly ContextualIllustrationAsset[],
  seed: string
): ContextualIllustrationAsset | null {
  if (!seed || candidates.length === 0) return null;

  let winner: ContextualIllustrationAsset | null = null;
  let winnerScore = -1;

  for (const candidate of candidates) {
    const score = hash32(`${HASH_VERSION}\u001f${seed}\u001f${candidate.id}`);
    if (
      score > winnerScore ||
      (score === winnerScore && winner !== null && candidate.id < winner.id)
    ) {
      winner = candidate;
      winnerScore = score;
    }
  }

  return winner;
}

function findCandidatePool(
  input: ContextualIllustrationInput,
  catalog: ContextualIllustrationCatalog
): { tier: ContextualIllustrationTier; candidates: readonly ContextualIllustrationAsset[] } | null {
  const city = input.normalizedCity;
  const district = input.normalizedDistrict;
  const propertyType = input.normalizedPropertyType;

  if (!city) return null;

  if (district && propertyType) {
    const candidates = catalog.districtType[contextualKey(city, district, propertyType)];
    if (candidates?.length) return { tier: "district_type", candidates };
  }

  if (district) {
    const candidates = catalog.district[contextualKey(city, district)];
    if (candidates?.length) return { tier: "district", candidates };
  }

  if (propertyType) {
    const candidates = catalog.cityType[contextualKey(city, propertyType)];
    if (candidates?.length) return { tier: "city_type", candidates };
  }

  const cityCandidates = catalog.city[city];
  if (cityCandidates?.length) return { tier: "city", candidates: cityCandidates };

  return null;
}

export function resolveContextualIllustrationFromCatalog(
  input: ContextualIllustrationInput,
  catalog: ContextualIllustrationCatalog
): ResolvedContextualIllustration | null {
  const stableListingId = input.stableListingId.trim();
  if (!stableListingId) return null;

  const pool = findCandidatePool(input, catalog);
  if (!pool) return null;

  const seed = contextualKey(
    stableListingId,
    input.normalizedCity ?? "",
    input.normalizedDistrict ?? "",
    input.normalizedPropertyType ?? "",
    pool.tier
  );
  const selected = selectDeterministicAsset(pool.candidates, seed);
  return selected ? { ...selected, tier: pool.tier } : null;
}

export function resolveContextualIllustration(
  input: ContextualIllustrationInput
): ResolvedContextualIllustration | null {
  return resolveContextualIllustrationFromCatalog(input, CONTEXTUAL_ILLUSTRATION_CATALOG);
}
