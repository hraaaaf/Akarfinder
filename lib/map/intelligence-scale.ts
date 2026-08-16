export type IntelligenceMode = "price" | "density" | "listings";
export type ReliabilityState = "insufficient" | "limited" | "moderate" | "strong";

export type IntelligenceScaleInput = {
  zoneId: string;
  value: number | null;
  reliability?: ReliabilityState | null;
};

export type IntelligenceScaleClass = {
  zoneId: string;
  value: number | null;
  neutral: boolean;
  classIndex: number | null;
};

export type IntelligenceLegend = {
  mode: IntelligenceMode;
  method: "snapshot_quantiles_v1";
  availableCount: number;
  classCount: number;
  thresholds: number[];
  min: number | null;
  max: number | null;
};

export type IntelligenceScaleResult = {
  legend: IntelligenceLegend;
  classes: IntelligenceScaleClass[];
};

function isUsable(input: IntelligenceScaleInput, mode: IntelligenceMode): boolean {
  if (input.value == null || !Number.isFinite(input.value) || input.value < 0) return false;
  if (mode === "price" && (input.value <= 0 || !input.reliability || input.reliability === "insufficient")) return false;
  return true;
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) throw new Error("quantile requires a non-empty array");
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function uniqueAscending(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

export function buildIntelligenceScale(
  mode: IntelligenceMode,
  inputs: readonly IntelligenceScaleInput[],
  requestedClassCount = 4,
): IntelligenceScaleResult {
  if (!Number.isInteger(requestedClassCount) || requestedClassCount < 1 || requestedClassCount > 7) {
    throw new Error(`requestedClassCount must be an integer between 1 and 7, got ${requestedClassCount}`);
  }

  const usableInputs = inputs.filter((input) => isUsable(input, mode));
  const sortedValues = usableInputs.map((input) => input.value as number).sort((a, b) => a - b);
  const distinctValues = uniqueAscending(sortedValues);
  const classCount = Math.min(requestedClassCount, distinctValues.length);

  const thresholds = classCount <= 1
    ? []
    : uniqueAscending(
        Array.from({ length: classCount - 1 }, (_, index) => quantile(sortedValues, (index + 1) / classCount)),
      );

  const effectiveClassCount = sortedValues.length ? thresholds.length + 1 : 0;

  const classes = inputs.map((input): IntelligenceScaleClass => {
    if (!isUsable(input, mode)) {
      return { zoneId: input.zoneId, value: input.value, neutral: true, classIndex: null };
    }
    const value = input.value as number;
    const classIndex = thresholds.findIndex((threshold) => value <= threshold);
    return {
      zoneId: input.zoneId,
      value,
      neutral: false,
      classIndex: classIndex === -1 ? thresholds.length : classIndex,
    };
  });

  return {
    legend: {
      mode,
      method: "snapshot_quantiles_v1",
      availableCount: sortedValues.length,
      classCount: effectiveClassCount,
      thresholds,
      min: sortedValues.length ? sortedValues[0] : null,
      max: sortedValues.length ? sortedValues[sortedValues.length - 1] : null,
    },
    classes,
  };
}
