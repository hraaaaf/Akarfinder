import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  FirstWriteSelectionAlgorithmVersion,
  LockedFirstWriteManifest,
  OpenSerpListingCandidate,
} from "./types";
import { redactSensitiveText, scoreCompleteness, sha256 } from "./utils";

export const FIRST_WRITE_SELECTION_ALGORITHM_VERSION: FirstWriteSelectionAlgorithmVersion =
  "openserp-first-write-v1";

const ALLOWED_PUBLIC_SOURCE_DOMAINS = new Set([
  "1immo.ma",
  "agenz.ma",
  "avito.ma",
  "barnes-marrakech.com",
  "kawtarimmobilier.com",
  "limmobiliersansfrontieres.com",
  "logic-immo.com",
  "logicimmo.com",
  "marocannonces.com",
  "marrakechrealty.com",
  "mouldar.com",
  "mubawab.ma",
  "sarouty.ma",
]);

type CandidateSelection = {
  selectedCandidates: OpenSerpListingCandidate[];
  excludedCandidates: Array<{ candidate_id: string; reason: string }>;
};

function hasSensitiveValue(value: string | null | undefined): boolean {
  if (!value) return false;
  const redacted = redactSensitiveText(value);
  return (
    redacted.phone_hits > 0 ||
    redacted.whatsapp_hits > 0 ||
    redacted.personal_email_hits > 0 ||
    redacted.secret_hits > 0
  );
}

function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !/^(javascript|data):/i.test(value);
  } catch {
    return false;
  }
}

function rankCandidate(candidate: OpenSerpListingCandidate): number {
  const completeness = scoreCompleteness({
    title: candidate.title,
    city: candidate.extracted.city,
    district: candidate.extracted.district,
    transaction_type: candidate.extracted.transaction_type,
    property_type: candidate.extracted.property_type,
    price_mad: candidate.extracted.price_mad,
    surface_m2: candidate.extracted.surface_m2,
    bedrooms_count: candidate.extracted.bedrooms_count,
    short_description: candidate.extracted.short_description,
  });

  let score = completeness;
  if (candidate.extracted.price_mad != null) score += 15;
  if (candidate.extracted.surface_m2 != null) score += 10;
  if (candidate.extracted.district) score += 8;
  if (candidate.extracted.bedrooms_count != null) score += 4;
  score += Math.max(0, 20 - candidate.rank);
  score += Math.min(candidate.seen_query_ids.length, 4) * 2;
  return score;
}

function deterministicSort(a: OpenSerpListingCandidate, b: OpenSerpListingCandidate): number {
  const scoreDelta = rankCandidate(b) - rankCandidate(a);
  if (scoreDelta !== 0) return scoreDelta;

  const domainDelta = a.source_domain.localeCompare(b.source_domain);
  if (domainDelta !== 0) return domainDelta;

  const districtA = a.extracted.district ?? "";
  const districtB = b.extracted.district ?? "";
  const districtDelta = districtA.localeCompare(districtB);
  if (districtDelta !== 0) return districtDelta;

  return a.canonical_source_url.localeCompare(b.canonical_source_url);
}

function filterEligibleCandidates(candidates: OpenSerpListingCandidate[]): CandidateSelection {
  const selected: OpenSerpListingCandidate[] = [];
  const excluded: Array<{ candidate_id: string; reason: string }> = [];

  for (const candidate of candidates) {
    if (candidate.classification_lane !== "individual_listing") {
      excluded.push({ candidate_id: candidate.candidate_id, reason: "classification_not_individual" });
      continue;
    }
    if (!candidate.extracted.city || !["Casablanca", "Rabat", "Marrakech"].includes(candidate.extracted.city)) {
      excluded.push({ candidate_id: candidate.candidate_id, reason: "unsupported_city" });
      continue;
    }
    if (!ALLOWED_PUBLIC_SOURCE_DOMAINS.has(candidate.source_domain)) {
      excluded.push({ candidate_id: candidate.candidate_id, reason: "source_domain_not_publicly_allowed" });
      continue;
    }
    if (!isSafeExternalUrl(candidate.canonical_source_url) || !isSafeExternalUrl(candidate.original_url)) {
      excluded.push({ candidate_id: candidate.candidate_id, reason: "unsafe_external_url" });
      continue;
    }
    if (
      hasSensitiveValue(candidate.title) ||
      hasSensitiveValue(candidate.snippet) ||
      hasSensitiveValue(candidate.original_url)
    ) {
      excluded.push({ candidate_id: candidate.candidate_id, reason: "pii_or_secret_detected" });
      continue;
    }
    selected.push(candidate);
  }

  return { selectedCandidates: selected, excludedCandidates: excluded };
}

function pickCityBatch(
  city: "Casablanca" | "Rabat" | "Marrakech",
  candidates: OpenSerpListingCandidate[],
  target: number,
): OpenSerpListingCandidate[] {
  const perDomain = new Map<string, OpenSerpListingCandidate[]>();
  for (const candidate of candidates.filter((entry) => entry.extracted.city === city).sort(deterministicSort)) {
    const list = perDomain.get(candidate.source_domain) ?? [];
    list.push(candidate);
    perDomain.set(candidate.source_domain, list);
  }

  const domainNames = [...perDomain.keys()].sort();
  const picked: OpenSerpListingCandidate[] = [];

  while (picked.length < target) {
    let progressed = false;
    for (const domain of domainNames) {
      const list = perDomain.get(domain);
      if (!list || list.length === 0) continue;
      picked.push(list.shift()!);
      progressed = true;
      if (picked.length >= target) break;
    }
    if (!progressed) break;
  }

  return picked;
}

export async function loadCandidatesFromJsonl(path: string): Promise<OpenSerpListingCandidate[]> {
  const content = await readFile(path, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as OpenSerpListingCandidate);
}

export function selectFirstWriteCandidates(
  candidates: OpenSerpListingCandidate[],
  desiredTotal = 180,
): CandidateSelection & { cityTargets: { Casablanca: number; Rabat: number; Marrakech: number } } {
  const filtered = filterEligibleCandidates(candidates);
  const cityTargets = {
    Casablanca: 85,
    Rabat: 50,
    Marrakech: 45,
  };

  const picked = [
    ...pickCityBatch("Casablanca", filtered.selectedCandidates, cityTargets.Casablanca),
    ...pickCityBatch("Rabat", filtered.selectedCandidates, cityTargets.Rabat),
    ...pickCityBatch("Marrakech", filtered.selectedCandidates, cityTargets.Marrakech),
  ];

  const uniquePicked = [...new Map(picked.map((candidate) => [candidate.candidate_id, candidate])).values()];
  const remaining = filtered.selectedCandidates
    .filter((candidate) => !uniquePicked.some((pickedCandidate) => pickedCandidate.candidate_id === candidate.candidate_id))
    .sort(deterministicSort);

  while (uniquePicked.length < desiredTotal && remaining.length > 0) {
    uniquePicked.push(remaining.shift()!);
  }

  const unselectedEligible = filtered.selectedCandidates.filter(
    (candidate) => !uniquePicked.some((pickedCandidate) => pickedCandidate.candidate_id === candidate.candidate_id),
  );

  return {
    selectedCandidates: uniquePicked.slice(0, desiredTotal),
    excludedCandidates: [
      ...filtered.excludedCandidates,
      ...unselectedEligible.map((candidate) => ({
        candidate_id: candidate.candidate_id,
        reason: "not_selected_after_deterministic_ranking",
      })),
    ],
    cityTargets,
  };
}

export async function buildLockedFirstWriteManifest(input: {
  sourceRunId: string;
  firstWriteRunId: string;
  candidateFilePath: string;
  candidates: OpenSerpListingCandidate[];
  desiredTotal?: number;
}): Promise<{ manifest: LockedFirstWriteManifest; selectedCandidates: OpenSerpListingCandidate[]; candidateFileSha256: string }> {
  const candidateContent = await readFile(input.candidateFilePath, "utf8");
  const candidateFileSha256 = sha256(candidateContent);
  const selection = selectFirstWriteCandidates(input.candidates, input.desiredTotal ?? 180);

  const manifestBody = {
    source_run_id: input.sourceRunId,
    first_write_run_id: input.firstWriteRunId,
    generated_at: new Date().toISOString(),
    candidate_file_path: input.candidateFilePath.replace(/\\/g, "/"),
    candidate_file_sha256: candidateFileSha256,
    candidate_count: input.candidates.length,
    selected_count: selection.selectedCandidates.length,
    selection_algorithm_version: FIRST_WRITE_SELECTION_ALGORITHM_VERSION,
    selected_candidate_ids: selection.selectedCandidates.map((candidate) => candidate.candidate_id),
    selected_source_urls: selection.selectedCandidates.map((candidate) => candidate.canonical_source_url),
    excluded_candidate_ids: selection.excludedCandidates.map((candidate) => candidate.candidate_id),
    exclusion_reasons: Object.fromEntries(
      selection.excludedCandidates.map((candidate) => [candidate.candidate_id, candidate.reason]),
    ),
    city_targets: selection.cityTargets,
  };

  const manifestSha256 = sha256(JSON.stringify(manifestBody));
  return {
    manifest: {
      ...manifestBody,
      manifest_sha256: manifestSha256,
    },
    selectedCandidates: selection.selectedCandidates,
    candidateFileSha256,
  };
}

export async function resolveSelectedCandidatesFromLockedManifest(
  manifest: LockedFirstWriteManifest,
): Promise<OpenSerpListingCandidate[]> {
  const candidateFilePath = resolve(process.cwd(), manifest.candidate_file_path);
  const candidates = await loadCandidatesFromJsonl(candidateFilePath);
  const byId = new Map(candidates.map((candidate) => [candidate.candidate_id, candidate]));
  return manifest.selected_candidate_ids.map((candidateId) => {
    const candidate = byId.get(candidateId);
    if (!candidate) {
      throw new Error(`locked manifest candidate missing from corpus: ${candidateId}`);
    }
    return candidate;
  });
}
