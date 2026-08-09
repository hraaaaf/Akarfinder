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
    rationale: "Locale + annonces namespace + explicit ref segment + terminal numeric listing segment.",
  },
  {
    source_domain: "immo-maroc.com",
    candidate_pattern: "^/(?:vente|location-annuelle|location-saisonniere|achat)-[^/]+-\\d+/?$",
    expected_positive_signatures: ["/{slug}-{id}"],
    rationale: "Terminal numeric id alone is too broad; require an explicit transaction prefix observed in listing evidence.",
  },
  {
    source_domain: "immobilier-a-marrakech.com",
    candidate_pattern: "^/produit/[^/]+/\\d+/?$",
    expected_positive_signatures: ["/produit/{slug}/{id}"],
    rationale: "Dedicated produit namespace separates listings from posts and actualite id-bearing routes.",
  },
  {
    source_domain: "immohammedia.com",
    candidate_pattern: "^/annonces-(?:location|vente|vacances)-[^/]+/[^/]+-[a-z]-\\d+/?$",
    expected_positive_signatures: ["/{slug}/{slug}-{id}"],
    rationale: "Generic two-segment id-bearing shape is ambiguous; require annonces transaction namespace and terminal letter+id marker.",
  },
  {
    source_domain: "leaderimmo.ma",
    candidate_pattern: "^/biens/\\d+/[^/]+/?$",
    expected_positive_signatures: ["/biens/{id}/{slug}"],
    rationale: "Dedicated biens detail namespace excludes ville/{id}/.../biens index routes.",
  },
] as const;

export type ShadowReplayDecision = "SHADOW_ACCEPTABLE" | "REJECTED_SHADOW";

export type ShadowReplayResult = {
  source_domain: string;
  candidate_pattern: string;
  positives: number;
  negatives: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  true_negatives: number;
  precision: number;
  recall: number;
  decision: ShadowReplayDecision;
  rejection_reasons: string[];
  matched_negative_examples: string[];
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
  const expected = new Set(proposal.expected_positive_signatures);
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
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let trueNegatives = 0;
  const matchedNegativeExamples: string[] = [];
  const missedPositiveExamples: string[] = [];

  for (const record of uniqueByPath.values()) {
    const signature = buildPathSignature(record.url);
    if (!signature) continue;
    const positive = expected.has(signature);
    const path = canonicalPath(record.url);
    if (path == null) continue;
    const matched = regex.test(path);

    if (positive) {
      positives += 1;
      if (matched) truePositives += 1;
      else {
        falseNegatives += 1;
        if (missedPositiveExamples.length < 10) missedPositiveExamples.push(record.url);
      }
    } else {
      negatives += 1;
      if (matched) {
        falsePositives += 1;
        if (matchedNegativeExamples.length < 10) matchedNegativeExamples.push(record.url);
      } else {
        trueNegatives += 1;
      }
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
  if (precision < 1) rejectionReasons.push("precision_below_1");
  if (recall < 0.95) rejectionReasons.push("recall_below_0_95");

  return {
    source_domain: proposal.source_domain,
    candidate_pattern: proposal.candidate_pattern,
    positives,
    negatives,
    true_positives: truePositives,
    false_positives: falsePositives,
    false_negatives: falseNegatives,
    true_negatives: trueNegatives,
    precision: Number(precision.toFixed(6)),
    recall: Number(recall.toFixed(6)),
    decision: rejectionReasons.length === 0 ? "SHADOW_ACCEPTABLE" : "REJECTED_SHADOW",
    rejection_reasons: rejectionReasons,
    matched_negative_examples: matchedNegativeExamples,
    missed_positive_examples: missedPositiveExamples,
  };
}
