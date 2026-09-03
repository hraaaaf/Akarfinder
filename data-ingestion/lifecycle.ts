import { createHash } from "node:crypto";

import type { CollectionListing } from "./collection-adapter";

export type LifecycleAction = "insert" | "unchanged" | "update" | "stale" | "inactive" | "out_of_scope";

export type LifecycleRecord = {
  source_key: string;
  property_group_id: string;
  listing: CollectionListing;
  absence_runs: number;
};

export type LifecycleDecision = {
  source_key: string;
  action: LifecycleAction;
  property_group_id: string;
  previous_hash: string | null;
  current_hash: string | null;
};

export type LifecycleRunScope = {
  source_name: string;
  source_type: CollectionListing["provenance"]["source_type"];
};

export type LifecycleConfig = {
  stale_after_missing_runs: number;
  inactive_after_missing_runs: number;
};

export type LifecycleRunResult = {
  records: LifecycleRecord[];
  decisions: LifecycleDecision[];
  counts: Record<LifecycleAction, number>;
};

const DEFAULT_CONFIG: LifecycleConfig = {
  stale_after_missing_runs: 1,
  inactive_after_missing_runs: 2,
};

function norm(value: string | null | undefined): string | null {
  const normalized = value?.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  return normalized || null;
}

function stableId(prefix: string, payload: string): string {
  return `${prefix}-${createHash("sha256").update(payload, "utf8").digest("hex").slice(0, 24)}`;
}

export function collectionSourceKey(listing: CollectionListing): string {
  return `${listing.source.name}:${listing.source.source_id}`;
}

export function propertyFingerprint(listing: CollectionListing): string | null {
  const city = norm(listing.location.city);
  const district = norm(listing.location.district);
  const address = norm(listing.location.address_text);
  const type = listing.property_type && listing.property_type !== "unknown" ? listing.property_type : null;
  const surface = listing.surface.total_m2 ?? listing.surface.land_m2 ?? listing.surface.built_m2;

  // Refuse weak fingerprints. A coarse hash is useful only when it has enough real-estate anchors.
  if (!city || !type || surface == null || (!district && !address)) return null;

  const payload = {
    country: "morocco",
    city,
    district,
    address,
    property_type: type,
    transaction: listing.transaction,
    surface_m2: Math.round(surface),
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    floor: listing.floor,
  };
  return createHash("sha256").update(JSON.stringify(payload), "utf8").digest("hex");
}

function groupIdFor(listing: CollectionListing, fingerprint: string | null): string {
  return fingerprint ? stableId("property-group", fingerprint) : stableId("property-group-source", collectionSourceKey(listing));
}

function inScope(record: LifecycleRecord, scope: LifecycleRunScope): boolean {
  return record.listing.source.name === scope.source_name && record.listing.provenance.source_type === scope.source_type;
}

function activateFromCurrent(current: CollectionListing, previous: LifecycleRecord | null, runAt: string): CollectionListing {
  if (previous && previous.listing.source.content_hash === current.source.content_hash) {
    return {
      ...previous.listing,
      status: "active",
      source: {
        ...previous.listing.source,
        last_seen_at: runAt,
      },
    };
  }

  return {
    ...current,
    status: "active",
    source: {
      ...current.source,
      first_seen_at: previous?.listing.source.first_seen_at ?? current.source.first_seen_at ?? runAt,
      last_seen_at: runAt,
    },
  };
}

export function reconcileLifecycleRun(
  previousRecords: LifecycleRecord[],
  currentListings: CollectionListing[],
  scope: LifecycleRunScope,
  runAt: string,
  config: LifecycleConfig = DEFAULT_CONFIG,
): LifecycleRunResult {
  if (config.stale_after_missing_runs < 1) throw new Error("stale_after_missing_runs_must_be_positive");
  if (config.inactive_after_missing_runs <= config.stale_after_missing_runs) throw new Error("inactive_threshold_must_exceed_stale_threshold");

  const previousBySource = new Map(previousRecords.map((record) => [record.source_key, record]));
  const currentBySource = new Map<string, CollectionListing>();
  for (const listing of currentListings) {
    const key = collectionSourceKey(listing);
    if (currentBySource.has(key)) throw new Error(`duplicate_source_key_in_run:${key}`);
    if (listing.source.name !== scope.source_name || listing.provenance.source_type !== scope.source_type) {
      throw new Error(`listing_outside_run_scope:${key}`);
    }
    currentBySource.set(key, listing);
  }

  const fingerprintGroups = new Map<string, string>();
  for (const record of previousRecords) {
    const fp = propertyFingerprint(record.listing);
    if (fp && !fingerprintGroups.has(fp)) fingerprintGroups.set(fp, record.property_group_id);
  }

  const records: LifecycleRecord[] = [];
  const decisions: LifecycleDecision[] = [];

  for (const [key, current] of currentBySource) {
    const previous = previousBySource.get(key) ?? null;
    const fp = propertyFingerprint(current);
    const propertyGroupId = previous?.property_group_id ?? (fp && fingerprintGroups.get(fp)) ?? groupIdFor(current, fp);
    if (fp && !fingerprintGroups.has(fp)) fingerprintGroups.set(fp, propertyGroupId);

    const listing = activateFromCurrent(current, previous, runAt);
    const action: LifecycleAction = !previous
      ? "insert"
      : previous.listing.source.content_hash === current.source.content_hash
        ? "unchanged"
        : "update";

    records.push({ source_key: key, property_group_id: propertyGroupId, listing, absence_runs: 0 });
    decisions.push({
      source_key: key,
      action,
      property_group_id: propertyGroupId,
      previous_hash: previous?.listing.source.content_hash ?? null,
      current_hash: current.source.content_hash,
    });
  }

  for (const previous of previousRecords) {
    if (currentBySource.has(previous.source_key)) continue;

    if (!inScope(previous, scope)) {
      records.push(previous);
      decisions.push({
        source_key: previous.source_key,
        action: "out_of_scope",
        property_group_id: previous.property_group_id,
        previous_hash: previous.listing.source.content_hash,
        current_hash: null,
      });
      continue;
    }

    const absenceRuns = previous.absence_runs + 1;
    const nextStatus: CollectionListing["status"] = absenceRuns >= config.inactive_after_missing_runs ? "inactive" : "stale";
    records.push({
      ...previous,
      absence_runs: absenceRuns,
      listing: { ...previous.listing, status: nextStatus },
    });
    decisions.push({
      source_key: previous.source_key,
      action: nextStatus === "inactive" ? "inactive" : "stale",
      property_group_id: previous.property_group_id,
      previous_hash: previous.listing.source.content_hash,
      current_hash: null,
    });
  }

  records.sort((a, b) => a.source_key.localeCompare(b.source_key));
  const counts: Record<LifecycleAction, number> = {
    insert: 0,
    unchanged: 0,
    update: 0,
    stale: 0,
    inactive: 0,
    out_of_scope: 0,
  };
  for (const decision of decisions) counts[decision.action] += 1;

  return { records, decisions, counts };
}

export function purgePortalSource(records: LifecycleRecord[], sourceName: string): { kept: LifecycleRecord[]; purged: LifecycleRecord[] } {
  const purged: LifecycleRecord[] = [];
  const kept: LifecycleRecord[] = [];
  for (const record of records) {
    if (record.listing.source.name === sourceName && record.listing.provenance.source_type === "portal") purged.push(record);
    else kept.push(record);
  }
  return { kept, purged };
}
