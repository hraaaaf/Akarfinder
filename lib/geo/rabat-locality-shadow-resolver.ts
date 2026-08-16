import { RABAT_ALL_PRODUCT_LOCALITIES, type RabatProductLocality } from "@/lib/geo/rabat-locality-registry";

export type RabatShadowInput = {
  district?: string | null;
  title?: string | null;
  snippet?: string | null;
  searchText?: string | null;
};

export type RabatShadowEvidence = {
  field: "district" | "title" | "snippet" | "searchText";
  matchedTerm: string;
  matchKind: "canonical" | "explicit_alias";
  signal: "structured_exact" | "text_phrase";
};

export type RabatShadowMatched = {
  status: "matched";
  localityId: string;
  slug: string;
  taxonomyStatus: RabatProductLocality["taxonomy_status"];
  marketMapEligible: boolean;
  activationStatus: RabatProductLocality["activation_status"];
  publicationBlocked: boolean;
  evidence: RabatShadowEvidence[];
};

export type RabatShadowAmbiguous = {
  status: "ambiguous";
  candidateLocalityIds: string[];
  evidence: RabatShadowEvidence[];
};

export type RabatShadowUnresolved = {
  status: "unresolved";
  reason: "no_exact_locality_signal";
};

export type RabatShadowResolution = RabatShadowMatched | RabatShadowAmbiguous | RabatShadowUnresolved;

type IndexedTerm = {
  locality: RabatProductLocality;
  normalizedTerm: string;
  originalTerm: string;
  matchKind: RabatShadowEvidence["matchKind"];
};

export function normalizeRabatShadowText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’'`´-]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const TERM_INDEX: readonly IndexedTerm[] = RABAT_ALL_PRODUCT_LOCALITIES.flatMap((locality) => {
  const seen = new Set<string>();
  const terms: IndexedTerm[] = [];

  const add = (originalTerm: string, matchKind: RabatShadowEvidence["matchKind"]) => {
    const normalizedTerm = normalizeRabatShadowText(originalTerm);
    if (!normalizedTerm || seen.has(normalizedTerm)) return;
    seen.add(normalizedTerm);
    terms.push({ locality, normalizedTerm, originalTerm, matchKind });
  };

  add(locality.display_name, "canonical");
  for (const alias of locality.aliases) add(alias, "explicit_alias");
  return terms;
});

function phrasePresent(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

function consolidate(matches: Array<{ term: IndexedTerm; evidence: RabatShadowEvidence }>): RabatShadowResolution {
  const byLocality = new Map<string, { locality: RabatProductLocality; evidence: RabatShadowEvidence[] }>();

  for (const match of matches) {
    const current = byLocality.get(match.term.locality.id) ?? { locality: match.term.locality, evidence: [] };
    if (!current.evidence.some((item) =>
      item.field === match.evidence.field &&
      item.matchedTerm === match.evidence.matchedTerm &&
      item.signal === match.evidence.signal
    )) {
      current.evidence.push(match.evidence);
    }
    byLocality.set(match.term.locality.id, current);
  }

  if (byLocality.size === 0) return { status: "unresolved", reason: "no_exact_locality_signal" };

  if (byLocality.size > 1) {
    const entries = [...byLocality.values()].sort((a, b) => a.locality.id.localeCompare(b.locality.id));
    return {
      status: "ambiguous",
      candidateLocalityIds: entries.map((entry) => entry.locality.id),
      evidence: entries.flatMap((entry) => entry.evidence),
    };
  }

  const [{ locality, evidence }] = [...byLocality.values()];
  return {
    status: "matched",
    localityId: locality.id,
    slug: locality.slug,
    taxonomyStatus: locality.taxonomy_status,
    marketMapEligible: locality.market_map_eligible,
    activationStatus: locality.activation_status,
    publicationBlocked: locality.activation_status !== "legacy_active",
    evidence,
  };
}

function matchTextField(
  field: Exclude<RabatShadowEvidence["field"], "district">,
  rawValue: string | null | undefined,
): RabatShadowResolution | null {
  const value = normalizeRabatShadowText(rawValue ?? "");
  if (!value) return null;

  const matches: Array<{ term: IndexedTerm; evidence: RabatShadowEvidence }> = [];
  for (const term of TERM_INDEX) {
    // Very short aliases such as "Riad" are accepted as structured exact
    // values only. In free text they are too weak to be deterministic.
    if (term.matchKind === "explicit_alias" && term.normalizedTerm.length < 5) continue;
    if (!phrasePresent(value, term.normalizedTerm)) continue;
    matches.push({
      term,
      evidence: {
        field,
        matchedTerm: term.originalTerm,
        matchKind: term.matchKind,
        signal: "text_phrase",
      },
    });
  }

  return matches.length > 0 ? consolidate(matches) : null;
}

/**
 * Read-only C8 shadow resolver.
 *
 * Authority order is intentionally strict:
 * 1. exact structured district against canonical names / explicit aliases;
 * 2. otherwise title exact-phrase signals;
 * 3. then snippet exact-phrase signals;
 * 4. finally searchText exact-phrase signals;
 * 5. ambiguity inside the first field carrying a signal fails closed;
 * 6. never fuzzy-match, infer a parent, create a DB entity, or activate a zone.
 */
export function resolveRabatLocalityShadow(input: RabatShadowInput): RabatShadowResolution {
  const district = normalizeRabatShadowText(input.district ?? "");
  if (district) {
    const structured = TERM_INDEX
      .filter((term) => term.normalizedTerm === district)
      .map((term) => ({
        term,
        evidence: {
          field: "district" as const,
          matchedTerm: term.originalTerm,
          matchKind: term.matchKind,
          signal: "structured_exact" as const,
        },
      }));
    if (structured.length > 0) return consolidate(structured);
  }

  for (const [field, value] of [
    ["title", input.title],
    ["snippet", input.snippet],
    ["searchText", input.searchText],
  ] as const) {
    const result = matchTextField(field, value);
    if (result) return result;
  }

  return { status: "unresolved", reason: "no_exact_locality_signal" };
}
