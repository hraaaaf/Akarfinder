import fs from "node:fs";
import path from "node:path";

import { resolveDetailSemanticEvidence } from "../data-ingestion/sources/mubawab/ambiguity-resolution";
import { extractMubawabCollectionListing } from "../data-ingestion/sources/mubawab/extractor";
import { fetchHtml, isAllowedByRobots } from "./scrapers/utils/fetch-html";

type AmbiguousCard = {
  source_id: string;
  url: string;
  route_url: string;
  title_text: string | null;
  card_text: string | null;
  property_type_candidates: string[];
  offer_scope_candidate?: "whole_property" | "room" | null;
};

type CardProof = {
  ambiguous_cards_for_human_gate: AmbiguousCard[];
};

const INPUT = path.resolve("data-ingestion/runs/mubawab/phase0-residual-card-probe/proof.json");
const OUT_DIR = path.resolve("data-ingestion/runs/mubawab/phase0-residual-detail-probe");
const OUT_FILE = path.join(OUT_DIR, "proof.json");
const DELAY_MS = 2750;
const DEFAULT_MAX_DETAILS = 5;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function positiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1 || value > 10) throw new Error(`invalid_MAX_DETAIL_LOOKUPS:${raw}`);
  return value;
}

function isSourceBlock(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /^HTTP (403|429)\b/.test(message);
}

async function main() {
  const maxDetails = positiveInt(process.env.MAX_DETAIL_LOOKUPS, DEFAULT_MAX_DETAILS);
  const cardProof = JSON.parse(fs.readFileSync(INPUT, "utf8")) as CardProof;
  const candidates = cardProof.ambiguous_cards_for_human_gate.slice(0, maxDetails);

  const resolved = [] as Array<Record<string, unknown>>;
  const humanReview = [] as Array<Record<string, unknown>>;
  const skipped = [] as Array<Record<string, unknown>>;
  const requestedUrls: string[] = [];
  let sourceBlocked = false;

  for (let index = 0; index < candidates.length; index++) {
    const card = candidates[index];
    const allowed = await isAllowedByRobots(card.url);
    if (!allowed) {
      humanReview.push({
        source_id: card.source_id,
        url: card.url,
        reason: "detail_robots_disallowed",
        card,
      });
      continue;
    }

    if (index > 0 && requestedUrls.length > 0) await sleep(DELAY_MS);

    try {
      const response = await fetchHtml(card.url, { timeoutMs: 20_000 });
      requestedUrls.push(card.url);
      const listing = extractMubawabCollectionListing(response.url, response.html);
      const semantic = resolveDetailSemanticEvidence({
        extractedPropertyType: listing.property_type,
        extractedTransaction: listing.transaction,
        routeUrl: card.route_url,
        title: listing.title,
        description: listing.description,
      });

      const evidence = {
        source_id: card.source_id,
        route_url: card.route_url,
        requested_url: card.url,
        final_url: response.url,
        card_title: card.title_text,
        detail_title: listing.title,
        detail_description: listing.description,
        city: listing.location.city,
        district: listing.location.district,
        semantic,
      };

      if (semantic.clear) resolved.push(evidence);
      else humanReview.push({ ...evidence, reason: "detail_semantics_still_ambiguous" });
    } catch (error) {
      if (isSourceBlock(error)) {
        sourceBlocked = true;
        skipped.push({ source_id: card.source_id, url: card.url, reason: "source_block", error: String(error) });
        break;
      }
      humanReview.push({
        source_id: card.source_id,
        url: card.url,
        reason: "detail_fetch_or_parse_failed",
        error: error instanceof Error ? error.message : String(error),
        card,
      });
    }
  }

  const proof = {
    generated_at: new Date().toISOString(),
    mode: "phase0_residual_detail_probe",
    safety: {
      ambiguous_cards_available: cardProof.ambiguous_cards_for_human_gate.length,
      max_detail_lookups: maxDetails,
      detail_pages_opened: requestedUrls.length,
      request_delay_ms: DELAY_MS,
      robots_checked_per_detail: true,
      source_blocked: sourceBlocked,
      database_writes: 0,
      production_writes: 0,
      image_downloads: 0,
      disallowed_pagination_requests: 0,
    },
    requested_urls: requestedUrls,
    resolved_count: resolved.length,
    human_review_count: humanReview.length,
    skipped_count: skipped.length,
    resolved,
    human_review_required: humanReview,
    skipped,
    remaining_ambiguous_not_opened: Math.max(0, cardProof.ambiguous_cards_for_human_gate.length - candidates.length),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));

  if (requestedUrls.length > maxDetails) throw new Error(`detail_budget_exceeded:${requestedUrls.length}`);
  if (sourceBlocked) throw new Error("phase0_detail_probe_source_blocked");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
