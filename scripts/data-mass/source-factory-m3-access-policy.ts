import type { SourceFactoryChannel } from "./source-factory-decision";

export type M3ExternalIndexMode = "NONE" | "MINIMAL_EXTERNAL_INDEX";
export type M3ExternalIndexField = "CANONICAL_URL" | "SOURCE_DOMAIN" | "PROVENANCE";

export interface M3ReuseAuthorizationInput {
  granted: boolean;
  evidenceReference?: string | null;
  allowedChannels?: SourceFactoryChannel[];
}

export interface M3SeparatedAccessPolicy {
  schemaVersion: "MASS_INDEX_M3_ACCESS_PLANES_V1";
  sourceDomain: string;
  externalIndex: {
    eligible: boolean;
    mode: M3ExternalIndexMode;
    allowedFields: M3ExternalIndexField[];
    sourceNetworkRequestsAllowed: false;
    sourceContentReuseAllowed: false;
  };
  ingestionAndReuse: {
    authorized: boolean;
    evidenceReference: string | null;
    allowedChannels: SourceFactoryChannel[];
  };
  invariants: {
    externalIndexDoesNotGrantReuse: true;
    legacyDecisionDoesNotGrantReuse: true;
    explicitReuseEvidenceRequired: true;
  };
}

const MINIMAL_EXTERNAL_INDEX_FIELDS: M3ExternalIndexField[] = [
  "CANONICAL_URL",
  "SOURCE_DOMAIN",
  "PROVENANCE",
];

const CONTENT_ACQUISITION_CHANNELS = new Set<SourceFactoryChannel>([
  "PUBLIC_SITEMAP",
  "COMMON_CRAWL",
  "DIRECT_FETCH",
  "PARTNER_FEED",
  "OWNER_SUBMISSION",
]);

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

function normalizeReuseChannels(channels: SourceFactoryChannel[]): SourceFactoryChannel[] {
  return [...new Set(channels)].filter((channel) => CONTENT_ACQUISITION_CHANNELS.has(channel));
}

/**
 * M3 separates two independent planes:
 * 1) minimal external indexing of an already-discovered canonical URL;
 * 2) ingestion/reuse of source content, which requires explicit authorization evidence.
 *
 * External-index eligibility is deliberately incapable of granting source fetches,
 * rich-content reuse, or any ingestion channel. Legacy Source Factory decisions are
 * not accepted as a substitute for explicit reuse authorization.
 */
export function buildM3SeparatedAccessPolicy(
  sourceDomain: string,
  externalIndexCandidate: boolean,
  reuseAuthorization: M3ReuseAuthorizationInput = { granted: false },
): M3SeparatedAccessPolicy {
  const domain = normalizeDomain(sourceDomain);
  if (!domain) throw new Error("M3_ACCESS_DOMAIN_REQUIRED");

  const requestedChannels = reuseAuthorization.allowedChannels ?? [];
  const allowedChannels = normalizeReuseChannels(requestedChannels);

  if (!reuseAuthorization.granted) {
    if (reuseAuthorization.evidenceReference?.trim() || requestedChannels.length > 0) {
      throw new Error("M3_REUSE_NOT_GRANTED_MUST_BE_EMPTY");
    }
  } else {
    if (!reuseAuthorization.evidenceReference?.trim()) {
      throw new Error("M3_REUSE_EVIDENCE_REQUIRED");
    }
    if (allowedChannels.length === 0) {
      throw new Error("M3_REUSE_CHANNEL_REQUIRED");
    }
    if (allowedChannels.length !== new Set(requestedChannels).size) {
      throw new Error("M3_REUSE_CHANNEL_INVALID_OR_DUPLICATE");
    }
  }

  return {
    schemaVersion: "MASS_INDEX_M3_ACCESS_PLANES_V1",
    sourceDomain: domain,
    externalIndex: {
      eligible: externalIndexCandidate,
      mode: externalIndexCandidate ? "MINIMAL_EXTERNAL_INDEX" : "NONE",
      allowedFields: externalIndexCandidate ? [...MINIMAL_EXTERNAL_INDEX_FIELDS] : [],
      sourceNetworkRequestsAllowed: false,
      sourceContentReuseAllowed: false,
    },
    ingestionAndReuse: {
      authorized: reuseAuthorization.granted,
      evidenceReference: reuseAuthorization.granted ? reuseAuthorization.evidenceReference!.trim() : null,
      allowedChannels: reuseAuthorization.granted ? allowedChannels : [],
    },
    invariants: {
      externalIndexDoesNotGrantReuse: true,
      legacyDecisionDoesNotGrantReuse: true,
      explicitReuseEvidenceRequired: true,
    },
  };
}
