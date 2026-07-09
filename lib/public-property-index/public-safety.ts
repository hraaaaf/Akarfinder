import type { PublicPropertyIndexRecord, PublicPropertyIndexSearchResponse } from "./types";

const FORBIDDEN_WORDING = [
  "annonce fiable",
  "annonce verifiee",
  "annonce certifiee",
  "prix officiel",
  "prix reel",
  "prix de marche",
  "sous le marche",
  "au-dessus du marche",
  "bon plan",
  "disponible confirme",
  "garanti",
  "certifie",
];

const FORBIDDEN_KEYS = [
  "raw_metadata",
  "payload",
  "contact",
  "phone",
  "whatsapp",
  "email",
  "gallery",
  "image",
  "image_url",
  "value_low",
  "value_median",
  "value_high",
  "evidence_ref",
  "source_registry",
  "cache_key",
];

export function assertPublicPropertyIndexRecordSafety(record: PublicPropertyIndexRecord): void {
  const serialized = JSON.stringify(record).toLowerCase();

  for (const term of FORBIDDEN_WORDING) {
    if (serialized.includes(term)) {
      throw new Error(`Unsafe public property index wording detected: ${term}`);
    }
  }

  for (const key of FORBIDDEN_KEYS) {
    if (serialized.includes(`"${key}"`)) {
      throw new Error(`Unsafe public property index field exposure detected: ${key}`);
    }
  }
}

export function assertPublicPropertyIndexResponseSafety(
  response: PublicPropertyIndexSearchResponse,
): void {
  const serialized = JSON.stringify(response).toLowerCase();

  for (const term of FORBIDDEN_WORDING) {
    if (serialized.includes(term)) {
      throw new Error(`Unsafe public property index response wording detected: ${term}`);
    }
  }

  for (const key of FORBIDDEN_KEYS) {
    if (serialized.includes(`"${key}"`)) {
      throw new Error(`Unsafe public property index response field exposure detected: ${key}`);
    }
  }
}
