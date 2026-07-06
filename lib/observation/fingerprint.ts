import type { ObservationFingerprintInput } from "./types";

function normalizeSegment(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  return String(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Stable identifier for a public result, used only to recognize repeat
 * observations. Never derived from contact, gallery, or free-text fields.
 */
export function buildObservationFingerprint(
  input: ObservationFingerprintInput,
): string {
  const originalUrlKey = normalizeSegment(input.original_url);
  const sourceHostKey = normalizeSegment(input.source_host);

  if (originalUrlKey) {
    return `u:${fnv1a(`${sourceHostKey}|${originalUrlKey}`)}`;
  }

  const fallbackParts = [
    sourceHostKey,
    normalizeSegment(input.title),
    normalizeSegment(input.city),
    normalizeSegment(input.district),
    normalizeSegment(input.property_type),
    normalizeSegment(input.transaction_type),
    normalizeSegment(input.price),
    normalizeSegment(input.surface),
  ];

  return `f:${fnv1a(fallbackParts.join("|"))}`;
}
