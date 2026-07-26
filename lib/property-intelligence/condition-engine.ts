import { calculateConfidence } from "./confidence";
import type { ExtractedFeature } from "./rule-engine";

const RULES = [
  ["vefa", [/\bvefa\b/i, /vente en l.?etat futur/i, /en cours de construction/i, /livraison\s+20\d{2}/i]],
  ["new_delivered", [/jamais habite/i, /jamais habité/i, /neuf livre/i, /neuf livré/i, /premiere main/i, /première main/i, /nouvelle construction/i]],
  ["recent", [/\brecent\b/i, /\brécent\b/i, /construction recente/i, /construction récente/i]],
  ["renovated_old", [/entierement renove/i, /entièrement rénové/i, /refait a neuf/i, /refait à neuf/i, /renove avec gout/i, /rénové avec goût/i]],
  ["good_condition", [/bon etat/i, /bon état/i, /tres bon etat/i, /très bon état/i, /excellent etat/i, /excellent état/i]],
  ["needs_refresh", [/a rafraichir/i, /à rafraîchir/i, /rafraichissement/i, /rafraîchissement/i]],
  ["needs_renovation", [/a renover/i, /à rénover/i, /travaux a prevoir/i, /travaux à prévoir/i, /gros travaux/i]],
  ["old_unspecified", [/\bancien\b/i, /ancienne construction/i]],
] as const;

type ConditionInput = {
  title?: string | null;
  description?: string | null;
  condition?: string | null;
  propertyAgeRange?: string | null;
  sourceReliability?: number;
};

export function extractConditionFeature(input: ConditionInput): ExtractedFeature {
  const reliability = input.sourceReliability ?? 0.8;
  const condition = input.condition?.trim() ?? "";
  const text = [input.title, input.description, condition, input.propertyAgeRange].filter(Boolean).join(" ");

  const structuredHit = RULES.find(([, patterns]) => patterns.some((pattern) => pattern.test(condition)));
  if (structuredHit) {
    const confidence = calculateConfidence({ supporting: ["structured"], sourceReliability: reliability });
    return { key: "condition.segment", value: structuredHit[0], confidence: confidence.confidence, status: "observed", method: "structured_source", evidence: ["condition"] };
  }

  if (input.propertyAgeRange) {
    const age = input.propertyAgeRange.trim();
    const value = ["1-5 ans", "5-10 ans"].includes(age)
      ? "recent"
      : ["10-20 ans", "20-30 ans", "30+ ans"].includes(age)
        ? "old_unspecified"
        : null;
    if (value) {
      const confidence = calculateConfidence({ supporting: ["structured"], sourceReliability: reliability });
      return { key: "condition.segment", value, confidence: confidence.confidence, status: "observed", method: "structured_source", evidence: ["property_age_range"] };
    }
  }

  const hits = RULES.filter(([, patterns]) => patterns.some((pattern) => pattern.test(text))).map(([value]) => value);
  const unique = [...new Set(hits)];
  if (unique.length === 0) return { key: "condition.segment", value: "unknown", confidence: 0.1, status: "unknown", method: "rule_engine_v2", evidence: [] };

  const confidence = calculateConfidence({
    supporting: ["explicit_text"],
    contradicting: unique.length > 1 ? ["explicit_text"] : [],
    sourceReliability: reliability,
  });
  return {
    key: "condition.segment",
    value: unique.length === 1 ? unique[0] : null,
    confidence: confidence.confidence,
    status: confidence.conflicted ? "conflicted" : "inferred",
    method: "rule_engine_v2",
    evidence: unique.map((value) => `condition:${value}`),
  };
}
