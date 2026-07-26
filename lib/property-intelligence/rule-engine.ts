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
  method: "structured_source" | "rule_engine_v2";
  evidence: string[];
};

type BooleanRule = {
  key: FeatureKey;
  positive: readonly RegExp[];
  negative: readonly RegExp[];
};

const normalize = (value: string) => value
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[’']/g, " ")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .replace(/\s+/g, " ").trim();

const contains = (text: string, patterns: readonly RegExp[]) => patterns.some((pattern) => pattern.test(text));

function explicitBoolean(
  rule: BooleanRule,
  text: string,
  sourceReliability: number,
): ExtractedFeature {
  const hasNegative = contains(text, rule.negative);
  const textWithoutNegativePhrases = rule.negative.reduce((current, pattern) => current.replace(pattern, " "), text);
  const hasPositive = contains(textWithoutNegativePhrases, rule.positive);

  if (!hasPositive && !hasNegative) {
    return { key: rule.key, value: null, confidence: 0.1, status: "unknown", method: "rule_engine_v2", evidence: [] };
  }

  const result = calculateConfidence({
    supporting: ["explicit_text"],
    contradicting: hasPositive && hasNegative ? ["explicit_text"] : [],
    sourceReliability,
  });

  return {
    key: rule.key,
    value: hasPositive && !hasNegative ? true : hasNegative && !hasPositive ? false : null,
    confidence: result.confidence,
    status: result.conflicted ? "conflicted" : "inferred",
    method: "rule_engine_v2",
    evidence: [hasPositive ? "positive_phrase" : "", hasNegative ? "negative_phrase" : ""].filter(Boolean),
  };
}

const BOOLEAN_RULES: readonly BooleanRule[] = [
  { key: "equipment.pool", positive: [/\b(piscine|swimming pool|حمام سباحة|مسبح)\b/], negative: [/\b(sans piscine|pas de piscine|aucune piscine|بدون مسبح)\b/g] },
  { key: "equipment.elevator", positive: [/\b(ascenseur|elevator|مصعد)\b/], negative: [/\b(sans ascenseur|pas d ascenseur|aucun ascenseur|بدون مصعد)\b/g] },
  { key: "equipment.parking", positive: [/\b(parking|garage|place au sous sol|stationnement|كراج|مراب)\b/], negative: [/\b(sans parking|sans garage|pas de parking|aucun parking|بدون كراج|بدون مراب)\b/g] },
  { key: "equipment.air_conditioning", positive: [/\b(climatisation|climatise|air conditionne|clim reversible|تكييف|مكيف)\b/], negative: [/\b(sans climatisation|non climatise|pas de climatisation|بدون تكييف)\b/g] },
  { key: "equipment.heating", positive: [/\b(chauffage|chauffage central|chauffage au sol|تدفئة)\b/], negative: [/\b(sans chauffage|pas de chauffage|بدون تدفئة)\b/g] },
  { key: "equipment.terrace", positive: [/\b(terrasse|terrasse privative|تراس|سطح خاص)\b/], negative: [/\b(sans terrasse|pas de terrasse|بدون تراس)\b/g] },
  { key: "equipment.balcony", positive: [/\b(balcon|balcony|شرفة)\b/], negative: [/\b(sans balcon|pas de balcon|بدون شرفة)\b/g] },
  { key: "equipment.garden", positive: [/\b(jardin privatif|jardin prive|private garden|حديقة خاصة)\b/], negative: [/\b(sans jardin|pas de jardin|بدون حديقة)\b/g] },
  { key: "equipment.rooftop", positive: [/\b(rooftop|toit terrasse|terrasse sur le toit|روف توب)\b/], negative: [/\b(sans rooftop|pas de rooftop)\b/g] },
  { key: "equipment.concierge", positive: [/\b(concierge|conciergerie|gardien|حارس)\b/], negative: [/\b(sans concierge|sans gardien|pas de gardien|بدون حارس)\b/g] },
  { key: "equipment.security", positive: [/\b(securise|securisee|securite 24 24|surveillance|videosurveillance|حراسة|مراقبة)\b/], negative: [/\b(non securise|sans securite|pas de surveillance|بدون حراسة)\b/g] },
  { key: "equipment.gym", positive: [/\b(salle de sport|fitness|gym|صالة رياضية)\b/], negative: [/\b(sans salle de sport|pas de salle de sport|بدون صالة رياضية)\b/g] },
  { key: "equipment.spa", positive: [/\b(spa|hammam|sauna|حمام|سبا)\b/], negative: [/\b(sans spa|sans hammam|pas de spa|بدون سبا)\b/g] },
  { key: "equipment.smart_home", positive: [/\b(domotique|maison connectee|smart home|منزل ذكي)\b/], negative: [/\b(sans domotique|pas de domotique)\b/g] },
  { key: "equipment.furnished", positive: [/\b(meuble|meublee|furnished|مفروش)\b/], negative: [/\b(non meuble|non meublee|sans meubles|غير مفروش)\b/g] },
  { key: "environment.calm", positive: [/\b(calme|tranquille|quartier paisible|هادئ)\b/], negative: [/\b(bruyant|tres bruyant|nuisances sonores|صاخب)\b/g] },
  { key: "environment.bright", positive: [/\b(lumineux|lumineuse|tres eclaire|ensoleille|مشمس|مضيء)\b/], negative: [/\b(sombre|peu lumineux|manque de lumiere|مظلم)\b/g] },
  { key: "environment.no_overlook", positive: [/\b(sans vis a vis|aucun vis a vis|vue degagee|دون مقابل)\b/], negative: [/\b(avec vis a vis|fort vis a vis)\b/g] },
  { key: "environment.seafront", positive: [/\b(front de mer|pieds dans l eau|premiere ligne mer|على البحر مباشرة)\b/], negative: [/\b(pas en front de mer|loin de la mer)\b/g] },
];

const STRUCTURED_MAP: readonly [FeatureKey, string][] = [
  ["equipment.pool", "has_pool"], ["equipment.elevator", "has_elevator"],
  ["equipment.parking", "has_parking"], ["equipment.air_conditioning", "has_air_conditioning"],
  ["equipment.heating", "has_heating"], ["equipment.terrace", "has_terrace"],
  ["equipment.balcony", "has_balcony"], ["equipment.garden", "has_garden"],
  ["equipment.rooftop", "has_rooftop"], ["equipment.concierge", "has_concierge"],
  ["equipment.security", "has_security"], ["equipment.gym", "has_gym"],
  ["equipment.spa", "has_spa"], ["equipment.smart_home", "has_smart_home"],
  ["equipment.furnished", "is_furnished"], ["environment.calm", "is_calm"],
  ["environment.bright", "is_bright"], ["environment.no_overlook", "has_no_overlook"],
  ["environment.seafront", "is_seafront"],
];

function extractOrientation(text: string, reliability: number): ExtractedFeature {
  const candidates = [
    ["north_east", /\b(nord est|north east|شمال شرقي)\b/],
    ["south_east", /\b(sud est|south east|جنوب شرقي)\b/],
    ["south_west", /\b(sud ouest|south west|جنوب غربي)\b/],
    ["north_west", /\b(nord ouest|north west|شمال غربي)\b/],
    ["north", /\b(expose nord|orientation nord|شمالي)\b/],
    ["south", /\b(expose sud|orientation sud|قبلي|جنوبي)\b/],
    ["east", /\b(expose est|orientation est|شرقي)\b/],
    ["west", /\b(expose ouest|orientation ouest|غربي)\b/],
  ] as const;
  const matches = candidates.filter(([, pattern]) => pattern.test(text)).map(([value]) => value);
  if (matches.length === 0) return { key: "environment.orientation", value: null, confidence: 0.1, status: "unknown", method: "rule_engine_v2", evidence: [] };
  const unique = [...new Set(matches)];
  const result = calculateConfidence({ supporting: ["explicit_text"], contradicting: unique.length > 1 ? ["explicit_text"] : [], sourceReliability: reliability });
  return { key: "environment.orientation", value: unique.length === 1 ? unique[0] : null, confidence: result.confidence, status: result.conflicted ? "conflicted" : "inferred", method: "rule_engine_v2", evidence: unique.map((value) => `orientation:${value}`) };
}

export function extractPropertyFeatures(input: RuleInput): ExtractedFeature[] {
  const title = normalize(input.title ?? "");
  const body = normalize(input.description ?? "");
  const text = `${title} ${body}`.trim();
  const reliability = input.sourceReliability ?? 0.8;
  const structured = input.structured ?? {};
  const output: ExtractedFeature[] = [];

  for (const [key, sourceKey] of STRUCTURED_MAP) {
    if (typeof structured[sourceKey] === "boolean") {
      const result = calculateConfidence({ supporting: ["structured"], sourceReliability: reliability });
      output.push({ key, value: structured[sourceKey], confidence: result.confidence, status: "observed", method: "structured_source", evidence: [sourceKey] });
    }
  }

  const existing = new Set(output.map((item) => item.key));
  for (const rule of BOOLEAN_RULES) {
    if (!existing.has(rule.key)) output.push(explicitBoolean(rule, text, reliability));
  }

  const views = [
    ["sea", /\b(vue mer|sea view|اطلالة بحرية)\b/], ["golf", /\b(vue golf|sur golf)\b/],
    ["mountain", /\b(vue montagne|اطلالة جبلية)\b/], ["garden", /\b(vue jardin|اطلالة على الحديقة)\b/],
    ["pool", /\b(vue piscine|اطلالة على المسبح)\b/], ["city", /\b(vue ville|vue urbaine|اطلالة على المدينة)\b/],
    ["open", /\b(vue degagee|panoramique|اطلالة مفتوحة)\b/], ["courtyard", /\b(vue cour|cour interieure)\b/],
  ] as const;
  const matchedViews = [...new Set(views.filter(([, pattern]) => pattern.test(text)).map(([value]) => value))];
  const viewConfidence = calculateConfidence({ supporting: matchedViews.length ? [title && matchedViews.some((value) => title.includes(value)) ? "title" : "explicit_text"] : [], sourceReliability: reliability });
  output.push({
    key: "environment.view", value: matchedViews.length ? matchedViews : null,
    confidence: viewConfidence.confidence, status: matchedViews.length ? "inferred" : "unknown",
    method: "rule_engine_v2", evidence: matchedViews.map((value) => `view:${value}`),
  });

  if (typeof structured.orientation === "string") {
    const value = normalize(structured.orientation);
    const result = calculateConfidence({ supporting: ["structured"], sourceReliability: reliability });
    output.push({ key: "environment.orientation", value, confidence: result.confidence, status: "observed", method: "structured_source", evidence: ["orientation"] });
  } else {
    output.push(extractOrientation(text, reliability));
  }

  return output;
}
