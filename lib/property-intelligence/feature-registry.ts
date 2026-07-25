export type FeatureValueType = "boolean" | "number" | "string" | "enum" | "string_array";
export type FeatureFamily =
  | "identity" | "geometry" | "distribution" | "condition" | "standing"
  | "equipment" | "environment" | "neighborhood" | "history"
  | "reliability" | "market_value" | "intelligence";

export type FeatureDefinition = {
  key: string;
  family: FeatureFamily;
  valueType: FeatureValueType;
  allowedValues?: readonly string[];
  publicConfidenceThreshold: number;
  scoreEligibleConfidenceThreshold: number;
  maxAgeDays: number | null;
  methods: readonly string[];
  publicEligible: boolean;
};

export const PROPERTY_CONDITIONS = [
  "vefa", "new_delivered", "recent", "renovated_old", "good_condition",
  "needs_refresh", "needs_renovation", "old_unspecified", "unknown",
] as const;

export const STANDING_LEVELS = [
  "economy", "standard", "mid", "high", "luxury", "prestige", "unknown",
] as const;

export const FEATURE_REGISTRY = {
  "condition.segment": {
    key: "condition.segment", family: "condition", valueType: "enum",
    allowedValues: PROPERTY_CONDITIONS, publicConfidenceThreshold: 0.8,
    scoreEligibleConfidenceThreshold: 0.7, maxAgeDays: 180,
    methods: ["structured_source", "rule_engine_v1"], publicEligible: true,
  },
  "standing.level": {
    key: "standing.level", family: "standing", valueType: "enum",
    allowedValues: STANDING_LEVELS, publicConfidenceThreshold: 0.85,
    scoreEligibleConfidenceThreshold: 0.75, maxAgeDays: 180,
    methods: ["structured_source", "rule_engine_v1"], publicEligible: true,
  },
  "equipment.pool": {
    key: "equipment.pool", family: "equipment", valueType: "boolean",
    publicConfidenceThreshold: 0.85, scoreEligibleConfidenceThreshold: 0.75,
    maxAgeDays: 120, methods: ["structured_source", "rule_engine_v1"], publicEligible: true,
  },
  "equipment.elevator": {
    key: "equipment.elevator", family: "equipment", valueType: "boolean",
    publicConfidenceThreshold: 0.85, scoreEligibleConfidenceThreshold: 0.75,
    maxAgeDays: 120, methods: ["structured_source", "rule_engine_v1"], publicEligible: true,
  },
  "equipment.parking": {
    key: "equipment.parking", family: "equipment", valueType: "boolean",
    publicConfidenceThreshold: 0.85, scoreEligibleConfidenceThreshold: 0.75,
    maxAgeDays: 120, methods: ["structured_source", "rule_engine_v1"], publicEligible: true,
  },
  "equipment.air_conditioning": {
    key: "equipment.air_conditioning", family: "equipment", valueType: "boolean",
    publicConfidenceThreshold: 0.85, scoreEligibleConfidenceThreshold: 0.75,
    maxAgeDays: 120, methods: ["structured_source", "rule_engine_v1"], publicEligible: true,
  },
  "environment.view": {
    key: "environment.view", family: "environment", valueType: "string_array",
    publicConfidenceThreshold: 0.85, scoreEligibleConfidenceThreshold: 0.75,
    maxAgeDays: 120, methods: ["rule_engine_v1"], publicEligible: true,
  },
  "reliability.aci": {
    key: "reliability.aci", family: "reliability", valueType: "number",
    publicConfidenceThreshold: 0.8, scoreEligibleConfidenceThreshold: 0.8,
    maxAgeDays: 30, methods: ["score_engine_v1"], publicEligible: true,
  },
  "intelligence.aqi": {
    key: "intelligence.aqi", family: "intelligence", valueType: "number",
    publicConfidenceThreshold: 0.85, scoreEligibleConfidenceThreshold: 0.8,
    maxAgeDays: 30, methods: ["score_engine_v1"], publicEligible: false,
  },
} as const satisfies Record<string, FeatureDefinition>;

export type FeatureKey = keyof typeof FEATURE_REGISTRY;

export function getFeatureDefinition(key: string): FeatureDefinition | null {
  return (FEATURE_REGISTRY as Record<string, FeatureDefinition>)[key] ?? null;
}

export function isValidFeatureValue(key: string, value: unknown): boolean {
  const definition = getFeatureDefinition(key);
  if (!definition) return false;
  if (value === null) return true;
  if (definition.allowedValues && typeof value === "string") return definition.allowedValues.includes(value);
  if (definition.valueType === "boolean") return typeof value === "boolean";
  if (definition.valueType === "number") return typeof value === "number" && Number.isFinite(value);
  if (definition.valueType === "string") return typeof value === "string";
  if (definition.valueType === "string_array") return Array.isArray(value) && value.every((item) => typeof item === "string");
  return definition.valueType === "enum" && typeof value === "string";
}
