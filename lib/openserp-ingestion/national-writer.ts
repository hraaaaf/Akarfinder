// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — sections 16-17.
// Extends the existing, validated write path (pipeline.ts's
// buildOpenSerpPropertyRow + upsert-on-unique-constraint idempotence) with:
//   - a discovery_candidates row per classified result (admitted or not);
//   - the new listing_sources columns (origin_type, content_fingerprint,
//     ingestion_run_id, displayed_price/price_currency/price_status);
//   - exactly one property_clusters + one property_cluster_members row per
//     NEW listing_sources row, cluster_origin = "deterministic_same_source_identifier".
//
// Idempotence: every insert here goes through Supabase upsert() targeting the
// table's own pre-existing unique constraint (discovery_candidates:
// (provider, query_hash, canonical_url); listing_sources: (listing_url);
// property_clusters: (legacy_property_listing_id); property_cluster_members:
// (property_cluster_id, source_offer_id)). A rerun with the same candidates
// therefore produces zero new rows anywhere — proven by the same mechanism
// already validated for property_listings/listing_sources by
// runPostWriteIdempotenceCheck in pipeline.ts, extended here to the two new
// tables. IDs are DB-generated (gen_random_uuid()); this deliberately departs
// from the ODM's own illustrative UUIDv5 pseudocode (section 16) in favor of
// the pattern already used everywhere else in this codebase for these exact
// tables (every InMemory*Repository in market-index-repository.ts creates
// rows via DB-generated id + a separate idempotency key, never a client
// UUIDv5) — the guarantee (same input never produces two rows) is identical;
// only the mechanism differs. See docs/OPENSERP_AUTOMATED_INGESTION_ARCHITECTURE.md.

import { createHash } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { buildOpenSerpPropertyRow } from "./pipeline";
import type { OpenSerpListingCandidate } from "./types";
import { classifyPrice } from "@/lib/market-index/market-index-price";
import { computeContentFingerprint, computeQueryHash } from "@/lib/market-index/market-index-identifiers";
import { assertOpenSerpOriginIsNeverPartnerFacing } from "@/lib/market-index/market-index-provenance";
import type { AdmissionDecision } from "./national-admission";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export type NationalWriteInput = {
  runId: string;
  decisions: AdmissionDecision[];
};

export type NationalWriteResult = {
  discovery_candidates_written: number;
  discovery_candidates_accepted: number;
  discovery_candidates_rejected: number;
  discovery_candidates_unclassified: number;
  new_property_listings: number;
  updated_property_listings: number;
  new_listing_sources: number;
  updated_listing_sources: number;
  new_clusters: number;
  new_memberships: number;
  multi_source_clusters_created: 0;
  observations_created: 0;
  write_errors: Array<{ candidate_url: string; error: string }>;
};

function discoveryStatusFor(decision: AdmissionDecision): "accepted" | "rejected" | "unclassified" {
  if (decision.admitted) return "accepted";
  if (decision.classified?.classification_lane === "reject_out_of_scope") return "rejected";
  return "unclassified";
}

function chunk<T>(values: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

export async function writeNationalDiscoveryCandidates(input: NationalWriteInput): Promise<{
  written: number;
  accepted: number;
  rejected: number;
  unclassified: number;
}> {
  const supabase = getSupabaseServerClient();
  const allRows = input.decisions
    .filter((decision) => decision.classified !== null)
    .map((decision) => {
      const classified = decision.classified!;
      const queryHash = computeQueryHash("openserp", classified.query_id);
      return {
        provider: "openserp",
        discovery_query: classified.query_id,
        query_hash: queryHash,
        result_rank: classified.rank,
        source_domain: classified.source_domain,
        source_url: classified.original_url,
        canonical_url: classified.canonical_source_url,
        title: classified.title,
        snippet: classified.snippet,
        discovered_at: classified.discovered_at,
        last_seen_at: new Date().toISOString(),
        discovery_status: discoveryStatusFor(decision),
        content_fingerprint: computeContentFingerprint(classified.title, classified.snippet),
        metadata: {
          ingestion_run_id: input.runId,
          engine: classified.engine,
          domain_status: decision.domain_status,
          admission_confidence: decision.confidence,
          admission_reasons: decision.reasons,
        },
      };
    });

  // Dedupe WITHIN this run's own batch on the same (provider, query_hash,
  // canonical_url) idempotency key the DB enforces. Found necessary during
  // this mission's own Wave 1 apply: a single SERP result page can list the
  // same canonical URL twice (e.g. a sponsored + organic slot), which
  // passed every earlier de-dup step (those only checked against rows
  // already IN the database) but still produced two identical-key rows in
  // one INSERT, violating the unique index outright. Keeps the last
  // occurrence (freshest rank/metadata for that key).
  const rows = [...new Map(allRows.map((row) => [`${row.provider}::${row.query_hash}::${row.canonical_url}`, row])).values()];

  let accepted = 0;
  let rejected = 0;
  let unclassified = 0;
  for (const row of rows) {
    if (row.discovery_status === "accepted") accepted += 1;
    else if (row.discovery_status === "rejected") rejected += 1;
    else unclassified += 1;
  }

  // discovery_candidates_idempotency_idx is a PARTIAL unique index
  // (`where canonical_url is not null`) -- confirmed via Gate B (real
  // PostgreSQL 18.2) that a plain upsert(onConflict:...) fails against it
  // ("no unique or exclusion constraint matching the ON CONFLICT
  // specification"): Postgres requires the INSERT's own ON CONFLICT clause
  // to declare the same predicate to use a partial index for conflict
  // inference, which the Supabase/PostgREST upsert API has no way to
  // express. Every row here always has a non-null canonical_url in
  // practice (classifyOpenSerpResult already drops any result whose URL
  // fails to canonicalize before it becomes a candidate at all), so a
  // manual select-then-split-insert/update achieves the identical
  // idempotency guarantee without relying on that partial index as an
  // ON CONFLICT target.
  for (const batch of chunk(rows, 25)) {
    const keys = batch.map((row) => `${row.provider}::${row.query_hash}::${row.canonical_url}`);
    const existingResult = await supabase
      .from("discovery_candidates")
      .select("id, provider, query_hash, canonical_url")
      .in("canonical_url", batch.map((row) => row.canonical_url));
    if (existingResult.error) throw new Error(`discovery_candidates lookup failed: ${existingResult.error.message}`);
    const existingByKey = new Map(
      (existingResult.data as Array<{ id: string; provider: string; query_hash: string; canonical_url: string }>).map((row) => [
        `${row.provider}::${row.query_hash}::${row.canonical_url}`,
        row.id,
      ]),
    );

    const toInsert = batch.filter((row, i) => !existingByKey.has(keys[i]));
    const toUpdate = batch
      .map((row, i) => ({ row, id: existingByKey.get(keys[i]) }))
      .filter((entry): entry is { row: (typeof batch)[number]; id: string } => entry.id !== undefined);

    if (toInsert.length > 0) {
      const insertResult = await supabase.from("discovery_candidates").insert(toInsert);
      if (insertResult.error) throw new Error(`discovery_candidates insert failed: ${insertResult.error.message}`);
    }
    for (const { row, id } of toUpdate) {
      const updateResult = await supabase
        .from("discovery_candidates")
        .update({
          last_seen_at: row.last_seen_at,
          discovery_status: row.discovery_status,
          result_rank: row.result_rank,
          title: row.title,
          snippet: row.snippet,
          metadata: row.metadata,
        })
        .eq("id", id);
      if (updateResult.error) throw new Error(`discovery_candidates update failed: ${updateResult.error.message}`);
    }
  }

  return { written: rows.length, accepted, rejected, unclassified };
}

export async function writeNationalAdmittedListings(input: NationalWriteInput): Promise<
  Omit<NationalWriteResult, "discovery_candidates_written" | "discovery_candidates_accepted" | "discovery_candidates_rejected" | "discovery_candidates_unclassified">
> {
  const supabase = getSupabaseServerClient();
  const admitted = input.decisions.filter((decision) => decision.admitted && decision.classified);
  const writeErrors: Array<{ candidate_url: string; error: string }> = [];

  if (admitted.length === 0) {
    return {
      new_property_listings: 0,
      updated_property_listings: 0,
      new_listing_sources: 0,
      updated_listing_sources: 0,
      new_clusters: 0,
      new_memberships: 0,
      multi_source_clusters_created: 0,
      observations_created: 0,
      write_errors: [],
    };
  }

  const now = new Date().toISOString();
  const candidates: OpenSerpListingCandidate[] = admitted.map((decision) => {
    const classified = decision.classified!;
    const fingerprint = sha256(`openserp:${classified.canonical_source_url}`);
    return {
      ...classified,
      candidate_id: `openserp_${fingerprint.slice(0, 16)}`,
      canonical_fingerprint: fingerprint,
      seen_query_ids: [classified.query_id],
      seen_run_ids: [input.runId],
    };
  });

  const fingerprints = [...new Set(candidates.map((c) => c.canonical_fingerprint))];
  const urls = [...new Set(candidates.map((c) => c.canonical_source_url))];

  const existingProperties: Array<{ id: number; canonical_fingerprint: string }> = [];
  for (const batch of chunk(fingerprints, 25)) {
    const response = await supabase.from("property_listings").select("id, canonical_fingerprint").in("canonical_fingerprint", batch);
    if (response.error) throw new Error(response.error.message);
    existingProperties.push(...(response.data as Array<{ id: number; canonical_fingerprint: string }>));
  }
  const existingPropertyByFingerprint = new Map(existingProperties.map((row) => [row.canonical_fingerprint, row.id]));

  const existingSources: Array<{ id: number; listing_url: string; property_listing_id: number; first_seen_at: string }> = [];
  for (const batch of chunk(urls, 25)) {
    const response = await supabase
      .from("listing_sources")
      .select("id, listing_url, property_listing_id, first_seen_at")
      .in("listing_url", batch);
    if (response.error) throw new Error(response.error.message);
    existingSources.push(
      ...(response.data as Array<{ id: number; listing_url: string; property_listing_id: number; first_seen_at: string }>),
    );
  }
  const existingSourceByUrl = new Map(existingSources.map((row) => [row.listing_url, row]));

  let newPropertyListings = 0;
  let updatedPropertyListings = 0;
  let newListingSources = 0;
  let updatedListingSources = 0;
  let newClusters = 0;
  let newMemberships = 0;

  for (const batch of chunk(candidates, 25)) {
    try {
      const propertyPayload = batch.map((candidate) => buildOpenSerpPropertyRow(candidate, now));
      const propertyUpsert = await supabase
        .from("property_listings")
        .upsert(propertyPayload, { onConflict: "canonical_fingerprint" })
        .select("id, canonical_fingerprint");
      if (propertyUpsert.error) throw new Error(propertyUpsert.error.message);

      const propertyIdByFingerprint = new Map(
        (propertyUpsert.data as Array<{ id: number; canonical_fingerprint: string }>).map((row) => [row.canonical_fingerprint, row.id]),
      );

      for (const fingerprint of propertyIdByFingerprint.keys()) {
        if (existingPropertyByFingerprint.has(fingerprint)) updatedPropertyListings += 1;
        else newPropertyListings += 1;
      }

      const sourceRows = batch.flatMap((candidate) => {
        const propertyId = propertyIdByFingerprint.get(candidate.canonical_fingerprint);
        if (!propertyId) return [];
        const priceClassification = classifyPrice(candidate.extracted.price_mad);
        assertOpenSerpOriginIsNeverPartnerFacing(true, "persisted_openserp");
        return [
          {
            property_listing_id: propertyId,
            source_name: candidate.source_domain.replace(/\.[a-z.]+$/, "").replace(/[^a-z0-9-]+/g, "-"),
            listing_url: candidate.canonical_source_url,
            source_url: candidate.original_url,
            first_seen_at: existingSourceByUrl.get(candidate.canonical_source_url)?.first_seen_at ?? now,
            last_seen_at: now,
            is_active: true,
            origin_type: "persisted_openserp",
            source_offer_key: null,
            compliance_status: null,
            content_fingerprint: computeContentFingerprint(candidate.title, candidate.snippet),
            ingestion_run_id: input.runId,
            displayed_price: priceClassification.value,
            price_currency: priceClassification.status === "valid" ? "MAD" : null,
            price_period: null,
            price_status: priceClassification.status,
          },
        ];
      });

      const sourceUpsert = await supabase
        .from("listing_sources")
        .upsert(sourceRows, { onConflict: "listing_url" })
        .select("id, listing_url, property_listing_id");
      if (sourceUpsert.error) throw new Error(sourceUpsert.error.message);

      const sourceIdByUrl = new Map(
        (sourceUpsert.data as Array<{ id: number; listing_url: string; property_listing_id: number }>).map((row) => [
          row.listing_url,
          row,
        ]),
      );

      for (const url of sourceIdByUrl.keys()) {
        if (existingSourceByUrl.has(url)) updatedListingSources += 1;
        else newListingSources += 1;
      }

      // 1:1 cluster + membership per SourceOffer — never merges two
      // SourceOffers into one cluster; never consults the legacy P5A
      // heuristic field this project has already proven unreliable.
      const clusterPayload = [...sourceIdByUrl.values()].map((source) => ({
        cluster_origin: "deterministic_same_source_identifier",
        legacy_property_listing_id: source.property_listing_id,
        created_by: `openserp-ingestion:${input.runId}`,
      }));

      if (clusterPayload.length > 0) {
        const clusterUpsert = await supabase
          .from("property_clusters")
          .upsert(clusterPayload, { onConflict: "legacy_property_listing_id" })
          .select("id, legacy_property_listing_id");
        if (clusterUpsert.error) throw new Error(clusterUpsert.error.message);

        const clusterIdByListingId = new Map(
          (clusterUpsert.data as Array<{ id: string; legacy_property_listing_id: number }>).map((row) => [
            row.legacy_property_listing_id,
            row.id,
          ]),
        );

        newClusters += clusterPayload.filter(
          (c) => !existingSources.some((s) => s.property_listing_id === c.legacy_property_listing_id),
        ).length;

        const memberPayload = [...sourceIdByUrl.values()]
          .map((source) => {
            const clusterId = clusterIdByListingId.get(source.property_listing_id);
            if (!clusterId) return null;
            return {
              property_cluster_id: clusterId,
              source_offer_id: source.id,
              origin_type: "deterministic_same_source_identifier",
              added_by: `openserp-ingestion:${input.runId}`,
            };
          })
          .filter((row): row is NonNullable<typeof row> => row !== null);

        if (memberPayload.length > 0) {
          const memberUpsert = await supabase
            .from("property_cluster_members")
            .upsert(memberPayload, { onConflict: "property_cluster_id,source_offer_id", ignoreDuplicates: true });
          if (memberUpsert.error) throw new Error(memberUpsert.error.message);
          newMemberships += memberPayload.length;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const candidate of batch) {
        writeErrors.push({ candidate_url: candidate.canonical_source_url, error: message });
      }
    }
  }

  return {
    new_property_listings: newPropertyListings,
    updated_property_listings: updatedPropertyListings,
    new_listing_sources: newListingSources,
    updated_listing_sources: updatedListingSources,
    new_clusters: newClusters,
    new_memberships: newMemberships,
    multi_source_clusters_created: 0,
    observations_created: 0,
    write_errors: writeErrors,
  };
}

export async function writeNationalIngestionRun(input: NationalWriteInput): Promise<NationalWriteResult> {
  const discovery = await writeNationalDiscoveryCandidates(input);
  const listings = await writeNationalAdmittedListings(input);
  return {
    discovery_candidates_written: discovery.written,
    discovery_candidates_accepted: discovery.accepted,
    discovery_candidates_rejected: discovery.rejected,
    discovery_candidates_unclassified: discovery.unclassified,
    ...listings,
  };
}
