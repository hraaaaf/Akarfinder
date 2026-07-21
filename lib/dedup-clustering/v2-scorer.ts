// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#6/10) -- Mass Deduplication &
// Property Clustering V2. SHADOW ONLY: this module scores candidate pairs
// and never writes to property_clusters/property_cluster_members. Those
// tables' origin_type CHECK constraint is a deliberate choke point (see
// 20260716140200_create_property_cluster_members.sql) that makes automatic
// clustering structurally impossible today -- this module does not attempt
// to widen it. Only structured, non-PII fields are used (city, district,
// property_type, transaction_type, price, surface, bedrooms, bathrooms,
// normalized title tokens). No fuzzy geocoding, no PII.

export type ClusterableOffer = {
  source_offer_id: number;
  listing_url: string;
  source_name: string;
  source_offer_key: string | null;
  city: string | null;
  district: string | null;
  property_type: string | null;
  transaction_type: string | null;
  price_mad: number | null;
  surface_m2: number | null;
  bedrooms_count: number | null;
  bathrooms_count: number | null;
  title: string | null;
};

export type ClusterTier =
  | "url_duplicate"
  | "same_source_offer"
  | "cross_source_high_confidence"
  | "possible_match"
  | "no_match";

export type PairwiseClusterCandidate = {
  offer_a_id: number;
  offer_b_id: number;
  tier: ClusterTier;
  matched_signals: string[];
  corroborating_signal_count: number;
  contradicting_signals: string[];
};

const PRICE_TOLERANCE_RATIO = 0.05; // within 5%
const SURFACE_TOLERANCE_RATIO = 0.05; // within 5%
const MIN_CORROBORATING_SIGNALS_FOR_HIGH_CONFIDENCE = 3;

// A signal present on both sides that disagrees by MORE than this is
// evidence AGAINST the same property, not neutral "no match" -- found via
// the real shadow audit: two agenz listings shared district/surface(~4%)/
// bedrooms but had an 800k vs 2.2M DH price (63% apart), which is far more
// likely two different units than one mis-priced listing. Any contradicting
// signal disqualifies the pair from cross_source_high_confidence outright,
// regardless of how many other signals matched.
const CONTRADICTION_RATIO = 0.40;

// A non-null field can still carry no information (e.g. district = "" is
// how this dataset represents "unknown", not "matches every other unknown
// district"). Treat blank strings the same as null everywhere below.
function nonBlank(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function ratioDiff(a: number, b: number): number {
  const denom = Math.max(Math.abs(a), Math.abs(b));
  if (denom === 0) return 0;
  return Math.abs(a - b) / denom;
}

function withinRatio(a: number, b: number, ratio: number): boolean {
  return ratioDiff(a, b) <= ratio;
}

// A is compared to B once; blocking (grouping by city+transaction+type
// before calling this) is the caller's responsibility -- kept out of this
// pure function so it stays independently testable at the pair level.
export function scorePair(a: ClusterableOffer, b: ClusterableOffer): PairwiseClusterCandidate {
  const base = { offer_a_id: a.source_offer_id, offer_b_id: b.source_offer_id };

  if (a.listing_url === b.listing_url) {
    return { ...base, tier: "url_duplicate", matched_signals: ["listing_url"], corroborating_signal_count: 0, contradicting_signals: [] };
  }

  if (
    a.source_name === b.source_name &&
    a.source_offer_key !== null &&
    b.source_offer_key !== null &&
    a.source_offer_key === b.source_offer_key
  ) {
    return { ...base, tier: "same_source_offer", matched_signals: ["source_name", "source_offer_key"], corroborating_signal_count: 0, contradicting_signals: [] };
  }

  const cityA = nonBlank(a.city);
  const cityB = nonBlank(b.city);
  const ttA = nonBlank(a.transaction_type);
  const ttB = nonBlank(b.transaction_type);
  const ptA = nonBlank(a.property_type);
  const ptB = nonBlank(b.property_type);

  // Mandatory gate for cross-source consideration at all -- never auto-
  // cluster on a single signal. Blank ("") is treated as unknown, not as a
  // value that can match another blank.
  const mandatoryMatch = cityA !== null && cityA === cityB && ttA !== null && ttA === ttB && ptA !== null && ptA === ptB;

  if (!mandatoryMatch) {
    return { ...base, tier: "no_match", matched_signals: [], corroborating_signal_count: 0, contradicting_signals: [] };
  }

  const matched: string[] = ["city", "transaction_type", "property_type"];
  const contradicting: string[] = [];
  let corroborating = 0;

  const districtA = nonBlank(a.district);
  const districtB = nonBlank(b.district);
  if (districtA !== null && districtA === districtB) {
    matched.push("district");
    corroborating += 1;
  }
  if (a.surface_m2 !== null && b.surface_m2 !== null) {
    if (withinRatio(a.surface_m2, b.surface_m2, SURFACE_TOLERANCE_RATIO)) {
      matched.push("surface_m2");
      corroborating += 1;
    } else if (ratioDiff(a.surface_m2, b.surface_m2) > CONTRADICTION_RATIO) {
      contradicting.push("surface_m2");
    }
  }
  if (a.price_mad !== null && b.price_mad !== null) {
    if (withinRatio(a.price_mad, b.price_mad, PRICE_TOLERANCE_RATIO)) {
      matched.push("price_mad");
      corroborating += 1;
    } else if (ratioDiff(a.price_mad, b.price_mad) > CONTRADICTION_RATIO) {
      contradicting.push("price_mad");
    }
  }
  if (a.bedrooms_count !== null && b.bedrooms_count !== null && a.bedrooms_count === b.bedrooms_count) {
    matched.push("bedrooms_count");
    corroborating += 1;
  }
  // No coordinates field exists in property_listings today, and title-token
  // overlap was tried and DROPPED after the real shadow audit showed it
  // inflating confidence on generic, formulaic French listing titles
  // ("Appartement a louer <n> m2 a <ville>") shared by clearly different
  // properties. Only the 4 structured signals below count.

  // A contradicting signal (e.g. 800k vs 2.2M DH, >40% apart) is evidence
  // AGAINST the same property and disqualifies high confidence outright,
  // no matter how many other signals matched -- found via the real shadow
  // audit (agenz Palmier listings, similar surface/district/bedrooms but
  // wildly different price).
  const tier: ClusterTier =
    contradicting.length === 0 && corroborating >= MIN_CORROBORATING_SIGNALS_FOR_HIGH_CONFIDENCE
      ? "cross_source_high_confidence"
      : "possible_match";

  return { ...base, tier, matched_signals: matched, corroborating_signal_count: corroborating, contradicting_signals: contradicting };
}

// Blocking key: only offers sharing this key are ever pairwise-compared.
// Prevents O(n^2) across the whole dataset and matches the mandate's "never
// auto-cluster on a single signal" gate structurally (city+transaction+type
// must already match before scorePair does any work).
export function blockingKey(offer: ClusterableOffer): string {
  return `${offer.city ?? "?"}::${offer.transaction_type ?? "?"}::${offer.property_type ?? "?"}`;
}

export function findCandidatePairs(offers: ClusterableOffer[]): PairwiseClusterCandidate[] {
  const blocks = new Map<string, ClusterableOffer[]>();
  for (const offer of offers) {
    const key = blockingKey(offer);
    if (!blocks.has(key)) blocks.set(key, []);
    blocks.get(key)!.push(offer);
  }

  const candidates: PairwiseClusterCandidate[] = [];
  // URL duplicates and same-source-offer matches can occur even across
  // different blocking keys (e.g. a data-entry error changed the city
  // field between two crawls of the identical URL) -- checked separately,
  // over the full offer list, deterministically ordered.
  const sorted = [...offers].sort((a, b) => a.source_offer_id - b.source_offer_id);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (a.listing_url === b.listing_url) {
        candidates.push(scorePair(a, b));
      } else if (a.source_name === b.source_name && a.source_offer_key !== null && a.source_offer_key === b.source_offer_key) {
        candidates.push(scorePair(a, b));
      }
    }
  }

  for (const block of blocks.values()) {
    const sortedBlock = [...block].sort((a, b) => a.source_offer_id - b.source_offer_id);
    for (let i = 0; i < sortedBlock.length; i++) {
      for (let j = i + 1; j < sortedBlock.length; j++) {
        const a = sortedBlock[i];
        const b = sortedBlock[j];
        if (a.listing_url === b.listing_url) continue; // already captured above
        if (a.source_name === b.source_name && a.source_offer_key !== null && a.source_offer_key === b.source_offer_key) continue;
        const result = scorePair(a, b);
        if (result.tier !== "no_match") candidates.push(result);
      }
    }
  }

  return candidates;
}
