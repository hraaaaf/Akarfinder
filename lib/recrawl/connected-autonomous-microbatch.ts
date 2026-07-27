import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchAuthorizedSource, MUBAWAB_CONTROLLED_POLICY } from "./authorized-source-adapter.js";
import {
  runAutonomousMicrobatch,
  type AutonomousMicrobatchReport,
  type AutonomousMicrobatchRepository,
  type MicrobatchJobResult,
} from "./autonomous-microbatch.js";
import type { ClaimedRecrawl } from "./recrawl-worker.js";
import { robotsAllows } from "./robots-policy.js";

export type ConnectedMicrobatchDependencies = {
  supabase: SupabaseClient;
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

type SourceOfferRow = {
  id: number;
  source_name: string;
  listing_url: string;
};

function requireData<T>(data: T | null, error: { message: string } | null, context: string): T {
  if (error) throw new Error(`${context}:${error.message}`);
  if (data == null) throw new Error(`${context}:missing_data`);
  return data;
}

export function createConnectedMicrobatchRepository(
  dependencies: ConnectedMicrobatchDependencies,
): AutonomousMicrobatchRepository {
  return {
    async claimDue(input) {
      const { data, error } = await dependencies.supabase.rpc("claim_due_recrawl_jobs_for_source_v1", {
        p_worker_id: input.worker_id,
        p_source_key: input.source_key,
        p_limit: input.limit,
        p_now: input.now,
        p_lease_minutes: 15,
      });
      return requireData(data, error, "claim_due_recrawl_jobs_for_source_v1") as ClaimedRecrawl[];
    },
    async releaseClaim(input) {
      const { data, error } = await dependencies.supabase.rpc("release_recrawl_claim", {
        p_source_offer_id: input.job.source_offer_id,
        p_lease_token: input.job.lease_token,
        p_reason: input.reason,
      });
      const released = requireData(data, error, "release_recrawl_claim");
      if (released !== true) throw new Error("release_recrawl_claim:not_released");
    },
  };
}

async function resolveSourceOffer(
  dependencies: ConnectedMicrobatchDependencies,
  job: ClaimedRecrawl,
): Promise<SourceOfferRow> {
  const { data, error } = await dependencies.supabase
    .from("listing_sources")
    .select("id,source_name,listing_url")
    .eq("id", job.source_offer_id)
    .eq("source_name", "mubawab")
    .single();
  return requireData(data, error, "resolve_source_offer") as SourceOfferRow;
}

async function assertRobotsAllowed(
  dependencies: ConnectedMicrobatchDependencies,
  listingUrl: string,
): Promise<void> {
  const target = new URL(listingUrl);
  const response = await (dependencies.fetchImpl ?? fetch)(`${target.origin}/robots.txt`, {
    method: "GET",
    redirect: "error",
    headers: {
      "user-agent": MUBAWAB_CONTROLLED_POLICY.userAgent,
      accept: "text/plain",
    },
  });
  if (!response.ok) throw new Error(`robots_fetch_failed_${response.status}`);
  const robotsText = await response.text();
  if (!robotsAllows(robotsText, `${target.pathname}${target.search}`)) {
    throw new Error("robots_detail_path_disallowed");
  }
}

export function createConnectedMicrobatchExecutor(dependencies: ConnectedMicrobatchDependencies) {
  return {
    async execute(job: ClaimedRecrawl): Promise<MicrobatchJobResult> {
      if (job.source_key !== "mubawab") throw new Error("connected_executor_source_not_allowed");
      const startedAt = (dependencies.now ?? (() => new Date()))();
      const source = await resolveSourceOffer(dependencies, job);
      await assertRobotsAllowed(dependencies, source.listing_url);
      const observation = await fetchAuthorizedSource({
        policy: MUBAWAB_CONTROLLED_POLICY,
        url: source.listing_url,
        fetchImpl: dependencies.fetchImpl,
        now: dependencies.now,
      });
      const completedAt = (dependencies.now ?? (() => new Date()))();
      const attemptKey = createHash("sha256")
        .update(`${job.source_offer_id}:${job.lease_token}:${observation.contentFingerprint}`)
        .digest("hex");

      const { data, error } = await dependencies.supabase.rpc("commit_transactional_recrawl_observation_v1", {
        p_attempt_key: attemptKey,
        p_source_offer_id: job.source_offer_id,
        p_source_key: job.source_key,
        p_worker_id: job.leased_by,
        p_lease_token: job.lease_token,
        p_started_at: startedAt.toISOString(),
        p_completed_at: completedAt.toISOString(),
        p_http_status: observation.httpStatus,
        p_observed_at: observation.fetchedAt,
        p_displayed_price: observation.displayedPrice,
        p_currency: observation.currency,
        p_surface_m2: observation.surfaceM2,
        p_title_fingerprint: observation.titleFingerprint,
        p_content_fingerprint: observation.contentFingerprint,
        p_source_status: observation.sourceStatus,
        p_availability_claim: null,
        p_observation_origin: "autonomous_recrawl_microbatch_v1",
        p_ingestion_run_id: null,
        p_city: job.city,
        p_metadata: {
          source_url: source.listing_url,
          bytes_read: observation.bytesRead,
          content_type: observation.contentType,
          publication_eligible: false,
        },
      });
      const committed = requireData(data, error, "commit_transactional_recrawl_observation_v1") as {
        observation_id: string;
        observation_inserted: boolean;
        event_keys: string[];
        publication_eligible: boolean;
      };
      if (committed.publication_eligible !== false) {
        throw new Error("transactional_rpc_publication_invariant_violated");
      }
      return {
        source_offer_id: job.source_offer_id,
        source_key: job.source_key,
        outcome: committed.observation_inserted ? "committed" : "unchanged",
        observation_id: committed.observation_id,
        event_count: committed.event_keys.length,
        publication_eligible: false,
      };
    },
  };
}

export async function runConnectedAutonomousMicrobatch(input: {
  dependencies: ConnectedMicrobatchDependencies;
  worker_id: string;
  limit: number;
  now: string;
  dry_run?: boolean;
}): Promise<AutonomousMicrobatchReport> {
  return runAutonomousMicrobatch({
    repository: createConnectedMicrobatchRepository(input.dependencies),
    executor: createConnectedMicrobatchExecutor(input.dependencies),
    worker_id: input.worker_id,
    source_key: "mubawab",
    limit: input.limit,
    now: input.now,
    dry_run: input.dry_run,
  });
}
