import { createHash } from "node:crypto";
import type { PartnerMappedRow } from "./canonical-mapping.js";

export const PARTNER_DEDUP_VERSION = "b3.4.4-v1" as const;
export type DedupDecision = "invalid" | "new_property" | "new_offer" | "update_offer" | "duplicate" | "manual_review";

export type ExistingOfferCandidate = {
  property_id: string;
  offer_id: string;
  source_kind: string;
  external_reference?: string | null;
  declared_facts: Record<string, string | number | boolean>;
  content_fingerprint?: string | null;
};

export type DedupResult = {
  version: typeof PARTNER_DEDUP_VERSION;
  decision: DedupDecision;
  confidence: "none" | "low" | "medium" | "high";
  property_fingerprint: string | null;
  offer_fingerprint: string | null;
  matched_property_id: string | null;
  matched_offer_id: string | null;
  reasons: string[];
  publication_eligible: false;
};

const text = (facts: Record<string, string | number | boolean>, key: string) => String(facts[key] ?? "").trim().toLocaleLowerCase("fr");
const number = (facts: Record<string, string | number | boolean>, key: string) => Number(facts[key] ?? 0);
const round = (value: number, step: number) => Math.round(value / step) * step;
const hash = (parts: unknown[]) => createHash("sha256").update(JSON.stringify(parts)).digest("hex");

export function buildPropertyFingerprint(facts: Record<string, string | number | boolean>): string | null {
  const city = text(facts, "location.city");
  const type = text(facts, "classification.property_type");
  const surface = number(facts, "surfaces.surface_total_m2");
  if (!city || !type || !(surface > 0)) return null;
  return hash([city, text(facts, "location.neighborhood"), type, round(surface, 5), number(facts, "layout.bedrooms_count")]);
}

export function buildOfferFingerprint(facts: Record<string, string | number | boolean>, externalReference: string | null): string | null {
  const property = buildPropertyFingerprint(facts);
  const transaction = text(facts, "offer.transaction_type");
  if (!property || !transaction) return null;
  return hash([property, transaction, externalReference ?? "", round(number(facts, "offer.price_amount"), 1000)]);
}

function materiallyChanged(a: Record<string, string | number | boolean>, b: Record<string, string | number | boolean>): boolean {
  const keys = ["offer.price_amount", "description.public_text", "condition.condition", "layout.bedrooms_count", "layout.bathrooms_count"];
  return keys.some((key) => String(a[key] ?? "") !== String(b[key] ?? ""));
}

export function decidePartnerDedup(row: PartnerMappedRow, candidates: ExistingOfferCandidate[]): DedupResult {
  const facts = row.canonical_payload.declared_facts;
  const externalReference = row.canonical_payload.external_reference;
  const propertyFingerprint = buildPropertyFingerprint(facts);
  const offerFingerprint = buildOfferFingerprint(facts, externalReference);
  const base = { version: PARTNER_DEDUP_VERSION, property_fingerprint: propertyFingerprint, offer_fingerprint: offerFingerprint, publication_eligible: false as const };

  if (row.row_status === "invalid" || !propertyFingerprint || !offerFingerprint) {
    return { ...base, decision: "invalid", confidence: "none", matched_property_id: null, matched_offer_id: null, reasons: ["canonical_row_invalid"] };
  }

  const sameReference = candidates.find((candidate) => externalReference && candidate.external_reference === externalReference);
  if (sameReference) {
    const changed = materiallyChanged(facts, sameReference.declared_facts);
    return { ...base, decision: changed ? "update_offer" : "duplicate", confidence: "high", matched_property_id: sameReference.property_id, matched_offer_id: sameReference.offer_id, reasons: [changed ? "same_partner_reference_material_change" : "same_partner_reference_same_content"] };
  }

  const sameProperty = candidates.filter((candidate) => buildPropertyFingerprint(candidate.declared_facts) === propertyFingerprint);
  if (sameProperty.length === 0) return { ...base, decision: "new_property", confidence: "medium", matched_property_id: null, matched_offer_id: null, reasons: ["no_property_candidate"] };

  const sameOffer = sameProperty.find((candidate) => buildOfferFingerprint(candidate.declared_facts, candidate.external_reference ?? null) === offerFingerprint);
  if (sameOffer) return { ...base, decision: "duplicate", confidence: "high", matched_property_id: sameOffer.property_id, matched_offer_id: sameOffer.offer_id, reasons: ["same_property_and_offer_fingerprint"] };

  const propertyIds = [...new Set(sameProperty.map((candidate) => candidate.property_id))];
  if (propertyIds.length === 1) return { ...base, decision: "new_offer", confidence: "medium", matched_property_id: propertyIds[0], matched_offer_id: null, reasons: ["same_property_distinct_offer"] };

  return { ...base, decision: "manual_review", confidence: "low", matched_property_id: null, matched_offer_id: null, reasons: ["ambiguous_property_candidates"] };
}
