import type { Observation } from "../market-index/market-index-types.js";
import {
  deriveObservationLedger,
  type ObservationLedgerEvent,
} from "./observation-ledger.js";

export type ObservationLedgerSupabaseClient = {
  from(table: string): {
    select(columns: string): {
      order(column: string, options: { ascending: boolean }): {
        order(column: string, options: { ascending: boolean }): {
          range(from: number, to: number): Promise<{
            data: unknown[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
  rpc(
    name: string,
    params: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { message: string } | null }>;
};

export type ObservationLedgerBackfillOptions = {
  snapshot: string;
  dryRun?: boolean;
  pageSize?: number;
  maxObservations?: number;
};

export type ObservationLedgerBackfillResult = {
  snapshot: string;
  dry_run: boolean;
  observations_read: number;
  distinct_source_offers: number;
  events_derived: number;
  events_persisted: number;
  events_skipped_existing: number;
};

const OBSERVATION_COLUMNS = [
  "id",
  "source_offer_id",
  "observed_at",
  "displayed_price",
  "currency",
  "surface_m2",
  "title_fingerprint",
  "content_fingerprint",
  "source_status",
  "availability_claim",
  "observation_origin",
  "ingestion_run_id",
  "created_at",
].join(",");

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapObservationRow(row: unknown): Observation {
  if (!row || typeof row !== "object") {
    throw new Error("Invalid source_offer_observations row");
  }

  const record = row as Record<string, unknown>;
  const sourceOfferId = Number(record.source_offer_id);
  if (!Number.isSafeInteger(sourceOfferId) || sourceOfferId <= 0) {
    throw new Error("Observation source_offer_id must be a positive safe integer");
  }

  const id = asNullableString(record.id);
  const observedAt = asNullableString(record.observed_at);
  const createdAt = asNullableString(record.created_at);
  if (!id || !observedAt || !createdAt) {
    throw new Error("Observation id, observed_at and created_at are required");
  }

  return {
    id,
    source_offer_id: sourceOfferId,
    observed_at: observedAt,
    displayed_price: asNullableNumber(record.displayed_price),
    currency: asNullableString(record.currency),
    surface_m2: asNullableNumber(record.surface_m2),
    title_fingerprint: asNullableString(record.title_fingerprint),
    content_fingerprint: asNullableString(record.content_fingerprint),
    source_status: asNullableString(record.source_status),
    availability_claim: asNullableString(record.availability_claim),
    observation_origin: asNullableString(record.observation_origin) ?? "unknown",
    ingestion_run_id: asNullableString(record.ingestion_run_id),
    created_at: createdAt,
  };
}

export async function readObservationHistory(
  client: ObservationLedgerSupabaseClient,
  options: Pick<ObservationLedgerBackfillOptions, "pageSize" | "maxObservations"> = {},
): Promise<Observation[]> {
  const pageSize = Math.max(1, Math.min(options.pageSize ?? 500, 1_000));
  const maxObservations = Math.max(0, options.maxObservations ?? Number.MAX_SAFE_INTEGER);
  const observations: Observation[] = [];

  for (let offset = 0; observations.length < maxObservations; offset += pageSize) {
    const remaining = maxObservations - observations.length;
    const limit = Math.min(pageSize, remaining);
    const response = await client
      .from("source_offer_observations")
      .select(OBSERVATION_COLUMNS)
      .order("source_offer_id", { ascending: true })
      .order("observed_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (response.error) {
      throw new Error(`Unable to read observation history: ${response.error.message}`);
    }

    const rows = response.data ?? [];
    observations.push(...rows.map(mapObservationRow));
    if (rows.length < limit) break;
  }

  return observations;
}

function jsonValue(value: string | number | null): string | number | null {
  return value;
}

export async function persistObservationLedgerEvent(
  client: ObservationLedgerSupabaseClient,
  event: ObservationLedgerEvent,
  snapshot: string,
): Promise<void> {
  const response = await client.rpc("persist_observation_ledger_event", {
    p_event_key: event.event_key,
    p_source_offer_id: event.source_offer_id,
    p_event_type: event.event_type,
    p_occurred_at: event.occurred_at,
    p_previous_observation_id: event.previous_observation_id,
    p_current_observation_id: event.current_observation_id,
    p_previous_value: jsonValue(event.previous_value),
    p_current_value: jsonValue(event.current_value),
    p_metadata: event.metadata,
    p_input_snapshot: snapshot,
    p_methodology_version: "observation_ledger_v1",
  });

  if (response.error) {
    throw new Error(`Unable to persist observation ledger event: ${response.error.message}`);
  }
}

export async function runObservationLedgerBackfill(
  client: ObservationLedgerSupabaseClient,
  options: ObservationLedgerBackfillOptions,
): Promise<ObservationLedgerBackfillResult> {
  const snapshot = options.snapshot.trim();
  if (!snapshot) throw new Error("Observation ledger snapshot is required");

  const observations = await readObservationHistory(client, options);
  const events = deriveObservationLedger(observations);
  const dryRun = options.dryRun ?? true;

  if (!dryRun) {
    for (const event of events) {
      await persistObservationLedgerEvent(client, event, snapshot);
    }
  }

  return {
    snapshot,
    dry_run: dryRun,
    observations_read: observations.length,
    distinct_source_offers: new Set(observations.map((entry) => entry.source_offer_id)).size,
    events_derived: events.length,
    events_persisted: dryRun ? 0 : events.length,
    events_skipped_existing: 0,
  };
}
