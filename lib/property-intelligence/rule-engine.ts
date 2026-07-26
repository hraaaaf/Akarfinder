import { calculateConfidence } from "./confidence";
import { STANDING_LEVELS, type FeatureKey } from "./feature-registry";

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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const phrase = (...values: string[]) => new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${values.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}])`,
  "u",
);
const contains = (text: string, patterns: readonly RegExp[]) => patterns.some((pattern) => pattern.test(text));
const removePatterns = (text: string, patterns: readonly RegExp[]) => patterns.reduce(
  (current, pattern) => current.replace(new RegExp(pattern.source, `${pattern.flags}g`), " "),
  text,
);

function explicitBoolean(rule: BooleanRule, text: string, sourceReliability: number): ExtractedFeature {
  const hasNegative = contains(text, rule.negative);
  const hasPositive = contains(removePatterns(text, rule.negative), rule.positive);

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
  { key: "equipment.pool", positive: [phrase("piscine", "swimming pool", "حمام سباحة", "مسبح")], negative: [phrase("sans piscine", "pas de piscine", "aucune piscine", "بدون مسبح")] },
  { key: "equipment.elevator", positive: [phrase("ascenseur", "elevator", "مصعد")], negative: [phrase("sans ascenseur", "pas d ascenseur", "aucun ascenseur", "بدون مصعد")] },
  { key: "equipment.parking", positive: [phrase("parking", "garage", "place au sous sol", "stationnement", "كراج", "مراب")], negative: [phrase("sans parking", "sans garage", "pas de parking", "aucun parking", "بدون كراج", "بدون مراب")] },
  { key: "equipment.air_conditioning", positive: [phrase("climatisation", "climatise", "air conditionne", "clim reversible", "تكييف", "مكيف")], negative: [phrase("sans climatisation", "non climatise", "pas de climatisation", "بدون تكييف")] },
  { key: "equipment.heating", positive: [phrase("chauffage", "chauffage central", "chauffage au sol", "تدفئة")], negative: [phrase("sans chauffage", "pas de chauffage", "بدون تدفئة")] },
  { key: "equipment.terrace", positive: [phrase("terrasse", "terrasse privative", "تراس", "سطح خاص")], negative: [phrase("sans terrasse", "pas de terrasse", "بدون تراس")] },
  { key: "equipment.balcony", positive: [phrase("balcon", "balcony", "شرفة")], negative: [phrase("sans balcon", "pas de balcon", "بدون شرفة")] },
  { key: "equipment.garden", positive: [phrase("jardin privatif", "jardin prive", "private garden", "حديقة خاصة")], negative: [phrase("sans jardin", "pas de jardin", "بدون حديقة")] },
  { key: "equipment.rooftop", positive: [phrase("rooftop", "toit terrasse", "terrasse sur le toit", "روف توب")], negative: [phrase("sans rooftop", "pas de rooftop")] },
  { key: "equipment.concierge", positive: [phrase("concierge", "conciergerie", "gardien", "حارس")], negative: [phrase("sans concierge", "sans gardien", "pas de gardien", "بدون حارس")] },
  { key: "equipment.security", positive: [phrase("securise", "securisee", "securite 24 24", "surveillance", "videosurveillance", "حراسة", "مراقبة")], negative: [phrase("non securise", "sans securite", "pas de surveillance", "بدون حراسة")] },
  { key: "equipment.gym", positive: [phrase("salle de sport", "fitness", "gym", "صالة رياضية")], negative: [phrase("sans salle de sport", "pas de salle de sport", "بدون صالة رياضية")] },
  { key: "equipment.spa", positive: [phrase("spa", "hammam", "sauna", "حمام", "سبا")], negative: [phrase("sans spa", "sans hammam", "pas de spa", "بدون سبا")] },
  { key: "equipment.smart_home", positive: [phrase("domotique", "maison connectee", "smart home", "منزل ذكي")], negative: [phrase("sans domotique", "pas de domotique")] },
  { key: "equipment.furnished", positive: [phrase("meuble", "meublee", "furnished", "مفروش")], negative: [phrase("non meuble", "non meublee", "sans meubles", "غير مفروش")] },
  { key: "environment.calm", positive: [phrase("calme", "tranquille", "quartier paisible", "هادئ")], negative: [phrase("bruyant", "tres bruyant", "nuisances sonores", "صاخب")] },
  { key: "environment.bright", positive: [phrase("lumineux", "lumineuse", "tres eclaire", "ensoleille", "مشمس", "مضيء")], negative: [phrase("sombre", "peu lumineux", "manque de lumiere", "مظلم")] },
  { key: "environment.no_overlook", positive: [phrase("sans vis a vis", "aucun vis a vis", "vue degagee", "دون مقابل")], negative: [phrase("avec vis a vis", "fort vis a vis")] },
  { key: "environment.seafront", positive: [phrase("front de mer", "pieds dans l eau", "premiere ligne mer", "على البحر مباشرة")], negative: [phrase("pas en front de mer", "loin de la mer")] },
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

function extractStanding(text: string, structured: Record<string, unknown>, reliability: number): ExtractedFeature {
  if (typeof structured.standing_level === "string") {
    const value = normalize(structured.standing_level);
    if ((STANDING_LEVELS as readonly string[]).includes(value)) {
      const result = calculateConfidence({ supporting: ["structured"], sourceReliability: reliability });
      return { key: "standing.level", value, confidence: result.confidence, status: "observed", method: "structured_source", evidence: ["standing_level"] };
    }
  }

  const candidates = [
    ["prestige", [phrase("prestige", "ultra premium", "exceptionnel", "استثنائي", "استثنائية")]],
    ["luxury", [phrase("luxe", "luxueux", "luxueuse", "luxury", "فاخر", "فاخرة")]],
    ["high", [phrase("haut standing", "high standing", "راقي", "راقية")]],
    ["mid", [phrase("moyen standing", "mid standing", "متوسط راقي", "متوسطة راقية")]],
    ["economy", [phrase("economique", "social", "اقتصادي", "اقتصادية")]],
    ["standard", [phrase("standard", "standing normal", "عادي", "عادية")]],
  ] as const;
  const matches = candidates.filter(([, patterns]) => contains(text, patterns)).map(([value]) => value);
  const unique = [...new Set(matches)];
  if (unique.length === 0) return { key: "standing.level", value: "unknown", confidence: 0.1, status: "unknown", method: "rule_engine_v2", evidence: [] };
  const result = calculateConfidence({ supporting: ["explicit_text"], contradicting: unique.length > 1 ? ["explicit_text"] : [], sourceReliability: reliability });
  return { key: "standing.level", value: unique.length === 1 ? unique[0] : null, confidence: result.confidence, status: result.conflicted ? "conflicted" : "inferred", method: "rule_engine_v2", evidence: unique.map((value) => `standing:${value}`) };
}

function extractOrientation(text: string, reliability: number): ExtractedFeature {
  const hasOrientationContext = contains(text, [phrase("orientation", "double orientation", "expose", "exposition", "واجهة")]);
  const candidates = [
    ["north_east", [phrase("nord est", "north east", "شمال شرقي")]],
    ["south_east", [phrase("sud est", "south east", "جنوب شرقي")]],
    ["south_west", [phrase("sud ouest", "south west", "جنوب غربي")]],
    ["north_west", [phrase("nord ouest", "north west", "شمال غربي")]],
    ["north", [phrase("expose nord", "orientation nord", "شمالي"), ...(hasOrientationContext ? [phrase("nord")] : [])]],
    ["south", [phrase("expose sud", "orientation sud", "قبلي", "جنوبي"), ...(hasOrientationContext ? [phrase("sud")] : [])]],
    ["east", [phrase("expose est", "orientation est", "شرقي"), ...(hasOrientationContext ? [phrase("est")] : [])]],
    ["west", [phrase("expose ouest", "orientation ouest", "غربي"), ...(hasOrientationContext ? [phrase("ouest")] : [])]],
  ] as const;
  const unique = [...new Set(candidates.filter(([, patterns]) => contains(text, patterns)).map(([value]) => value))];
  if (unique.length === 0) return { key: "environment.orientation", value: null, confidence: 0.1, status: "unknown", method: "rule_engine_v2", evidence: [] };
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
  for (const rule of BOOLEAN_RULES) if (!existing.has(rule.key)) output.push(explicitBoolean(rule, text, reliability));

  const views = [
    ["sea", phrase("vue mer", "sea view", "اطلالة بحرية")], ["golf", phrase("vue golf", "sur golf")],
    ["mountain", phrase("vue montagne", "اطلالة جبلية")], ["garden", phrase("vue jardin", "اطلالة على الحديقة")],
    ["pool", phrase("vue piscine", "اطلالة على المسبح")], ["city", phrase("vue ville", "vue urbaine", "اطلالة على المدينة")],
    ["open", phrase("vue degagee", "panoramique", "اطلالة مفتوحة")], ["courtyard", phrase("vue cour", "cour interieure")],
  ] as const;
  const matchedViews = [...new Set(views.filter(([, pattern]) => pattern.test(text)).map(([value]) => value))];
  const titleHasView = views.some(([value, pattern]) => matchedViews.includes(value) && pattern.test(title));
  const viewConfidence = calculateConfidence({ supporting: matchedViews.length ? [titleHasView ? "title" : "explicit_text"] : [], sourceReliability: reliability });
  output.push({ key: "environment.view", value: matchedViews.length ? matchedViews : null, confidence: viewConfidence.confidence, status: matchedViews.length ? "inferred" : "unknown", method: "rule_engine_v2", evidence: matchedViews.map((value) => `view:${value}`) });

  if (typeof structured.orientation === "string") {
    const value = normalize(structured.orientation);
    const result = calculateConfidence({ supporting: ["structured"], sourceReliability: reliability });
    output.push({ key: "environment.orientation", value, confidence: result.confidence, status: "observed", method: "structured_source", evidence: ["orientation"] });
  } else output.push(extractOrientation(text, reliability));

  output.push(extractStanding(text, structured, reliability));
  return output;
}
