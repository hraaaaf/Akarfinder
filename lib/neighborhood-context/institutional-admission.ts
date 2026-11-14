import { NEIGHBORHOOD_POI_MAX_AGE_MS } from "./poi-registry";

export type InstitutionalSourceEvidenceV1 = {
  id: string;
  publisher: "MENPS" | "MSPS";
  dataset_url: string;
  dataset_as_of: string;
  portal_modified_on: string;
  file_format: "XLS" | "XLSX";
  licence: "ODbL";
  resource_sha256: string | null;
  source_file_inspected: boolean;
};

export type InstitutionalPoiReviewV1 = {
  dataset_id: string;
  source_entity_id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  // This MUST be a per-entity observation, not a portal upload or HTTP fetch.
  individual_verified_at: string | null;
  independent_evidence_url: string | null;
  independent_evidence_method: "field_visit" | "official_entity_record" | "direct_contact" | null;
  territorial_relation: "inside_certified_boundary" | "authority_linked" | "near_certified_reference" | null;
  territorial_proof_url: string | null;
  reviewer_approval_id: string | null;
};

export type AdmissionDecisionV1 = {
  status: "accepted" | "rejected" | "manual_review";
  reasons: string[];
  // A staging decision NEVER writes to the public NeighborhoodContextReadModelV1.
  public_publish_allowed: false;
};

export const INSTITUTIONAL_DATASETS_2026: InstitutionalSourceEvidenceV1[] = [
  {
    id: "menps-primary-2026-07", publisher: "MENPS",
    dataset_url: "https://data.gov.ma/data/fr/dataset/liste-des-etablissements-publics-primaire",
    dataset_as_of: "2026-07", portal_modified_on: "2026-09-16",
    file_format: "XLSX", licence: "ODbL", resource_sha256: null, source_file_inspected: false,
  },
  {
    id: "menps-college-2026-07", publisher: "MENPS",
    dataset_url: "https://data.gov.ma/data/fr/dataset/liste-de-etablissements-publics-collegial",
    dataset_as_of: "2026-07", portal_modified_on: "2026-09-16",
    file_format: "XLSX", licence: "ODbL", resource_sha256: null, source_file_inspected: false,
  },
  {
    id: "menps-qualifiant-2026-07", publisher: "MENPS",
    dataset_url: "https://data.gov.ma/data/fr/dataset/liste-des-etablissements-publics-qualifiants",
    dataset_as_of: "2026-07", portal_modified_on: "2026-09-16",
    file_format: "XLSX", licence: "ODbL", resource_sha256: null, source_file_inspected: false,
  },
  {
    id: "menps-private-2026-07", publisher: "MENPS",
    dataset_url: "https://data.gov.ma/data/fr/dataset/liste-des-etablissements-prives-2023",
    dataset_as_of: "2026-07", portal_modified_on: "2026-09-16",
    file_format: "XLSX", licence: "ODbL", resource_sha256: null, source_file_inspected: false,
  },
  {
    id: "msps-hospitals-2025", publisher: "MSPS",
    dataset_url: "https://data.gov.ma/data/fr/dataset/la-liste-des-hopitaux",
    dataset_as_of: "2025", portal_modified_on: "2026-10-29",
    file_format: "XLSX", licence: "ODbL", resource_sha256: null, source_file_inspected: false,
  },
];

function validOfficialUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" &&
      (parsed.hostname === "data.gov.ma" || parsed.hostname === "www.data.gov.ma");
  } catch {
    return false;
  }
}

function validEvidenceUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function reviewInstitutionalPoiV1(
  source: InstitutionalSourceEvidenceV1,
  row: InstitutionalPoiReviewV1,
  now = new Date(),
): AdmissionDecisionV1 {
  const rejected: string[] = [];
  const pending: string[] = [];

  if (row.dataset_id !== source.id || !row.source_entity_id.trim() || !row.name.trim()) {
    rejected.push("missing_or_mismatched_identity");
  }
  if (!validOfficialUrl(source.dataset_url) || source.licence !== "ODbL") {
    rejected.push("invalid_source_provenance");
  }
  if (row.latitude == null || row.longitude == null ||
      !Number.isFinite(row.latitude) || !Number.isFinite(row.longitude) ||
      row.latitude < 27 || row.latitude > 37 || row.longitude < -14 || row.longitude > -1) {
    rejected.push("coordinates_missing_or_outside_morocco");
  }
  if (!source.source_file_inspected || !/^[a-f0-9]{64}$/i.test(source.resource_sha256 ?? "")) {
    pending.push("source_file_uninspected_or_unhashed");
  }
  const observed = row.individual_verified_at ? Date.parse(row.individual_verified_at) : NaN;
  if (!Number.isFinite(observed)) pending.push("missing_individual_observation");
  else if (observed > now.getTime() || now.getTime() - observed > NEIGHBORHOOD_POI_MAX_AGE_MS) {
    rejected.push("individual_observation_stale_or_future");
  }
  if (!validEvidenceUrl(row.independent_evidence_url) || !row.independent_evidence_method) {
    pending.push("missing_independent_entity_evidence");
  } else {
    const verificationHost = new URL(row.independent_evidence_url!).hostname.replace(/^www\./, "");
    const sourceHost = validOfficialUrl(source.dataset_url)
      ? new URL(source.dataset_url).hostname.replace(/^www\./, "")
      : "";
    if (verificationHost === sourceHost) pending.push("non_independent_source_host");
  }
  if (!row.territorial_relation || !validEvidenceUrl(row.territorial_proof_url)) {
    pending.push("unproven_territorial_relation");
  }
  if (row.territorial_relation === "inside_certified_boundary" && !row.territorial_proof_url) {
    rejected.push("unproven_inside_claim");
  }
  if (!row.reviewer_approval_id?.trim()) pending.push("human_admission_approval_missing");
  // This offline preflight cannot verify a human signature or independently
  // corroborate an entity. Never auto-admit on a typed approval ID alone.
  pending.push("external_signed_admission_required");

  return {
    status: rejected.length ? "rejected" : "manual_review",
    reasons: [...rejected, ...pending],
    public_publish_allowed: false,
  };
}

export function buildInstitutionalAdmissionReport(now = new Date()) {
  return {
    schema: "NCI_L5_INSTITUTIONAL_ADMISSION_PREFLIGHT_V1" as const,
    generated_at: now.toISOString(),
    source_count: INSTITUTIONAL_DATASETS_2026.length,
    source_catalogue: INSTITUTIONAL_DATASETS_2026,
    source_metadata_verified: INSTITUTIONAL_DATASETS_2026.length,
    source_files_downloaded_and_hashed: 0,
    source_rows_inspected: 0,
    entity_rows_individually_verified: 0,
    accepted: 0,
    rejected: 0,
    manual_review: 0,
    pending_source_files: INSTITUTIONAL_DATASETS_2026.map((source) => source.id),
    public_publish_allowed: false,
    source_updated_date_is_not_entity_verified_at: true,
    finding: "No XLSX source bytes, row coordinates or independent per-entity verification were obtained; no public POI is admissible.",
  };
}
