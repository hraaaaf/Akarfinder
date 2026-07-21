// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#9/10) -- AkarFinder Index
// Lifecycle at Scale. Pure, deterministic state machine over the distinct
// index states. No DB writes here -- the scale test (gate) drives this
// function against a synthetic PGlite table.
//
// Core invariants:
//  - A seed (DISCOVERED_SEED) is NEVER public and NEVER auto-creates a
//    listing. Only an authorized fresh-channel reobservation can promote it.
//  - Nothing is ever physically deleted by a transition -- lifecycle only
//    changes status. Public search excludes non-publishable statuses.
//  - A later fresh observation refreshes/reactivates in place; it never
//    creates a duplicate row (the caller keys on canonical_url).

export type IndexLifecycleState =
  | "DISCOVERED_SEED" // Common Crawl / bulk-discovery only, never public
  | "FRESH_CONFIRMED" // exact reobservation by an authorized fresh channel, recent
  | "INDEXED" // admitted + currently within the fresh window -> publishable
  | "AGING" // last fresh observation 31-90 days ago
  | "STALE" // last fresh observation > 90 days ago
  | "REMOVED"; // explicit delete/unpublish signal, or rejected -- never public

export const PUBLISHABLE_STATES: ReadonlySet<IndexLifecycleState> = new Set(["INDEXED"]);

export const FRESH_CONFIRMED_MAX_AGE_DAYS = 30;
export const AGING_MAX_AGE_DAYS = 90;

// The events that can drive a transition. All are things the EXISTING
// pipeline already produces -- no new external calls.
export type LifecycleEvent =
  | { type: "seed_discovered"; observed_at: string } // a bulk-discovery (Common Crawl) sighting
  | { type: "fresh_observation"; observed_at: string } // exact reobservation by OpenSERP/Yandex
  | { type: "admitted" } // passed the admission pipeline -> eligible to be indexed/public
  | { type: "remove_signal" } // explicit delete/unpublish (e.g. a partner feed signal)
  | { type: "time_tick"; now: string }; // periodic re-evaluation (aging/stale demotion)

export type LifecycleRecord = {
  canonical_url: string;
  state: IndexLifecycleState;
  first_seen_at: string;
  last_seen_at: string;
  last_fresh_seen_at: string | null;
  channels_seen: string[];
  observation_count: number;
};

function daysBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24);
}

function ageBasedState(lastFreshSeenAt: string | null, now: string): IndexLifecycleState {
  if (!lastFreshSeenAt) return "DISCOVERED_SEED";
  const age = daysBetween(lastFreshSeenAt, now);
  if (age <= FRESH_CONFIRMED_MAX_AGE_DAYS) return "INDEXED";
  if (age <= AGING_MAX_AGE_DAYS) return "AGING";
  return "STALE";
}

// Pure transition. Given the current record and one event, returns the next
// record. Idempotent for time_tick: re-applying the same now yields the same
// record. Never mutates the input.
export function applyLifecycleEvent(record: LifecycleRecord, event: LifecycleEvent): LifecycleRecord {
  // REMOVED is terminal against everything except an explicit fresh
  // observation (a listing genuinely came back online) -- a plain time_tick
  // or seed sighting never resurrects a removed listing.
  switch (event.type) {
    case "seed_discovered": {
      // A seed sighting only ever (a) creates the seed, or (b) bumps the
      // observation count + last_seen on an already-known record. It NEVER
      // promotes, NEVER makes anything public, NEVER resurrects a REMOVED
      // record, and NEVER touches last_fresh_seen_at (Common Crawl is not a
      // fresh channel).
      const lastSeen =
        new Date(event.observed_at).getTime() > new Date(record.last_seen_at).getTime() ? event.observed_at : record.last_seen_at;
      return {
        ...record,
        last_seen_at: lastSeen,
        observation_count: record.observation_count + 1,
      };
    }

    case "fresh_observation": {
      const observedAt = event.observed_at;
      const channels = record.channels_seen.includes("fresh") ? record.channels_seen : [...record.channels_seen, "fresh"];
      const lastFresh =
        !record.last_fresh_seen_at || new Date(observedAt).getTime() > new Date(record.last_fresh_seen_at).getTime()
          ? observedAt
          : record.last_fresh_seen_at;
      // A fresh observation always at least reaches FRESH_CONFIRMED; whether
      // it becomes INDEXED depends on a separate admission event. But if the
      // record was already INDEXED/AGING/STALE, a recent fresh obs restores
      // it to INDEXED (reactivation in place, never a duplicate).
      const wasAdmitted = record.state === "INDEXED" || record.state === "AGING" || record.state === "STALE";
      const nextState: IndexLifecycleState = wasAdmitted ? ageBasedState(lastFresh, observedAt) : "FRESH_CONFIRMED";
      return {
        ...record,
        state: nextState,
        last_seen_at: observedAt,
        last_fresh_seen_at: lastFresh,
        channels_seen: channels,
        observation_count: record.observation_count + 1,
      };
    }

    case "admitted": {
      // Admission only takes effect on a fresh-confirmed record -- a raw
      // seed can never be admitted directly (doctrine: no listing from a
      // seed alone). A REMOVED record is not re-admitted by this event.
      if (record.state === "FRESH_CONFIRMED") {
        return { ...record, state: "INDEXED" };
      }
      return record;
    }

    case "remove_signal": {
      return { ...record, state: "REMOVED" };
    }

    case "time_tick": {
      // Aging/stale demotion for currently-indexed records. Never touches a
      // seed (no fresh timestamp), a fresh_confirmed-but-not-yet-admitted
      // record, or a REMOVED record.
      if (record.state === "INDEXED" || record.state === "AGING" || record.state === "STALE") {
        return { ...record, state: ageBasedState(record.last_fresh_seen_at, event.now) };
      }
      return record;
    }
  }
}

export function isPublishable(state: IndexLifecycleState): boolean {
  return PUBLISHABLE_STATES.has(state);
}

// A brand-new record starts as a raw seed -- never public, no fresh channel
// yet, observation_count = 1.
export function newSeedRecord(canonicalUrl: string, discoveredAt: string): LifecycleRecord {
  return {
    canonical_url: canonicalUrl,
    state: "DISCOVERED_SEED",
    first_seen_at: discoveredAt,
    last_seen_at: discoveredAt,
    last_fresh_seen_at: null,
    channels_seen: ["bulk_discovery"],
    observation_count: 1,
  };
}
