import type { ObservationRecord } from "./types";

export type RecordObservationInput = {
  fingerprint: string;
  source_kind: ObservationRecord["source_kind"];
  source_host?: string;
  city?: string;
  district?: string;
  property_type?: string;
  transaction_type?: string;
  observed_at?: string;
};

export interface ObservationStore {
  get(fingerprint: string): ObservationRecord | null;
  recordObservation(input: RecordObservationInput): ObservationRecord;
}

/**
 * Default store: never fabricates history. Safe to use even if no
 * persistence table exists yet — real persistence lands after an explicit
 * DB GO, without requiring any front-end change.
 */
export class NoopObservationStore implements ObservationStore {
  get(): ObservationRecord | null {
    return null;
  }

  recordObservation(input: RecordObservationInput): ObservationRecord {
    const observedAt = input.observed_at ?? new Date().toISOString();

    return {
      fingerprint: input.fingerprint,
      source_kind: input.source_kind,
      source_host: input.source_host,
      city: input.city,
      district: input.district,
      property_type: input.property_type,
      transaction_type: input.transaction_type,
      first_observed_at: observedAt,
      last_observed_at: observedAt,
      observation_count: 1,
      last_seen_in_current_search: true,
    };
  }
}

/** Process-memory store for tests and local/dev use — not durable, not shared across instances. */
export class InMemoryObservationStore implements ObservationStore {
  private readonly records = new Map<string, ObservationRecord>();

  get(fingerprint: string): ObservationRecord | null {
    return this.records.get(fingerprint) ?? null;
  }

  recordObservation(input: RecordObservationInput): ObservationRecord {
    const observedAt = input.observed_at ?? new Date().toISOString();
    const existing = this.records.get(input.fingerprint);

    const next: ObservationRecord = {
      fingerprint: input.fingerprint,
      source_kind: input.source_kind,
      source_host: input.source_host,
      city: input.city,
      district: input.district,
      property_type: input.property_type,
      transaction_type: input.transaction_type,
      first_observed_at: existing?.first_observed_at ?? observedAt,
      last_observed_at: observedAt,
      observation_count: (existing?.observation_count ?? 0) + 1,
      last_seen_in_current_search: true,
    };

    this.records.set(input.fingerprint, next);
    return next;
  }
}

let activeStore: ObservationStore = new NoopObservationStore();

export function getObservationStore(): ObservationStore {
  return activeStore;
}

/** Test-only seam. Not called from production code paths. */
export function setObservationStoreForTests(store: ObservationStore): void {
  activeStore = store;
}
