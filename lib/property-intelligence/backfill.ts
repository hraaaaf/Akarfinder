import { extractConditionFeature } from "./condition-engine";
import { extractPropertyFeatures, type ExtractedFeature } from "./rule-engine";

export type BackfillListing = {
  cursor: string;
  canonicalPropertyId: string;
  title?: string | null;
  description?: string | null;
  structured?: Record<string, unknown>;
  sourceReliability?: number;
  sourceObservationIds?: string[];
};

export type BackfillPage = {
  rows: BackfillListing[];
  nextCursor: string | null;
};

export type BackfillFeatureWrite = {
  canonicalPropertyId: string;
  feature: ExtractedFeature;
  methodologyVersion: string;
  inputSnapshot: string;
  sourceObservationIds: string[];
};

export type BackfillDependencies = {
  fetchPage: (cursor: string | null, limit: number) => Promise<BackfillPage>;
  persistFeature: (input: BackfillFeatureWrite) => Promise<void>;
};

export type BackfillOptions = {
  batchSize?: number;
  maxRows?: number;
  startCursor?: string | null;
  dryRun?: boolean;
  persistUnknown?: boolean;
  methodologyVersion: string;
  inputSnapshot: string;
};

export type BackfillReport = {
  status: "completed" | "max_rows_reached";
  dryRun: boolean;
  scannedRows: number;
  extractedFeatures: number;
  persistedFeatures: number;
  skippedUnknown: number;
  conflictedFeatures: number;
  nextCursor: string | null;
};

function positiveInteger(value: number | undefined, fallback: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved <= 0) throw new Error(`invalid_${label}`);
  return resolved;
}

export async function runPropertyIntelligenceBackfill(
  dependencies: BackfillDependencies,
  options: BackfillOptions,
): Promise<BackfillReport> {
  if (!options.methodologyVersion.trim()) throw new Error("methodology_version_required");
  if (!options.inputSnapshot.trim()) throw new Error("input_snapshot_required");

  const batchSize = positiveInteger(options.batchSize, 100, "batch_size");
  const maxRows = positiveInteger(options.maxRows, 1_000, "max_rows");
  const dryRun = options.dryRun ?? true;
  const persistUnknown = options.persistUnknown ?? false;

  let cursor = options.startCursor ?? null;
  let scannedRows = 0;
  let extractedFeatures = 0;
  let persistedFeatures = 0;
  let skippedUnknown = 0;
  let conflictedFeatures = 0;

  while (scannedRows < maxRows) {
    const remaining = maxRows - scannedRows;
    const page = await dependencies.fetchPage(cursor, Math.min(batchSize, remaining));
    if (page.rows.length === 0) {
      return { status: "completed", dryRun, scannedRows, extractedFeatures, persistedFeatures, skippedUnknown, conflictedFeatures, nextCursor: null };
    }

    for (const row of page.rows) {
      if (!row.canonicalPropertyId.trim()) throw new Error("canonical_property_id_required");
      const structured = row.structured ?? {};
      const features = [
        ...extractPropertyFeatures({
          title: row.title,
          description: row.description,
          structured,
          sourceReliability: row.sourceReliability,
        }),
        extractConditionFeature({
          title: row.title,
          description: row.description,
          condition: typeof structured.condition === "string" ? structured.condition : null,
          propertyAgeRange: typeof structured.property_age_range === "string" ? structured.property_age_range : null,
          sourceReliability: row.sourceReliability,
        }),
      ];

      scannedRows += 1;
      extractedFeatures += features.length;

      for (const feature of features) {
        if (feature.status === "conflicted") conflictedFeatures += 1;
        if (feature.status === "unknown" && !persistUnknown) {
          skippedUnknown += 1;
          continue;
        }
        if (!dryRun) {
          await dependencies.persistFeature({
            canonicalPropertyId: row.canonicalPropertyId,
            feature,
            methodologyVersion: options.methodologyVersion,
            inputSnapshot: options.inputSnapshot,
            sourceObservationIds: row.sourceObservationIds ?? [],
          });
          persistedFeatures += 1;
        }
      }
    }

    cursor = page.nextCursor;
    if (!cursor) {
      return { status: "completed", dryRun, scannedRows, extractedFeatures, persistedFeatures, skippedUnknown, conflictedFeatures, nextCursor: null };
    }
  }

  return { status: "max_rows_reached", dryRun, scannedRows, extractedFeatures, persistedFeatures, skippedUnknown, conflictedFeatures, nextCursor: cursor };
}
