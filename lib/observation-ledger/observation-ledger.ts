import type { Observation } from "../market-index/market-index-types.js";

export type ObservationEventType =
  | "first_observed"
  | "price_decreased"
  | "price_increased"
  | "price_disclosed"
  | "price_removed"
  | "content_changed"
  | "surface_changed"
  | "withdrawn"
  | "reactivated"
  | "availability_changed";

export type ObservationLedgerEvent = {
  event_key: string;
  source_offer_id: number;
  event_type: ObservationEventType;
  occurred_at: string;
  previous_observation_id: string | null;
  current_observation_id: string;
  previous_value: string | number | null;
  current_value: string | number | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type ObservationTimeline = {
  source_offer_id: number;
  observation_count: number;
  first_observed_at: string;
  last_observed_at: string;
  lifespan_days: number;
  change_count: number;
  price_change_count: number;
  withdrawal_count: number;
  reactivation_count: number;
  last_known_status: string | null;
  last_known_price: number | null;
  freshness: {
    age_hours: number;
    score: number;
    band: "fresh" | "recent" | "aging" | "stale";
  };
};

const REMOVED_STATUSES = new Set(["removed", "inactive", "expired", "unavailable", "unreachable"]);
const ACTIVE_STATUSES = new Set(["active", "available", "published"]);

function normalizeStatus(status: string | null): string | null {
  return status?.trim().toLowerCase() || null;
}

function isRemoved(status: string | null): boolean {
  const normalized = normalizeStatus(status);
  return normalized !== null && REMOVED_STATUSES.has(normalized);
}

function isActive(status: string | null): boolean {
  const normalized = normalizeStatus(status);
  return normalized !== null && ACTIVE_STATUSES.has(normalized);
}

function eventKey(
  current: Observation,
  type: ObservationEventType,
  previous: Observation | null,
): string {
  return [current.source_offer_id, previous?.id ?? "origin", current.id, type].join(":");
}

function event(
  current: Observation,
  previous: Observation | null,
  type: ObservationEventType,
  previousValue: string | number | null,
  currentValue: string | number | null,
  metadata: Record<string, string | number | boolean | null> = {},
): ObservationLedgerEvent {
  return {
    event_key: eventKey(current, type, previous),
    source_offer_id: current.source_offer_id,
    event_type: type,
    occurred_at: current.observed_at,
    previous_observation_id: previous?.id ?? null,
    current_observation_id: current.id,
    previous_value: previousValue,
    current_value: currentValue,
    metadata,
  };
}

export function deriveObservationEvents(
  previous: Observation | null,
  current: Observation,
): ObservationLedgerEvent[] {
  if (previous && previous.source_offer_id !== current.source_offer_id) {
    throw new Error("Observation ledger comparison requires the same source_offer_id");
  }

  if (!previous) {
    return [event(current, null, "first_observed", null, current.source_status)];
  }

  const events: ObservationLedgerEvent[] = [];
  const previousPrice = previous.displayed_price;
  const currentPrice = current.displayed_price;

  if (previousPrice === null && currentPrice !== null) {
    events.push(event(current, previous, "price_disclosed", null, currentPrice));
  } else if (previousPrice !== null && currentPrice === null) {
    events.push(event(current, previous, "price_removed", previousPrice, null));
  } else if (previousPrice !== null && currentPrice !== null && previousPrice !== currentPrice) {
    const delta = currentPrice - previousPrice;
    const percentage = previousPrice > 0 ? Number(((delta / previousPrice) * 100).toFixed(4)) : null;
    events.push(
      event(
        current,
        previous,
        delta < 0 ? "price_decreased" : "price_increased",
        previousPrice,
        currentPrice,
        { delta, percentage },
      ),
    );
  }

  if (previous.content_fingerprint !== current.content_fingerprint) {
    events.push(
      event(
        current,
        previous,
        "content_changed",
        previous.content_fingerprint,
        current.content_fingerprint,
      ),
    );
  }

  if (previous.surface_m2 !== current.surface_m2) {
    events.push(event(current, previous, "surface_changed", previous.surface_m2, current.surface_m2));
  }

  const previousStatus = normalizeStatus(previous.source_status);
  const currentStatus = normalizeStatus(current.source_status);

  if (!isRemoved(previousStatus) && isRemoved(currentStatus)) {
    events.push(event(current, previous, "withdrawn", previousStatus, currentStatus));
  } else if (isRemoved(previousStatus) && isActive(currentStatus)) {
    events.push(event(current, previous, "reactivated", previousStatus, currentStatus));
  } else if (previousStatus !== currentStatus) {
    events.push(event(current, previous, "availability_changed", previousStatus, currentStatus));
  }

  return events;
}

export function deriveObservationLedger(observations: Observation[]): ObservationLedgerEvent[] {
  const ordered = [...observations].sort((a, b) => {
    const timeDifference = Date.parse(a.observed_at) - Date.parse(b.observed_at);
    return timeDifference !== 0 ? timeDifference : a.id.localeCompare(b.id);
  });

  const previousByOffer = new Map<number, Observation>();
  const events: ObservationLedgerEvent[] = [];

  for (const current of ordered) {
    const previous = previousByOffer.get(current.source_offer_id) ?? null;
    events.push(...deriveObservationEvents(previous, current));
    previousByOffer.set(current.source_offer_id, current);
  }

  return events;
}

export function computeFreshness(observedAt: string, nowIso: string): ObservationTimeline["freshness"] {
  const observed = Date.parse(observedAt);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(observed) || !Number.isFinite(now) || now < observed) {
    throw new Error("Freshness requires valid timestamps with now >= observed_at");
  }

  const ageHours = Number(((now - observed) / 3_600_000).toFixed(2));
  const score = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-ageHours / (24 * 14)))));
  const band = ageHours <= 24 ? "fresh" : ageHours <= 24 * 7 ? "recent" : ageHours <= 24 * 30 ? "aging" : "stale";

  return { age_hours: ageHours, score, band };
}

export function buildObservationTimeline(
  observations: Observation[],
  nowIso: string,
): ObservationTimeline | null {
  if (observations.length === 0) return null;

  const offerIds = new Set(observations.map((observation) => observation.source_offer_id));
  if (offerIds.size !== 1) {
    throw new Error("Observation timeline requires exactly one source_offer_id");
  }

  const ordered = [...observations].sort((a, b) => Date.parse(a.observed_at) - Date.parse(b.observed_at));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const events = deriveObservationLedger(ordered);
  const lifespanDays = Number(
    Math.max(0, (Date.parse(last.observed_at) - Date.parse(first.observed_at)) / 86_400_000).toFixed(2),
  );

  return {
    source_offer_id: first.source_offer_id,
    observation_count: ordered.length,
    first_observed_at: first.observed_at,
    last_observed_at: last.observed_at,
    lifespan_days: lifespanDays,
    change_count: events.filter((entry) => entry.event_type !== "first_observed").length,
    price_change_count: events.filter((entry) =>
      ["price_decreased", "price_increased", "price_disclosed", "price_removed"].includes(entry.event_type),
    ).length,
    withdrawal_count: events.filter((entry) => entry.event_type === "withdrawn").length,
    reactivation_count: events.filter((entry) => entry.event_type === "reactivated").length,
    last_known_status: normalizeStatus(last.source_status),
    last_known_price: last.displayed_price,
    freshness: computeFreshness(last.observed_at, nowIso),
  };
}
