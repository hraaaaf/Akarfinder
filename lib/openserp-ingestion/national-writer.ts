// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — sections 16-17.
// Extends the existing, validated write path (pipeline.ts's
// buildOpenSerpPropertyRow + upsert-on-unique-constraint idempotence) with:
//   - a discovery_candidates row per classified result (admitted or not);
//   - the new listing_sources columns (origin_type, content_fingerprint,
//     ingestion_run_id, displayed_price/price_currency/price_status);
//   - exactly one property_clusters + one property_cluster_members row per
//     NEW listing_sources row, cluster_origin = "deterministic_same_source_identifier".
//
// Idempotence: discovery_candidates uses the service-role PostgreSQL RPC
// upsert_discovery_candidates_batch so the partial idempotency index predicate
// is expressed by PostgreSQL itself, atomically. The remaining writes use
// Supabase upsert() targeting each table's pre-existing unique constraint
// (listing_sources: (listing_url); property_clusters:
// (legacy_property_listing_id); property_cluster_members:
// (property_cluster_id, source_offer_id)). IDs are DB-generated
// (gen_random_uuid()); this deliberately departs from the ODM's own
// illustrative UUIDv5 pseudocode (section 16) in favor of the pattern already
// used everywhere else in this codebase for these exact tables (every
// InMemory*Repository in market-index-repository.ts creates rows via
// DB-generated id + a separate idempotency key, never a client UUIDv5) — the
// guarantee (same input never produces two rows) is identical; only the
// mechanism differs. See docs/OPENSERP_AUTOMATED_INGESTION_ARCHITECTURE.md.

import { createHash } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { buildOpenSerpPropertyRow } from "./pipeline";
import type { OpenSerpListingCandidate } from "./types";
import { classifyPrice } from "@/lib/market-index/market-index-price";
import { computeContentFingerprint, computeQueryHash } from "@/lib/market-index/market-index-identifiers";
import { assertOpenSerpOriginIsNeverPartnerFacing } from "@/lib/market-index/market-index-provenance";
import type { AdmissionDecision } from "./national-admission";
import { dedupeByCanonicalFingerprint } from "./national-writer-dedupe";
// OPENSERP-SERVERLESS-DB-CALL-TIMEOUT-SAFETY-1 — Phase 8: every writer DB
// call is bounded through withDbTimeout (real .abortSignal() cancellation,
// budget-aware refusal when the caller supplies its TimeBudget via
// input.dbCtx, structured instrumentation).
import { withDbTimeout } from "./state/db-call-guard";
import type { DbCallContext } from "./state/query-rotation-state-repository";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

// Found necessary during this mission's own Wave 2 Production apply: at
// least 3 of 59 admitted candidates carried a wildly implausible extracted
// price (50,000,000 MAD; 312,490,000 MAD; 32,224,000 MAD for ordinary
// apartments) -- two distinct, unresolved root causes traced to
// utils.ts's parsePriceMad (shared with the pilot, not edited on a guess):
// a "X millions" snippet phrase that may mean millions of MAD OR millions
// of centimes (a real, unresolvable-from-text Moroccan pricing ambiguity),
// and a greedy regex span mashing unrelated leading digits (room/bathroom/
// bedroom icon counts) into the price capture. Rather than guess at a fix
// to shared extraction logic, this caps at a generous but real ceiling --
// even Casablanca's most expensive listed residential properties rarely
// exceed this -- and treats anything above it as unknown (null), never as
// a trusted, displayed number. The listing itself still gets admitted;
// only the untrustworthy price is discarded.
export const IMPLAUSIBLE_PRICE_CEILING_MAD = 30_000_000;

export function sanitizePriceMad(priceMad: number | null): number | null {
  if (priceMad === null) return null;
  if (priceMad > IMPLAUSIBLE_PRICE_CEILING_MAD) return null;
  return priceMad;
}

export type NationalWriteInput = {
  runId: string;
  decisions: AdmissionDecision[];
  dbCtx?: DbCallContext;
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
          // OPENSERP-YANDEX-DUAL-DISCOVERY-LANE-1: additive only. `provider`
          // stays the literal "openserp" above regardless of channel (see
          // that field's own comment history) so the existing
          // (provider, query_hash, canonical_url) idempotency key never
          // splits one real-world URL into two rows across channels --
          // per-channel provenance lives here instead, in this
          // unconstrained jsonb column. Falls back to a single-element
          // array derived from `engine` for every pre-existing caller that
          // never sets source_channels.
          source_channels: classified.source_channels ?? [classified.engine],
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

  // P0 incident fix: do not enumerate existing rows through PostgREST. One
  // canonical URL can legitimately have hundreds of provider/query keys, so
  // even a 25-URL lookup can exceed PostgREST's 1,000-row response cap and
  // misclassify existing keys as missing. The RPC performs INSERT ... ON
  // CONFLICT with the exact partial-index predicate inside PostgreSQL, which
  // is both atomic under concurrent writers and independent of result limits.
  // Keep the existing 25-row request chunk to bound payload/transaction size.
  const dbCtx = input.dbCtx ?? {};
  for (const batch of chunk(rows, 25)) {
    await withDbTimeout({
      callName: "writer_discovery_candidates_atomic_upsert",
      timeBudget: dbCtx.timeBudget,
      now: dbCtx.now,
      countRows: () => batch.length,
      run: async (signal) => {
        const result = await supabase
          .rpc("upsert_discovery_candidates_batch", { p_rows: batch })
          .abortSignal(signal);
        if (result.error) throw new Error(`discovery_candidates atomic upsert failed: ${result.error.message}`);
        const affected = Number(result.data);
        if (!Number.isFinite(affected) || affected !== batch.length) {
          throw new Error(`discovery_candidates atomic upsert count mismatch: expected=${batch.length} actual=${String(result.data)}`);
        }
        return batch;
      },
    });
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
  const rawCandidates: OpenSerpListingCandidate[] = admitted.map((decision) => {
    const classified = decision.classified!;
    const fingerprint = sha256(`openserp:${classified.canonical_source_url}`);
    return {
      ...classified,
      candidate_id: `openserp_${fingerprint.slice(0, 16)}`,
      canonical_fingerprint: fingerprint,
      seen_query_ids: [classified.query_id],
      seen_run_ids: [input.runId],
      extracted: { ...classified.extracted, price_mad: sanitizePriceMad(classified.extracted.price_mad) },
    };
  });
  // PostgreSQL rejects one INSERT .. ON CONFLICT DO UPDATE statement when
  // two input rows target the same UNIQUE canonical_fingerprint. The same
  // canonical URL may be admitted through multiple queries/engines in one
  // run, so collapse those duplicates before the 25-row property upserts.
  const candidates = dedupeByCanonicalFingerprint(rawCandidates);

  const fingerprints = [...new Set(candidates.map((c) => c.canonical_fingerprint))];
  const urls = [...new Set(candidates.map((c) => c.canonical_source_url))];

  const dbCtx = input.dbCtx ?? {};

  const existingProperties: Array<{ id: number; canonical_fingerprint: string }> = [];
  for (const batch of chunk(fingerprints, 25)) {
    const rows = await withDbTimeout({
      callName: "writer_property_fingerprint_lookup",
      timeBudget: dbCtx.timeBudget,
      now: dbCtx.now,
      countRows: (r: Array<{ id: number }>) => r.length,
      run: async (signal) => {
        const response = await supabase
          .from("property_listings")
          .select("id, canonical_fingerprint")
          .in("canonical_fingerprint", batch)
          .abortSignal(signal);
        if (response.error) throw new Error(response.error.message);
        return response.data as Array<{ id: number; canonical_fingerprint: string }>;
      },
    });
    existingProperties.push(...rows);
  }
  const existingPropertyByFingerprint = new Map(existingProperties.map((row) => [row.canonical_fingerprint, row.id]));

  const existingSources: Array<{ id: number; listing_url: string; property_listing_id: number; first_seen_at: string }> = [];
  for (const batch of chunk(urls, 25)) {
    const rows = await withDbTimeout({
      callName: "writer_listing_sources_lookup",
      timeBudget: dbCtx.timeBudget,
      now: dbCtx.now,
      countRows: (r: Array<{ id: number }>) => r.length,
      run: async (signal) => {
        const response = await supabase
          .from("listing_sources")
          .select("id, listing_url, property_listing_id, first_seen_at")
          .in("listing_url", batch)
          .abortSignal(signal);
        if (response.error) throw new Error(response.error.message);
        return response.data as Array<{ id: number; listing_url: string; property_listing_id: number; first_seen_at: string }>;
      },
    });
    existingSources.push(...rows);
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
      const propertyRows = await withDbTimeout({
        callName: "writer_property_listings_upsert",
        timeBudget: dbCtx.timeBudget,
        now: dbCtx.now,
        countRows: (r: Array<{ id: number }>) => r.length,
        run: async (signal) => {
          const propertyUpsert = await supabase
            .from("property_listings")
            .upsert(propertyPayload, { onConflict: "canonical_fingerprint" })
            .select("id, canonical_fingerprint")
            .abortSignal(signal);
          if (propertyUpsert.error) throw new Error(propertyUpsert.error.message);
          return propertyUpsert.data as Array<{ id: number; canonical_fingerprint: string }>;
        },
      });

      const propertyIdByFingerprint = new Map(propertyRows.map((row) => [row.canonical_fingerprint, row.id]));

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

      const sourceUpsertRows = await withDbTimeout({
        callName: "writer_listing_sources_upsert",
        timeBudget: dbCtx.timeBudget,
        now: dbCtx.now,
        countRows: (r: Array<{ id: number }>) => r.length,
        run: async (signal) => {
          const sourceUpsert = await supabase
            .from("listing_sources")
            .upsert(sourceRows, { onConflict: "listing_url" })
            .select("id, listing_url, property_listing_id")
            .abortSignal(signal);
          if (sourceUpsert.error) throw new Error(sourceUpsert.error.message);
          return sourceUpsert.data as Array<{ id: number; listing_url: string; property_listing_id: number }>;
        },
      });

      const sourceIdByUrl = new Map(sourceUpsertRows.map((row) => [row.listing_url, row]));

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
        const clusterRows = await withDbTimeout({
          callName: "writer_property_clusters_upsert",
          timeBudget: dbCtx.timeBudget,
          now: dbCtx.now,
          countRows: (r: Array<{ id: string }>) => r.length,
          run: async (signal) => {
            const clusterUpsert = await supabase
              .from("property_clusters")
              .upsert(clusterPayload, { onConflict: "legacy_property_listing_id" })
              .select("id, legacy_property_listing_id")
              .abortSignal(signal);
            if (clusterUpsert.error) throw new Error(clusterUpsert.error.message);
            return clusterUpsert.data as Array<{ id: string; legacy_property_listing_id: number }>;
          },
        });

        const clusterIdByListingId = new Map(clusterRows.map((row) => [row.legacy_property_listing_id, row.id]));

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
          await withDbTimeout({
            callName: "writer_cluster_members_upsert",
            timeBudget: dbCtx.timeBudget,
            now: dbCtx.now,
            countRows: () => memberPayload.length,
            run: async (signal) => {
              const memberUpsert = await supabase
                .from("property_cluster_members")
                .upsert(memberPayload, { onConflict: "property_cluster_id,source_offer_id", ignoreDuplicates: true })
                .abortSignal(signal);
              if (memberUpsert.error) throw new Error(memberUpsert.error.message);
              return memberPayload;
            },
          });
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