import type { Observation } from "../market-index/market-index-types.js";
import { deriveObservationLedger, type ObservationLedgerEvent } from "../observation-ledger/observation-ledger.js";

export type FreshnessBand = "fresh" | "recent" | "aging" | "stale" | "unknown";
export type LifecycleState =
  | "unknown"
  | "newly_observed"
  | "active"
  | "recently_updated"
  | "price_changed"
  | "content_changed"
  | "probably_stale"
  | "withdrawn"
  | "reactivated";

export type FreshnessLifecycleResult = {
  source_offer_id: number;
  evaluated_at: string;
  last_observed_at: string | null;
  freshness_score: number | null;
  freshness_band: FreshnessBand;
  lifecycle_state: LifecycleState;
  lifecycle_score: number | null;
  volatility_score: number | null;
  observation_density: number;
  confidence_score: number;
  next_recheck_at: string | null;
  recrawl_priority: number;
  evidence_event_keys: string[];
  blockers: string[];
};

const REMOVED = new Set(["removed", "inactive", "expired", "unavailable", "unreachable"]);

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ageHours(observedAt: string, nowIso: string): number {
  const observed = Date.parse(observedAt);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(observed) || !Number.isFinite(now) || now < observed) {
    throw new Error("Freshness lifecycle evaluation requires valid timestamps with now >= observed_at");
  }
  return (now - observed) / 3_600_000;
}

function freshness(age: number): { score: number; band: Exclude<FreshnessBand, "unknown"> } {
  const score = clamp(100 * Math.exp(-age / (24 * 14)));
  const band = age <= 24 ? "fresh" : age <= 24 * 7 ? "recent" : age <= 24 * 30 ? "aging" : "stale";
  return { score, band };
}

function relevantRecentEvent(events: ObservationLedgerEvent[]): ObservationLedgerEvent | null {
  const candidates = events.filter((event) => event.event_type !== "first_observed");
  return candidates.length === 0 ? null : candidates[candidates.length - 1];
}

function lifecycleFor(input: {
  observations: Observation[];
  events: ObservationLedgerEvent[];
  age: number;
}): LifecycleState {
  const last = input.observations[input.observations.length - 1];
  const lastStatus = last.source_status?.trim().toLowerCase() ?? null;
  const lastEvent = relevantRecentEvent(input.events);

  if (lastStatus && REMOVED.has(lastStatus)) return "withdrawn";
  if (lastEvent?.event_type === "reactivated") return "reactivated";
  if (lastEvent?.event_type === "price_decreased" || lastEvent?.event_type === "price_increased" || lastEvent?.event_type === "price_disclosed" || lastEvent?.event_type === "price_removed") return "price_changed";
  if (lastEvent?.event_type === "content_changed" || lastEvent?.event_type === "surface_changed") return "content_changed";
  if (input.age > 24 * 30) return "probably_stale";
  if (lastEvent && input.age <= 24 * 7) return "recently_updated";
  if (input.observations.length === 1) return "newly_observed";
  return "active";
}

function lifecycleScore(state: LifecycleState, freshnessScore: number): number | null {
  const factor: Record<LifecycleState, number | null> = {
    unknown: null,
    newly_observed: 1,
    active: 0.9,
    recently_updated: 0.95,
    price_changed: 0.85,
    content_changed: 0.82,
    probably_stale: 0.35,
    withdrawn: 0,
    reactivated: 0.88,
  };
  const value = factor[state];
  return value === null ? null : clamp(freshnessScore * value);
}

function volatility(events: ObservationLedgerEvent[], lifespanDays: number): number {
  const changes = events.filter((event) => event.event_type !== "first_observed").length;
  const normalizedDays = Math.max(1, lifespanDays);
  return clamp((changes / normalizedDays) * 30 * 12);
}

function recheckDelayHours(state: LifecycleState, freshnessBand: FreshnessBand, volatilityScore: number): number | null {
  if (state === "unknown") return null;
  if (state === "withdrawn") return 24 * 14;
  if (state === "reactivated" || state === "price_changed" || state === "content_changed") return 24;
  if (freshnessBand === "stale") return 6;
  if (freshnessBand === "aging") return 24;
  if (volatilityScore >= 60) return 24;
  if (freshnessBand === "recent") return 24 * 3;
  return 24 * 7;
}

export function evaluateFreshnessLifecycle(observations: Observation[], nowIso: string): FreshnessLifecycleResult | null {
  if (observations.length === 0) return null;
  const ids = new Set(observations.map((row) => row.source_offer_id));
  if (ids.size !== 1) throw new Error("Freshness lifecycle evaluation requires exactly one source_offer_id");

  const ordered = [...observations].sort((a, b) => Date.parse(a.observed_at) - Date.parse(b.observed_at) || a.id.localeCompare(b.id));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const age = ageHours(last.observed_at, nowIso);
  const fresh = freshness(age);
  const events = deriveObservationLedger(ordered);
  const lifespanDays = Math.max(0, (Date.parse(last.observed_at) - Date.parse(first.observed_at)) / 86_400_000);
  const state = lifecycleFor({ observations: ordered, events, age });
  const volatilityScore = volatility(events, lifespanDays);
  const density = Number((ordered.length / Math.max(1, lifespanDays + 1)).toFixed(4));
  const confidenceScore = clamp(Math.min(1, ordered.length / 4) * 60 + Math.min(1, lifespanDays / 14) * 25 + (last.content_fingerprint ? 15 : 0));
  const delayHours = recheckDelayHours(state, fresh.band, volatilityScore);
  const nextRecheck = delayHours === null ? null : new Date(Date.parse(last.observed_at) + delayHours * 3_600_000).toISOString();
  const priority = clamp((100 - fresh.score) * 0.5 + volatilityScore * 0.3 + (state === "withdrawn" ? 5 : 20));

  return {
    source_offer_id: first.source_offer_id,
    evaluated_at: nowIso,
    last_observed_at: last.observed_at,
    freshness_score: fresh.score,
    freshness_band: fresh.band,
    lifecycle_state: state,
    lifecycle_score: lifecycleScore(state, fresh.score),
    volatility_score: volatilityScore,
    observation_density: density,
    confidence_score: confidenceScore,
    next_recheck_at: nextRecheck,
    recrawl_priority: priority,
    evidence_event_keys: events.slice(-5).map((event) => event.event_key),
    blockers: state === "probably_stale" ? ["fresh_recheck_required"] : [],
  };
}
