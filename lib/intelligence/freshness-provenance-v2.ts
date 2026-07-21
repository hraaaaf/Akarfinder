import type {
  AcquisitionChannel,
  CanonicalFact,
  CanonicalOfferV1,
  CanonicalPropertyV1,
  OfferOriginType,
  ProvenanceKind,
} from "../property-schema/core";
import {
  createUnavailableClaim,
  validateAnalysisClaim,
  type AnalysisClaimV1,
  type AnalysisConfidence,
  type AnalysisContractValidation,
  type AnalysisEvidenceV1,
} from "../analysis/analysis-contract";
import type { StructuredListingOrigin } from "./structured-listing-pipeline";

export const FRESHNESS_PROVENANCE_VERSION = "2.0" as const;

// Listing observation freshness is intentionally stricter than historical seed
// freshness (30/90 days). These thresholds describe how recently an authorized
// structured listing signal was observed; they never prove current availability.
export const LISTING_FRESH_MAX_AGE_DAYS = 7;
export const LISTING_AGING_MAX_AGE_DAYS = 30;

export type ListingFreshnessState = "fresh" | "aging" | "stale" | "unknown";

export type FreshnessVerificationChannel =
  | "first_party"
  | "partner_structured"
  | "authorized_source_observation"
  | "search_discovery"
  | "legacy_import"
  | "system_unknown";

export type AvailabilitySignalV2 =
  | "declared_available"
  | "explicitly_unavailable"
  | "not_currently_available"
  | "unknown";

export interface FreshnessProvenanceV2 {
  version: typeof FRESHNESS_PROVENANCE_VERSION;
  property_id: string;
  offer_id: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  source_updated_at: string | null;
  observation_age_days: number | null;
  freshness_state: ListingFreshnessState;
  freshness_score: number | null;
  verification_channel: FreshnessVerificationChannel;
  acquisition_channel: AcquisitionChannel | null;
  origin_type: OfferOriginType | null;
  availability_signal: AvailabilitySignalV2;
  availability_label: string;
  can_claim_current_availability: false;
  public_freshness_label: string;
  public_explanation: string;
  claim: AnalysisClaimV1;
  contract_validation: AnalysisContractValidation;
}

function parseIso(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function isoMin(values: Array<string | null | undefined>): string | null {
  const parsed = values
    .map((value) => ({ value: value ?? null, time: parseIso(value) }))
    .filter((item): item is { value: string; time: number } => item.value !== null && item.time !== null);
  if (parsed.length === 0) return null;
  parsed.sort((a, b) => a.time - b.time);
  return parsed[0].value;
}

function isoMax(values: Array<string | null | undefined>): string | null {
  const parsed = values
    .map((value) => ({ value: value ?? null, time: parseIso(value) }))
    .filter((item): item is { value: string; time: number } => item.value !== null && item.time !== null);
  if (parsed.length === 0) return null;
  parsed.sort((a, b) => b.time - a.time);
  return parsed[0].value;
}

function factObservationTimes(property: CanonicalPropertyV1, offer: CanonicalOfferV1 | null): string[] {
  const facts: Array<CanonicalFact<unknown> | undefined> = [
    property.facts.classification.property_type,
    property.facts.classification.market_segment,
    property.facts.location.city,
    property.facts.location.district,
    property.facts.surfaces.surface_total_m2,
    property.facts.surfaces.surface_habitable_m2,
    property.facts.surfaces.surface_built_m2,
    offer?.title,
    offer?.description,
    offer?.price_amount,
  ];
  return facts
    .map((fact) => fact?.observed_at ?? null)
    .filter((value): value is string => parseIso(value) !== null);
}

function mapVerificationChannel(
  acquisitionChannel: AcquisitionChannel | null,
  originType: OfferOriginType | null,
): FreshnessVerificationChannel {
  if (acquisitionChannel === "first_party_user" || originType === "first_party_user") return "first_party";
  if (
    acquisitionChannel === "partner_api" ||
    acquisitionChannel === "partner_feed" ||
    acquisitionChannel === "manual_partner" ||
    originType === "partner_api" ||
    originType === "partner_feed"
  ) return "partner_structured";
  if (
    acquisitionChannel === "source_page" ||
    originType === "authorized_static_page" ||
    originType === "persisted_openserp"
  ) return "authorized_source_observation";
  if (acquisitionChannel === "search_result") return "search_discovery";
  if (originType === "legacy_import") return "legacy_import";
  return "system_unknown";
}

function channelConfidence(channel: FreshnessVerificationChannel): AnalysisConfidence {
  switch (channel) {
    case "first_party":
    case "partner_structured":
    case "authorized_source_observation":
      return "high";
    case "search_discovery":
      return "medium";
    case "legacy_import":
      return "low";
    case "system_unknown":
      return "insufficient";
  }
}

function channelProvenance(channel: FreshnessVerificationChannel): ProvenanceKind {
  switch (channel) {
    case "legacy_import":
    case "system_unknown":
      return "INFERRED";
    default:
      return "DECLARED";
  }
}

function classifyFreshness(ageDays: number | null): ListingFreshnessState {
  if (ageDays == null) return "unknown";
  if (ageDays <= LISTING_FRESH_MAX_AGE_DAYS) return "fresh";
  if (ageDays <= LISTING_AGING_MAX_AGE_DAYS) return "aging";
  return "stale";
}

function scoreFreshness(state: ListingFreshnessState): number | null {
  switch (state) {
    case "fresh": return 100;
    case "aging": return 60;
    case "stale": return 20;
    case "unknown": return null;
  }
}

function freshnessLabel(state: ListingFreshnessState): string {
  switch (state) {
    case "fresh": return "Vu récemment";
    case "aging": return "Observation à actualiser";
    case "stale": return "Observation ancienne";
    case "unknown": return "Date d’observation inconnue";
  }
}

function availabilitySignal(offer: CanonicalOfferV1 | null): AvailabilitySignalV2 {
  if (!offer) return "unknown";
  if (["deleted", "unpublished", "inactive"].includes(offer.offer_status)) return "explicitly_unavailable";
  if (["sold", "rented", "withdrawn"].includes(offer.availability_status)) return "explicitly_unavailable";
  if (["reserved", "upcoming"].includes(offer.availability_status)) return "not_currently_available";
  if (offer.availability_status === "available") return "declared_available";
  return "unknown";
}

function availabilityLabel(signal: AvailabilitySignalV2): string {
  switch (signal) {
    case "declared_available": return "Disponibilité déclarée par la source";
    case "explicitly_unavailable": return "Indisponibilité déclarée";
    case "not_currently_available": return "Non disponible immédiatement selon la source";
    case "unknown": return "Disponibilité non confirmée";
  }
}

function buildFreshnessEvidence(
  offer: CanonicalOfferV1,
  channel: FreshnessVerificationChannel,
  lastSeenAt: string,
): AnalysisEvidenceV1 {
  const confidence = channelConfidence(channel);
  return {
    evidence_id: `${offer.offer_id}:last-observation`,
    provenance: channelProvenance(channel),
    confidence: confidence === "insufficient" ? "unknown" : confidence,
    verification_status: "unverified",
    visibility: "PUBLIC",
    source_ref: offer.canonical_source_url ?? offer.source_url ?? offer.source_id,
    observed_at: lastSeenAt,
    public_usable: true,
  };
}

function buildFreshnessClaim(input: {
  property: CanonicalPropertyV1;
  offer: CanonicalOfferV1 | null;
  state: ListingFreshnessState;
  ageDays: number | null;
  lastSeenAt: string | null;
  channel: FreshnessVerificationChannel;
  generatedAt: string;
}): { claim: AnalysisClaimV1; validation: AnalysisContractValidation } {
  if (!input.offer || input.state === "unknown" || input.ageDays == null || !input.lastSeenAt) {
    const claim = createUnavailableClaim({
      claim_id: `freshness:${input.property.property_id}`,
      domain: "freshness",
      label: "Fraîcheur inconnue",
      explanation: "Aucune date d’observation exploitable ne permet de qualifier la récence de cette offre.",
      generated_at: input.generatedAt,
    });
    return { claim, validation: validateAnalysisClaim(claim) };
  }

  const baseConfidence = channelConfidence(input.channel);
  const confidence: AnalysisConfidence = input.state === "stale"
    ? "low"
    : input.state === "aging" && baseConfidence === "high"
      ? "medium"
      : baseConfidence === "insufficient"
        ? "low"
        : baseConfidence;

  const roundedAge = Math.max(0, Math.floor(input.ageDays));
  const claim: AnalysisClaimV1 = {
    contract_version: "1.0",
    claim_id: `freshness:${input.property.property_id}`,
    domain: "freshness",
    label: freshnessLabel(input.state),
    explanation: `Dernière observation connue il y a ${roundedAge} jour${roundedAge === 1 ? "" : "s"}. Cette information décrit la récence de l’observation et ne confirme pas la disponibilité actuelle du bien.`,
    strength: "calculated",
    confidence,
    evidence: [buildFreshnessEvidence(input.offer, input.channel, input.lastSeenAt)],
    assumptions: ["La date retenue correspond au dernier signal d’observation structuré disponible dans le pipeline canonique."],
    limitations: ["Une observation récente ne prouve pas que l’offre est toujours commercialisée au moment de la consultation."],
    generated_at: input.generatedAt,
  };
  const validation = validateAnalysisClaim(claim);
  if (validation.valid) return { claim, validation };

  const safeClaim = createUnavailableClaim({
    claim_id: `freshness:${input.property.property_id}`,
    domain: "freshness",
    label: "Fraîcheur indisponible",
    explanation: "Le signal de fraîcheur n’a pas satisfait le contrat d’analyse public.",
    generated_at: input.generatedAt,
  });
  return { claim: safeClaim, validation: validateAnalysisClaim(safeClaim) };
}

export function evaluateFreshnessProvenanceV2(
  property: CanonicalPropertyV1,
  offer: CanonicalOfferV1 | null,
  origin: StructuredListingOrigin,
  generatedAt = new Date().toISOString(),
): FreshnessProvenanceV2 {
  const acquisitionChannel = offer?.acquisition_channel ?? null;
  const originType = offer?.origin_type ?? null;
  const verificationChannel = mapVerificationChannel(acquisitionChannel, originType);

  // Legacy adapters stamp facts when they are mapped, not when the source was
  // actually observed. Using those adapter timestamps would manufacture
  // freshness, so legacy_db is deliberately excluded from the fact fallback.
  const factTimes = origin === "legacy_db" ? [] : factObservationTimes(property, offer);

  const firstSeenAt = offer
    ? isoMin([offer.first_observed_at, ...factTimes])
    : isoMin(factTimes);
  const lastSeenAt = offer
    ? isoMax([offer.last_observed_at, ...factTimes])
    : isoMax(factTimes);
  const sourceUpdatedAt = offer?.updated_at_source && parseIso(offer.updated_at_source) !== null
    ? offer.updated_at_source
    : null;

  const generatedTime = parseIso(generatedAt) ?? Date.now();
  const lastSeenTime = parseIso(lastSeenAt);
  const ageDays = lastSeenTime == null
    ? null
    : Math.max(0, Number(((generatedTime - lastSeenTime) / 86_400_000).toFixed(2)));
  const state = classifyFreshness(ageDays);
  const availability = availabilitySignal(offer);
  const { claim, validation } = buildFreshnessClaim({
    property,
    offer,
    state,
    ageDays,
    lastSeenAt,
    channel: verificationChannel,
    generatedAt,
  });

  return {
    version: FRESHNESS_PROVENANCE_VERSION,
    property_id: property.property_id,
    offer_id: offer?.offer_id ?? null,
    first_seen_at: firstSeenAt,
    last_seen_at: lastSeenAt,
    source_updated_at: sourceUpdatedAt,
    observation_age_days: ageDays,
    freshness_state: state,
    freshness_score: scoreFreshness(state),
    verification_channel: verificationChannel,
    acquisition_channel: acquisitionChannel,
    origin_type: originType,
    availability_signal: availability,
    availability_label: availabilityLabel(availability),
    can_claim_current_availability: false,
    public_freshness_label: freshnessLabel(state),
    public_explanation: claim.explanation,
    claim,
    contract_validation: validation,
  };
}
