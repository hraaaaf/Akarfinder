// AKARFINDER-MARKET-INDEX-FOUNDATION-1 — validation for DiscoveryCandidate and
// SourceOffer. Rejects PII, raw HTML, and invalid URLs before anything is
// allowed to become a domain object -- these checks run on plain input data
// and never fetch a URL themselves.

import { canonicalizeUrl } from "./market-index-identifiers";
import type { DiscoveryStatus, OriginType, PriceStatus } from "./market-index-types";
import { ALLOWED_DISCOVERY_STATUSES, ALLOWED_ORIGIN_TYPES, ALLOWED_PRICE_STATUSES } from "./market-index-types";

// Same patterns already used elsewhere in this project
// (lib/openserp-ingestion redaction, scripts/audits PII scans) -- kept
// consistent rather than reinvented.
const PHONE_RE = /(?<![\d.])(?:\+212|0)[\s.-]?[5-7](?:[\s.-]?\d){8}(?![\d.])/;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const WHATSAPP_RE = /whatsapp/i;
const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i;

export type ValidationIssue = { field: string; reason: string };
export type ValidationResult = { valid: true } | { valid: false; issues: ValidationIssue[] };

function containsForbiddenContent(value: string | null | undefined): string | null {
  if (!value) return null;
  if (PHONE_RE.test(value)) return "contains a phone-number-shaped pattern";
  if (EMAIL_RE.test(value)) return "contains an email-shaped pattern";
  if (WHATSAPP_RE.test(value)) return "contains a WhatsApp reference";
  if (HTML_TAG_RE.test(value)) return "contains raw HTML markup, which must never be stored";
  return null;
}

export type DiscoveryCandidateInput = {
  provider: string;
  discovery_query?: string | null;
  source_domain: string;
  source_url: string;
  canonical_url?: string | null;
  title?: string | null;
  snippet?: string | null;
  discovery_status?: string;
  metadata?: Record<string, unknown> | null;
};

export function validateDiscoveryCandidate(input: DiscoveryCandidateInput): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!input.provider?.trim()) {
    issues.push({ field: "provider", reason: "provider is required" });
  }
  if (!input.source_domain?.trim()) {
    issues.push({ field: "source_domain", reason: "source_domain is required" });
  }

  const canonical = canonicalizeUrl(input.source_url);
  if (!canonical) {
    issues.push({ field: "source_url", reason: "source_url is not a valid URL" });
  }

  for (const [field, value] of [
    ["title", input.title],
    ["snippet", input.snippet],
    ["discovery_query", input.discovery_query],
  ] as const) {
    const forbidden = containsForbiddenContent(value);
    if (forbidden) issues.push({ field, reason: forbidden });
  }

  if (input.metadata) {
    const serialized = JSON.stringify(input.metadata);
    const forbidden = containsForbiddenContent(serialized);
    if (forbidden) issues.push({ field: "metadata", reason: forbidden });
    // Bounded size guard -- metadata must stay small, never a full-page dump.
    if (serialized.length > 4096) {
      issues.push({ field: "metadata", reason: "metadata exceeds the 4KB bound -- must not carry raw page content" });
    }
  }

  if (input.discovery_status && !ALLOWED_DISCOVERY_STATUSES.includes(input.discovery_status as DiscoveryStatus)) {
    issues.push({ field: "discovery_status", reason: `"${input.discovery_status}" is not an allowed status` });
  }

  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}

export type SourceOfferInput = {
  source_name: string;
  listing_url: string;
  origin_type?: string | null;
  price_status?: string | null;
  displayed_price?: number | null;
};

export function validateSourceOffer(input: SourceOfferInput): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!input.source_name?.trim()) {
    issues.push({ field: "source_name", reason: "source_name is required" });
  }

  const canonical = canonicalizeUrl(input.listing_url);
  if (!canonical) {
    issues.push({ field: "listing_url", reason: "listing_url is not a valid URL" });
  }

  if (input.origin_type && !ALLOWED_ORIGIN_TYPES.includes(input.origin_type as OriginType)) {
    issues.push({ field: "origin_type", reason: `"${input.origin_type}" is not an allowed origin_type` });
  }

  if (input.price_status && !ALLOWED_PRICE_STATUSES.includes(input.price_status as PriceStatus)) {
    issues.push({ field: "price_status", reason: `"${input.price_status}" is not an allowed price_status` });
  }

  // Doctrine check (mission section 9): 0/negative is never "valid".
  if (input.price_status === "valid" && (input.displayed_price == null || input.displayed_price <= 0)) {
    issues.push({
      field: "displayed_price",
      reason: "price_status=valid requires a positive displayed_price -- 0/negative/null can never be valid",
    });
  }

  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}
