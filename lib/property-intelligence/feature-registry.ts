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

export const ORIENTATIONS = ["north", "north_east", "east", "south_east", "south", "south_west", "west", "north_west"] as const;
export const VIEW_TYPES = ["sea", "golf", "mountain", "garden", "pool", "city", "open", "courtyard"] as const;

const BOOLEAN_METHODS = ["structured_source", "rule_engine_v2"] as const;
const BOOLEAN_FEATURE = (key: string, family: FeatureFamily = "equipment"): FeatureDefinition => ({
  key, family, valueType: "boolean", publicConfidenceThreshold: 0.85,
  scoreEligibleConfidenceThreshold: 0.75, maxAgeDays: 120,
  methods: BOOLEAN_METHODS, publicEligible: true,
});

export const FEATURE_REGISTRY = {
  "condition.segment": {
    key: "condition.segment", family: "condition", valueType: "enum",
    allowedValues: PROPERTY_CONDITIONS, publicConfidenceThreshold: 0.8,
    scoreEligibleConfidenceThreshold: 0.7, maxAgeDays: 180,
    methods: ["structured_source", "rule_engine_v1", "rule_engine_v2"], publicEligible: true,
  },
  "standing.level": {
    key: "standing.level", family: "standing", valueType: "enum",
    allowedValues: STANDING_LEVELS, publicConfidenceThreshold: 0.85,
    scoreEligibleConfidenceThreshold: 0.75, maxAgeDays: 180,
    methods: ["structured_source", "rule_engine_v1", "rule_engine_v2"], publicEligible: true,
  },
  "equipment.pool": BOOLEAN_FEATURE("equipment.pool"),
  "equipment.elevator": BOOLEAN_FEATURE("equipment.elevator"),
  "equipment.parking": BOOLEAN_FEATURE("equipment.parking"),
  "equipment.air_conditioning": BOOLEAN_FEATURE("equipment.air_conditioning"),
  "equipment.heating": BOOLEAN_FEATURE("equipment.heating"),
  "equipment.terrace": BOOLEAN_FEATURE("equipment.terrace"),
  "equipment.balcony": BOOLEAN_FEATURE("equipment.balcony"),
  "equipment.garden": BOOLEAN_FEATURE("equipment.garden"),
  "equipment.rooftop": BOOLEAN_FEATURE("equipment.rooftop"),
  "equipment.concierge": BOOLEAN_FEATURE("equipment.concierge"),
  "equipment.security": BOOLEAN_FEATURE("equipment.security"),
  "equipment.gym": BOOLEAN_FEATURE("equipment.gym"),
  "equipment.spa": BOOLEAN_FEATURE("equipment.spa"),
  "equipment.smart_home": BOOLEAN_FEATURE("equipment.smart_home"),
  "equipment.furnished": BOOLEAN_FEATURE("equipment.furnished"),
  "environment.calm": BOOLEAN_FEATURE("environment.calm", "environment"),
  "environment.bright": BOOLEAN_FEATURE("environment.bright", "environment"),
  "environment.no_overlook": BOOLEAN_FEATURE("environment.no_overlook", "environment"),
  "environment.seafront": BOOLEAN_FEATURE("environment.seafront", "environment"),
  "environment.view": {
    key: "environment.view", family: "environment", valueType: "string_array",
    allowedValues: VIEW_TYPES, publicConfidenceThreshold: 0.85,
    scoreEligibleConfidenceThreshold: 0.75, maxAgeDays: 120,
    methods: ["rule_engine_v1", "rule_engine_v2"], publicEligible: true,
  },
  "environment.orientation": {
    key: "environment.orientation", family: "environment", valueType: "enum",
    allowedValues: ORIENTATIONS, publicConfidenceThreshold: 0.9,
    scoreEligibleConfidenceThreshold: 0.8, maxAgeDays: 180,
    methods: ["structured_source", "rule_engine_v2"], publicEligible: true,
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
  if (definition.valueType === "boolean") return typeof value === "boolean";
  if (definition.valueType === "number") return typeof value === "number" && Number.isFinite(value);
  if (definition.valueType === "string") return typeof value === "string";
  if (definition.valueType === "string_array") {
    return Array.isArray(value)
      && value.every((item) => typeof item === "string")
      && (!definition.allowedValues || value.every((item) => definition.allowedValues?.includes(item)));
  }
  if (definition.valueType === "enum") {
    return typeof value === "string" && (!definition.allowedValues || definition.allowedValues.includes(value));
  }
  return false;
}
