import type { ExtractedFeature } from "./rule-engine";
import { getFeatureDefinition, isValidFeatureValue, type FeatureKey } from "./feature-registry";

export type IntelligenceFeatureRecord = {
  id: string;
  canonical_property_id: string;
  feature_key: FeatureKey;
  feature_value: unknown;
  confidence: number;
  feature_status: ExtractedFeature["status"];
  method: ExtractedFeature["method"];
  methodology_version: string;
  evidence: string[];
  input_snapshot: string;
  source_observation_ids: string[];
  generated_at: string;
  valid_until: string | null;
  publication_eligible: boolean;
};

export type PersistFeatureInput = {
  canonicalPropertyId: string;
  feature: ExtractedFeature;
  methodologyVersion: string;
  inputSnapshot: string;
  sourceObservationIds?: string[];
  validUntil?: string | null;
};

type RpcResult<T> = { data: T | null; error: { message: string } | null };
type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

type SupabaseStoreClient = {
  rpc(name: string, args: Record<string, unknown>): Promise<RpcResult<string>>;
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        order(column: string, options: { ascending: boolean }): QueryResult<IntelligenceFeatureRecord[]>;
      };
    };
  };
};

export function computePublicationEligibility(feature: ExtractedFeature): boolean {
  const definition = getFeatureDefinition(feature.key);
  if (!definition || !definition.publicEligible) return false;
  if (feature.status !== "observed" && feature.status !== "inferred") return false;
  if (!isValidFeatureValue(feature.key, feature.value)) return false;
  return feature.confidence >= definition.publicConfidenceThreshold;
}

export function validatePersistFeatureInput(input: PersistFeatureInput): void {
  if (!input.canonicalPropertyId.trim()) throw new Error("canonical_property_id_required");
  if (!input.methodologyVersion.trim()) throw new Error("methodology_version_required");
  if (!input.inputSnapshot.trim()) throw new Error("input_snapshot_required");
  if (!Number.isFinite(input.feature.confidence) || input.feature.confidence < 0 || input.feature.confidence > 1) {
    throw new Error("invalid_feature_confidence");
  }
  if (!isValidFeatureValue(input.feature.key, input.feature.value)) throw new Error("invalid_feature_value");
}

export class PropertyIntelligenceStore {
  constructor(private readonly client: SupabaseStoreClient) {}

  async persistFeature(input: PersistFeatureInput): Promise<string> {
    validatePersistFeatureInput(input);
    const publicationEligible = computePublicationEligibility(input.feature);
    const { data, error } = await this.client.rpc("persist_property_intelligence_feature", {
      p_canonical_property_id: input.canonicalPropertyId,
      p_feature_key: input.feature.key,
      p_feature_value: input.feature.value,
      p_confidence: input.feature.confidence,
      p_feature_status: input.feature.status,
      p_method: input.feature.method,
      p_methodology_version: input.methodologyVersion,
      p_evidence: input.feature.evidence,
      p_input_snapshot: input.inputSnapshot,
      p_source_observation_ids: input.sourceObservationIds ?? [],
      p_valid_until: input.validUntil ?? null,
      p_publication_eligible: publicationEligible,
    });
    if (error) throw new Error(`property_intelligence_store_write_failed:${error.message}`);
    if (!data) throw new Error("property_intelligence_store_missing_id");
    return data;
  }

  async listLatestFeatures(canonicalPropertyId: string): Promise<IntelligenceFeatureRecord[]> {
    if (!canonicalPropertyId.trim()) throw new Error("canonical_property_id_required");
    const { data, error } = await this.client
      .from("latest_internal_property_intelligence_features")
      .select("*")
      .eq("canonical_property_id", canonicalPropertyId)
      .order("feature_key", { ascending: true });
    if (error) throw new Error(`property_intelligence_store_read_failed:${error.message}`);
    return data ?? [];
  }
}
