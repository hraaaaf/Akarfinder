import type { SearchResult } from "@/lib/search";
import {
  compareLegacyAndOdm,
  emitOdmDualReadMetric,
  type OdmDualReadDivergence,
  type OdmShadowSearchContext,
} from "@/lib/odm/odm-dual-read-shadow";
import {
  persistOdmDualReadMetric,
  type OdmShadowTelemetryWriteResult,
} from "@/lib/odm/odm-shadow-telemetry-store";
import {
  searchPublicRepresentations,
  type PublicSearchInput,
  type PublicSearchPage,
} from "@/lib/search-gateway/public-search-cursor";

export type OdmDualReadFailureStage = "odm_rpc" | "comparison" | "telemetry_write";

export type OdmDualReadStageEvent =
  | "odm_rpc_started"
  | "odm_rpc_completed"
  | "comparison_completed"
  | "telemetry_write_started"
  | "telemetry_write_completed";

export type OdmDualReadRunnerResult =
  | { completed: true; write: OdmShadowTelemetryWriteResult }
  | { completed: false; stage: OdmDualReadFailureStage; error: string };

type StageLogger = (event: OdmDualReadStageEvent, payload: Record<string, unknown>) => void;

export type OdmDualReadRunnerDependencies = {
  search: (input: PublicSearchInput) => Promise<PublicSearchPage>;
  compare: (
    stableKey: string,
    legacy: SearchResult,
    odm: PublicSearchPage,
  ) => OdmDualReadDivergence;
  emit: (metric: OdmDualReadDivergence) => void;
  persist: (metric: OdmDualReadDivergence) => Promise<OdmShadowTelemetryWriteResult>;
  logStage: StageLogger;
  logError: (payload: Record<string, unknown>) => void;
};

const defaultDependencies: OdmDualReadRunnerDependencies = {
  search: searchPublicRepresentations,
  compare: compareLegacyAndOdm,
  emit: emitOdmDualReadMetric,
  persist: persistOdmDualReadMetric,
  logStage(event, payload) {
    console.info("[odm-dual-read-shadow:stage]", JSON.stringify({ event, ...payload }));
  },
  logError(payload) {
    console.warn("[odm-dual-read-shadow:error]", JSON.stringify(payload));
  },
};

const EMPTY_CONTEXT: OdmShadowSearchContext = {
  city: null,
  property_type: null,
  transaction_type: null,
  has_text_query: false,
  has_price_filter: false,
  has_surface_filter: false,
  limit: null,
  offset: null,
  is_paginated: false,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "odm_dual_read_unknown_error";
}

export async function runOdmDualReadShadow(
  input: {
    stableKey: string;
    legacyResult: SearchResult;
    odmInput: PublicSearchInput;
    context?: OdmShadowSearchContext;
  },
  dependencies: OdmDualReadRunnerDependencies = defaultDependencies,
): Promise<OdmDualReadRunnerResult> {
  const startedAt = Date.now();
  let stage: OdmDualReadFailureStage = "odm_rpc";
  const context = input.context ?? EMPTY_CONTEXT;

  try {
    dependencies.logStage("odm_rpc_started", { elapsed_ms: 0 });
    const odmPage = await dependencies.search(input.odmInput);
    dependencies.logStage("odm_rpc_completed", {
      elapsed_ms: Date.now() - startedAt,
      results_count: odmPage.results_count,
      total_count: odmPage.total_count,
    });

    stage = "comparison";
    const compared = dependencies.compare(input.stableKey, input.legacyResult, odmPage);
    const metric: OdmDualReadDivergence = {
      ...compared,
      context_city: context.city,
      context_property_type: context.property_type,
      context_transaction_type: context.transaction_type,
      context_has_text_query: context.has_text_query,
      context_has_price_filter: context.has_price_filter,
      context_has_surface_filter: context.has_surface_filter,
      context_limit: context.limit,
      context_offset: context.offset,
      context_is_paginated: context.is_paginated,
    };
    dependencies.logStage("comparison_completed", {
      elapsed_ms: Date.now() - startedAt,
      stable_key_hash: metric.stable_key_hash,
      legacy_count: metric.legacy_count,
      odm_count: metric.odm_count,
      context_city: metric.context_city,
      context_property_type: metric.context_property_type,
      context_transaction_type: metric.context_transaction_type,
    });
    dependencies.emit(metric);

    stage = "telemetry_write";
    dependencies.logStage("telemetry_write_started", {
      elapsed_ms: Date.now() - startedAt,
      stable_key_hash: metric.stable_key_hash,
    });
    const write = await dependencies.persist(metric);
    dependencies.logStage("telemetry_write_completed", {
      elapsed_ms: Date.now() - startedAt,
      stable_key_hash: metric.stable_key_hash,
      stored: write.stored,
      reason: write.stored ? null : write.reason,
    });

    return { completed: true, write };
  } catch (error) {
    const message = errorMessage(error);
    dependencies.logError({
      version: "odm_dual_read_v1",
      stage,
      elapsed_ms: Date.now() - startedAt,
      error: message,
    });
    return { completed: false, stage, error: message };
  }
}
