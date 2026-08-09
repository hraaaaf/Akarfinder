export type PatternEvidenceRecord = {
  url: string;
  timestamp: string;
  status?: string;
  mime?: string;
  index: string;
};

export type PatternSignatureEvidence = {
  signature: string;
  url_count: number;
  share: number;
  id_bearing: boolean;
  property_namespace: boolean;
  examples: string[];
};

export type DomainPatternEvidenceState =
  | "STRONG_PATTERN_EVIDENCE"
  | "REVIEWABLE_PATTERN_EVIDENCE"
  | "INSUFFICIENT_URL_INDEX_EVIDENCE";

export type DomainPatternEvidence = {
  source_domain: string;
  state: DomainPatternEvidenceState;
  raw_records: number;
  healthy_html_records: number;
  unique_urls: number;
  top_signatures: PatternSignatureEvidence[];
};

const PROPERTY_NAMESPACE = /(^|[-_])(property|properties|annonce|annonces|bien|biens|immobilier|immobiliere|immobilieres|vente|vendre|achat|acheter|location|louer|rent|sale|listing|listings|detail|details)([-_]|$)/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEXISH = /^[0-9a-f]{8,}$/i;
const NUMERIC = /^\d+$/;

function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

function normalizeSegment(segment: string): string | null {
  let value: string;
  try {
    value = decodeURIComponent(segment).toLowerCase();
  } catch {
    return null;
  }
  if (UUID.test(value)) return "{uuid}";
  if (NUMERIC.test(value)) return "{id}";
  if (HEXISH.test(value) && /\d/.test(value)) return "{hex}";

  value = value
    .replace(/([_-])ref([_-])?\d+(?=\.|$)/gi, "$1ref$2{id}")
    .replace(/([_-])\d{3,}(?=\.|$)/g, "$1{id}")
    .replace(/^\d{3,}([_-])/, "{id}$1");

  if (/\{id\}/.test(value)) {
    value = value.replace(/^[a-z0-9]+(?:-[a-z0-9]+)*?(?=[_-]\{id\})/i, "{slug}");
    return value;
  }

  if (/^[a-z0-9]+(?:-[a-z0-9]+){2,}(?:\.[a-z0-9]+)?$/i.test(value)) {
    const extension = value.match(/(\.[a-z0-9]+)$/i)?.[1] ?? "";
    return `{slug}${extension}`;
  }

  return value;
}

export function buildPathSignature(urlValue: string): string | null {
  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    return null;
  }
  const segments: string[] = [];
  for (const raw of url.pathname.split("/").filter(Boolean)) {
    const normalized = normalizeSegment(raw);
    if (normalized == null) return null;
    segments.push(normalized);
  }
  return `/${segments.join("/")}${url.pathname.endsWith("/") && segments.length ? "/" : ""}`;
}

function isHealthyHtml(record: PatternEvidenceRecord): boolean {
  return record.status === "200" && (record.mime ?? "").toLowerCase().includes("text/html");
}

function signatureHasId(signature: string): boolean {
  return /\{(?:id|uuid|hex)\}/.test(signature);
}

function signatureHasPropertyNamespace(signature: string): boolean {
  return signature
    .split("/")
    .filter(Boolean)
    .some((segment) => PROPERTY_NAMESPACE.test(segment.replace(/[{}]/g, "")));
}

export function buildDomainPatternEvidence(
  domain: string,
  records: PatternEvidenceRecord[],
): DomainPatternEvidence {
  const normalizedDomain = normalizeHost(domain);
  const healthySameHost: PatternEvidenceRecord[] = [];
  const unique = new Map<string, string>();

  for (const record of records) {
    if (!isHealthyHtml(record)) continue;
    try {
      const url = new URL(record.url);
      if (normalizeHost(url.hostname) !== normalizedDomain) continue;
      healthySameHost.push(record);
      url.hash = "";
      unique.set(url.toString(), url.toString());
    } catch {
      // Malformed index rows are ignored; evidence remains fail-closed.
    }
  }

  const groups = new Map<string, string[]>();
  for (const url of unique.values()) {
    const signature = buildPathSignature(url);
    if (!signature) continue;
    if (!groups.has(signature)) groups.set(signature, []);
    groups.get(signature)!.push(url);
  }

  const total = unique.size;
  const topSignatures = [...groups.entries()]
    .map(([signature, urls]) => ({
      signature,
      url_count: urls.length,
      share: total ? Number((urls.length / total).toFixed(4)) : 0,
      id_bearing: signatureHasId(signature),
      property_namespace: signatureHasPropertyNamespace(signature),
      examples: urls.slice(0, 5),
    }))
    .sort((a, b) => b.url_count - a.url_count || a.signature.localeCompare(b.signature))
    .slice(0, 10);

  const strong = topSignatures.some((candidate) =>
    candidate.url_count >= 5 && candidate.share >= 0.1 && candidate.id_bearing,
  );
  const reviewable = topSignatures.some((candidate) =>
    candidate.url_count >= 5 && candidate.share >= 0.1 && candidate.property_namespace,
  );

  const state: DomainPatternEvidenceState = strong
    ? "STRONG_PATTERN_EVIDENCE"
    : reviewable
      ? "REVIEWABLE_PATTERN_EVIDENCE"
      : "INSUFFICIENT_URL_INDEX_EVIDENCE";

  return {
    source_domain: normalizedDomain,
    state,
    raw_records: records.length,
    healthy_html_records: healthySameHost.length,
    unique_urls: total,
    top_signatures: topSignatures,
  };
}
