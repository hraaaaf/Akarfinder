import { buildPathSignature, type PatternEvidenceRecord } from "@/lib/acquisition-scale-v1/commoncrawl-pattern-evidence";

export const P0_4_STRONG_DOMAINS = [
  "christiesrealestatemorocco.com",
  "immo-maroc.com",
  "immobilier-a-marrakech.com",
  "immohammedia.com",
  "leaderimmo.ma",
] as const;

export type P0_4StrongDomain = (typeof P0_4_STRONG_DOMAINS)[number];

export type PatternProposal = {
  source_domain: P0_4StrongDomain;
  candidate_pattern: string;
  expected_positive_signatures: string[];
  certified_negative_signatures: string[];
  rationale: string;
};

export const P0_4_PATTERN_PROPOSALS: readonly PatternProposal[] = [
  {
    source_domain: "christiesrealestatemorocco.com",
    candidate_pattern: "^/(?:fr/annonces-immobilieres|en/annonces)/ref-[^/]+-\\d+/[^/]+-\\d+/?$",
    expected_positive_signatures: [
      "/fr/annonces-immobilieres/{slug}-{id}/{slug}-{id}",
      "/en/annonces/{slug}-{id}/{slug}-{id}",
    ],
    certified_negative_signatures: [
      "/en/{slug}",
      "/fr/{slug}",
      "/en/{slug}/p=2",
      "/fr/{slug}/p=2",
    ],
    rationale: "Locale + annonces namespace + explicit ref segment + terminal numeric listing segment.",
  },
  {
    source_domain: "immo-maroc.com",
    candidate_pattern: "^/(?:vente|location-annuelle|location-saisonniere|achat)-[^/]+-\\d+/?$",
    expected_positive_signatures: ["/{slug}-{id}"],
    certified_negative_signatures: ["/", "/contact", "/construction"],
    rationale: "Terminal numeric id alone is too broad; require an explicit transaction prefix observed in listing evidence.",
  },
  {
    source_domain: "immobilier-a-marrakech.com",
    candidate_pattern: "^/produit/[^/]+/\\d+/?$",
    expected_positive_signatures: ["/produit/{slug}/{id}"],
    certified_negative_signatures: [
      "/posts/{slug}/{id}",
      "/posts/cpge-marrakech/{id}",
      "/actualite/{slug}/{id}",
      "/netlinking",
    ],
    rationale: "Dedicated produit namespace separates listings from posts and actualite id-bearing routes.",
  },
  {
    source_domain: "immohammedia.com",
    candidate_pattern: "^/annonces-(?:location|vente|vacances)-[^/]+/[^/]+-[a-z]-\\d+/?$",
    expected_positive_signatures: ["/{slug}/{slug}-{id}"],
    certified_negative_signatures: [
      "/cartes-map",
      "/blog/{slug}",
      "/blog/tag/{slug}",
      "/annonces-vente",
      "/annonces-location",
      "/annonces-vacances",
    ],
    rationale: "Generic two-segment id-bearing shape is ambiguous; require annonces transaction namespace and terminal letter+id marker.",
  },
  {
    source_domain: "leaderimmo.ma",
    candidate_pattern: "^/biens/\\d+/[^/]+/?$",
    expected_positive_signatures: ["/biens/{id}/{slug}"],
    certified_negative_signatures: [
      "/biens",
      "/ville/{id}/bouznika/biens",
      "/ville/{id}/casablanca/biens",
      "/ville/{id}/rabat/biens",
      "/ville/{id}/marrakech/biens",
      "/ville/{id}/fes/biens",
    ],
    rationale: "Dedicated biens detail namespace excludes ville/{id}/.../biens index routes.",
  },
] as const;

export type ShadowReplayDecision = "SHADOW_ACCEPTABLE" | "REJECTED_SHADOW";

export type ShadowReplayResult = {
  source_domain: string;
  candidate_pattern: string;
  positives: number;
  negatives: number;
  ambiguous: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  true_negatives: number;
  matched_ambiguous: number;
  precision: number;
  recall: number;
  decision: ShadowReplayDecision;
  rejection_reasons: string[];
  matched_negative_examples: string[];
  matched_ambiguous_examples: string[];
  missed_positive_examples: string[];
};

function canonicalPath(urlValue: string): string | null {
  try {
    return new URL(urlValue).pathname;
  } catch {
    return null;
  }
}

function isHealthyHtml(record: PatternEvidenceRecord): boolean {
  return record.status === "200" && (record.mime ?? "").toLowerCase().includes("text/html");
}

export function replayPatternProposal(
  proposal: PatternProposal,
  records: PatternEvidenceRecord[],
): ShadowReplayResult {
  const regex = new RegExp(proposal.candidate_pattern, "i");
  const positiveSignatures = new Set(proposal.expected_positive_signatures);
  const negativeSignatures = new Set(proposal.certified_negative_signatures);
  const uniqueByPath = new Map<string, PatternEvidenceRecord>();

  for (const record of records) {
    if (!isHealthyHtml(record)) continue;
    try {
      const url = new URL(record.url);
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (host !== proposal.source_domain) continue;
      url.hash = "";
      const path = url.pathname;
      if (!uniqueByPath.has(path)) {
        uniqueByPath.set(path, { ...record, url: url.toString() });
      }
    } catch {
      // Malformed URL-index rows are ignored; shadow evaluation remains conservative.
    }
  }

  let positives = 0;
  let negatives = 0;
  let ambiguous = 0;
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let trueNegatives = 0;
  let matchedAmbiguous = 0;
  const matchedNegativeExamples: string[] = [];
  const matchedAmbiguousExamples: string[] = [];
  const missedPositiveExamples: string[] = [];

  for (const record of uniqueByPath.values()) {
    const signature = buildPathSignature(record.url);
    if (!signature) continue;
    const path = canonicalPath(record.url);
    if (path == null) continue;
    const matched = regex.test(path);

    if (positiveSignatures.has(signature)) {
      positives += 1;
      if (matched) truePositives += 1;
      else {
        falseNegatives += 1;
        if (missedPositiveExamples.length < 10) missedPositiveExamples.push(record.url);
      }
      continue;
    }

    if (negativeSignatures.has(signature)) {
      negatives += 1;
      if (matched) {
        falsePositives += 1;
        if (matchedNegativeExamples.length < 10) matchedNegativeExamples.push(record.url);
      } else {
        trueNegatives += 1;
      }
      continue;
    }

    ambiguous += 1;
    if (matched) {
      matchedAmbiguous += 1;
      if (matchedAmbiguousExamples.length < 10) matchedAmbiguousExamples.push(record.url);
    }
  }

  const precision = truePositives + falsePositives > 0
    ? truePositives / (truePositives + falsePositives)
    : 0;
  const recall = positives > 0 ? truePositives / positives : 0;
  const rejectionReasons: string[] = [];

  if (positives < 5) rejectionReasons.push("insufficient_positive_corpus");
  if (negatives < 5) rejectionReasons.push("insufficient_negative_corpus");
  if (falsePositives > 0) rejectionReasons.push("false_positive_detected");
  if (matchedAmbiguous > 0) rejectionReasons.push("ambiguous_match_detected");
  if (precision < 1) rejectionReasons.push("precision_below_1");
  if (recall < 0.95) rejectionReasons.push("recall_below_0_95");

  return {
    source_domain: proposal.source_domain,
    candidate_pattern: proposal.candidate_pattern,
    positives,
    negatives,
    ambiguous,
    true_positives: truePositives,
    false_positives: falsePositives,
    false_negatives: falseNegatives,
    true_negatives: trueNegatives,
    matched_ambiguous: matchedAmbiguous,
    precision: Number(precision.toFixed(6)),
    recall: Number(recall.toFixed(6)),
    decision: rejectionReasons.length === 0 ? "SHADOW_ACCEPTABLE" : "REJECTED_SHADOW",
    rejection_reasons: rejectionReasons,
    matched_negative_examples: matchedNegativeExamples,
    matched_ambiguous_examples: matchedAmbiguousExamples,
    missed_positive_examples: missedPositiveExamples,
  };
}
