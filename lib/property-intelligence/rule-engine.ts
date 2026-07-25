import { calculateConfidence, type EvidenceStrength } from "./confidence";
import type { FeatureKey } from "./feature-registry";

export type RuleInput = {
  title?: string | null;
  description?: string | null;
  structured?: Record<string, unknown>;
  sourceReliability?: number;
};

export type ExtractedFeature = {
  key: FeatureKey;
  value: unknown;
  confidence: number;
  status: "observed" | "inferred" | "unknown" | "conflicted";
  method: "structured_source" | "rule_engine_v1";
  evidence: string[];
};

const normalize = (value: string) => value
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/\s+/g, " ").trim();

function explicitBoolean(
  key: FeatureKey,
  text: string,
  positive: RegExp,
  negative: RegExp,
  sourceReliability: number,
): ExtractedFeature {
  const hasPositive = positive.test(text);
  const hasNegative = negative.test(text);
  if (!hasPositive && !hasNegative) {
    return { key, value: null, confidence: 0.1, status: "unknown", method: "rule_engine_v1", evidence: [] };
  }
  const strengths: EvidenceStrength[] = ["explicit_text"];
  const result = calculateConfidence({
    supporting: strengths,
    contradicting: hasPositive && hasNegative ? ["explicit_text"] : [],
    sourceReliability,
  });
  return {
    key,
    value: hasPositive && !hasNegative ? true : hasNegative && !hasPositive ? false : null,
    confidence: result.confidence,
    status: result.conflicted ? "conflicted" : "inferred",
    method: "rule_engine_v1",
    evidence: [hasPositive ? "positive_phrase" : "", hasNegative ? "negative_phrase" : ""].filter(Boolean),
  };
}

export function extractPropertyFeatures(input: RuleInput): ExtractedFeature[] {
  const text = normalize(`${input.title ?? ""} ${input.description ?? ""}`);
  const reliability = input.sourceReliability ?? 0.8;
  const structured = input.structured ?? {};
  const output: ExtractedFeature[] = [];

  const structuredMap: Array<[FeatureKey, string]> = [
    ["equipment.pool", "has_pool"],
    ["equipment.elevator", "has_elevator"],
    ["equipment.parking", "has_parking"],
    ["equipment.air_conditioning", "has_air_conditioning"],
  ];
  for (const [key, sourceKey] of structuredMap) {
    if (typeof structured[sourceKey] === "boolean") {
      const result = calculateConfidence({ supporting: ["structured"], sourceReliability: reliability });
      output.push({ key, value: structured[sourceKey], confidence: result.confidence, status: "observed", method: "structured_source", evidence: [sourceKey] });
    }
  }

  const existing = new Set(output.map((item) => item.key));
  const booleanRules: Array<[FeatureKey, RegExp, RegExp]> = [
    ["equipment.pool", /\b(piscine|swimming pool)\b/, /\b(sans piscine|pas de piscine)\b/],
    ["equipment.elevator", /\b(ascenseur|elevator)\b/, /\b(sans ascenseur|pas d ascenseur)\b/],
    ["equipment.parking", /\b(parking|garage|place au sous sol)\b/, /\b(sans parking|sans garage|pas de parking)\b/],
    ["equipment.air_conditioning", /\b(climatisation|climatise|air conditionne)\b/, /\b(sans climatisation|non climatise)\b/],
  ];
  for (const [key, positive, negative] of booleanRules) {
    if (!existing.has(key)) output.push(explicitBoolean(key, text, positive, negative, reliability));
  }

  const views = [
    ["mer", /\b(vue mer|front de mer)\b/],
    ["golf", /\b(vue golf|sur golf)\b/],
    ["montagne", /\b(vue montagne)\b/],
    ["jardin", /\b(vue jardin)\b/],
    ["piscine", /\b(vue piscine)\b/],
    ["ville", /\b(vue ville|vue urbaine)\b/],
  ] as const;
  const matchedViews = views.filter(([, pattern]) => pattern.test(text)).map(([value]) => value);
  const viewConfidence = calculateConfidence({ supporting: matchedViews.length ? ["explicit_text"] : [], sourceReliability: reliability });
  output.push({
    key: "environment.view", value: matchedViews.length ? matchedViews : null,
    confidence: viewConfidence.confidence, status: matchedViews.length ? "inferred" : "unknown",
    method: "rule_engine_v1", evidence: matchedViews.map((value) => `view:${value}`),
  });

  return output;
}
