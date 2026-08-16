import {
  createEmptyAnnouncementTruthEvidence,
  evaluateAnnouncementFeature,
} from "@/lib/property-detail/announcement-page-truth-contract-v1";
import type { AkarEstimateHistoryRuntime } from "@/lib/property-detail/akar-estimate-history-runtime";

export function canPublishObservedPriceHistory(model: AkarEstimateHistoryRuntime | null | undefined): boolean {
  if (!model || model.history.status !== "available") return false;
  const evidence = createEmptyAnnouncementTruthEvidence();
  evidence.page_access_allowed = true;
  evidence.history.observation_count = model.history.observationCount;
  evidence.history.price_observation_count = model.history.points.length;
  return evaluateAnnouncementFeature("price_history", evidence).allowed;
}

export function canPublishAkarEstimate(model: AkarEstimateHistoryRuntime | null | undefined): boolean {
  if (!model?.estimate) return false;
  const evidence = createEmptyAnnouncementTruthEvidence();
  evidence.page_access_allowed = true;
  evidence.intelligence.estimate_certified = model.estimate.status === "certified";
  evidence.intelligence.estimate_value = model.estimate.valueMad;
  evidence.intelligence.estimate_low = model.estimate.lowMad;
  evidence.intelligence.estimate_high = model.estimate.highMad;
  return evaluateAnnouncementFeature("akar_estimate", evidence).allowed;
}
